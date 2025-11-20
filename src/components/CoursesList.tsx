import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, FileText, Play, StopCircle, Download, Share2, MessageCircle, Mail, Facebook } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

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

  useEffect(() => {
    fetchCourses();
    setupRealtimeSubscription();
  }, [driverId]);

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
          devis:devis!course_id(
            id,
            amount,
            status,
            quote_number,
            valid_until,
            base_price,
            distance_price,
            time_price,
            created_at
          ),
          factures:factures!course_id(
            id,
            invoice_number,
            invoice_number_generated,
            amount,
            payment_status,
            payment_method,
            paid_at,
            created_at
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("scheduled_date", { ascending: false });

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
    const channel = supabase
      .channel("courses_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          fetchCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAcceptCourse = async (courseId: string) => {
    try {
      // Chauffeur accepte une course créée par le client
      const { error } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Course acceptée et confirmée !");
      await fetchCourses();
    } catch (error: any) {
      console.error("Error accepting course:", error);
      toast.error("Erreur lors de l'acceptation de la course");
    }
  };

  const handleStartCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "in_progress" })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Course commencée !");
      
      // Refresh courses immediately to update UI
      await fetchCourses();
    } catch (error: any) {
      console.error("Error starting course:", error);
      toast.error("Erreur lors du démarrage de la course");
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
      // Update course status to completed
      const { error: courseError } = await supabase
        .from("courses")
        .update({ status: "completed" })
        .eq("id", selectedCourseId);

      if (courseError) throw courseError;

      // First, get the course to find the most recent devis
      const { data: courseData } = await supabase
        .from("courses")
        .select("*, devis(*)")
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

      toast.success("Course terminée ! Facture générée automatiquement.");
      setShowPaymentDialog(false);
      setPaymentMethod("");
      
      // Refresh courses immediately
      await fetchCourses();
    } catch (error: any) {
      console.error("Error completing course:", error);
      toast.error("Erreur lors de la finalisation: " + error.message);
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
      const { error } = await supabase
        .from("courses")
        .update({ 
          status: "cancelled",
          notes: `Motif de refus: ${finalReason}\n\n${courses.find(c => c.id === courseToReject)?.notes || ''}`
        })
        .eq("id", courseToReject);

      if (error) throw error;

      toast.success("Course annulée");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setCustomReason("");
      setCourseToReject(null);
      fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      toast.error("Erreur lors de l'annulation");
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
    doc.text(`SIRET: ${driverInfo.siret || 'N/A'}`, 20, 81);
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
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Forfait de base", 25, yPos + 5);
      doc.text(`${devis.base_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text("Prix au kilomètre", 25, yPos + 5);
      doc.text(`${devis.distance_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
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
    
    if (!driverInfo || !driverInfo.company_name || !driverInfo.siret) {
      toast.error("Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET, Adresse)");
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
    doc.text(`SIRET: ${driverInfo.siret || 'N/A'}`, 20, 81);
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
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
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
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
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
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-premium/10 text-premium border-premium/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels = {
      pending: "En attente",
      accepted: "Acceptée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles]} border`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const pendingCourses = courses.filter(c => c.status === "pending");
  const acceptedCourses = courses.filter(c => c.status === "accepted");
  const inProgressCourses = courses.filter(c => c.status === "in_progress");
  const completedCourses = courses.filter(c => c.status === "completed");
  const cancelledCourses = courses.filter(c => c.status === "cancelled");

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            En attente ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmées ({acceptedCourses.length + inProgressCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({completedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Refusées ({cancelledCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course en attente</p>
          ) : (
            pendingCourses.map((course) => (
              <Card key={course.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {course.passengers_count} passager(s)
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Montant du devis</span>
                        <span className="text-3xl font-bold text-blue-600">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                      {course.devis[0].quote_number && (
                        <p className="text-xs text-muted-foreground mt-1">Réf: {course.devis[0].quote_number}</p>
                      )}
                    </div>
                  )}

                  {/* FLUX SYSTÉMATIQUE D'ACCEPTATION */}
                  {(() => {
                    const devis = course.devis?.[0];
                    if (!devis) return null;
                    
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
                    // Flux: Client crée → Client accepte → Chauffeur accepte → Confirmée
                    
                    // Client n'a pas encore accepté le devis
                    if (devis.status === "pending") {
                      return (
                        <div className="text-sm text-muted-foreground italic">
                          ⏳ En attente de l'acceptation du client
                        </div>
                      );
                    }
                    
                    // Client a accepté, maintenant le CHAUFFEUR doit accepter
                    if (devis.status === "accepted" && course.status === "pending") {
                      return (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAcceptCourse(course.id)}
                            className="flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accepter la course
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelCourse(course.id)}
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Refuser
                          </Button>
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
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {[...acceptedCourses, ...inProgressCourses].length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course confirmée</p>
          ) : (
            [...acceptedCourses, ...inProgressCourses].map((course) => (
              <Card key={course.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {course.passengers_count} passager(s)
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Montant du devis</span>
                        <span className="text-3xl font-bold text-blue-600">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

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
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course terminée</p>
          ) : (
            completedCourses.map((course) => (
              <Card key={course.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {course.factures && course.factures.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Montant de la facture</span>
                        <span className="text-3xl font-bold text-green-600">{course.factures[0].amount.toFixed(2)}€</span>
                      </div>
                      {course.factures[0].invoice_number_generated && (
                        <p className="text-xs text-muted-foreground mt-1">Réf: {course.factures[0].invoice_number_generated}</p>
                      )}
                    </div>
                  )}

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
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {cancelledCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course refusée</p>
          ) : (
            cancelledCourses.map((course) => (
              <Card key={course.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{course.clients?.profiles?.full_name}</h3>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Montant du devis</span>
                        <span className="text-3xl font-bold text-blue-600">{course.devis[0].amount.toFixed(2)}€</span>
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
                </div>
              </Card>
            ))
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
    </div>
  );
};

export default CoursesList;
