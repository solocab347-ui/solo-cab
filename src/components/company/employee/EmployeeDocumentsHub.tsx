import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  MapPin, 
  Calendar, 
  Euro, 
  CheckCircle, 
  Clock, 
  XCircle,
  RefreshCw,
  Car
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeDocumentsHubProps {
  employeeId: string;
  companyId: string;
  companyName: string;
}

interface DevisData {
  id: string;
  quote_number: string;
  amount: number;
  status: string;
  valid_until: string;
  created_at: string;
  base_price: number;
  distance_price: number;
  time_price: number | null;
  evening_surcharge_amount: number | null;
  weekend_surcharge_amount: number | null;
  discount_amount: number | null;
  promo_code: string | null;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    distance_km: number | null;
    duration_minutes: number | null;
  };
  driver: {
    id: string;
    company_name: string | null;
    company_address: string | null;
    siret: string | null;
    siren: string | null;
    tva_number: string | null;
    profile: {
      full_name: string | null;
      phone: string | null;
      profile_photo_url: string | null;
    } | null;
  };
  company: {
    id: string;
    company_name: string;
    siret: string;
    siren: string | null;
    tva_number: string | null;
    address: string;
    billing_address: string | null;
    contact_email: string;
    contact_phone: string | null;
  } | null;
  employee: {
    id: string;
    user_name: string | null;
    phone: string | null;
  } | null;
}

interface FactureData {
  id: string;
  invoice_number: string;
  invoice_number_generated: string | null;
  amount: number;
  payment_status: string;
  created_at: string;
  course: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    distance_km: number | null;
  };
  driver: {
    id: string;
    company_name: string | null;
    company_address: string | null;
    siret: string | null;
    siren: string | null;
    tva_number: string | null;
    profile: {
      full_name: string | null;
      phone: string | null;
    } | null;
  };
  company: {
    id: string;
    company_name: string;
    siret: string;
    siren: string | null;
    tva_number: string | null;
    address: string;
    billing_address: string | null;
    contact_email: string;
    contact_phone: string | null;
  } | null;
}

