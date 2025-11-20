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
            pickup_address,
            destination_address,
            scheduled_date,
            distance_km,
            duration_minutes
          ),
          drivers!inner(
            company_name,
            company_address,
            siret,
            profiles:user_id(full_name, phone, profile_photo_url)
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevisList(data || []);
    } catch (error: any) {
      console.error("Error fetching devis:", error);
      toast.error("Erreur lors du chargement des devis");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("devis-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devis",
        },
        () => fetchDevis()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAccept = async (devisId: string) => {
    try {
      toast.loading("Redirection vers le paiement...");
      
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: { devis_id: devisId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast.error("Erreur lors de la création de la session de paiement");
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

  const getStatusBadge = (status: string, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date();
    
    if (isExpired && status === "pending") {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          Expiré
        </Badge>
      );
    }

    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      expired: "bg-muted text-muted-foreground border-border",
    };

    const labels = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
      expired: "Expiré",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
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
    
    // Informations Chauffeur (à gauche) - CLIENT VERSION (moins de détails)
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
    }
    if (devis.drivers?.profiles?.phone) {
      doc.text(`Tél: ${devis.drivers.profiles.phone}`, 20, yPos);
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
    
    // Tarification - VERSION SIMPLIFIÉE POUR CLIENT (sans détails des calculs)
    yPos = 155;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    
    // Calcul TVA
    const totalHT = parseFloat(devis.base_price) + parseFloat(devis.distance_price) + parseFloat(devis.time_price || 0);
    const tvaRate = parseFloat(devis.time_price || 0) > 0 ? 20 : 10;
    const tvaAmount = totalHT * (tvaRate / 100);
    const totalTTC = totalHT + tvaAmount;
    
    yPos += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // Total HT
    doc.text("Montant HT", 20, yPos);
    doc.text(`${totalHT.toFixed(2)} €`, pageWidth - 20, yPos, { align: "right" });
    
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
    doc.text(`TOTAL TTC: ${devis.amount.toFixed(2)} €`, 20, yPos);
    
    // Validité
    doc.setFontSize(10);
    yPos += 10;
    doc.text(`Valable jusqu'au ${format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}`, 20, yPos);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleShareDevis = (devis: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const message = `Devis ${devis.quote_number}\n` +
                   `Trajet: ${devis.courses.pickup_address} → ${devis.courses.destination_address}\n` +
                   `Date: ${format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}\n` +
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

  // Filtrer les devis par statut
  const pendingDevis = devisList.filter(d => d.status === "pending" && new Date(d.valid_until) >= new Date());
  const acceptedDevis = devisList.filter(d => d.status === "accepted");
  const rejectedDevis = devisList.filter(d => d.status === "rejected");

  const renderDevisCard = (devis: any) => {
    const isExpired = new Date(devis.valid_until) < new Date();
    const canAccept = devis.status === "pending" && !isExpired;

    return (
      <Card key={devis.id} className="p-6 hover:shadow-elegant transition-all">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">Devis {devis.quote_number}</h3>
              {getStatusBadge(devis.status, devis.valid_until)}
            </div>
            <p className="text-sm text-muted-foreground">
              Chauffeur : {devis.drivers?.profiles?.full_name}
              {devis.drivers?.company_name && ` • ${devis.drivers.company_name}`}
            </p>
          </div>
        </div>

        <div className="bg-secondary rounded-lg p-4 mb-4 space-y-2 text-sm">
          <div>
            <span className="font-medium">Départ :</span>
            <span className="text-muted-foreground ml-2">{devis.courses.pickup_address}</span>
          </div>
          <div>
            <span className="font-medium">Arrivée :</span>
            <span className="text-muted-foreground ml-2">{devis.courses.destination_address}</span>
          </div>
          <div>
            <span className="font-medium">Date :</span>
            <span className="text-muted-foreground ml-2">
              {format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
          </div>
          {devis.courses.distance_km && (
            <div>
              <span className="font-medium">Distance :</span>
              <span className="text-muted-foreground ml-2">{devis.courses.distance_km} km</span>
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Euro className="w-4 h-4" />
            Détail du prix
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forfait de base</span>
              <span className="font-medium">{parseFloat(devis.base_price).toFixed(2)} €</span>
            </div>
            {parseFloat(devis.distance_price) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix au kilomètre</span>
                <span className="font-medium">{parseFloat(devis.distance_price).toFixed(2)} €</span>
              </div>
            )}
            {parseFloat(devis.time_price || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix horaire</span>
                <span className="font-medium">{parseFloat(devis.time_price).toFixed(2)} €</span>
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
