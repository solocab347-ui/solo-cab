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
import { toast } from "sonner";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, FileText, Play, StopCircle, Download, Share2, MessageCircle, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface CoursesListProps {
  driverId: string;
}

const CoursesList = ({ driverId }: CoursesListProps) => {
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

      // Dual association query with devis and factures data
      const { data, error } = await supabase
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
      
      console.log("Courses chargées avec devis et factures:", data);
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("courses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAccept = async (courseId: string) => {
    try {
      // Update course status
      const { error: updateError } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (updateError) throw updateError;

      // Generate course number
      const { data: courseNumber } = await supabase
        .rpc("generate_course_number", { _driver_id: driverId });

      await supabase
        .from("courses")
        .update({ course_number: courseNumber })
        .eq("id", courseId);

      // Create devis automatically
      const response = await supabase.functions.invoke("create-devis-auto", {
        body: {
          course_id: courseId,
          driver_id: driverId,
          use_hourly_rate: false,
        },
      });

      if (response.error) throw response.error;

      toast.success("Course acceptée ! Devis généré automatiquement.");
      fetchCourses();
    } catch (error: any) {
      console.error("Error accepting course:", error);
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const openRejectDialog = (courseId: string) => {
    setCourseToReject(courseId);
    setRejectionReason("");
    setCustomReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!courseToReject) return;
    
    const finalReason = rejectionReason === "Autre" ? customReason : rejectionReason;
    
    if (!finalReason.trim()) {
      toast.error("Veuillez indiquer un motif de refus");
      return;
    }

    try {
      const course = courses.find(c => c.id === courseToReject);
      const { error } = await supabase
        .from("courses")
        .update({ 
          status: "cancelled",
          notes: `Motif de refus: ${finalReason}${course?.notes ? `\n\nNotes originales: ${course.notes}` : ''}`
        })
        .eq("id", courseToReject);

      if (error) throw error;
      
      toast.success("Course refusée");
      setRejectDialogOpen(false);
      fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      toast.error("Erreur lors du refus");
    }
  };

  const handleStartCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "in_progress" })
        .eq("id", courseId);

      if (error) throw error;
      toast.success("Course démarrée");
      fetchCourses();
    } catch (error: any) {
      console.error("Error starting course:", error);
      toast.error("Erreur lors du démarrage");
    }
  };

  const openPaymentDialog = (courseId: string) => {
    setSelectedCourseId(courseId);
    setPaymentMethod("");
    setShowPaymentDialog(true);
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

  const handleDownloadDevis = (course: any) => {
    const devis = course.devis?.[0];
    if (!devis || !driverInfo) {
      toast.error("Informations incomplètes pour générer le PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // En-tête avec fond bleu
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("DEVIS", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 26, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 32, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    // Informations Chauffeur (à gauche) et Client (à droite)
    let yPos = 50;
    
    // Chauffeur (gauche)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, yPos);
      yPos += 4;
    }
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 70);
      addressLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 4;
      });
    }
    
    yPos += 1;
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, yPos);
      yPos += 4;
    }
    if (driverInfo.profiles?.phone) {
      doc.text(`Tél: ${driverInfo.profiles.phone}`, 20, yPos);
    }
    
    // Client (droite)
    yPos = 50;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, yPos, { align: "right" });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    doc.text(course.clients?.profiles?.full_name || "N/A", pageWidth - 20, yPos, { align: "right" });
    yPos += 4;
    if (course.clients?.profiles?.phone) {
      doc.text(course.clients.profiles.phone, pageWidth - 20, yPos, { align: "right" });
    }
    
    // Détails de la course (encadré)
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
    const pickupLines = doc.splitTextToSize(course.pickup_address, pageWidth - 55);
    doc.text(pickupLines, 45, yPos);
    yPos += 4 * pickupLines.length;
    
    doc.text("Arrivée:", 20, yPos);
    const destLines = doc.splitTextToSize(course.destination_address, pageWidth - 55);
    doc.text(destLines, 45, yPos);
    yPos += 4 * destLines.length + 1;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    yPos += 4;
    
    doc.text("Passagers:", 20, yPos);
    doc.text(`${course.passengers_count}`, 45, yPos);
    if (course.distance_km) {
      yPos += 4;
      doc.text("Distance:", 20, yPos);
      doc.text(`${course.distance_km} km`, 45, yPos);
    }
    
    // Tarification (tableau) - VERSION DÉTAILLÉE POUR CHAUFFEUR
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    
    yPos += 6;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos, pageWidth - 30, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Description", 20, yPos + 4.5);
    doc.text("Montant HT", pageWidth - 20, yPos + 4.5, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    yPos += 9;
    doc.setFont(undefined, 'normal');
    doc.text("Forfait de base", 20, yPos);
    doc.text(`${parseFloat(devis.base_price).toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    if (parseFloat(devis.distance_price) > 0) {
      yPos += 5;
      doc.text("Prix au kilomètre", 20, yPos);
      doc.text(`${parseFloat(devis.distance_price).toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    }
    
    if (parseFloat(devis.time_price || 0) > 0) {
      yPos += 5;
      doc.text("Mise à disposition", 20, yPos);
      doc.text(`${parseFloat(devis.time_price).toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    }
    
    // Calcul TVA
    const totalHT = parseFloat(devis.base_price) + parseFloat(devis.distance_price) + parseFloat(devis.time_price || 0);
    const tvaRate = parseFloat(devis.time_price || 0) > 0 ? 20 : 10; // 20% si mise à dispo, sinon 10%
    const tvaAmount = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + tvaAmount;
    
    // Ligne de séparation
    yPos += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    // Sous-total HT
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text("Sous-total HT", 20, yPos);
    doc.text(`${totalHT.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    // TVA
    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`TVA (${tvaRate}%)`, 20, yPos);
    doc.text(`${tvaAmount.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    // Total TTC
    yPos += 5;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Validité
    yPos += 12;
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);
    
    // Pied de page
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = (course: any) => {
    const facture = course.factures?.[0];
    const devis = course.devis?.[0];
    if (!facture || !driverInfo) {
      toast.error("Informations incomplètes pour générer le PDF");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // En-tête avec fond vert (facture payée)
    const headerColor: [number, number, number] = facture.payment_status === 'paid' ? [40, 167, 69] : [108, 117, 125];
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("FACTURE", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`N° ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 34, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    // Ligne de séparation
    doc.setDrawColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.setLineWidth(1);
    doc.line(10, 42, pageWidth - 10, 42);
    
    // Informations Chauffeur (à gauche) et Client (à droite)
    let yPos = 55;
    
    // Chauffeur (gauche)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 15, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    doc.text(driverInfo.profiles?.full_name || driverInfo.company_name || "N/A", 15, yPos);
    yPos += 5;
    if (driverInfo.company_name && driverInfo.company_name !== driverInfo.profiles?.full_name) {
      doc.text(driverInfo.company_name, 15, yPos);
      yPos += 5;
    }
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 80);
      doc.text(addressLines, 15, yPos);
      yPos += 5 * addressLines.length;
    }
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 15, yPos);
      yPos += 5;
    }
    if (driverInfo.profiles?.phone) {
      doc.text(`Tél: ${driverInfo.profiles.phone}`, 15, yPos);
    }
    
    // Client (droite)
    yPos = 55;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 15, yPos, { align: "right" });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    doc.text(course.clients?.profiles?.full_name || "N/A", pageWidth - 15, yPos, { align: "right" });
    yPos += 5;
    if (course.clients?.profiles?.phone) {
      doc.text(course.clients.profiles.phone, pageWidth - 15, yPos, { align: "right" });
    }
    
    // Détails de la course (encadré)
    yPos = 105;
    doc.setFillColor(248, 249, 250);
    doc.rect(10, yPos, pageWidth - 20, 45, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, yPos, pageWidth - 20, 45);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA COURSE", 15, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 7;
    doc.text("Départ:", 15, yPos);
    doc.text(course.pickup_address, 40, yPos);
    yPos += 6;
    doc.text("Arrivée:", 15, yPos);
    doc.text(course.destination_address, 40, yPos);
    yPos += 6;
    doc.text("Date:", 15, yPos);
    doc.text(format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 40, yPos);
    yPos += 6;
    doc.text("Passagers:", 15, yPos);
    doc.text(`${course.passengers_count}`, 40, yPos);
    if (course.distance_km) {
      yPos += 6;
      doc.text("Distance:", 15, yPos);
      doc.text(`${course.distance_km} km`, 40, yPos);
    }
    
    // Détail du prix (tableau)
    yPos = 165;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAIL DU PRIX", 15, yPos);
    
    if (devis) {
      yPos += 8;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(10, yPos, pageWidth - 20, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text("Désignation", 15, yPos + 5);
      doc.text("Montant", pageWidth - 15, yPos + 5, { align: "right" });
      doc.setTextColor(0, 0, 0);
      
      yPos += 10;
      doc.setFont(undefined, 'normal');
      doc.text("Forfait de base", 15, yPos);
      doc.text(`${parseFloat(devis.base_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: "right" });
      
      if (parseFloat(devis.distance_price) > 0) {
        yPos += 6;
        doc.text("Prix au kilomètre", 15, yPos);
        doc.text(`${parseFloat(devis.distance_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: "right" });
      }
      
      if (parseFloat(devis.time_price || 0) > 0) {
        yPos += 6;
        doc.text("Prix horaire (mise à disposition)", 15, yPos);
        doc.text(`${parseFloat(devis.time_price).toFixed(2)} €`, pageWidth - 15, yPos, { align: "right" });
      }
      
      // Ligne de séparation
      yPos += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(10, yPos, pageWidth - 10, yPos);
    }
    
    // Total TTC
    yPos += 8;
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(10, yPos - 4, pageWidth - 20, 10, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 15, yPos + 2);
    doc.text(`${facture.amount.toFixed(2)} €`, pageWidth - 15, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Informations de paiement
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("INFORMATIONS DE PAIEMENT", 15, yPos);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    if (facture.payment_method) {
      doc.text(`Moyen de paiement: ${facture.payment_method}`, 15, yPos);
      yPos += 5;
    }
    if (facture.paid_at) {
      doc.text(`Payé le: ${format(new Date(facture.paid_at), "dd/MM/yyyy", { locale: fr })}`, 15, yPos);
      yPos += 5;
    }
    doc.setFont(undefined, 'bold');
    const statusText = facture.payment_status === 'paid' ? 'PAYÉE' : 'EN ATTENTE';
    const statusColor: [number, number, number] = facture.payment_status === 'paid' ? [40, 167, 69] : [220, 53, 69];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Statut: ${statusText}`, 15, yPos);
    doc.setTextColor(0, 0, 0);
    
    // Pied de page
    yPos = doc.internal.pageSize.height - 20;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, yPos - 5, pageWidth, 25, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, yPos, { align: "center" });
    
    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}.pdf`);
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
      fetchCourses();
    } catch (error: any) {
      console.error("Error completing course:", error);
      toast.error("Erreur lors de la finalisation");
    }
  };

  const getDevisStatus = (course: any) => {
    const devis = course.devis?.[0];
    
    // Status cohérent selon la section où apparaît la course
    if (course.status === "pending") {
      return {
        icon: Clock,
        text: "En attente d'acceptation du chauffeur",
        color: "text-yellow-500"
      };
    }
    
    if (course.status === "accepted") {
      // Dans la section Confirmées, toujours afficher "Confirmée"
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
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  // Filtrer les courses par statut
  const pendingCourses = courses.filter(c => c.status === "pending");
  const confirmedCourses = courses.filter(c => c.status === "accepted" || c.status === "in_progress");
  const completedCourses = courses.filter(c => c.status === "completed");
  const rejectedCourses = courses.filter(c => c.status === "cancelled");

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des courses...</p>
      </div>
    );
  }

  const renderCourseCard = (course: any) => (
    <Card key={course.id} className="p-6 hover:shadow-elegant transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {course.clients?.profiles?.profile_photo_url ? (
            <img
              src={course.clients.profiles.profile_photo_url}
              alt={course.clients.profiles.full_name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-bold">{course.clients?.profiles?.full_name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {course.clients?.is_exclusive && (
                <Badge variant="outline" className="text-xs">Client exclusif</Badge>
              )}
              {course.course_number && (
                <span className="text-xs text-premium">{course.course_number}</span>
              )}
            </div>
          </div>
        </div>
        {getStatusBadge(course.status)}
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
            {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.passengers_count} passager{course.passengers_count > 1 ? "s" : ""}
          </div>
        </div>

        {course.distance_km && (
          <div className="text-sm text-muted-foreground">
            Distance estimée : {course.distance_km} km
            {course.duration_minutes && ` • Durée : ${course.duration_minutes} min`}
          </div>
        )}

        {course.notes && (
          <div className="text-sm bg-secondary p-3 rounded-lg">
            <p className="font-medium mb-1">Notes :</p>
            <p className="text-muted-foreground">{course.notes}</p>
          </div>
        )}
      </div>

      {/* Status message avec icône dynamique */}
      {(() => {
        const statusInfo = getDevisStatus(course);
        const StatusIcon = statusInfo.icon;
        return (
          <div className={`text-sm flex items-center gap-2 mb-3 ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusInfo.text}
          </div>
        );
      })()}

      {/* Prix et partage du devis - Affiché dans toutes les sections si devis existe */}
      {course.devis?.[0] && (
        <div className="space-y-3 pt-3 border-t border-border">
          {/* Prix du devis */}
          <div className="p-4 bg-gradient-to-r from-premium/10 to-premium/5 rounded-lg border border-premium/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Montant du devis</span>
              <span className="text-3xl font-bold text-premium">{course.devis[0].amount.toFixed(2)}€</span>
            </div>
            {course.devis[0].quote_number && (
              <p className="text-xs text-muted-foreground mt-1">Réf: {course.devis[0].quote_number}</p>
            )}
          </div>

          {/* Boutons de partage et téléchargement */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadDevis(course)}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
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
              onClick={() => handleShareDevis(course, 'email')}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShareDevis(course, 'sms')}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              SMS
            </Button>
          </div>
        </div>
      )}

      {/* Prix et partage de la facture - Affiché dans la section Terminées si facture existe */}
      {course.status === "completed" && course.factures?.[0] && (
        <div className="space-y-3 pt-3 border-t border-border">
          {/* Prix de la facture */}
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Montant de la facture</span>
              <span className="text-3xl font-bold text-green-600">{course.factures[0].amount.toFixed(2)}€</span>
            </div>
            {course.factures[0].invoice_number_generated && (
              <p className="text-xs text-muted-foreground mt-1">Réf: {course.factures[0].invoice_number_generated}</p>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              {course.factures[0].payment_method && (
                <span>Paiement: {course.factures[0].payment_method}</span>
              )}
              {course.factures[0].paid_at && (
                <span className="ml-2">• Payé le {format(new Date(course.factures[0].paid_at), "d MMM yyyy", { locale: fr })}</span>
              )}
            </div>
          </div>

          {/* Boutons de partage et téléchargement */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadFacture(course)}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
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
              onClick={() => handleShareFacture(course, 'email')}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShareFacture(course, 'sms')}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              SMS
            </Button>
          </div>
        </div>
      )}

      {course.status === "pending" && (
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={() => handleAccept(course.id)}
            className="flex-1 bg-gradient-premium"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accepter et créer devis
          </Button>
          <Button
            onClick={() => openRejectDialog(course.id)}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Refuser
          </Button>
        </div>
      )}

      {(course.status === "accepted" || course.status === "in_progress") && (
        <div className="flex gap-3 pt-4 border-t border-border">
          {course.status === "accepted" && (
            <Button
              onClick={() => handleStartCourse(course.id)}
              className="flex-1 bg-gradient-trust"
            >
              <Play className="w-4 h-4 mr-2" />
              Commencer la course
            </Button>
          )}
          {course.status === "in_progress" && (
            <Button
              onClick={() => openPaymentDialog(course.id)}
              className="flex-1 bg-gradient-success"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Terminer la course
            </Button>
          )}
          <Button
            onClick={() => openRejectDialog(course.id)}
            variant="destructive"
            size="sm"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Annuler
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <>
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Terminer la course</DialogTitle>
            <DialogDescription>
              Sélectionnez le moyen de paiement utilisé par le client
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Espèces" id="cash" />
                <Label htmlFor="cash" className="cursor-pointer flex-1">Espèces</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Carte bancaire" id="card" />
                <Label htmlFor="card" className="cursor-pointer flex-1">Carte bancaire</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Virement" id="transfer" />
                <Label htmlFor="transfer" className="cursor-pointer flex-1">Virement</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Chèque" id="check" />
                <Label htmlFor="check" className="cursor-pointer flex-1">Chèque</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCompleteCourse} className="bg-gradient-premium">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmer et générer facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif de refus</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du refus de cette course
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Client trop éloigné de ma zone" id="distance" />
                <Label htmlFor="distance" className="cursor-pointer flex-1">Client trop éloigné de ma zone</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Horaire non disponible" id="schedule" />
                <Label htmlFor="schedule" className="cursor-pointer flex-1">Horaire non disponible</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Véhicule non adapté pour cette course" id="vehicle" />
                <Label htmlFor="vehicle" className="cursor-pointer flex-1">Véhicule non adapté pour cette course</Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-secondary cursor-pointer">
                <RadioGroupItem value="Autre" id="other" />
                <Label htmlFor="other" className="cursor-pointer flex-1">Autre motif</Label>
              </div>
            </RadioGroup>
            
            {rejectionReason === "Autre" && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Précisez le motif</Label>
                <Textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Entrez votre motif de refus..."
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || (rejectionReason === "Autre" && !customReason.trim())}
            >
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            En attente ({pendingCourses.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Confirmées ({confirmedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Terminées ({completedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Refusées ({rejectedCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course en attente</h3>
              <p className="text-muted-foreground">
                Les demandes des clients et les devis envoyés apparaîtront ici
              </p>
            </Card>
          ) : (
            pendingCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course confirmée</h3>
              <p className="text-muted-foreground">
                Les courses acceptées par les clients apparaîtront ici
              </p>
            </Card>
          ) : (
            confirmedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course terminée</h3>
              <p className="text-muted-foreground">
                Les courses complétées apparaîtront ici
              </p>
            </Card>
          ) : (
            completedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedCourses.length === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune course refusée</h3>
              <p className="text-muted-foreground">
                Les courses refusées apparaîtront ici
              </p>
            </Card>
          ) : (
            rejectedCourses.map(renderCourseCard)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CoursesList;