export const EmployeeDocumentsHub = ({ 
  employeeId, 
  companyId, 
  companyName 
}: EmployeeDocumentsHubProps) => {
  const [activeTab, setActiveTab] = useState("devis");
  const [devisList, setDevisList] = useState<DevisData[]>([]);
  const [facturesList, setFacturesList] = useState<FactureData[]>([]);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEmployeeName();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [employeeId, companyId]);

  const fetchEmployeeName = async () => {
    try {
      // Use RPC function to bypass RLS restrictions
      const { data } = await supabase.rpc('get_employee_profile_for_course', { 
        p_employee_id: employeeId 
      });
      
      if (data && data.length > 0) {
        setEmployeeName(data[0].full_name || null);
      }
    } catch (error) {
      console.error("[EmployeeDocumentsHub] Error fetching employee name:", error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch company info
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, company_name, siret, siren, tva_number, address, billing_address, contact_email, contact_phone")
        .eq("id", companyId)
        .maybeSingle();

      // Fetch devis for this employee
      const { data: devisData, error: devisError } = await supabase
        .from("devis")
        .select(`
          id,
          quote_number,
          amount,
          status,
          valid_until,
          created_at,
          base_price,
          distance_price,
          time_price,
          evening_surcharge_amount,
          weekend_surcharge_amount,
          discount_amount,
          promo_code,
          course_id,
          driver_id
        `)
        .eq("company_employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (devisError) {
        console.error("[EmployeeDocumentsHub] Devis error:", devisError);
      }

      // Enrich devis with course and driver info
      const enrichedDevis: DevisData[] = [];
      for (const devis of devisData || []) {
        // Fetch course
        const { data: course } = await supabase
          .from("courses")
          .select("id, pickup_address, destination_address, scheduled_date, distance_km, duration_minutes")
          .eq("id", devis.course_id)
          .maybeSingle();

        // Fetch driver with profile
        const { data: driver } = await supabase
          .from("drivers")
          .select("id, company_name, company_address, siret, siren, tva_number, user_id")
          .eq("id", devis.driver_id)
          .maybeSingle();

        let driverProfile = null;
        if (driver?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone, profile_photo_url")
            .eq("id", driver.user_id)
            .maybeSingle();
          driverProfile = profile;
        }

        enrichedDevis.push({
          ...devis,
          course: course as any,
          driver: {
            ...driver,
            profile: driverProfile
          } as any,
          company: companyData as any,
          employee: {
            id: employeeId,
            user_name: employeeName,
            phone: null
          }
        });
      }

      setDevisList(enrichedDevis);

      // Fetch factures - get course IDs for this employee first
      const { data: employeeCourses } = await supabase
        .from("company_courses")
        .select("course_id")
        .eq("employee_id", employeeId);

      if (employeeCourses && employeeCourses.length > 0) {
        const courseIds = employeeCourses.map(c => c.course_id);

        const { data: facturesData, error: facturesError } = await supabase
          .from("factures")
          .select(`
            id,
            invoice_number,
            invoice_number_generated,
            amount,
            payment_status,
            created_at,
            course_id,
            driver_id
          `)
          .in("course_id", courseIds)
          .order("created_at", { ascending: false });

        if (facturesError) {
          console.error("[EmployeeDocumentsHub] Factures error:", facturesError);
        }

        // Enrich factures
        const enrichedFactures: FactureData[] = [];
        for (const facture of facturesData || []) {
          const { data: course } = await supabase
            .from("courses")
            .select("id, pickup_address, destination_address, scheduled_date, distance_km")
            .eq("id", facture.course_id)
            .maybeSingle();

          const { data: driver } = await supabase
            .from("drivers")
            .select("id, company_name, company_address, siret, siren, tva_number, user_id")
            .eq("id", facture.driver_id)
            .maybeSingle();

          let driverProfile = null;
          if (driver?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("id", driver.user_id)
              .maybeSingle();
            driverProfile = profile;
          }

          enrichedFactures.push({
            ...facture,
            course: course as any,
            driver: {
              ...driver,
              profile: driverProfile
            } as any,
            company: companyData as any
          });
        }

        setFacturesList(enrichedFactures);
      }
    } catch (error: any) {
      console.error("[EmployeeDocumentsHub] Error:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const unsubDevis = subscriptionManager.subscribe(
      `employee-devis-${employeeId}`,
      { table: "devis", event: "*", debounceMs: 1000 },
      () => fetchData()
    );

    const unsubFactures = subscriptionManager.subscribe(
      `employee-factures-${employeeId}`,
      { table: "factures", event: "*", debounceMs: 1000 },
      () => fetchData()
    );

    return () => {
      unsubDevis?.();
      unsubFactures?.();
    };
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Generate professional devis PDF
  const handleDownloadDevis = (devis: DevisData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header with blue background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side) - ÉMETTEUR
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const driverName = devis.driver?.profile?.full_name || devis.driver?.company_name || "N/A";
    doc.text(driverName, 20, 71);
    
    let infoY = 76;
    if (devis.driver?.company_name && devis.driver.company_name !== driverName) {
      doc.text(devis.driver.company_name, 20, infoY);
      infoY += 4;
    }
    if (devis.driver?.siret) {
      doc.text(`SIRET: ${devis.driver.siret}`, 20, infoY);
      infoY += 4;
    } else if (devis.driver?.siren) {
      doc.text(`SIREN: ${devis.driver.siren}`, 20, infoY);
      infoY += 4;
    }
    if (devis.driver?.tva_number) {
      doc.text(`TVA: ${devis.driver.tva_number}`, 20, infoY);
      infoY += 4;
    }
    if (devis.driver?.profile?.phone) {
      doc.text(`Tél: ${devis.driver.profile.phone}`, 20, infoY);
      infoY += 4;
    }
    if (devis.driver?.company_address) {
      const addressLines = doc.splitTextToSize(devis.driver.company_address, 75);
      doc.text(addressLines, 20, infoY);
    }

    // Company info (right side) - DESTINATAIRE
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("ENTREPRISE", pageWidth - 20, 65, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    doc.text(devis.company?.company_name || companyName, pageWidth - 20, 71, { align: 'right' });
    
    let companyInfoY = 76;
    if (devis.company?.siret) {
      doc.text(`SIRET: ${devis.company.siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    } else if (devis.company?.siren) {
      doc.text(`SIREN: ${devis.company.siren}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    if (devis.company?.tva_number) {
      doc.text(`TVA: ${devis.company.tva_number}`, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }
    const companyAddress = devis.company?.billing_address || devis.company?.address;
    if (companyAddress) {
      const addressLines = doc.splitTextToSize(companyAddress, 75);
      addressLines.forEach((line: string, index: number) => {
        doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
      });
      companyInfoY += addressLines.length * 4;
    }
    if (devis.company?.contact_email) {
      doc.text(devis.company.contact_email, pageWidth - 20, companyInfoY, { align: 'right' });
      companyInfoY += 4;
    }

    // Collaborateur info
    companyInfoY += 3;
    doc.setFont(undefined, 'bold');
    doc.text("COLLABORATEUR", pageWidth - 20, companyInfoY, { align: 'right' });
    doc.setFont(undefined, 'normal');
    companyInfoY += 5;
    doc.text(employeeName || "Collaborateur", pageWidth - 20, companyInfoY, { align: 'right' });

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 115, 170, 50);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 123);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(devis.course?.pickup_address || "N/A", 140);
    const destLines = doc.splitTextToSize(devis.course?.destination_address || "N/A", 140);
    
    doc.text("Départ:", 25, 131);
    doc.text(pickupLines, 50, 131);
    
    let currentY = 131 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    if (devis.course?.scheduled_date) {
      doc.text(`Date: ${format(new Date(devis.course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    }
    if (devis.course?.distance_km) {
      doc.text(`Distance: ${devis.course.distance_km} km`, 105, currentY);
    }

    // Pricing - simplified for client view
    let yPos = 180;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const subtotal = (devis.base_price || 0) + (devis.distance_price || 0) + (devis.time_price || 0);
    const tvaRate = (devis.time_price && devis.time_price > 0) ? 20 : 10;
    const tvaAmount = subtotal * (tvaRate / 100);

    doc.setFillColor(41, 128, 185);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("Description", 25, yPos + 5.5);
    doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
    
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos, 170, 7, 'F');
    doc.text("Sous-total HT", 25, yPos + 5);
    doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    
    yPos += 7;
    
    // Show discount if applicable
    if (devis.promo_code && devis.discount_amount && devis.discount_amount > 0) {
      doc.setTextColor(46, 125, 50);
      doc.text(`Réduction (${devis.promo_code})`, 25, yPos + 5);
      doc.text(`-${devis.discount_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      yPos += 7;
      doc.setTextColor(0, 0, 0);
    }
    
    doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
    doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
    
    yPos += 9;
    doc.setFillColor(41, 128, 185);
    doc.rect(20, yPos, 170, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text("TOTAL TTC", 25, yPos + 6);
    doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });

    // Validity
    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  // Generate professional facture PDF
  const handleDownloadFacture = (facture: FactureData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const isPaid = facture.payment_status === 'paid';
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(234, 179, 8);
    }
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`N° ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 26, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 32, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Driver (ÉMETTEUR - left side)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("ÉMETTEUR", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = facture.driver?.profile?.full_name || facture.driver?.company_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (facture.driver?.company_name && facture.driver.company_name !== driverName) {
      doc.text(facture.driver.company_name, 20, yPos);
      yPos += 4;
    }
    
    if (facture.driver?.siret) {
      doc.text(`SIRET: ${facture.driver.siret}`, 20, yPos);
      yPos += 4;
    } else if (facture.driver?.siren) {
      doc.text(`SIREN: ${facture.driver.siren}`, 20, yPos);
      yPos += 4;
    }
    
    if (facture.driver?.tva_number) {
      doc.text(`TVA: ${facture.driver.tva_number}`, 20, yPos);
      yPos += 4;
    }
    
    if (facture.driver?.profile?.phone) {
      doc.text(`Tél: ${facture.driver.profile.phone}`, 20, yPos);
      yPos += 4;
    }
    
    if (facture.driver?.company_address) {
      const addressLines = doc.splitTextToSize(facture.driver.company_address, 75);
      doc.text(addressLines, 20, yPos);
    }
    
    // Company (DESTINATAIRE - right side)
    let rightYPos = 50;
    doc.setFont(undefined, 'bold');
    doc.text("DESTINATAIRE", pageWidth - 80, rightYPos);
    doc.setFont(undefined, 'normal');
    rightYPos += 5;
    
    doc.text(facture.company?.company_name || companyName, pageWidth - 80, rightYPos);
    rightYPos += 4;
    
    if (facture.company?.siret) {
      doc.text(`SIRET: ${facture.company.siret}`, pageWidth - 80, rightYPos);
      rightYPos += 4;
    } else if (facture.company?.siren) {
      doc.text(`SIREN: ${facture.company.siren}`, pageWidth - 80, rightYPos);
      rightYPos += 4;
    }
    
    if (facture.company?.tva_number) {
      doc.text(`TVA: ${facture.company.tva_number}`, pageWidth - 80, rightYPos);
      rightYPos += 4;
    }
    
    if (facture.company?.contact_phone) {
      doc.text(`Tél: ${facture.company.contact_phone}`, pageWidth - 80, rightYPos);
      rightYPos += 4;
    }
    
    const companyAddress = facture.company?.billing_address || facture.company?.address;
    if (companyAddress) {
      const addressLines = doc.splitTextToSize(companyAddress, 75);
      doc.text(addressLines, pageWidth - 80, rightYPos);
      rightYPos += addressLines.length * 4;
    }

    // Collaborateur
    rightYPos += 3;
    doc.setFont(undefined, 'bold');
    doc.text("COLLABORATEUR", pageWidth - 80, rightYPos);
    doc.setFont(undefined, 'normal');
    rightYPos += 5;
    doc.text(employeeName || "Collaborateur", pageWidth - 80, rightYPos);
    
    // Course details
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    const pickupLines = doc.splitTextToSize(facture.course?.pickup_address || "N/A", pageWidth - 55);
    doc.text(pickupLines, 45, yPos);
    yPos += 4 * pickupLines.length;
    
    doc.text("Arrivée:", 20, yPos);
    const destLines = doc.splitTextToSize(facture.course?.destination_address || "N/A", pageWidth - 55);
    doc.text(destLines, 45, yPos);
    yPos += 4 * destLines.length + 1;
    
    doc.text("Date:", 20, yPos);
    if (facture.course?.scheduled_date) {
      doc.text(format(new Date(facture.course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    }
    
    // Amount
    yPos = 155;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(234, 179, 8);
    }
    doc.rect(15, yPos - 3, pageWidth - 30, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 3);
    doc.text(`${facture.amount.toFixed(2)} €`, pageWidth - 20, yPos + 3, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Payment status
    yPos += 20;
    doc.setFontSize(10);
    doc.text(`Statut: ${isPaid ? 'PAYÉE' : 'EN ATTENTE DE PAIEMENT'}`, 20, yPos);
    
    // Footer
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });
    
    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
    toast.success("Facture téléchargée");
  };

  const getDevisStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();
    
    if (isExpired && status === "pending") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <Clock className="w-3 h-3 mr-1" />
          Expiré
        </Badge>
      );
    }

    const configs: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
      pending: { 
        className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", 
        label: "En attente",
        icon: <Clock className="w-3 h-3 mr-1" />
      },
      accepted: { 
        className: "bg-green-500/10 text-green-500 border-green-500/20", 
        label: "Accepté",
        icon: <CheckCircle className="w-3 h-3 mr-1" />
      },
      rejected: { 
        className: "bg-destructive/10 text-destructive border-destructive/20", 
        label: "Refusé",
        icon: <XCircle className="w-3 h-3 mr-1" />
      },
    };

    const config = configs[status] || configs.pending;

    return (
      <Badge variant="outline" className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getFactureStatusBadge = (status: string) => {
    if (status === "paid") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Payée
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
        <Clock className="w-3 h-3 mr-1" />
        En attente
      </Badge>
    );
  };

  // Categorize devis
  const pendingDevis = devisList.filter(d => d.status === "pending" && new Date(d.valid_until) > new Date());
  const acceptedDevis = devisList.filter(d => d.status === "accepted");
  const rejectedDevis = devisList.filter(d => d.status === "rejected" || (d.status === "pending" && new Date(d.valid_until) < new Date()));

  // Categorize factures
  const pendingFactures = facturesList.filter(f => f.payment_status !== "paid");
  const paidFactures = facturesList.filter(f => f.payment_status === "paid");

  const totalDevis = devisList.length;
  const totalFactures = facturesList.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mes documents</h2>
          <p className="text-sm text-muted-foreground">
            Devis et factures liés à vos courses
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Devis</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalDevis}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">En attente</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingDevis.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Factures payées</span>
            </div>
            <p className="text-2xl font-bold mt-1">{paidFactures.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-accent">
              <Euro className="w-4 h-4" />
              <span className="text-sm font-medium">Total facturé</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {facturesList.reduce((sum, f) => sum + f.amount, 0).toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs: Devis / Factures */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devis">
            Devis ({totalDevis})
          </TabsTrigger>
          <TabsTrigger value="factures">
            Factures ({totalFactures})
          </TabsTrigger>
        </TabsList>

        {/* DEVIS TAB */}
        <TabsContent value="devis" className="space-y-4">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                En attente ({pendingDevis.length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Acceptés ({acceptedDevis.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Refusés ({rejectedDevis.length})
              </TabsTrigger>
            </TabsList>

            {[
              { key: "pending", data: pendingDevis },
              { key: "accepted", data: acceptedDevis },
              { key: "rejected", data: rejectedDevis }
            ].map(({ key, data }) => (
              <TabsContent key={key} value={key}>
                {data.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">Aucun devis</h3>
                      <p className="text-sm text-muted-foreground">
                        {key === "pending" && "Aucun devis en attente de validation."}
                        {key === "accepted" && "Aucun devis accepté."}
                        {key === "rejected" && "Aucun devis refusé ou expiré."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {data.map((devis) => (
                      <Card key={devis.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <FileText className="w-5 h-5 text-primary" />
                                <span className="font-medium">{devis.quote_number}</span>
                                {getDevisStatusBadge(devis.status, devis.valid_until)}
                              </div>

                              <div className="grid gap-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="font-medium">{devis.course?.pickup_address}</p>
                                    <p className="text-muted-foreground">→ {devis.course?.destination_address}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span>
                                    {devis.course?.scheduled_date && format(
                                      new Date(devis.course.scheduled_date), 
                                      "d MMMM yyyy 'à' HH:mm", 
                                      { locale: fr }
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Driver info */}
                              <div className="flex items-center gap-3 pt-2 border-t">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={devis.driver?.profile?.profile_photo_url || undefined} />
                                  <AvatarFallback>
                                    <Car className="w-4 h-4" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {devis.driver?.profile?.full_name || devis.driver?.company_name || "Chauffeur"}
                                  </p>
                                  {devis.driver?.company_name && (
                                    <p className="text-muted-foreground text-xs">
                                      {devis.driver.company_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold">{devis.amount.toFixed(2)} €</p>
                                <p className="text-xs text-muted-foreground">
                                  Créé le {format(new Date(devis.created_at), "d MMM yyyy", { locale: fr })}
                                </p>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadDevis(devis)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* FACTURES TAB */}
        <TabsContent value="factures" className="space-y-4">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                En attente ({pendingFactures.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                Payées ({paidFactures.length})
              </TabsTrigger>
            </TabsList>

            {[
              { key: "pending", data: pendingFactures },
              { key: "paid", data: paidFactures }
            ].map(({ key, data }) => (
              <TabsContent key={key} value={key}>
                {data.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">Aucune facture</h3>
                      <p className="text-sm text-muted-foreground">
                        {key === "pending" && "Aucune facture en attente de paiement."}
                        {key === "paid" && "Aucune facture payée."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {data.map((facture) => (
                      <Card key={facture.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <FileText className="w-5 h-5 text-green-600" />
                                <span className="font-medium">
                                  {facture.invoice_number_generated || facture.invoice_number}
                                </span>
                                {getFactureStatusBadge(facture.payment_status)}
                              </div>

                              <div className="grid gap-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="font-medium">{facture.course?.pickup_address}</p>
                                    <p className="text-muted-foreground">→ {facture.course?.destination_address}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span>
                                    {facture.course?.scheduled_date && format(
                                      new Date(facture.course.scheduled_date), 
                                      "d MMMM yyyy 'à' HH:mm", 
                                      { locale: fr }
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Driver info */}
                              <div className="flex items-center gap-2 pt-2 border-t text-sm">
                                <Car className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Chauffeur:</span>
                                <span className="font-medium">
                                  {facture.driver?.profile?.full_name || facture.driver?.company_name}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold">{facture.amount.toFixed(2)} €</p>
                                <p className="text-xs text-muted-foreground">
                                  Émise le {format(new Date(facture.created_at), "d MMM yyyy", { locale: fr })}
                                </p>
                              </div>

                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadFacture(facture)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};
