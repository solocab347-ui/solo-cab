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
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Clock, Euro, Download, MessageCircle, Mail, Share2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface DevisListProps {
  clientId: string;
}

const DevisList = ({ clientId }: DevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  useEffect(() => {
    fetchDevis();
    setupRealtimeSubscription();
  }, [clientId]);

  const fetchDevis = async () => {
    try {
      const { data, error } = await supabase
        .from("devis")
        .select(`
          *,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes,
            status
          ),
          drivers!inner(
            company_name,
            company_address,
            siret,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          clients!inner(
            profiles:user_id(full_name, phone, email)
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // CORRECTION: Synchroniser le statut du devis avec celui de la course
      const synchronizedDevis = (data || []).map(devis => {
        const courseStatus = devis.courses?.status;
        
        // Si la course est annulée, le devis doit aussi être considéré comme annulé
        if (courseStatus === 'cancelled' && devis.status === 'pending') {
          return { ...devis, status: 'cancelled', _courseStatus: courseStatus };
        }
        
        return { ...devis, _courseStatus: courseStatus };
      });
      
      setDevisList(synchronizedDevis);
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!clientId) return () => {};

    return subscriptionManager.subscribe(
      `devis-client-${clientId}`,
      {
        table: "devis",
        event: "*",
        filter: `client_id=eq.${clientId}`,
        debounceMs: 1000
      },
      () => fetchDevis()
    );
  };

  const handleAccept = async (devisId: string) => {
    try {
      // ========== FLUX SYSTÉMATIQUE D'ACCEPTATION ==========
      // Récupérer les infos du devis et de la course
      const { data: devisData, error: fetchError } = await supabase
        .from("devis")
        .select(`
          *,
          courses!inner(
            id,
            created_by_user_id,
            status
          ),
          drivers!inner(
            user_id
          )
        `)
        .eq("id", devisId)
        .single();

      if (fetchError) throw fetchError;

      const course = devisData.courses;
      const driverUserId = devisData.drivers.user_id;

      // CORRECTION CRITIQUE: Vérifier si c'est CE CHAUFFEUR PRÉCIS qui a créé la course
      // en comparant created_by_user_id avec le user_id du chauffeur
      const isDriverCreated = course.created_by_user_id === driverUserId;

      // Étape 1: TOUJOURS accepter le devis d'abord
      const { error: updateError } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devisId);

      if (updateError) throw updateError;

      // ========== CAS 1: CHAUFFEUR A CRÉÉ LA COURSE ==========
      // Flux: Chauffeur crée → Client accepte → Course CONFIRMÉE DIRECTEMENT
      if (isDriverCreated) {
        const { error: courseError } = await supabase
          .from("courses")
          .update({ status: "accepted" })
          .eq("id", course.id);

        if (courseError) throw courseError;

        // Notifier le chauffeur que son devis a été accepté
        await supabase.from("notifications").insert({
          user_id: driverUserId,
          title: "Devis accepté !",
          message: `Le client a accepté votre devis ${devisData.quote_number}. La course est confirmée.`,
          type: "devis_accepted",
          link: "/driver-dashboard?tab=courses"
        });

        toast.success("Devis accepté ! Course confirmée.");
      } 
      // ========== CAS 2: CLIENT A CRÉÉ LA COURSE ==========
      // Flux: Client crée → Client accepte → Chauffeur doit accepter → Course confirmée
      else {
        // Course reste "pending", le chauffeur doit maintenant l'accepter
        // Notifier le chauffeur qu'il doit maintenant accepter la course
        await supabase.from("notifications").insert({
          user_id: driverUserId,
          title: "Nouveau devis accepté",
          message: `Le client a accepté le devis ${devisData.quote_number}. Vous devez maintenant accepter la course.`,
          type: "devis_accepted",
          link: "/driver-dashboard?tab=courses"
        });

        toast.success("Devis accepté ! En attente de confirmation du chauffeur.");
      }

      fetchDevis();
    } catch (error: any) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation du devis");
    }
  };

  const openRejectDialog = (devisId: string) => {
    setSelectedDevisId(devisId);
    setRejectReason("");
    setCustomReason("");
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedDevisId) return;
    
    if (!rejectReason) {
      toast.error("Veuillez sélectionner une raison de refus");
      return;
    }

    if (rejectReason === "Autre" && !customReason.trim()) {
      toast.error("Veuillez préciser la raison du refus");
      return;
    }

    try {
      const finalReason = rejectReason === "Autre" ? customReason : rejectReason;

      const { error: devisError } = await supabase
        .from("devis")
        .update({ 
          status: "rejected",
          notes: finalReason
        })
        .eq("id", selectedDevisId);

      if (devisError) throw devisError;

      const { data: devisData } = await supabase
        .from("devis")
        .select(`
          quote_number,
          driver_id,
          clients!inner(
            profiles:user_id(full_name)
          )
        `)
        .eq("id", selectedDevisId)
        .single();

      if (devisData) {
        await supabase.from("notifications").insert({
          user_id: devisData.driver_id,
          title: "Devis refusé",
          message: `Le devis ${devisData.quote_number} a été refusé par ${devisData.clients.profiles.full_name}. Raison : ${finalReason}`,
          type: "devis_rejected",
          link: "/driver-dashboard?tab=devis"
        });
      }

      toast.success("Devis refusé");
      setShowRejectDialog(false);
      fetchDevis();
    } catch (error: any) {
      console.error("Error rejecting devis:", error);
      toast.error("Erreur lors du refus");
    }
  };

  const getStatusBadge = (status: string, validUntil: string, courseStatus?: string) => {
    const isExpired = new Date(validUntil) < new Date();
    
    // CORRECTION: Si la course est annulée, afficher "Annulé"
    if (courseStatus === 'cancelled') {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          Annulé
        </Badge>
      );
    }
    
    if (isExpired && status === "pending") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          Expiré
        </Badge>
      );
    }

    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      expired: "bg-muted text-muted-foreground border-border",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      expired: "Expiré",
      cancelled: "Annulé",
    };

    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleDownloadDevis = (devis: any) => {
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
    
    // Informations Chauffeur (à gauche)
    let yPos = 50;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = devis.drivers?.profiles?.full_name || devis.drivers?.company_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (devis.drivers?.company_name && devis.drivers.company_name !== driverName) {
      doc.text(devis.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
    if (devis.drivers?.company_address) {
      const addressLines = doc.splitTextToSize(devis.drivers.company_address, 70);
      addressLines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 4;
      });
    }
    
    yPos += 1;
    if (devis.drivers?.siret) {
      doc.text(`SIRET: ${devis.drivers.siret}`, 20, yPos);
      yPos += 4;
    } else if (devis.drivers?.siren) {
      doc.text(`SIREN: ${devis.drivers.siren}`, 20, yPos);
      yPos += 4;
    }
    if (devis.drivers?.profiles?.phone) {
      doc.text(`Tél: ${devis.drivers.profiles.phone}`, 20, yPos);
    }
    
    // Informations Client (à droite)
    let clientYPos = 50;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CLIENT", pageWidth - 20, clientYPos, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    clientYPos += 5;
    
    const clientName = devis.clients?.profiles?.full_name || "N/A";
    doc.text(clientName, pageWidth - 20, clientYPos, { align: 'right' });
    clientYPos += 4;
    
    if (devis.clients?.profiles?.email) {
      doc.text(devis.clients.profiles.email, pageWidth - 20, clientYPos, { align: 'right' });
      clientYPos += 4;
    }
    
    if (devis.clients?.profiles?.phone) {
      doc.text(`Tél: ${devis.clients.profiles.phone}`, pageWidth - 20, clientYPos, { align: 'right' });
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
    const pickupLines = doc.splitTextToSize(devis.courses.pickup_address, pageWidth - 55);
    doc.text(pickupLines, 45, yPos);
    yPos += 4 * pickupLines.length;
    
    doc.text("Arrivée:", 20, yPos);
    const destLines = doc.splitTextToSize(devis.courses.destination_address, pageWidth - 55);
    doc.text(destLines, 45, yPos);
    yPos += 4 * destLines.length + 1;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(devis.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    if (devis.courses.distance_km) {
      yPos += 4;
      doc.text("Distance:", 20, yPos);
      doc.text(`${devis.courses.distance_km} km`, 45, yPos);
    }
    
    // Tarification - VERSION SIMPLIFIÉE POUR CLIENT (affichage clair avec majorations)
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    
    // Calcul du HT de base (avant majorations)
    const baseHT = parseFloat(devis.base_price) + 
                   parseFloat(devis.distance_price) + 
                   parseFloat(devis.time_price || 0);
    
    const eveningSurcharge = parseFloat(devis.evening_surcharge_amount || 0);
    const weekendSurcharge = parseFloat(devis.weekend_surcharge_amount || 0);
    
    // Total HT incluant toutes les majorations
    const totalHT = baseHT + eveningSurcharge + weekendSurcharge;
    
    const tvaRate = parseFloat(devis.time_price || 0) > 0 ? 20 : 10;
    const tvaAmount = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + tvaAmount;
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Sous-total HT (base)
    doc.text("Sous-total HT", 20, yPos);
    doc.text(`${baseHT.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    // Majorations (si présentes)
    if (eveningSurcharge > 0) {
      yPos += 6;
      doc.setTextColor(255, 140, 0);
      doc.text("Majoration soirée", 20, yPos);
      doc.text(`+ ${eveningSurcharge.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
      doc.setTextColor(0, 0, 0);
    }
    
    if (weekendSurcharge > 0) {
      yPos += 6;
      doc.setTextColor(255, 140, 0);
      doc.text("Majoration week-end", 20, yPos);
      doc.text(`+ ${weekendSurcharge.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
      doc.setTextColor(0, 0, 0);
    }
    
    // Total HT après majorations
    if (eveningSurcharge > 0 || weekendSurcharge > 0) {
      yPos += 6;
      doc.setFont(undefined, 'bold');
      doc.text("Total HT", 20, yPos);
      doc.text(`${totalHT.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
      doc.setFont(undefined, 'normal');
    }
    
    // TVA
    yPos += 6;
    doc.text(`TVA (${tvaRate}%)`, 20, yPos);
    doc.text(`${tvaAmount.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
    // Ligne de séparation
    yPos += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    // Total TTC
    yPos += 7;
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    // Validité (encadré avec mention 7 jours)
    yPos += 12;
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(1);
    doc.rect(15, yPos - 3, pageWidth - 30, 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 102, 204);
    doc.text(`⏰ Devis valable 7 jours - jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, yPos + 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Pied de page
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL TTC: ${devis.amount.toFixed(2)} €`, 20, yPos);
    
    // Validité
    doc.setFontSize(10);
    yPos += 10;
    doc.text(`Valable jusqu'au ${format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleShareDevis = async (devis: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    try {
      // CORRECTION: Import dynamique sécurisé au lieu de require
      const { generateDevisShareMessage } = await import("@/lib/courseMessageGenerator");
      
      const message = generateDevisShareMessage(
        devis,
        devis.courses,
        devis.drivers,
        devis.clients,
        false // Client partage le devis
      );

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
      toast.success("Message préparé pour partage");
    } catch (error) {
      console.error("Error sharing devis:", error);
      toast.error("Erreur lors de la préparation du partage");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des devis...</p>
      </div>
    );
  }

  if (devisList.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Aucun devis</h3>
        <p className="text-muted-foreground">
          Vos devis apparaîtront ici après qu'un chauffeur ait accepté votre réservation
        </p>
      </Card>
    );
  }

  // Filtrer les devis par statut - exclure ceux liés à des courses annulées des "en attente"
  const pendingDevis = devisList.filter(d => 
    d.status === "pending" && 
    new Date(d.valid_until) >= new Date() &&
    d.courses?.status !== 'cancelled'
  );
  const acceptedDevis = devisList.filter(d => d.status === "accepted");
  const rejectedDevis = devisList.filter(d => d.status === "rejected" || d.courses?.status === 'cancelled');

  const renderDevisCard = (devis: any) => {
    const isExpired = new Date(devis.valid_until) < new Date();
    const isCourseAnnuled = devis.courses?.status === 'cancelled';
    const canAccept = devis.status === "pending" && !isExpired && !isCourseAnnuled;

    return (
      <Card key={devis.id} className="p-6 hover:shadow-elegant transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">Devis {devis.quote_number}</h3>
              {getStatusBadge(devis.status, devis.valid_until, devis.courses?.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Chauffeur : {devis.drivers?.profiles?.full_name}
              {devis.drivers?.company_name && ` • ${devis.drivers.company_name}`}
            </p>
          </div>
        </div>

        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground min-w-[80px]">Départ :</span>
            <span className="text-foreground/80">{devis.courses.pickup_address}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground min-w-[80px]">Arrivée :</span>
            <span className="text-foreground/80">{devis.courses.destination_address}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground min-w-[80px]">Date :</span>
            <span className="text-foreground/80">
              {format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
          {devis.courses.distance_km && (
            <div className="flex items-start gap-2">
              <span className="font-semibold text-foreground min-w-[80px]">Distance :</span>
              <span className="text-foreground/80">{devis.courses.distance_km} km</span>
            </div>
          )}
        </div>

        {/* Prix simplifié pour le client - pas de détail des tarifs */}
        <div className="border border-border rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Euro className="w-4 h-4" />
            Prix de la course
          </h4>
          <div className="space-y-2 text-sm">
            {devis.courses.distance_km && (
              <div className="flex justify-between text-muted-foreground">
                <span>Distance</span>
                <span>{devis.courses.distance_km} km</span>
              </div>
            )}
            {devis.courses.duration_minutes && (
              <div className="flex justify-between text-muted-foreground">
                <span>Durée estimée</span>
                <span>~{devis.courses.duration_minutes} min</span>
              </div>
            )}
            {devis.promo_code && devis.discount_amount > 0 && (
              <div className="flex justify-between text-success">
                <span>Réduction ({devis.promo_code})</span>
                <span>-{parseFloat(devis.discount_amount).toFixed(2)} €</span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span className="text-premium">{parseFloat(devis.amount).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-4">
          {isExpired ? (
            <span className="text-destructive">Devis expiré</span>
          ) : (
            <span>Valable jusqu'au {format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}</span>
          )}
        </div>

        {devis.status === "rejected" && devis.notes && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-destructive font-medium mb-1">Motif du refus :</p>
            <p className="text-sm text-muted-foreground">{devis.notes}</p>
          </div>
        )}

        {/* Boutons de partage et téléchargement - toujours visibles */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadDevis(devis)}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShareDevis(devis, 'whatsapp')}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShareDevis(devis, 'email')}
            className="flex-1"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShareDevis(devis, 'sms')}
            className="flex-1"
          >
            <Share2 className="w-4 h-4 mr-2" />
            SMS
          </Button>
        </div>

        {canAccept && (
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={() => handleAccept(devis.id)}
              className="flex-1 bg-gradient-premium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accepter le devis
            </Button>
            <Button
              onClick={() => openRejectDialog(devis.id)}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Refuser
            </Button>
          </div>
        )}

        {devis.status === "accepted" && (
          <div className="pt-4 border-t border-border text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Devis accepté le {format(new Date(devis.accepted_at), "d MMMM yyyy", { locale: fr })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <>
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Refuser le devis</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du refus. Cette information sera transmise au chauffeur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup value={rejectReason} onValueChange={setRejectReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Prix trop élevé" id="price" />
                <Label htmlFor="price" className="cursor-pointer">Prix trop élevé</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Distance trop importante" id="distance" />
                <Label htmlFor="distance" className="cursor-pointer">Distance trop importante</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="L'horaire ne me convient pas" id="time" />
                <Label htmlFor="time" className="cursor-pointer">L'horaire ne me convient pas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Je souhaite changer l'horaire" id="reschedule" />
                <Label htmlFor="reschedule" className="cursor-pointer">Je souhaite changer l'horaire</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Je ne souhaite plus effectuer cette course" id="cancel" />
                <Label htmlFor="cancel" className="cursor-pointer">Je ne souhaite plus effectuer cette course</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Autre" id="other" />
                <Label htmlFor="other" className="cursor-pointer">Autre raison</Label>
              </div>
            </RadioGroup>

            {rejectReason === "Autre" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Précisez la raison</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Décrivez votre raison..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            En attente ({pendingDevis.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Acceptés ({acceptedDevis.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Refusés ({rejectedDevis.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDevis.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun devis en attente</h3>
              <p className="text-muted-foreground">
                Les devis envoyés par votre chauffeur apparaîtront ici
              </p>
            </Card>
          ) : (
            pendingDevis.map(renderDevisCard)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4">
          {acceptedDevis.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun devis accepté</h3>
              <p className="text-muted-foreground">
                Les devis que vous avez acceptés apparaîtront ici
              </p>
            </Card>
          ) : (
            acceptedDevis.map(renderDevisCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedDevis.length === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun devis refusé</h3>
              <p className="text-muted-foreground">
                Les devis que vous avez refusés apparaîtront ici
              </p>
            </Card>
          ) : (
            rejectedDevis.map(renderDevisCard)
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default DevisList;
