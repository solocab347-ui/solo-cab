import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Clock, Download, MessageCircle, Mail } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

interface DevisListProps {
  clientId: string;
}

const DevisList = ({ clientId }: DevisListProps) => {
  const [devisList, setDevisList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevis();
    setupRealtimeSubscription();
  }, [clientId]);

  const fetchDevis = async () => {
    try {
      const { data, error } = await Promise.race([
        supabase
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
          .order("created_at", { ascending: false })
          .limit(50),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Devis query timeout')), 15000)
        )
      ]);

      if (error) throw error;
      setDevisList(data || []);
    } catch (error: any) {
      if (!error?.message?.includes('timeout')) {
        console.error("Error fetching devis:", error);
        toast.error("Erreur lors du chargement des devis");
      }
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!clientId) return () => {};
    return subscriptionManager.subscribe(
      `devis-client-${clientId}`,
      { table: "devis", event: "*", filter: `client_id=eq.${clientId}`, debounceMs: 1000 },
      () => fetchDevis()
    );
  };

  const getStatusBadge = (status: string, courseStatus?: string) => {
    if (courseStatus === 'cancelled') {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Annulé</Badge>;
    }
    const styles: Record<string, { cls: string; label: string }> = {
      accepted: { cls: "bg-green-500/10 text-green-500 border-green-500/20", label: "Confirmé" },
      pending: { cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "En cours" },
      rejected: { cls: "bg-destructive/10 text-destructive border-destructive/20", label: "Annulé" },
    };
    const s = styles[status] || styles.pending;
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  const handleDownloadDevis = (devis: any) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("DEVIS", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`N° ${devis.quote_number}`, 105, 30, { align: "center" });
      doc.setFontSize(10);
      let y = 50;
      if (devis.drivers?.company_name) { doc.text(`Chauffeur : ${devis.drivers.company_name}`, 20, y); y += 7; }
      if (devis.drivers?.profiles?.full_name) { doc.text(`Nom : ${devis.drivers.profiles.full_name}`, 20, y); y += 7; }
      if (devis.drivers?.siret) { doc.text(`SIRET : ${devis.drivers.siret}`, 20, y); y += 14; }
      doc.text(`Départ : ${devis.courses?.pickup_address}`, 20, y); y += 7;
      doc.text(`Arrivée : ${devis.courses?.destination_address}`, 20, y); y += 7;
      doc.text(`Date : ${format(new Date(devis.courses?.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`, 20, y); y += 14;
      doc.setFontSize(14);
      doc.text(`Total TTC : ${parseFloat(devis.amount).toFixed(2)} €`, 20, y);
      doc.save(`devis-${devis.quote_number}.pdf`);
      toast.success("PDF téléchargé");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleShareDevis = (devis: any, method: 'whatsapp' | 'email') => {
    const text = `Devis ${devis.quote_number} - ${parseFloat(devis.amount).toFixed(2)}€\nDe: ${devis.courses?.pickup_address}\nÀ: ${devis.courses?.destination_address}\nDate: ${format(new Date(devis.courses?.scheduled_date), "d MMM yyyy HH:mm", { locale: fr })}`;
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    } else {
      window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodeURIComponent(text)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (devisList.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Aucun devis</h3>
        <p className="text-muted-foreground">
          Vos devis apparaîtront ici après une réservation
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {devisList.map((devis) => (
        <Card key={devis.id} className="p-6 hover:shadow-elegant transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">Devis {devis.quote_number}</h3>
                {getStatusBadge(devis.status, devis.courses?.status)}
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
              <span className="text-foreground/80">{devis.courses?.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-foreground min-w-[80px]">Arrivée :</span>
              <span className="text-foreground/80">{devis.courses?.destination_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-foreground min-w-[80px]">Date :</span>
              <span className="text-foreground/80">
                {format(new Date(devis.courses?.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
            {devis.courses?.distance_km && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-[80px]">Distance :</span>
                <span className="text-foreground/80">{devis.courses.distance_km} km</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg mb-4">
            <span className="font-semibold">Total TTC</span>
            <span className="text-2xl font-bold text-premium">{parseFloat(devis.amount).toFixed(2)} €</span>
          </div>

          <div className="text-xs text-muted-foreground mb-4">
            Créé le {format(new Date(devis.created_at), "d MMMM yyyy", { locale: fr })}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => handleDownloadDevis(devis)} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShareDevis(devis, 'whatsapp')} className="flex-1">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShareDevis(devis, 'email')} className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DevisList;
