import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Wallet,
  Users,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  Euro,
  Loader2,
  TrendingUp,
  Car
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetPartnerCommissionsProps {
  fleetManagerId: string;
}

interface PartnerCommission {
  partnership_id: string;
  driver_id: string;
  driver_name: string;
  driver_photo: string | null;
  commission_percentage: number;
  payment_schedule: string;
  total_owed: number;
  total_paid: number;
  next_payment_date: string | null;
  partnership_suspended: boolean;
}

export const FleetPartnerCommissions = ({ fleetManagerId }: FleetPartnerCommissionsProps) => {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);

  useEffect(() => {
    if (fleetManagerId) {
      fetchCommissions();
    }
  }, [fleetManagerId]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      // Get active partnerships with drivers
      const { data: partnerships, error } = await supabase
        .from("fleet_driver_partnerships")
        .select(`
          id,
          driver_id,
          commission_percentage,
          payment_schedule,
          total_owed,
          total_paid,
          next_payment_date,
          partnership_suspended
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted")
        .eq("contract_signed", true);

      if (error) throw error;

      if (partnerships && partnerships.length > 0) {
        // Get driver info
        const driverIds = partnerships.map(p => p.driver_id);
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id, user_id")
          .in("id", driverIds);

        if (drivers) {
          const userIds = drivers.map(d => d.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", userIds);

          const commissionsData: PartnerCommission[] = partnerships.map(p => {
            const driver = drivers.find(d => d.id === p.driver_id);
            const profile = profiles?.find(pr => pr.id === driver?.user_id);
            return {
              partnership_id: p.id,
              driver_id: p.driver_id,
              driver_name: profile?.full_name || "Chauffeur",
              driver_photo: profile?.profile_photo_url || null,
              commission_percentage: p.commission_percentage,
              payment_schedule: p.payment_schedule || "per_course",
              total_owed: p.total_owed || 0,
              total_paid: p.total_paid || 0,
              next_payment_date: p.next_payment_date,
              partnership_suspended: p.partnership_suspended || false
            };
          });
          setCommissions(commissionsData);
        }
      } else {
        setCommissions([]);
      }
    } catch (error) {
      console.error("Error fetching partner commissions:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "Par course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return schedule;
    }
  };

  const totalOwed = commissions.reduce((sum, c) => sum + (c.total_owed || 0), 0);
  const totalReceived = commissions.reduce((sum, c) => sum + (c.total_paid || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résumé global */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-warning/20">
                <Wallet className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À recevoir</p>
                <p className="text-2xl font-bold">{totalOwed.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total reçu</p>
                <p className="text-2xl font-bold">{totalReceived.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-info/20">
                <Users className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partenaires actifs</p>
                <p className="text-2xl font-bold">{commissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste par chauffeur partenaire */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Commissions par Partenaire
          </CardTitle>
          <CardDescription>
            Suivez les commissions dues par vos chauffeurs partenaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun partenariat actif avec commission</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissions.map((commission) => (
                <Card 
                  key={commission.partnership_id} 
                  className={`border-border/50 ${
                    commission.partnership_suspended ? "opacity-60 border-destructive/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={commission.driver_photo || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                          {commission.driver_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{commission.driver_name}</h3>
                          {commission.partnership_suspended && (
                            <Badge variant="destructive" className="text-xs">Suspendu</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {commission.commission_percentage}% commission
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {getPaymentScheduleLabel(commission.payment_schedule)}
                          </Badge>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 rounded bg-warning/10 border border-warning/20">
                            <p className="text-xs text-muted-foreground">À recevoir</p>
                            <p className="font-semibold text-warning">
                              {commission.total_owed.toFixed(2)} €
                            </p>
                          </div>
                          <div className="p-2 rounded bg-success/10 border border-success/20">
                            <p className="text-xs text-muted-foreground">Déjà reçu</p>
                            <p className="font-semibold text-success">
                              {commission.total_paid.toFixed(2)} €
                            </p>
                          </div>
                        </div>

                        {commission.next_payment_date && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Prochain paiement: {format(new Date(commission.next_payment_date), "dd MMM yyyy", { locale: fr })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
