import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { 
  MapPin, 
  Calendar, 
  Users, 
  XCircle, 
  Car, 
  Clock, 
  CheckCircle, 
  FileText,
  Download,
  Phone,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Timer,
  Building2,
  CreditCard,
  Receipt,
  Send,
  User
} from "lucide-react";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeCoursesListProps {
  employeeId: string;
  userId: string;
  companyId: string;
  onCreateCourse: () => void;
  canCreateCourses?: boolean;
}

interface CourseData {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  distance_km: number | null;
  duration_minutes: number | null;
  passengers_count: number;
  notes: string | null;
  created_by_user_id: string | null;
  driver: {
    id: string;
    company_name: string | null;
    company_address: string | null;
    siret: string | null;
    siren: string | null;
    tva_number: string | null;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    show_phone: boolean | null;
    profile: {
      full_name: string | null;
      phone: string | null;
      profile_photo_url: string | null;
    } | null;
  } | null;
  devis: {
    id: string;
    quote_number: string;
    amount: number;
    status: string;
    valid_until: string;
    base_price: number;
    distance_price: number;
    tva_rate: number | null;
    tva_amount: number | null;
  } | null;
  facture: {
    id: string;
    invoice_number: string;
    invoice_number_generated: string | null;
    amount: number;
    payment_status: string;
    tva_rate: number | null;
    tva_amount: number | null;
  } | null;
  companyCourse: {
    actual_payment_method: string | null;
    client_confirmed_payment_method: string | null;
  } | null;
  company: {
    id: string;
    company_name: string;
    siret: string;
    siren: string | null;
    tva_number: string | null;
    address: string;
    billing_address: string | null;
    contact_email: string;
  } | null;
  agreement: {
    payment_frequency: string;
    payment_day: number | null;
  } | null;
}

