import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Clock, Euro, Download, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface CompanyDevisListProps {
  companyId: string;
}

export const CompanyDevisList = ({ companyId }: CompanyDevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDevisId, setSelectedDevisId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  useEffect(() => {
    fetchDevis();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [companyId]);

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
            profiles:user_id(full_name, phone)
          )
        `)
        .eq("company_id", companyId)
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
    if (!companyId) return () => {};

    return subscriptionManager.subscribe(
      `devis-company-${companyId}`,
      {
        table: "devis",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 1000
      },
      () => fetchDevis()
    );
  };

  const handleAccept = async (devisId: string) => {
    try {
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
      const isDriverCreated = course.created_by_user_id === driverUserId;

      // Accepter le devis
      const { error: updateError } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devisId);

      if (updateError) throw updateError;

      if (isDriverCreated) {
        // Chauffeur a créé → Course confirmée directement
        const { error: courseError } = await supabase
          .from("courses")
          .update({ status: "accepted" })
          .eq("id", course.id);

        if (courseError) throw courseError;

        await supabase.from("notifications").insert({
          user_id: driverUserId,
          title: "Devis accepté !",
          message: `L'entreprise a accepté votre devis ${devisData.quote_number}. La course est confirmée.`,
          type: "devis_accepted",
          link: "/driver-dashboard?tab=courses"
        });

        toast.success("Devis accepté ! Course confirmée.");
      } else {
        // Entreprise a créé → Chauffeur doit accepter
        await supabase.from("notifications").insert({
          user_id: driverUserId,
          title: "Nouveau devis accepté",
          message: `L'entreprise a accepté le devis ${devisData.quote_number}. Vous devez maintenant accepter la course.`,
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
    if (!selectedDevisId || !rejectReason) {
      toast.error("Veuillez sélectionner une raison de refus");
      return;
    }

    if (rejectReason === "Autre" && !customReason.trim()) {
      toast.error("Veuillez préciser la raison du refus");
      return;
    }

    try {
      const finalReason = rejectReason === "Autre" ? customReason : rejectReason;

      const { error } = await supabase
        .from("devis")
        .update({ 
          status: "rejected",
          notes: finalReason
        })
        .eq("id", selectedDevisId);

      if (error) throw error;

      const { data: devisData } = await supabase
        .from("devis")
        .select(`quote_number, drivers!inner(user_id)`)
        .eq("id", selectedDevisId)
        .single();

      if (devisData) {
        await supabase.from("notifications").insert({
          user_id: devisData.drivers.user_id,
          title: "Devis refusé",
          message: `Le devis ${devisData.quote_number} a été refusé. Raison : ${finalReason}`,
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

    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Accepté",
      rejected: "Refusé",
    };

    return (
      <Badge variant="outline" className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const handleDownloadDevis = (devis: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
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
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    yPos += 5;
    
    const driverName = devis.drivers?.profiles?.full_name || devis.drivers?.company_name || "N/A";
    doc.text(driverName, 20, yPos);
    yPos += 4;
    
    if (devis.drivers?.company_name) {
      doc.text(devis.drivers.company_name, 20, yPos);
      yPos += 4;
    }
    
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
    doc.text(devis.courses.pickup_address, 45, yPos);
    yPos += 4;
    
    doc.text("Arrivée:", 20, yPos);
    doc.text(devis.courses.destination_address, 45, yPos);
    yPos += 4;
    
    doc.text("Date:", 20, yPos);
    doc.text(format(new Date(devis.courses.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 45, yPos);
    
    yPos = 155;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(0, 102, 204);
    doc.rect(15, yPos - 3, pageWidth - 30, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL TTC", 20, yPos + 2);
    doc.text(`${devis.amount.toFixed(2)} €`, pageWidth - 20, yPos + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);
    
    doc.save(`devis-${devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const pendingDevis = devisList.filter(d => d.status === "pending" && new Date(d.valid_until) > new Date());
  const acceptedDevis = devisList.filter(d => d.status === "accepted");
  const rejectedDevis = devisList.filter(d => d.status === "rejected" || (d.status === "pending" && new Date(d.valid_until) < new Date()));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Mes devis</h2>
        <p className="text-sm text-muted-foreground">Acceptez ou refusez les devis reçus</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            En attente ({pendingDevis.length})
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Acceptés ({acceptedDevis.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Refusés/Expirés ({rejectedDevis.length})
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
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Aucun devis</h3>
                  <p className="text-muted-foreground">
                    {key === "pending" && "Aucun devis en attente de votre décision."}
                    {key === "accepted" && "Aucun devis accepté."}
                    {key === "rejected" && "Aucun devis refusé ou expiré."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.map((devis) => (
                  <Card key={devis.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="font-medium">Devis n°{devis.quote_number}</span>
                            {getStatusBadge(devis.status, devis.valid_until)}
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-medium">{devis.courses.pickup_address}</p>
                                <p className="text-muted-foreground">→ {devis.courses.destination_address}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {format(new Date(devis.courses.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-sm text-muted-foreground">Chauffeur:</span>
                            <span className="text-sm font-medium">
                              {devis.drivers?.profiles?.full_name || devis.drivers?.company_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{devis.amount.toFixed(2)} €</p>
                            <p className="text-xs text-muted-foreground">
                              Valide jusqu'au {format(new Date(devis.valid_until), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadDevis(devis)}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>

                            {devis.status === "pending" && new Date(devis.valid_until) > new Date() && (
                              <>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => openRejectDialog(devis.id)}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Refuser
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleAccept(devis.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Accepter
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Dialog de refus */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser ce devis</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du refus. Le chauffeur sera notifié.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={rejectReason} onValueChange={setRejectReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Prix trop élevé" id="r1" />
                <Label htmlFor="r1">Prix trop élevé</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Date ne convient pas" id="r2" />
                <Label htmlFor="r2">Date ne convient pas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Changement de plan" id="r3" />
                <Label htmlFor="r3">Changement de plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Autre" id="r4" />
                <Label htmlFor="r4">Autre</Label>
              </div>
            </RadioGroup>

            {rejectReason === "Autre" && (
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Précisez la raison..."
                className="mt-4"
              />
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
    </div>
  );
};
