import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, FileText, Play, StopCircle, Download, Share2, MessageCircle, Mail, Filter, X, AlertTriangle, Navigation, Handshake } from "lucide-react";
import { CourseNavigationButtons } from "@/components/course/CourseNavigationButtons";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import CourseShareButtons from "@/components/CourseShareButtons";
import CourseReportDialog from "@/components/CourseReportDialog";
import { ShareCourseWithPartnerDialog } from "@/components/driver/ShareCourseWithPartnerDialog";
import { cn } from "@/lib/utils";
import { usePaginatedData } from "@/hooks/usePaginatedQuery";
import Pagination from "@/components/Pagination";
import { notificationService } from "@/lib/notificationService";

interface CoursesListProps {
  driverId: string;
}

const isDriver = true; // Assuming this is driver dashboard

const CoursesList = ({ driverId }: CoursesListProps) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [courseToReject, setCourseToReject] = useState<string | null>(null);
  
  // États pour les filtres avancés
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // État pour le signalement
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [courseToReport, setCourseToReport] = useState<any>(null);
  
  // État pour le partage avec partenaire
  const [sharePartnerDialogOpen, setSharePartnerDialogOpen] = useState(false);
  const [courseToShareWithPartner, setCourseToShareWithPartner] = useState<any>(null);
  
  // SYSTÈME DE FIGEMENT: Capture l'ordre initial des courses pour maintenir leur position
  const [confirmedCoursesOrder, setConfirmedCoursesOrder] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchCourses();
    // Désactivation de la souscription temps réel pour éviter que les courses bougent automatiquement
    // setupRealtimeSubscription();
  }, [driverId]);

  // SYSTÈME DE FIGEMENT: Capture l'ordre initial quand les courses changent
  useEffect(() => {
    const confirmed = courses.filter(c => c.status === "accepted" || c.status === "in_progress");
    const sorted = [...confirmed].sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
    
    const newOrder = new Map<string, number>();
    sorted.forEach((course, index) => {
      // Si la course n'a pas encore d'ordre assigné, on lui donne son index actuel
      if (!confirmedCoursesOrder.has(course.id)) {
        newOrder.set(course.id, index);
      } else {
        // Sinon on garde son ordre existant
        newOrder.set(course.id, confirmedCoursesOrder.get(course.id)!);
      }
    });
    
    setConfirmedCoursesOrder(newOrder);
  }, [courses.length]); // Seulement quand le nombre de courses change (ajout/suppression)

  const fetchCourses = async () => {
    try {
      // Fetch driver info for PDF generation
      const { data: driverData } = await supabase
        .from("drivers")
        .select(`
          *,
          profiles:user_id(full_name, phone)
        `)
        .eq("id", driverId)
        .single();
      
      setDriverInfo(driverData);

      const { data: coursesData, error } = await supabase
        .from("courses")
        .select(`
          *,
          clients!inner(
            user_id,
            is_exclusive,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          devis:devis(
            id,
            amount,
            status,
            quote_number,
            valid_until,
            base_price,
            distance_price,
            time_price,
            evening_surcharge_amount,
            weekend_surcharge_amount,
            discount_amount,
            promo_code,
            created_at
          ),
          factures:factures(
            id,
            invoice_number,
            invoice_number_generated,
            amount,
            payment_status,
            payment_method,
            paid_at,
            discount_amount,
            promo_code,
            created_at
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setCourses(coursesData || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!driverId) return () => {};

    return subscriptionManager.subscribe(
      `courses-driver-${driverId}`,
      {
        table: "courses",
        event: "*",
        filter: `driver_id=eq.${driverId}`,
        debounceMs: 1000
      },
      () => {
        fetchCourses();
      }
    );
  };

  const handleAcceptCourse = async (courseId: string) => {
    try {
      // Optimistic update - keep course in place
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "accepted" as const } : c
      ));

      // Récupérer les infos du client pour la notification
      const course = courses.find(c => c.id === courseId);

      // Chauffeur accepte une course créée par le client
      const { error } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (error) throw error;

      // Notifier le client que la course est acceptée
      if (course?.clients?.user_id && driverInfo) {
        const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || 'Votre chauffeur';
        await notificationService.notifyCourseAccepted(course.clients.user_id, driverName);
      }

      toast.success("Course acceptée et confirmée !");
      
      // Ne PAS recharger pour garder la course à sa place
      // await fetchCourses();
    } catch (error: any) {
      console.error("Error accepting course:", error);
      toast.error("Erreur lors de l'acceptation de la course");
      // Revert on error
      await fetchCourses();
    }
  };

  const handleStartCourse = async (courseId: string) => {
    try {
      // SÉCURITÉ: Mise à jour optimiste SANS re-fetch pour maintenir la position
      // La course reste exactement à sa position même si son statut change
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "in_progress" as const } : c
      ));

      // Récupérer les infos du client pour la notification
      const course = courses.find(c => c.id === courseId);

      const { error } = await supabase
        .from("courses")
        .update({ status: "in_progress" })
        .eq("id", courseId);

      if (error) throw error;

      // Notifier le client que la course a démarré
      if (course?.clients?.user_id && driverInfo) {
        const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || 'Votre chauffeur';
        await notificationService.notifyCourseStarted(course.clients.user_id, driverName);
      }

      toast.success("Course commencée !");
    } catch (error: any) {
      console.error("Error starting course:", error);
      toast.error("Erreur lors du démarrage de la course");
      // En cas d'erreur, revenir au statut précédent SANS changer la position
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "accepted" as const } : c
      ));
    }
  };

  const handleEndCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setShowPaymentDialog(true);
  };

  const handleCompleteCourse = async () => {
    if (!selectedCourseId || !paymentMethod) {
      toast.error("Veuillez sélectionner un moyen de paiement");
      return;
    }

    try {
      // Optimistic update - keep course in place
      setCourses(prev => prev.map(c => 
        c.id === selectedCourseId ? { ...c, status: "completed" as const } : c
      ));

      // Update course status to completed
      const { error: courseError } = await supabase
        .from("courses")
        .update({ status: "completed" })
        .eq("id", selectedCourseId);

      if (courseError) throw courseError;

      // First, get the course to find the most recent devis
      const { data: courseData } = await supabase
        .from("courses")
        .select("*, devis(*), clients(user_id)")
        .eq("id", selectedCourseId)
        .single();

      // Accept the most recent devis if not already accepted
      if (courseData?.devis && courseData.devis.length > 0) {
        const mostRecentDevis = courseData.devis.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        if (mostRecentDevis.status !== "accepted") {
          await supabase
            .from("devis")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", mostRecentDevis.id);
        }
      }

      // Generate facture automatically
      const { data, error: factureError } = await supabase.functions.invoke("create-facture-auto", {
        body: {
          course_id: selectedCourseId,
          payment_method: paymentMethod
        }
      });

      if (factureError) throw factureError;

      // Notifier le client que la course est terminée
      if (courseData?.clients?.user_id) {
        await notificationService.notifyCourseCompleted(courseData.clients.user_id);
      }

      toast.success("Course terminée ! Facture générée automatiquement.");
      setShowPaymentDialog(false);
      setPaymentMethod("");
      
      // Ne PAS recharger pour garder la course à sa place
      // await fetchCourses();
    } catch (error: any) {
      console.error("Error completing course:", error);
      toast.error("Erreur lors de la finalisation: " + error.message);
      // Revert on error
      await fetchCourses();
    }
  };

  const handleCancelCourse = (courseId: string) => {
    setCourseToReject(courseId);
    setRejectDialogOpen(true);
  };

  const handleRejectCourse = async () => {
    if (!courseToReject) return;

    const finalReason = rejectionReason === "custom" ? customReason : rejectionReason;
    
    if (!finalReason) {
      toast.error("Veuillez sélectionner ou saisir un motif");
      return;
    }

    try {
      // Récupérer les infos du client pour la notification
      const course = courses.find(c => c.id === courseToReject);

      // Optimistic update - keep course in place
      setCourses(prev => prev.map(c => 
        c.id === courseToReject 
          ? { 
              ...c, 
              status: "cancelled" as const,
              notes: `Motif de refus: ${finalReason}\n\n${c.notes || ''}`
            } 
          : c
      ));

      const { error } = await supabase
        .from("courses")
        .update({ 
          status: "cancelled",
          notes: `Motif de refus: ${finalReason}\n\n${courses.find(c => c.id === courseToReject)?.notes || ''}`
        })
        .eq("id", courseToReject);

      if (error) throw error;

      // Notifier le client que la course est refusée
      if (course?.clients?.user_id && driverInfo) {
        const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || 'Votre chauffeur';
        await notificationService.notifyCourseRejected(course.clients.user_id, driverName);
      }

      toast.success("Course annulée");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setCustomReason("");
      setCourseToReject(null);
      
      // Ne PAS recharger pour garder la course à sa place
      // fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      toast.error("Erreur lors de l'annulation");
      // Revert on error
      await fetchCourses();
    }
  };

  const handleShareDevis = (course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const devis = course.devis?.[0];
    if (!devis) {
      toast.error("Aucun devis disponible");
      return;
    }

    const message = `Devis ${devis.quote_number} - ${course.clients?.profiles?.full_name}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${devis.amount.toFixed(2)}€\n` +
                   `Valable jusqu'au: ${format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}`;

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

  const handleDownloadDevis = async (course: any, forClient: boolean = false) => {
    const devis = course.devis?.[0];
    if (!devis || !driverInfo) {
      toast.error("Informations incomplètes pour générer le PDF");
      return;
    }

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header with blue background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, 81);
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, 81);
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", 145, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(course.clients?.profiles?.full_name || "N/A", 145, 71);

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${course.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${course.distance_km} km`, 105, currentY + 5);

    // Pricing table
    let yPos = 180;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const subtotal = (devis.base_price || 0) + (devis.distance_price || 0) + (devis.time_price || 0);
    const tvaRate = devis.time_price > 0 ? 20 : 10;
    const tvaAmount = subtotal * (tvaRate / 100);
    
    // Déterminer le type de course
    const isMiseADisposition = devis.time_price > 0 && devis.distance_price === 0;

    if (!forClient) {
      // Driver version - detailed breakdown
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant HT", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      if (isMiseADisposition) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = course.duration_minutes / 60;
        const hourlyRate = devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${devis.base_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        doc.text("Prix au kilomètre", 25, yPos + 5);
        doc.text(`${devis.distance_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (devis.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
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
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée sans le détail des tarifs.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
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
    }

    // Validity
    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`devis-${devis.quote_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = async (course: any, forClient: boolean = false) => {
    const facture = course.factures?.[0];
    const devis = course.devis?.[0];
    
    if (!facture) {
      toast.error("Aucune facture disponible pour cette course");
      return;
    }
    
    if (!driverInfo || !driverInfo.company_name || (!driverInfo.siret && !driverInfo.siren)) {
      toast.error("Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET ou SIREN, Adresse)");
      return;
    }

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Green color for invoices
    const headerColor: [number, number, number] = [46, 204, 113]; // Green

    // Header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`N°: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, 81);
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, 81);
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client info (right side)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", 145, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(course.clients?.profiles?.full_name || "N/A", 145, 71);

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${course.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${course.distance_km} km`, 105, currentY + 5);

    // Payment info
    let yPos = 175;
    doc.text(`Mode de paiement: ${facture.payment_method || 'N/A'}`, 20, yPos);

    // Pricing table
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    // Calculate TVA - use devis time_price if available, otherwise default to 10%
    const amount = facture.amount;
    const tvaRate = devis?.time_price && devis.time_price > 0 ? 20 : 10;
    const subtotalHT = amount / (1 + tvaRate / 100);
    const tvaAmount = amount - subtotalHT;

    if (!forClient) {
      // Driver version - with payment details
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      // Afficher les composantes de prix depuis le devis (version détaillée chauffeur)
      const isMiseADisposition = devis?.time_price && devis.time_price > 0 && (!devis?.distance_price || devis.distance_price === 0);
      
      if (isMiseADisposition && devis) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = course.duration_minutes / 60;
        const hourlyRate = devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours.toFixed(1)}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else if (devis) {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${(devis.base_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        doc.text("Prix au kilomètre", 25, yPos + 5);
        doc.text(`${(devis.distance_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Fallback sans devis
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Montant HT", 25, yPos + 5);
        doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 9;
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (devis?.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis?.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      // Afficher la réduction si code promo appliqué
      if ((facture.promo_code || devis?.promo_code) && (facture.discount_amount > 0 || devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || devis?.discount_amount || 0;
        const promoCode = facture.promo_code || devis?.promo_code || '';
        doc.setTextColor(46, 125, 50);
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
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
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      
      // Afficher la réduction si code promo appliqué
      if ((facture.promo_code || devis?.promo_code) && (facture.discount_amount > 0 || devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || devis?.discount_amount || 0;
        const promoCode = facture.promo_code || devis?.promo_code || '';
        doc.setTextColor(46, 125, 50);
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      // Afficher les augmentations soir/weekend si présentes
      if (devis?.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis?.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Facture téléchargée");
  };

  const handleShareFacture = (course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const facture = course.factures?.[0];
    if (!facture) {
      toast.error("Aucune facture disponible");
      return;
    }

    const message = `Facture ${facture.invoice_number_generated || facture.invoice_number} - ${course.clients?.profiles?.full_name}\n` +
                   `Trajet: ${course.pickup_address} → ${course.destination_address}\n` +
                   `Date: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
                   `Montant: ${facture.amount.toFixed(2)}€\n` +
                   `Statut: ${facture.payment_status === 'paid' ? 'Payée' : 'En attente'}`;

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

  const getDevisStatus = (course: any) => {
    const devis = course.devis?.[0];
    
    if (course.status === "pending") {
      return {
        icon: Clock,
        text: "En attente d'acceptation du chauffeur",
        color: "text-yellow-500"
      };
    }
    
    if (course.status === "accepted") {
      if (devis?.status === "pending") {
        return {
          icon: CheckCircle,
          text: "Confirmée - Devis envoyé au client",
          color: "text-green-500"
        };
      }
      return {
        icon: CheckCircle,
        text: "Confirmée",
        color: "text-green-500"
      };
    }
    
    if (course.status === "in_progress") {
      return {
        icon: CheckCircle,
        text: "Confirmée - En cours",
        color: "text-green-500"
      };
    }
    
    if (course.status === "completed") {
      return {
        icon: CheckCircle,
        text: "Terminée",
        color: "text-green-500"
      };
    }
    
    if (course.status === "cancelled") {
      return {
        icon: XCircle,
        text: "Course annulée",
        color: "text-destructive"
      };
    }

    return {
      icon: Clock,
      text: "En attente",
      color: "text-muted-foreground"
    };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-primary/10 text-primary border-primary/20 border",
      accepted: "bg-success/10 text-success border-success/20 border",
      in_progress: "bg-info/10 text-info border-info/20 border",
      completed: "bg-accent/10 text-accent border-accent/20 border",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20 border",
    };

    const labels = {
      pending: "En attente",
      accepted: "Acceptée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // Fonction pour filtrer les courses par date
  const filterCoursesByDate = (coursesList: any[]) => {
    if (dateFilter === "all") return coursesList;

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now, { locale: fr });
        endDate = endOfWeek(now, { locale: fr });
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case "custom":
        if (customStartDate) startDate = startOfDay(new Date(customStartDate));
        if (customEndDate) endDate = endOfDay(new Date(customEndDate));
        break;
    }

    if (!startDate && !endDate) return coursesList;

    return coursesList.filter(course => {
      const courseDate = new Date(course.scheduled_date);
      if (startDate && endDate) {
        return courseDate >= startDate && courseDate <= endDate;
      } else if (startDate) {
        return courseDate >= startDate;
      } else if (endDate) {
        return courseDate <= endDate;
      }
      return true;
    });
  };

  // Fonction pour appliquer tous les filtres (recherche, date, montant, statut paiement)
  const applyAllFilters = (coursesList: any[]) => {
    let filtered = [...coursesList];

    // Filtre par date
    filtered = filterCoursesByDate(filtered);

    // Filtre par recherche (nom du client)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(course => 
        course.clients?.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    // Filtre par montant (devis ou facture)
    if (minAmount || maxAmount) {
      filtered = filtered.filter(course => {
        const amount = course.factures?.[0]?.amount || course.devis?.[0]?.amount;
        if (!amount) return false;
        
        const min = minAmount ? parseFloat(minAmount) : 0;
        const max = maxAmount ? parseFloat(maxAmount) : Infinity;
        
        return amount >= min && amount <= max;
      });
    }

    // Filtre par statut de paiement (pour courses terminées avec factures)
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(course => {
        if (!course.factures?.[0]) return false;
        return course.factures[0].payment_status === paymentStatusFilter;
      });
    }

    return filtered;
  };

  const resetAllFilters = () => {
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
    setMinAmount("");
    setMaxAmount("");
    setPaymentStatusFilter("all");
  };

  // Filtrage et tri des courses (DU PLUS RÉCENT AU PLUS ANCIEN)
  const sortByDate = (coursesList: any[]) => 
    [...coursesList].sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

  // SYSTÈME DE FIGEMENT: Tri stable pour les courses confirmées
  const sortConfirmedByStableOrder = (coursesList: any[]) => {
    return [...coursesList].sort((a, b) => {
      const orderA = confirmedCoursesOrder.get(a.id) ?? 999999;
      const orderB = confirmedCoursesOrder.get(b.id) ?? 999999;
      return orderA - orderB;
    });
  };

  const pendingCourses = sortByDate(applyAllFilters(courses.filter(c => c.status === "pending")));
  const acceptedCourses = applyAllFilters(courses.filter(c => c.status === "accepted"));
  const inProgressCourses = applyAllFilters(courses.filter(c => c.status === "in_progress"));
  const confirmedCoursesCombined = sortConfirmedByStableOrder([...acceptedCourses, ...inProgressCourses]);
  const completedCourses = sortByDate(applyAllFilters(courses.filter(c => c.status === "completed")));
  const cancelledCourses = sortByDate(applyAllFilters(courses.filter(c => c.status === "cancelled")));

  const hasActiveFilters = dateFilter !== "all" || searchQuery.trim() !== "" || minAmount !== "" || maxAmount !== "" || paymentStatusFilter !== "all";

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* BARRE DE RECHERCHE SIMPLE */}
      <Card className="p-4 bg-card/50 backdrop-blur border border-primary/20">
        <div className="space-y-3">
          <Label htmlFor="search" className="text-sm font-semibold">Recherche rapide</Label>
          <Input
            id="search"
            type="text"
            placeholder="Rechercher par nom de client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
      </Card>

      {/* FILTRES AVANCÉS */}
      <Card className="p-4 bg-card/50 backdrop-blur border border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres avancés
            </h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Tout réinitialiser
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs"
              >
                {showAdvancedFilters ? "Masquer" : "Afficher"} les filtres
              </Button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="space-y-4 pt-2 border-t border-border">
              {/* FILTRES PAR DATE */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par date</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <Button
                    variant={dateFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("all")}
                    className="w-full text-xs"
                  >
                    Tout
                  </Button>
                  <Button
                    variant={dateFilter === "today" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("today")}
                    className="w-full text-xs"
                  >
                    Aujourd'hui
                  </Button>
                  <Button
                    variant={dateFilter === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("week")}
                    className="w-full text-xs"
                  >
                    Cette semaine
                  </Button>
                  <Button
                    variant={dateFilter === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("month")}
                    className="w-full text-xs"
                  >
                    Ce mois
                  </Button>
                  <Button
                    variant={dateFilter === "last-month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilter("last-month")}
                    className="w-full text-xs"
                  >
                    Mois dernier
                  </Button>
                  <Button
                    variant={dateFilter === "custom" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDateFilter("custom");
                      setShowDateFilters(!showDateFilters);
                    }}
                    className="w-full text-xs"
                  >
                    Personnalisé
                  </Button>
                </div>

                {dateFilter === "custom" && showDateFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="start-date" className="text-xs">Date de début</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-date" className="text-xs">Date de fin</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* FILTRES PAR MONTANT */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par montant (€)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="min-amount" className="text-xs">Montant minimum</Label>
                    <Input
                      id="min-amount"
                      type="number"
                      placeholder="Ex: 50"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full text-xs"
                      min="0"
                      step="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-amount" className="text-xs">Montant maximum</Label>
                    <Input
                      id="max-amount"
                      type="number"
                      placeholder="Ex: 200"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full text-xs"
                      min="0"
                      step="10"
                    />
                  </div>
                </div>
              </div>

              {/* FILTRES PAR STATUT DE PAIEMENT */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Filtrer par statut de paiement</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* RÉSUMÉ DES FILTRES ACTIFS */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
                <span className="font-medium">Filtres actifs:</span>
                {searchQuery && <Badge variant="secondary" className="text-xs">Recherche: {searchQuery}</Badge>}
                {dateFilter !== "all" && dateFilter !== "custom" && (
                  <Badge variant="secondary" className="text-xs">
                    {dateFilter === "today" && "Aujourd'hui"}
                    {dateFilter === "week" && "Cette semaine"}
                    {dateFilter === "month" && "Ce mois"}
                    {dateFilter === "last-month" && "Mois dernier"}
                  </Badge>
                )}
                {dateFilter === "custom" && customStartDate && customEndDate && (
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(customStartDate), "dd/MM/yy", { locale: fr })} - {format(new Date(customEndDate), "dd/MM/yy", { locale: fr })}
                  </Badge>
                )}
                {(minAmount || maxAmount) && (
                  <Badge variant="secondary" className="text-xs">
                    Montant: {minAmount || "0"}€ - {maxAmount || "∞"}€
                  </Badge>
                )}
                {paymentStatusFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Paiement: {paymentStatusFilter === "paid" ? "Payé" : paymentStatusFilter === "pending" ? "En attente" : "Échoué"}
                  </Badge>
                )}
              </p>
            </div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 mb-6 h-auto bg-transparent p-0">
          <TabsTrigger 
            value="pending" 
            className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-200 data-[state=active]:border-yellow-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-yellow-500/10 transition-all"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">En attente</span>
            <Badge className="bg-yellow-500/30 text-yellow-200 text-xs font-bold">{pendingCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="confirmed"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-blue-500/10 transition-all"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Confirmée</span>
            <Badge className="bg-blue-500/30 text-blue-200 text-xs font-bold">{confirmedCoursesCombined.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-200 data-[state=active]:border-green-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-green-500/10 transition-all"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Terminée</span>
            <Badge className="bg-green-500/30 text-green-200 text-xs font-bold">{completedCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="rejected"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-200 data-[state=active]:border-red-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-red-500/10 transition-all"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Refusé</span>
            <Badge className="bg-red-500/30 text-red-200 text-xs font-bold">{cancelledCourses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 sm:space-y-4 mt-4">
          {pendingCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course en attente</p>
          ) : (
            pendingCourses.map((course) => {
              return (
              <Card key={course.id} className="p-3 sm:p-4 backdrop-blur-sm border border-primary/10 bg-card/95 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">{course.clients?.profiles?.full_name}</h3>
                          {getStatusBadge(course.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70" />
                          <span className="truncate">{format(new Date(course.scheduled_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                        </p>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-xs sm:text-sm min-w-0 flex-1">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground break-words">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-xs sm:text-sm min-w-0 flex-1">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground break-words">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70" />
                      {course.passengers_count} passager(s)
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-medium text-foreground">Montant du devis</span>
                        <span className="text-2xl sm:text-3xl font-bold text-primary">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                      {course.devis[0].quote_number && (
                        <p className="text-xs text-muted-foreground mt-1">Réf: {course.devis[0].quote_number}</p>
                      )}
                    </div>
                  )}

                  {/* FLUX SYSTÉMATIQUE D'ACCEPTATION */}
                  {(() => {
                    const devis = course.devis?.[0];
                    
                    // CAS SPÉCIAL: Pas de devis → Erreur lors de la création
                    if (!devis) {
                      return (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                          <p className="text-sm text-destructive font-medium">⚠️ Devis manquant</p>
                          <p className="text-xs text-muted-foreground">
                            Le devis n'a pas pu être généré automatiquement. Veuillez le générer manuellement.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.functions.invoke('create-devis-auto', {
                                  body: {
                                    course_id: course.id,
                                    driver_id: driverId,
                                    use_hourly_rate: false
                                  }
                                });
                                if (error) throw error;
                                toast.success("Devis généré avec succès !");
                                fetchCourses();
                              } catch (err: any) {
                                console.error("Error generating devis:", err);
                                toast.error("Erreur lors de la génération du devis");
                              }
                            }}
                            className="w-full border-destructive/30 hover:bg-destructive/10"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Générer le devis
                          </Button>
                        </div>
                      );
                    }
                    
                    // Déterminer qui a créé la course
                    const isDriverCreated = user && course.created_by_user_id === user.id;
                    
                    // ========== CAS 1: CHAUFFEUR CRÉÉ LA COURSE ==========
                    // Flux: Chauffeur crée → Client accepte → Confirmée DIRECTEMENT
                    // Note: Quand client accepte, DevisList.tsx change course.status à "accepted"
                    // donc la course ne sera plus en "pending" et n'apparaîtra plus ici
                    if (isDriverCreated) {
                      if (devis.status === "pending") {
                        return (
                        <div className="text-sm text-muted-foreground italic">
                          ⏳ En attente de l'acceptation du client
                        </div>
                        );
                      }
                      // Si devis accepté et course encore pending, c'est anormal
                      // mais ne devrait jamais arriver car DevisList.tsx change status à "accepted"
                      return null;
                    }
                    
                    // ========== CAS 2: CLIENT CRÉÉ LA COURSE ==========
                    // Flux: Client crée → Client accepte devis → Chauffeur accepte course → Confirmée
                    
                    // Client n'a pas encore accepté le devis
                    if (devis.status === "pending") {
                      return (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                          <p className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">
                            ⏳ En attente de l'acceptation du devis par le client
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Le client doit d'abord accepter le devis avant que vous puissiez accepter la course.
                          </p>
                        </div>
                      );
                    }
                    
                    // Client a accepté le devis, maintenant le CHAUFFEUR doit accepter la course
                    if (devis.status === "accepted" && course.status === "pending") {
                      return (
                        <div className="space-y-2">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                            <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                              ✅ Devis accepté par le client
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Vous pouvez maintenant accepter ou refuser cette course.
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAcceptCourse(course.id)}
                              className="flex-1 bg-success/90 hover:bg-success text-success-foreground border-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accepter la course
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelCourse(course.id)}
                              className="flex-1 border-border hover:bg-muted"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  {/* Bouton Partager avec Partenaire - uniquement pour courses confirmées (accepted) */}
                  {course.status === 'accepted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToShareWithPartner(course);
                        setSharePartnerDialogOpen(true);
                      }}
                      className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Partager avec un partenaire
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedCoursesCombined.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course confirmée</p>
          ) : (
            confirmedCoursesCombined.map((course) => {
              return (
              <Card key={course.id} className="p-4 backdrop-blur-sm border border-primary/10 bg-card/95 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-muted-foreground/70" />
                      {course.passengers_count} passager(s)
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Montant du devis</span>
                        <span className="text-3xl font-bold text-white drop-shadow-glow">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

                  {/* Boutons de navigation GPS */}
                  <CourseNavigationButtons
                    status={course.status}
                    pickupAddress={course.pickup_address}
                    pickupLatitude={course.pickup_latitude}
                    pickupLongitude={course.pickup_longitude}
                    destinationAddress={course.destination_address}
                    destinationLatitude={course.destination_latitude}
                    destinationLongitude={course.destination_longitude}
                  />

                  <div className="flex gap-2 flex-wrap">
                    {course.status === "accepted" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartCourse(course.id)}
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Commencer
                      </Button>
                    )}
                    {course.status === "in_progress" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleEndCourse(course.id)}
                        className="flex-1"
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        Terminer
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelCourse(course.id)}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  {/* Bouton Partager avec Partenaire - uniquement pour courses confirmées (accepted) */}
                  {course.status === 'accepted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToShareWithPartner(course);
                        setSharePartnerDialogOpen(true);
                      }}
                      className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Partager avec un partenaire
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course terminée</p>
          ) : (
            completedCourses.map((course) => {
              return (
              <Card key={course.id} className="p-4 backdrop-blur-sm border border-primary/10 bg-card/95 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Affichage SYSTÉMATIQUE du prix - Facture en priorité, sinon Devis */}
                  {(() => {
                    const facture = course.factures?.[0];
                    const devis = course.devis?.[0];
                    const amount = facture?.amount || devis?.amount;
                    const reference = facture?.invoice_number_generated || devis?.quote_number;

                    if (!amount) {
                      return (
                        <div className="p-4 bg-destructive/20 backdrop-blur-sm rounded-lg border border-destructive/30">
                          <p className="text-sm text-destructive font-medium">⚠️ Prix non disponible</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Aucun devis ou facture n'a été généré pour cette course.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="p-4 bg-primary/10 backdrop-blur-sm rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {facture ? "Montant de la facture" : "Montant du devis"}
                          </span>
                          <span className="text-3xl font-bold text-primary">{amount.toFixed(2)}€</span>
                        </div>
                        {reference && (
                          <p className="text-xs text-muted-foreground mt-1">Réf: {reference}</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFacture(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Facture Détaillée
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFacture(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Facture Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {cancelledCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course refusée</p>
          ) : (
            cancelledCourses.map((course) => {
              return (
              <Card key={course.id} className="p-4 backdrop-blur-sm border border-primary/10 bg-card/95 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Montant du devis</span>
                        <span className="text-3xl font-bold text-white drop-shadow-glow">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finaliser la course</DialogTitle>
            <DialogDescription>
              Sélectionnez le moyen de paiement utilisé par le client
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Carte bancaire" id="card" />
              <Label htmlFor="card">Carte bancaire</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Espèces" id="cash" />
              <Label htmlFor="cash">Espèces</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Virement" id="transfer" />
              <Label htmlFor="transfer">Virement</Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCompleteCourse} disabled={!paymentMethod}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la course</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison de l'annulation
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Horaire non disponible" id="schedule" />
              <Label htmlFor="schedule">Horaire non disponible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Distance trop importante" id="distance" />
              <Label htmlFor="distance">Distance trop importante</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Problème technique" id="technical" />
              <Label htmlFor="technical">Problème technique</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Autre raison</Label>
            </div>
          </RadioGroup>
          {rejectionReason === "custom" && (
            <Textarea
              placeholder="Précisez la raison..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectCourse}>
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      {courseToReport && (
        <CourseReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          courseId={courseToReport.id}
          reportedAgainstUserId={courseToReport.clients?.user_id}
          isDriver={true}
          currentUserId={user?.id || ""}
        />
      )}

      {/* Share with Partner Dialog */}
      <ShareCourseWithPartnerDialog
        open={sharePartnerDialogOpen}
        onOpenChange={setSharePartnerDialogOpen}
        course={courseToShareWithPartner}
        driverId={driverId}
        onSuccess={fetchCourses}
      />
    </div>
  );
};

export default CoursesList;
