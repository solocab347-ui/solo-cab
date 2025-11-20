import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, Clock, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
            profiles:user_id(full_name, profile_photo_url)
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
      const { error } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devisId);

      if (error) throw error;

      toast.success("Devis accepté ! Votre chauffeur va être notifié.");
      fetchDevis();
    } catch (error: any) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation du devis");
    }
  };

  const handleReject = async (devisId: string) => {
    try {
      const { error } = await supabase
        .from("devis")
        .update({ status: "rejected" })
        .eq("id", devisId);

      if (error) throw error;
      toast.success("Devis refusé");
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

  return (
    <div className="space-y-4">
      {devisList.map((devis) => {
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

            {/* Course Details */}
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

            {/* Price Breakdown */}
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

            {/* Validity */}
            <div className="text-xs text-muted-foreground mb-4">
              {isExpired ? (
                <span className="text-destructive">Devis expiré</span>
              ) : (
                <span>Valable jusqu'au {format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}</span>
              )}
            </div>

            {/* Actions */}
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
                  onClick={() => handleReject(devis.id)}
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
      })}
    </div>
  );
};

export default DevisList;
