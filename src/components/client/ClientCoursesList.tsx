import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { checkDriverStripeStatus } from "@/hooks/useDriverStripeStatus";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { 
  MapPin, 
  Calendar, 
  Users, 
  XCircle, 
  MessageSquare, 
  Car, 
  Clock, 
  CheckCircle, 
  FileText,
  Download,
  Mail,
  Share2,
  Phone,
  AlertTriangle,
  CreditCard,
  Shield
} from "lucide-react";
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
import { CourseRating } from "@/components/CourseRating";
import CourseReportDialog from "@/components/CourseReportDialog";
import { SharedCoursePartnerInfo } from "./SharedCoursePartnerInfo";
import { GuestReservationWithCardHold } from "@/components/payment/GuestReservationWithCardHold";

interface ClientCoursesListProps {
  clientId: string;
  userId?: string;
  exclusiveDriverId?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  defaultTab?: string | null;
}

const COURSES_PAGE_SIZE = 20;

const ClientCoursesList = ({ clientId, userId, exclusiveDriverId, userEmail, userPhone, defaultTab }: ClientCoursesListProps) => {
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCounts, setTotalCounts] = useState({ pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);
  
  // État pour le signalement
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [courseToReport, setCourseToReport] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Card hold flow state
  const [cardHoldData, setCardHoldData] = useState<{
    courseId: string;
    driverId: string;
    amount: number;
    clientEmail?: string;
    clientName?: string;
  } | null>(null);

  // Auto-detect courses needing card hold
  useEffect(() => {
    if (courses.length > 0 && !cardHoldData) {
      const needsHold = courses.find(
        c => c.payment_status === 'bank_imprint_pending' && 
          c.card_hold_status !== 'confirmed' &&
          (c.status === 'accepted' || c.status === 'pending')
      );
      if (needsHold) {
        const autoOpen = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          setCardHoldData({
            courseId: needsHold.id,
            driverId: needsHold.driver_id,
            amount: needsHold.guest_estimated_price || needsHold.final_payment_amount || 45,
            clientEmail: user?.email || undefined,
            clientName: user?.user_metadata?.full_name || undefined,
          });
        };
        autoOpen();
      }
    }
  }, [courses]);

  useEffect(() => {
    fetchCourses(0);
    fetchTotalCounts();
    const cleanup = setupRealtimeSubscription();
    return () => { cleanup?.(); };
  }, [clientId]);
  
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const fetchCourses = async (pageNum: number = 0, append: boolean = false) => {
    try {
      const from = pageNum * COURSES_PAGE_SIZE;
      const to = from + COURSES_PAGE_SIZE - 1;

      // Query courses by client_id OR created_by_user_id for broader matching
      let query = supabase
        .from("courses")
        .select(`
          *,
          drivers(
            company_name,
            company_address,
            siret,
            vehicle_model,
            vehicle_brand,
            vehicle_color,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          devis(
            id,
            quote_number,
            amount,
            status,
            valid_until,
            discount_amount,
            promo_code
          ),
          factures(
            id,
            invoice_number,
            invoice_number_generated,
            amount,
            payment_status,
            payment_method
          )
        `)
        .order("scheduled_date", { ascending: false })
        .range(from, to);

      // Build comprehensive OR filter to match all possible course associations
      const orParts: string[] = [`client_id.eq.${clientId}`];
      if (userId) orParts.push(`created_by_user_id.eq.${userId}`);
      if (userEmail) orParts.push(`guest_email.ilike.${userEmail}`);
      if (userPhone) orParts.push(`guest_phone.eq.${userPhone}`);
      query = query.or(orParts.join(','));

      const { data, error } = await query;

      if (error) throw error;
      
      const newData = data || [];
      setHasMore(newData.length === COURSES_PAGE_SIZE);
      
      if (append) {
        setCourses(prev => [...prev, ...newData]);
      } else {
        setCourses(newData);
      }
      setPage(pageNum);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalCounts = async () => {
    if (!clientId) return;
    const orParts: string[] = [`client_id.eq.${clientId}`];
    if (userId) orParts.push(`created_by_user_id.eq.${userId}`);
    if (exclusiveDriverId) orParts.push(`driver_id.eq.${exclusiveDriverId}`);
    if (userEmail) orParts.push(`guest_email.ilike.${userEmail}`);
    if (userPhone) orParts.push(`guest_phone.eq.${userPhone}`);
    const orFilter = orParts.join(',');
    const applyFilter = (q: any) => q.or(orFilter);
    
    const [pendingRes, confirmedRes, completedRes, cancelledRes] = await Promise.all([
      applyFilter(supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "pending")),
      applyFilter(supabase.from("courses").select("*", { count: "exact", head: true }).in("status", ["accepted", "in_progress"])),
      applyFilter(supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "completed")),
      applyFilter(supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "cancelled")),
    ]);
    setTotalCounts({
      pending: pendingRes.count || 0,
      confirmed: confirmedRes.count || 0,
      completed: completedRes.count || 0,
      cancelled: cancelledRes.count || 0,
    });
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchCourses(page + 1, true);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!clientId) return () => {};

    return subscriptionManager.subscribe(
      `courses-client-${clientId}`,
      {
        table: "courses",
        event: "*",
        filter: `client_id=eq.${clientId}`,
        debounceMs: 1000
      },
      () => { fetchCourses(); fetchTotalCounts(); }
    );
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

  const getStatusBadge = (status: string, devis?: any) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      pending_driver: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-premium/10 text-premium border-premium/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };

    // Déterminer le bon label en fonction du statut du devis
    let displayStatus = status;
    let label = "";
    
    if (status === "pending") {
      // Vérifier si le devis a été accepté par le client
      if (devis?.status === "accepted") {
        // Client a accepté, en attente du chauffeur
        displayStatus = "pending_driver";
        label = "En attente de confirmation du chauffeur";
      } else if (devis?.status === "pending") {
        // Client doit accepter le devis
        label = "Devis en attente de votre acceptation";
      } else {
        label = "En attente de devis";
      }
    } else {
      const labels: Record<string, string> = {
        accepted: "Confirmée",
        in_progress: "En cours",
        completed: "Terminée",
        cancelled: "Annulée",
      };
      label = labels[status] || status;
    }

    return (
      <Badge variant="outline" className={styles[displayStatus as keyof typeof styles] || styles.pending}>
        {label}
      </Badge>
    );
  };

  const handleDownloadDevis = (devis: any, course: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête bleu
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("DEVIS", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 26, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Info chauffeur
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const rawDriverName = course.drivers?.profiles?.full_name || "N/A";
    const driverNameParts = rawDriverName.trim().split(/\s+/);
    const driverName = driverNameParts.length > 1 ? `${driverNameParts[0]} ${driverNameParts[driverNameParts.length - 1][0]?.toUpperCase()}.` : rawDriverName;
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (course.drivers?.company_name) {
      doc.text(course.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    // Détails course
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    doc.text(course.pickup_address, 45, yPos);
    yPos += 4;
    
    doc.text("Arrivée:", 20, yPos);
    doc.text(course.destination_address, 45, yPos);
    yPos += 4;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    // Prix simplifié pour le client - sans détails de tarification
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("MONTANT", 20, yPos);
    
    // Afficher uniquement distance et total TTC
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    if (course.distance_km) {
      doc.text("Distance", 20, yPos);
      doc.text(`${course.distance_km} km`, pageWidth - 20, yPos, { align: "right" });
      yPos += 6;
    }
    
    if (course.duration_minutes) {
      doc.text("Durée estimée", 20, yPos);
      doc.text(`~${course.duration_minutes} min`, pageWidth - 20, yPos, { align: "right" });
      yPos += 6;
    }
    
    yPos += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    yPos += 7;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${parseFloat(devis.amount).toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = (facture: any, course: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête vert pour facture payée, gris pour impayée
    const isPaid = facture.payment_status === 'paid';
    if (isPaid) {
      doc.setFillColor(34, 197, 94); // green
    } else {
      doc.setFillColor(148, 163, 184); // grey
    }
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Numéro: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 26, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    // Info chauffeur
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const rawDriverName2 = course.drivers?.profiles?.full_name || "N/A";
    const driverName2Parts = rawDriverName2.trim().split(/\s+/);
    const driverName = driverName2Parts.length > 1 ? `${driverName2Parts[0]} ${driverName2Parts[driverName2Parts.length - 1][0]?.toUpperCase()}.` : rawDriverName2;
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (course.drivers?.company_name) {
      doc.text(course.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    // Détails course
    yPos = 95;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.rect(15, yPos, pageWidth - 30, 40);
    
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 20, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text("Départ:", 20, yPos);
    doc.text(course.pickup_address, 45, yPos);
    yPos += 4;
    
    doc.text("Arrivée:", 20, yPos);
    doc.text(course.destination_address, 45, yPos);
    yPos += 4;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    // Montant
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("MONTANT", 20, yPos);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    if (isPaid) {
      doc.setFillColor(34, 197, 94);
    } else {
      doc.setFillColor(148, 163, 184);
    }
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${facture.amount.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
    toast.success("Facture téléchargée");
  };

  const handleShareDevis = (devis: any, course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Devis ${devis.quote_number}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${devis.amount.toFixed(2)}€`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const handleShareFacture = (facture: any, course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Facture ${facture.invoice_number_generated || facture.invoice_number}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${facture.amount.toFixed(2)}€`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const handleAcceptDevis = async (devisId: string, courseId: string) => {
    try {
      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Vous devez être connecté pour accepter un devis");
      }

      // Utiliser la fonction sécurisée avec verrou atomique
      const { data, error } = await supabase
        .rpc('accept_devis_safely', {
          _devis_id: devisId,
          _client_user_id: user.id
        });

      if (error) {
        console.error("Erreur RPC accept_devis_safely:", error);
        throw new Error("Erreur lors de l'acceptation du devis");
      }

      // La fonction retourne un tableau avec un seul résultat
      const result = data?.[0];
      
      if (!result?.success) {
        throw new Error(result?.message || "Échec de l'acceptation du devis");
      }

      // Vérifier si le chauffeur utilise Stripe Connect → empreinte bancaire requise
      const course = courses.find(c => c.id === courseId);
      const devis = course?.devis?.find((d: any) => d.id === devisId);
      
      if (course && devis) {
        const driverUsesStripe = await checkDriverStripeStatus(course.driver_id);

        if (driverUsesStripe && course.payment_method_requested === "card") {
          const secureAmount = Number.parseFloat(
            String(devis.amount ?? course.final_payment_amount ?? course.guest_estimated_price ?? 0)
          );

          if (!(secureAmount > 0)) {
            throw new Error("Montant TTC introuvable pour verrouiller la réservation");
          }

          const { error: lockError } = await supabase
            .from("courses")
            .update({
              payment_method: "stripe",
              payment_status: "bank_imprint_pending",
              card_hold_status: "pending",
              final_payment_amount: secureAmount,
            })
            .eq("id", courseId);

          if (lockError) {
            throw new Error("Impossible de verrouiller le paiement avant la réservation");
          }

          setCardHoldData({
            courseId,
            driverId: course.driver_id,
            amount: secureAmount,
            clientEmail: user.email || undefined,
            clientName: user.user_metadata?.full_name || undefined,
          });
          toast.info("Validez votre carte pour bloquer exactement le montant TTC de la course");
          await fetchCourses();
          return;
        }
      }

      toast.success(result.message);
      await fetchCourses();
    } catch (error: any) {
      console.error("Erreur acceptation devis:", error);
      toast.error(error.message || "Erreur lors de l'acceptation du devis");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des courses...</p>
      </div>
    );
  }

  // Filtrer les courses par statut
  const pendingCourses = courses.filter((c) => c.status === "pending");
  const confirmedCourses = courses.filter((c) => c.status === "accepted" || c.status === "in_progress");
  const completedCourses = courses.filter((c) => c.status === "completed");
  const cancelledCourses = courses.filter((c) => c.status === "cancelled");

  const renderCourseCard = (course: any) => {
    const devis = course.devis?.[0];
    const facture = course.factures?.[0];
    const driverPhone = course.drivers?.profiles?.phone;

    return (
      <Card key={course.id} className="p-6 hover:shadow-elegant transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {course.drivers?.profiles?.profile_photo_url ? (
              <img
                src={course.drivers.profiles.profile_photo_url}
                alt={course.drivers.profiles.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-bold">{(() => {
                const n = course.drivers?.profiles?.full_name || '';
                const p = n.trim().split(/\s+/);
                return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]?.toUpperCase()}.` : n;
              })()}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                {(() => {
                  // Affichage: modèle/marque en premier, couleur à la fin
                  const brand = course.drivers?.vehicle_brand;
                  const model = course.drivers?.vehicle_model;
                  const color = course.drivers?.vehicle_color;
                  const vehicleParts = [];
                  if (brand) vehicleParts.push(brand);
                  if (model && model !== brand) vehicleParts.push(model);
                  if (color) vehicleParts.push(color);
                  const vehicleDisplay = vehicleParts.join(' ');
                  return vehicleDisplay ? <span>{vehicleDisplay}</span> : null;
                })()}
                {course.course_number && (
                  <>
                    <span>•</span>
                    <span className="text-premium font-medium">{course.course_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {getStatusBadge(course.status, devis)}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-premium mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Départ</p>
              <p className="text-muted-foreground">{course.pickup_address}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Arrivée</p>
              <p className="text-muted-foreground">{course.destination_address}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                locale: fr,
              })}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {course.passengers_count} passager{course.passengers_count > 1 ? "s" : ""}
            </div>
          </div>

          {course.notes && (
            <div className="text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
              <p className="font-semibold text-destructive mb-1">Motif d'annulation :</p>
              <p className="text-foreground">{course.notes}</p>
            </div>
          )}
        </div>

        {/* Affichage du partenaire si course partagée */}
        <SharedCoursePartnerInfo courseId={course.id} userId={currentUserId} />

        {/* 🔒 BANNER: Carte non enregistrée — action requise */}
        {(course.payment_status === 'bank_imprint_pending' && 
          (course.status === 'accepted' || course.status === 'pending') &&
          course.card_hold_status !== 'confirmed') && (
          <div 
            className="p-3 bg-primary/10 border border-primary/30 rounded-lg mb-4 cursor-pointer hover:bg-primary/15 transition-colors"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              setCardHoldData({
                courseId: course.id,
                driverId: course.driver_id,
                amount: course.guest_estimated_price || course.final_payment_amount || 45,
                clientEmail: user?.email || undefined,
                clientName: user?.user_metadata?.full_name || undefined,
              });
            }}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">Enregistrez votre carte</p>
                <p className="text-xs text-muted-foreground">
                  Appuyez ici pour valider — une seule fois, puis tout sera automatique.
                </p>
              </div>
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
        )}

        {/* ✅ Carte validée — paiement automatique */}
        {course.card_hold_status === 'confirmed' && course.payment_method === 'stripe' && 
          (course.status === 'accepted' || course.status === 'in_progress') && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium">
                ✅ Carte validée • Le paiement se fera automatiquement à la fin de la course
              </p>
            </div>
          </div>
        )}

        {/* Afficher devis si disponible */}
        {devis && (
          <div className="p-3 bg-orange-500/10 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Devis {devis.quote_number}</span>
              <span className="text-2xl font-bold text-orange-500">{devis.amount.toFixed(2)}€</span>
            </div>
            
            {/* Bouton accepter pour devis pending dans la section En attente - TRÈS GRANDS */}
            {course.status === "pending" && devis.status === "pending" && (
              <div className="flex flex-col gap-4 mt-4">
                <Button
                  onClick={() => handleAcceptDevis(devis.id, course.id)}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg shadow-green-500/30 min-h-[60px] text-lg"
                  size="lg"
                >
                  <CheckCircle className="w-7 h-7 mr-3" />
                  Accepter le devis
                </Button>
                <Button
                  onClick={() => setCancelCourseId(course.id)}
                  variant="outline"
                  className="w-full border-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-[48px] text-base font-medium"
                  size="lg"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Refuser
                </Button>
              </div>
            )}

            {/* Message d'attente de confirmation du chauffeur */}
            {course.status === "pending" && devis.status === "accepted" && (
              <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-orange-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">En attente de confirmation</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous avez accepté ce devis. Le chauffeur doit maintenant confirmer sa disponibilité pour cette course.
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDevis(devis, course)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareDevis(devis, course, 'whatsapp')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareDevis(devis, course, 'email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        )}

        {/* Bouton de signalement */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCourseToReport(course);
            setReportDialogOpen(true);
          }}
          className="w-full mt-3 border-warning text-warning hover:bg-warning/10"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Signaler un problème
        </Button>

        {/* Afficher facture si disponible */}
        {facture && (
          <div className="p-3 bg-green-500/10 rounded-lg mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Facture {facture.invoice_number_generated || facture.invoice_number}</span>
              <span className="text-2xl font-bold text-green-500">{facture.amount.toFixed(2)}€</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadFacture(facture, course)}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareFacture(facture, course, 'whatsapp')}
                className="flex-1"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareFacture(facture, course, 'email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        )}

        {/* Rating section for completed courses */}
        {course.status === "completed" && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-3">Évaluer cette course :</p>
            <CourseRating
              courseId={course.id}
              currentRating={course.client_rating}
              onRatingSubmitted={fetchCourses}
            />
          </div>
        )}

        {course.status === "pending" && (
          <div className="flex gap-2 pt-4 border-t border-border">
            {driverPhone && (
              <Button
                onClick={() => window.open(`tel:${driverPhone}`, '_self')}
                variant="outline"
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-2" />
                Appeler
              </Button>
            )}
            <Button
              onClick={() => toast.info("Messagerie disponible dans l'onglet Messages")}
              variant="outline"
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacter
            </Button>
            <Button
              onClick={() => setCancelCourseId(course.id)}
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto p-2">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-500 flex-col md:flex-row gap-1 md:gap-2 h-auto py-2 md:py-3"
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs md:text-sm">En attente</span>
            <Badge className="bg-yellow-500/30 text-xs">{totalCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="confirmed"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 flex-col md:flex-row gap-1 md:gap-2 h-auto py-2 md:py-3"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs md:text-sm">Confirmée</span>
            <Badge className="bg-blue-500/30 text-xs">{totalCounts.confirmed}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500 flex-col md:flex-row gap-1 md:gap-2 h-auto py-2 md:py-3"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs md:text-sm">Terminée</span>
            <Badge className="bg-green-500/30 text-xs">{totalCounts.completed}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="cancelled"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500 flex-col md:flex-row gap-1 md:gap-2 h-auto py-2 md:py-3"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-xs md:text-sm">Refusé</span>
            <Badge className="bg-red-500/30 text-xs">{totalCounts.cancelled}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course en attente</h3>
              <p className="text-muted-foreground">
                Vos demandes de courses apparaîtront ici
              </p>
            </Card>
          ) : (
            pendingCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4 mt-6">
          {confirmedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course confirmée</h3>
              <p className="text-muted-foreground">
                Vos courses confirmées apparaîtront ici
              </p>
            </Card>
          ) : (
            confirmedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course terminée</h3>
              <p className="text-muted-foreground">
                Vos courses terminées apparaîtront ici
              </p>
            </Card>
          ) : (
            completedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4 mt-6">
          {cancelledCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course annulée</h3>
              <p className="text-muted-foreground">
                Vos courses annulées apparaîtront ici
              </p>
            </Card>
          ) : (
            cancelledCourses.map(renderCourseCard)
          )}
        </TabsContent>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={loadMore} disabled={loading}>
              Charger plus de courses
            </Button>
          </div>
        )}
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelCourseId} onOpenChange={(open) => !open && setCancelCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette course ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera définitivement votre réservation. Le chauffeur en sera informé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      {courseToReport && (
        <CourseReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          courseId={courseToReport.id}
          reportedAgainstUserId={courseToReport.drivers?.user_id}
          isDriver={false}
          currentUserId={currentUserId}
        />
      )}

      {/* Card Hold Dialog - Paiement sécurisé */}
      <Dialog open={!!cardHoldData} onOpenChange={(open) => !open && setCardHoldData(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Paiement sécurisé
            </DialogTitle>
            <DialogDescription>
              Enregistrez votre carte pour valider cette réservation. Les paiements suivants seront automatiques.
            </DialogDescription>
          </DialogHeader>
          {cardHoldData && (
            <GuestReservationWithCardHold
              driverId={cardHoldData.driverId}
              courseId={cardHoldData.courseId}
              clientEmail={cardHoldData.clientEmail}
              clientName={cardHoldData.clientName}
              estimatedAmount={cardHoldData.amount}
              trackingToken=""
              onComplete={() => {
                setCardHoldData(null);
                toast.success("✅ Carte validée ! Paiement automatique à la fin de la course.");
                fetchCourses();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientCoursesList;