export function EmployeeCoursesList({ 
  employeeId, 
  userId, 
  companyId, 
  onCreateCourse,
  canCreateCourses = true
}: EmployeeCoursesListProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);
  const [generatingDevisId, setGeneratingDevisId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverProfileOpen, setDriverProfileOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [employeeId, userId]);

  const fetchCourses = async () => {
    try {
      console.log("[EmployeeCoursesList] Fetching courses for employee:", employeeId, "user:", userId);
      
      // Utiliser une edge function pour contourner les problèmes RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("[EmployeeCoursesList] No session");
        return;
      }

      // Récupérer les demandes de courses en attente pour cet employé
      const { data: requestsData, error: requestsError } = await supabase
        .from("company_course_requests")
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          passengers_count,
          notes,
          created_at,
          quotes:company_course_quotes(
            id,
            total_price,
            status,
            driver:drivers(
              user_id,
              company_name
            )
          )
        `)
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
        .in("status", ["draft", "quotes_generated", "sent_to_drivers"])
        .order("created_at", { ascending: false });

      if (requestsError) {
        console.error("[EmployeeCoursesList] Error fetching pending requests:", requestsError);
      } else {
        console.log("[EmployeeCoursesList] Pending requests found:", requestsData?.length);
        
        // Fetch driver profiles for quotes
        const driverUserIds = new Set<string>();
        requestsData?.forEach((r: any) => {
          r.quotes?.forEach((q: any) => {
            if (q.driver?.user_id) driverUserIds.add(q.driver.user_id);
          });
        });
        
        let profilesMap = new Map<string, string>();
        if (driverUserIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", Array.from(driverUserIds));
          profiles?.forEach((p: any) => profilesMap.set(p.id, p.full_name));
        }
        
        // Enrich requests with driver names
        const enrichedRequests = requestsData?.map((r: any) => ({
          ...r,
          quotes: r.quotes?.map((q: any) => ({
            ...q,
            driver_name: q.driver?.user_id ? profilesMap.get(q.driver.user_id) : q.driver?.company_name
          }))
        })) || [];
        
        setPendingRequests(enrichedRequests);
      }

      // Récupérer les company_courses liées à cet utilisateur
      const { data: companyCourses, error: ccError } = await supabase
        .from("company_courses")
        .select("course_id, employee_id")
        .eq("company_id", companyId);

      if (ccError) {
        console.error("[EmployeeCoursesList] Error fetching company_courses:", ccError);
        throw ccError;
      }

      console.log("[EmployeeCoursesList] Company courses found:", companyCourses?.length);

      if (!companyCourses || companyCourses.length === 0) {
        setCourses([]);
        return;
      }

      // Récupérer les détails des courses
      const courseIds = companyCourses.map(cc => cc.course_id);
      
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          distance_km,
          duration_minutes,
          passengers_count,
          notes,
          created_by_user_id,
          driver_id
        `)
        .in("id", courseIds)
        .order("scheduled_date", { ascending: false });

      if (coursesError) {
        console.error("[EmployeeCoursesList] Error fetching courses:", coursesError);
        throw coursesError;
      }

      console.log("[EmployeeCoursesList] Courses found:", coursesData?.length);

      // Filtrer pour ne garder que les courses créées par cet utilisateur
      const myCourses = coursesData?.filter(c => 
        c.created_by_user_id === userId ||
        companyCourses.find(cc => cc.course_id === c.id)?.employee_id === employeeId
      ) || [];

      console.log("[EmployeeCoursesList] My courses after filter:", myCourses.length);

      if (myCourses.length === 0) {
        setCourses([]);
        return;
      }

      // Batch fetch all data in parallel for performance
      const myCourseIds = myCourses.map(c => c.id);
      const driverIds = [...new Set(myCourses.map(c => c.driver_id).filter(Boolean))] as string[];

      const [companyResult, companyCourseResult, driversResult, devisResult, facturesResult, agreementsResult] = await Promise.all([
        // Company info
        supabase
          .from("companies")
          .select("id, company_name, siret, siren, tva_number, address, billing_address, contact_email")
          .eq("id", companyId)
          .maybeSingle(),
        // Company courses payment info
        supabase
          .from("company_courses")
          .select("course_id, actual_payment_method, client_confirmed_payment_method")
          .in("course_id", myCourseIds),
        // Drivers
        driverIds.length > 0
          ? supabase
              .from("drivers")
              .select("id, company_name, company_address, siret, siren, tva_number, vehicle_brand, vehicle_model, vehicle_color, user_id, show_phone")
              .in("id", driverIds)
          : Promise.resolve({ data: [] as any[] }),
        // Devis - only select columns that exist
        supabase
          .from("devis")
          .select("id, course_id, quote_number, amount, status, valid_until, base_price, distance_price, created_at")
          .in("course_id", myCourseIds),
        // Factures - only select columns that exist
        supabase
          .from("factures")
          .select("id, course_id, invoice_number, invoice_number_generated, amount, payment_status")
          .in("course_id", myCourseIds),
        // Agreements
        driverIds.length > 0
          ? supabase
              .from("company_driver_agreements")
              .select("driver_id, payment_frequency, payment_day")
              .in("driver_id", driverIds)
              .eq("company_id", companyId)
              .eq("status", "accepted")
          : Promise.resolve({ data: [] as any[] })
      ]);

      // Fetch driver profiles in batch
      const driverUserIds = driversResult.data?.map((d: any) => d.user_id).filter(Boolean) || [];
      const profilesResult = driverUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, phone, profile_photo_url").in("id", driverUserIds)
        : { data: [] };

      // Create lookup maps
      const companyData = companyResult.data;
      
      const companyCourseMap = new Map<string, any>();
      for (const cc of (companyCourseResult.data || [])) {
        companyCourseMap.set(cc.course_id, cc);
      }

      const driversMap = new Map<string, any>();
      for (const d of (driversResult.data || [])) {
        driversMap.set(d.id, d);
      }

      const profilesMap = new Map<string, any>();
      for (const p of (profilesResult.data || [])) {
        profilesMap.set(p.id, p);
      }

      // Group devis by course_id, keep only the latest
      const devisMap = new Map<string, any>();
      for (const d of (devisResult.data || [])) {
        const existing = devisMap.get(d.course_id);
        if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
          devisMap.set(d.course_id, d);
        }
      }

      const facturesMap = new Map<string, any>();
      for (const f of (facturesResult.data || [])) {
        facturesMap.set(f.course_id, f);
      }

      const agreementsMap = new Map<string, any>();
      for (const a of (agreementsResult.data || [])) {
        agreementsMap.set(a.driver_id, a);
      }

      // Build enriched courses
      const enrichedCourses: CourseData[] = myCourses.map(course => {
        const driverData = driversMap.get(course.driver_id);
        const profileData = driverData ? profilesMap.get(driverData.user_id) : null;
        
        const driver = driverData ? {
          id: driverData.id,
          company_name: driverData.company_name,
          company_address: driverData.company_address,
          siret: driverData.siret,
          siren: driverData.siren,
          tva_number: driverData.tva_number,
          vehicle_brand: driverData.vehicle_brand,
          vehicle_model: driverData.vehicle_model,
          vehicle_color: driverData.vehicle_color,
          show_phone: driverData.show_phone,
          profile: profileData
        } : null;

        const devisData = devisMap.get(course.id);
        const devis = devisData ? {
          id: devisData.id,
          quote_number: devisData.quote_number,
          amount: devisData.amount,
          status: devisData.status,
          valid_until: devisData.valid_until,
          base_price: devisData.base_price,
          distance_price: devisData.distance_price,
          tva_rate: null,
          tva_amount: null
        } : null;

        const factureData = facturesMap.get(course.id);
        const facture = factureData ? {
          id: factureData.id,
          invoice_number: factureData.invoice_number,
          invoice_number_generated: factureData.invoice_number_generated,
          amount: factureData.amount,
          payment_status: factureData.payment_status,
          tva_rate: null,
          tva_amount: null
        } : null;

        const companyCourse = companyCourseMap.get(course.id) || null;
        const agreement = driverData ? agreementsMap.get(driverData.id) : null;

        return {
          ...course,
          driver,
          devis,
          facture,
          companyCourse,
          company: companyData,
          agreement
        };
      });

      setCourses(enrichedCourses);
    } catch (error: any) {
      console.error("[EmployeeCoursesList] Error:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    // Subscribe to company_courses changes
    const unsubscribeCourses = subscriptionManager.subscribe(
      `employee-courses-${employeeId}`,
      {
        table: "company_courses",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 500
      },
      () => fetchCourses()
    );

    // Also subscribe to devis changes to see new quotes instantly
    const unsubscribeDevis = subscriptionManager.subscribe(
      `employee-devis-${employeeId}`,
      {
        table: "devis",
        event: "*",
        debounceMs: 500
      },
      () => fetchCourses()
    );

    // Subscribe to company_course_requests changes
    const unsubscribeRequests = subscriptionManager.subscribe(
      `employee-requests-${employeeId}`,
      {
        table: "company_course_requests",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 500
      },
      () => fetchCourses()
    );

    // Return combined cleanup
    return () => {
      unsubscribeCourses?.();
      unsubscribeDevis?.();
      unsubscribeRequests?.();
    };
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleCancelConfirm = async () => {
    if (!cancelCourseId) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "cancelled" })
        .eq("id", cancelCourseId);

      if (error) throw error;
      toast.success("Course annulée");
      setCancelCourseId(null);
      fetchCourses();
    } catch (error: any) {
      console.error("Error cancelling course:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleAcceptDevis = async (devisId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Marquer le devis comme accepté
      const { error: devisError } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devisId);

      if (devisError) throw devisError;

      // Récupérer le devis pour notifier le chauffeur
      const { data: devisData } = await supabase
        .from("devis")
        .select("course_id, driver_id, quote_number")
        .eq("id", devisId)
        .single();

      if (devisData) {
        // Récupérer le chauffeur pour envoyer une notification
        const { data: driver } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", devisData.driver_id)
          .single();

        if (driver?.user_id) {
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "Devis accepté par l'entreprise",
            message: `Le devis ${devisData.quote_number} a été accepté. Confirmez la course.`,
            type: "devis_accepted",
            link: "/driver-dashboard?tab=courses"
          });
        }
      }

      toast.success("Devis accepté ! En attente de confirmation du chauffeur.");
      fetchCourses();
    } catch (error: any) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation du devis");
    }
  };

  const handleRejectDevis = async (devisId: string) => {
    try {
      const { error } = await supabase
        .from("devis")
        .update({ status: "rejected" })
        .eq("id", devisId);

      if (error) throw error;

      toast.success("Devis refusé");
      fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting devis:", error);
      toast.error("Erreur lors du refus du devis");
    }
  };

  const handleRegenerateDevis = async (courseId: string) => {
    // Empêcher les doubles clics
    if (generatingDevisId === courseId) {
      console.log("[EmployeeCoursesList] Devis generation already in progress for course:", courseId);
      return;
    }
    
    try {
      setGeneratingDevisId(courseId);
      
      // Vérifier si un devis existe déjà pour cette course
      const { data: existingDevis, error: checkError } = await supabase
        .from("devis")
        .select("id, quote_number, status")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (checkError) {
        console.error("[EmployeeCoursesList] Error checking existing devis:", checkError);
      }
      
      if (existingDevis) {
        console.log("[EmployeeCoursesList] Devis already exists:", existingDevis.quote_number);
        toast.info(`Un devis existe déjà (${existingDevis.quote_number})`);
        fetchCourses();
        return;
      }
      
      // Récupérer la course pour avoir le driver_id
      const course = courses.find(c => c.id === courseId);
      if (!course?.driver?.id) {
        toast.error("Chauffeur non trouvé pour cette course");
        return;
      }

      toast.info("Génération du devis en cours...");

      const { data, error } = await supabase.functions.invoke("create-devis-auto", {
        body: { 
          course_id: courseId, 
          driver_id: course.driver.id,
          company_id: companyId // Passer le company_id pour les courses entreprise
        }
      });

      if (error) {
        console.error("Error generating devis:", error);
        toast.error("Erreur lors de la génération du devis");
        return;
      }

      toast.success("Devis généré avec succès !");
      fetchCourses();
    } catch (error: any) {
      console.error("Error regenerating devis:", error);
      toast.error("Erreur lors de la génération du devis");
    } finally {
      setGeneratingDevisId(null);
    }
  };

  const handleDownloadDevis = (course: CourseData) => {
    if (!course.devis) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${course.devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });
    
    // Driver info (left side) - ÉMETTEUR
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const driverName = course.driver?.profile?.full_name || course.driver?.company_name || "N/A";
    doc.text(driverName, 20, 72);
    
    let infoY = 77;
    if (course.driver?.siret) {
      doc.text(`SIRET: ${course.driver.siret}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.tva_number) {
      doc.text(`TVA: ${course.driver.tva_number}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.profile?.phone) {
      doc.text(`Tél: ${course.driver.profile.phone}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.company_address) {
      const addressLines = doc.splitTextToSize(course.driver.company_address, 75);
      doc.text(addressLines, 20, infoY);
    }
    
    // Company info (right side) - DESTINATAIRE
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("ENTREPRISE", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    doc.text(course.company?.company_name || "Entreprise", pageWidth - 20, 72, { align: 'right' });
    
    let companyInfoY = 77;
    if (course.company?.siret) {
      doc.text(`SIRET: ${course.company.siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    if (course.company?.tva_number) {
      doc.text(`TVA: ${course.company.tva_number}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    const companyAddress = course.company?.billing_address || course.company?.address;
    if (companyAddress) {
      const addressLines = doc.splitTextToSize(companyAddress, 75);
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
      });
      companyInfoY += addressLines.length * 4;
    }
    
    // Service details
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 115, 170, 45);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 123);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 131);
    doc.text(pickupLines, 50, 131);
    
    let currentY = 131 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    
    // Pricing
    let yPos = 175;
    const subtotal = (course.devis.base_price || 0) + (course.devis.distance_price || 0);
    const tvaRate = course.devis.tva_rate || 10;
    const tvaAmount = course.devis.tva_amount || (subtotal * (tvaRate / 100));
    const totalTTC = course.devis.amount;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Sous-total HT: ${subtotal.toFixed(2)} €`, 20, yPos);
    yPos += 6;
    doc.text(`TVA (${tvaRate}%): ${tvaAmount.toFixed(2)} €`, 20, yPos);
    yPos += 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`TOTAL TTC: ${totalTTC.toFixed(2)} €`, 20, yPos);
    
    doc.save(`devis-${course.devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = (course: CourseData) => {
    if (!course.facture) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const invoiceNum = course.facture.invoice_number_generated || course.facture.invoice_number;
    doc.text(`Référence: ${invoiceNum}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });
    
    // Driver info (left side) - ÉMETTEUR
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const driverName = course.driver?.profile?.full_name || course.driver?.company_name || "N/A";
    doc.text(driverName, 20, 72);
    
    let infoY = 77;
    if (course.driver?.siret) {
      doc.text(`SIRET: ${course.driver.siret}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.tva_number) {
      doc.text(`TVA: ${course.driver.tva_number}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.profile?.phone) {
      doc.text(`Tél: ${course.driver.profile.phone}`, 20, infoY);
      infoY += 4;
    }
    if (course.driver?.company_address) {
      const addressLines = doc.splitTextToSize(course.driver.company_address, 75);
      doc.text(addressLines, 20, infoY);
    }
    
    // Company info (right side) - DESTINATAIRE
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("FACTURÉ À", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    doc.text(course.company?.company_name || "Entreprise", pageWidth - 20, 72, { align: 'right' });
    
    let companyInfoY = 77;
    if (course.company?.siret) {
      doc.text(`SIRET: ${course.company.siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    if (course.company?.tva_number) {
      doc.text(`TVA: ${course.company.tva_number}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    const companyAddress = course.company?.billing_address || course.company?.address;
    if (companyAddress) {
      const addressLines = doc.splitTextToSize(companyAddress, 75);
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
      });
      companyInfoY += addressLines.length * 4;
    }
    
    // Service details
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 115, 170, 45);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("PRESTATION RÉALISÉE", 25, 123);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 131);
    doc.text(pickupLines, 50, 131);
    
    let currentY = 131 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    
    // Pricing
    let yPos = 175;
    const totalTTC = course.facture.amount;
    const tvaRate = course.facture.tva_rate || 10;
    const tvaAmount = course.facture.tva_amount || (totalTTC / (1 + tvaRate / 100)) * (tvaRate / 100);
    const subtotal = totalTTC - tvaAmount;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("MONTANT", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Sous-total HT: ${subtotal.toFixed(2)} €`, 20, yPos);
    yPos += 6;
    doc.text(`TVA (${tvaRate}%): ${tvaAmount.toFixed(2)} €`, 20, yPos);
    yPos += 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.text(`TOTAL TTC: ${totalTTC.toFixed(2)} €`, 20, yPos);
    
    // Payment status
    yPos += 15;
    doc.setFontSize(10);
    const paymentStatus = course.facture.payment_status === 'paid' ? 'PAYÉE' : 'EN ATTENTE';
    doc.text(`Statut: ${paymentStatus}`, 20, yPos);
    
    doc.save(`facture-${invoiceNum}.pdf`);
    toast.success("Facture téléchargée");
  };

  const getPaymentFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'per_course': 'À la course',
      'weekly': 'Hebdomadaire',
      'monthly': 'Mensuel',
      'bi_weekly': 'Bi-mensuel'
    };
    return labels[frequency] || frequency;
  };

  const getStatusConfig = (status: string, devisStatus?: string) => {
    if (status === "pending") {
      if (devisStatus === "accepted") {
        return {
          label: "En attente du chauffeur",
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          icon: Timer
        };
      }
      if (devisStatus === "pending") {
        return {
          label: "Devis à valider",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          icon: FileText
        };
      }
      return {
        label: "En attente de devis",
        color: "text-gray-500",
        bgColor: "bg-gray-500/10",
        icon: Clock
      };
    }

    const configs: Record<string, any> = {
      accepted: { label: "Confirmée", color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle },
      in_progress: { label: "En cours", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Car },
      completed: { label: "Terminée", color: "text-purple-500", bgColor: "bg-purple-500/10", icon: CheckCircle },
      cancelled: { label: "Annulée", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle }
    };

    return configs[status] || configs.pending;
  };

  // Filtrer les courses par catégorie
  // Devis à valider: course pending avec devis pending
  const pendingQuotes = courses.filter(c => 
    c.status === "pending" && c.devis?.status === "pending"
  );
  // En attente du chauffeur: devis accepté, course pending
  const awaitingDriver = courses.filter(c => 
    c.status === "pending" && c.devis?.status === "accepted"
  );
  // Courses sans devis (en attente de génération)
  const awaitingQuote = courses.filter(c => 
    c.status === "pending" && !c.devis
  );
  // Combiner les devis à valider avec ceux en attente de génération ET les demandes en attente
  const allPendingQuotes = [...pendingQuotes, ...awaitingQuote];
  // Total des éléments en attente = courses + demandes
  const totalPending = allPendingQuotes.length + pendingRequests.length;
  
  const confirmedCourses = courses.filter(c => 
    c.status === "accepted" || c.status === "in_progress"
  );
  const completedCourses = courses.filter(c => c.status === "completed");
  const cancelledCourses = courses.filter(c => c.status === "cancelled");

  // Fonction pour obtenir le statut d'une demande
  const getRequestStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      draft: { label: "Brouillon", color: "text-gray-500", bgColor: "bg-gray-500/10", icon: Clock },
      quotes_generated: { label: "Devis générés", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: FileText },
      sent_to_drivers: { label: "Envoyé aux chauffeurs", color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Send }
    };
    return configs[status] || configs.draft;
  };

  // Render une carte de demande en attente
  const renderRequestCard = (request: any) => {
    const statusConfig = getRequestStatusConfig(request.status);
    const StatusIcon = statusConfig.icon;
    const bestQuote = request.quotes?.find((q: any) => q.status === "sent") || request.quotes?.[0];

    return (
      <Card key={request.id} className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
        <CardContent className="p-4 sm:p-5">
          {/* Header avec statut */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${statusConfig.bgColor} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              </div>
              <div>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0 font-semibold`}>
                  {statusConfig.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(request.scheduled_date), "EEE d MMM • HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
            {bestQuote && (
              <div className="text-right">
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {bestQuote.total_price?.toFixed(0)}€
                </p>
                <p className="text-[10px] text-muted-foreground">Estimation</p>
              </div>
            )}
          </div>

          {/* Adresses */}
          <div className="relative space-y-0 mb-4 pl-3">
            <div className="absolute left-0.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-green-500 via-muted to-red-500 rounded-full" />
            <div className="flex items-start gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 -ml-[5px] ring-2 ring-green-500/20" />
              <p className="text-sm text-foreground/90 leading-relaxed">{request.pickup_address}</p>
            </div>
            <div className="flex items-start gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 -ml-[5px] ring-2 ring-red-500/20" />
              <p className="text-sm text-foreground/90 leading-relaxed">{request.destination_address}</p>
            </div>
          </div>

          {/* Info sur les chauffeurs contactés */}
          {request.quotes && request.quotes.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <Send className="w-4 h-4" />
                {request.quotes.length} chauffeur(s) contacté(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                En attente de confirmation d'un chauffeur
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderCourseCard = (course: CourseData) => {
    const statusConfig = getStatusConfig(course.status, course.devis?.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card key={course.id} className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
        <CardContent className="p-4 sm:p-5">
          {/* Header avec statut et prix */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${statusConfig.bgColor} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              </div>
              <div>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0 font-semibold`}>
                  {statusConfig.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(course.scheduled_date), "EEE d MMM • HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
            {course.devis && (
              <div className="text-right">
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {course.devis.amount.toFixed(0)}€
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">{course.devis.quote_number}</p>
              </div>
            )}
          </div>

          {/* Adresses avec ligne de connexion */}
          <div className="relative space-y-0 mb-4 pl-3">
            <div className="absolute left-0.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-green-500 via-muted to-red-500 rounded-full" />
            <div className="flex items-start gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 -ml-[5px] ring-2 ring-green-500/20" />
              <p className="text-sm text-foreground/90 leading-relaxed">{course.pickup_address}</p>
            </div>
            <div className="flex items-start gap-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 -ml-[5px] ring-2 ring-red-500/20" />
              <p className="text-sm text-foreground/90 leading-relaxed">{course.destination_address}</p>
            </div>
          </div>

          {/* Info chauffeur */}
          {course.driver && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 mb-4 border border-border/30">
              <button
                onClick={() => {
                  setSelectedDriverId(course.driver.id);
                  setDriverProfileOpen(true);
                }}
                className="cursor-pointer"
              >
                <Avatar className="h-11 w-11 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage src={course.driver.profile?.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    <Car className="w-5 h-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </button>
              <div 
                className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setSelectedDriverId(course.driver.id);
                  setDriverProfileOpen(true);
                }}
              >
                <p className="font-semibold truncate text-sm text-primary underline-offset-2 hover:underline">
                  {course.driver.profile?.full_name || course.driver.company_name || "Chauffeur"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  {course.driver.vehicle_brand} {course.driver.vehicle_model}
                  {course.driver.vehicle_color && (
                    <span className="text-muted-foreground/60">• {course.driver.vehicle_color}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-auto bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={() => {
                    setSelectedDriverId(course.driver.id);
                    setDriverProfileOpen(true);
                  }}
                >
                  <User className="w-4 h-4" />
                </Button>
                {/* Show phone button if driver allows it */}
                {course.driver.show_phone && course.driver.profile?.phone && (
                  <a 
                    href={`tel:${course.driver.profile.phone}`}
                    className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Info paiement différé pour courses terminées */}
          {course.status === "completed" && 
           course.companyCourse?.actual_payment_method === "company_will_pay" && 
           course.companyCourse?.client_confirmed_payment_method === "company_will_pay" && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700">
                    Paiement différé à l'entreprise
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Cette course a été remontée pour facturation à l'entreprise
                    {course.agreement && (
                      <span className="block mt-1">
                        Échéance: <strong>{getPaymentFrequencyLabel(course.agreement.payment_frequency)}</strong>
                        {course.agreement.payment_day && ` (jour ${course.agreement.payment_day})`}
                      </span>
                    )}
                  </p>
                </div>
                <Badge className="bg-blue-500/20 text-blue-700 border-0">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Entreprise
                </Badge>
              </div>
            </div>
          )}

          {/* Actions selon le statut */}
          <div className="flex flex-wrap gap-2">
            {/* Course sans devis - proposer de régénérer */}
            {course.status === "pending" && !course.devis && (
              <div className="w-full space-y-2">
                <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    En attente de génération du devis...
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRegenerateDevis(course.id)}
                  disabled={generatingDevisId === course.id}
                  className="w-full"
                >
                  {generatingDevisId === course.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {generatingDevisId === course.id ? "Génération..." : "Générer le devis"}
                </Button>
              </div>
            )}

            {/* Devis en attente de validation */}
            {course.status === "pending" && course.devis?.status === "pending" && (
              <>
                <Button 
                  onClick={() => handleAcceptDevis(course.devis!.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accepter le devis
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleRejectDevis(course.devis!.id)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
              </>
            )}

            {/* Course en attente du chauffeur */}
            {course.status === "pending" && course.devis?.status === "accepted" && (
              <div className="w-full p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Le chauffeur doit confirmer la course
                </p>
              </div>
            )}

            {/* Télécharger devis */}
            {course.devis && (
              <Button variant="outline" size="sm" onClick={() => handleDownloadDevis(course)}>
                <Download className="w-4 h-4 mr-2" />
                Devis
              </Button>
            )}

            {/* Télécharger facture (courses terminées avec facture) */}
            {course.facture && (course.status === "completed" || course.status === "accepted" || course.status === "in_progress") && (
              <Button variant="outline" size="sm" onClick={() => handleDownloadFacture(course)}>
                <Receipt className="w-4 h-4 mr-2" />
                Facture
              </Button>
            )}

            {/* Annuler (seulement si pending) */}
            {course.status === "pending" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCancelCourseId(course.id)}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header moderne - responsive */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-r from-card via-card to-card/80 border border-border/50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text truncate">
              Mes courses
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Gérez et suivez vos déplacements
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="rounded-xl border-border/50 hover:bg-muted/50 w-9 h-9 sm:w-10 sm:h-10"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {canCreateCourses && (
              <Button 
                onClick={onCreateCourse} 
                size="sm"
                className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 h-9 sm:h-10 px-3 sm:px-4"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouvelle course</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Pills modernes - Grille 3+2 en mobile, ligne en desktop */}
      <div className="space-y-2">
        {/* Première ligne: 3 boutons */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "pending"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "pending" ? "bg-white/20" : "bg-amber-500/20 text-amber-500"
              }`}>
                {totalPending}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold">Devis</span>
          </button>

          <button
            onClick={() => setActiveTab("awaiting")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "awaiting"
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "awaiting" ? "bg-white/20" : "bg-orange-500/20 text-orange-500"
              }`}>
                {awaitingDriver.length}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold">Attente</span>
          </button>

          <button
            onClick={() => setActiveTab("confirmed")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
              activeTab === "confirmed"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "confirmed" ? "bg-white/20" : "bg-green-500/20 text-green-500"
              }`}>
                {confirmedCourses.length}
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold">Confirmées</span>
          </button>
        </div>

        {/* Deuxième ligne: 2 boutons */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === "completed"
                ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Car className="w-4 h-4" />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "completed" ? "bg-white/20" : "bg-purple-500/20 text-purple-500"
              }`}>
                {completedCourses.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold">Terminées</span>
          </button>

          <button
            onClick={() => setActiveTab("cancelled")}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl font-medium text-xs transition-all ${
              activeTab === "cancelled"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "cancelled" ? "bg-white/20" : "bg-red-500/20 text-red-500"
              }`}>
                {cancelledCourses.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold">Annulées</span>
          </button>
        </div>

        {/* Version desktop pour les 2 derniers boutons (hidden en mobile) */}
        <div className="hidden sm:contents">
          <button
            onClick={() => setActiveTab("completed")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "completed"
                ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="text-xs font-semibold">Terminées</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "completed" ? "bg-white/20" : "bg-purple-500/20 text-purple-500"
            }`}>
              {completedCourses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("cancelled")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "cancelled"
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Annulées</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "cancelled" ? "bg-white/20" : "bg-red-500/20 text-red-500"
            }`}>
              {cancelledCourses.length}
            </span>
          </button>
        </div>
      </div>

      {/* Hidden Tabs for functionality */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden">
        <TabsList>
          <TabsTrigger value="pending">Devis</TabsTrigger>
          <TabsTrigger value="awaiting">En attente</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmées</TabsTrigger>
          <TabsTrigger value="completed">Terminées</TabsTrigger>
          <TabsTrigger value="cancelled">Annulées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content sections */}
      <div className="space-y-4">
        {/* Pending Quotes */}
        {activeTab === "pending" && (
          totalPending === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aucun devis en attente</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  {canCreateCourses 
                    ? "Réservez une course pour recevoir un devis automatique"
                    : "Les courses vous seront assignées par votre gestionnaire"
                  }
                </p>
                {canCreateCourses && (
                  <Button 
                    onClick={onCreateCourse}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Réserver une course
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Afficher d'abord les demandes en attente (company_course_requests) */}
              {pendingRequests.map(renderRequestCard)}
              {/* Puis les courses avec devis en attente */}
              {allPendingQuotes.map(renderCourseCard)}
            </div>
          )
        )}

        {/* Awaiting Driver */}
        {activeTab === "awaiting" && (
          awaitingDriver.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aucune course en attente</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Les courses acceptées par vous en attente de confirmation du chauffeur apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {awaitingDriver.map(renderCourseCard)}
            </div>
          )
        )}

        {/* Confirmed */}
        {activeTab === "confirmed" && (
          confirmedCourses.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aucune course confirmée</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Vos prochaines courses confirmées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {confirmedCourses.map(renderCourseCard)}
            </div>
          )
        )}

        {/* Completed */}
        {activeTab === "completed" && (
          completedCourses.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aucune course terminée</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Votre historique de courses apparaîtra ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedCourses.map(renderCourseCard)}
            </div>
          )
        )}

        {/* Cancelled */}
        {activeTab === "cancelled" && (
          cancelledCourses.length === 0 ? (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aucune course annulée</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Les courses annulées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {cancelledCourses.map(renderCourseCard)}
            </div>
          )
        )}
      </div>

      {/* Dialog annulation */}
      <AlertDialog open={!!cancelCourseId} onOpenChange={() => setCancelCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette course ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le chauffeur sera notifié de l'annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog profil chauffeur */}
      <DriverProfileDialog
        driverId={selectedDriverId}
        open={driverProfileOpen}
        onOpenChange={setDriverProfileOpen}
      />
    </div>
  );
}
