import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Euro, 
  FileCheck, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Wallet,
  HandCoins
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetCommissionTrackerProps {
  fleetManagerId: string;
}

interface DriverCommissionData {
  driver_id: string;
  name: string;
  photo: string | null;
  vehicle: string;
  commission_percentage: number;
  is_salaried: boolean;
  payment_schedule: string;
  payment_agreement_signed: boolean;
  last_payment_date: string | null;
  // Calculated
  total_revenue: number;
  commission_owed: number;
  courses_count: number;
  unpaid_courses: number;
}

export const FleetCommissionTracker = ({ fleetManagerId }: FleetCommissionTrackerProps) => {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverCommissionData[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverCommissionData | null>(null);
  const [showAgreementDialog, setShowAgreementDialog] = useState(false);
  const [signingAgreement, setSigningAgreement] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Get drivers with commission data
      const { data: fmdData, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          commission_percentage,
          commission_type,
          is_salaried,
          payment_schedule,
          payment_agreement_signed,
          last_payment_date,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (error) throw error;

      if (!fmdData || fmdData.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driverUserIds = fmdData
        .filter(d => d.driver)
        .map(d => (d.driver as any).user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", driverUserIds);

      // Get invoices for revenue calculation
      const driverIds = fmdData.map(d => d.driver_id);
      const { data: factures } = await supabase
        .from("factures")
        .select("*")
        .in("driver_id", driverIds)
        .eq("payment_status", "paid");

      // Calculate commissions per driver
      const driversWithCommissions: DriverCommissionData[] = fmdData
        .filter(d => !d.is_salaried && d.commission_percentage > 0)
        .map(d => {
          const profile = profiles?.find(p => p.id === (d.driver as any)?.user_id);
          const driverFactures = factures?.filter(f => f.driver_id === d.driver_id) || [];
          
          // Calculate based on payment schedule
          let unpaidFactures = driverFactures;
          if (d.last_payment_date) {
            unpaidFactures = driverFactures.filter(
              f => new Date(f.created_at) > new Date(d.last_payment_date!)
            );
          }

          const totalRevenue = unpaidFactures.reduce((sum, f) => sum + (f.amount || 0), 0);
          const commissionOwed = totalRevenue * (d.commission_percentage / 100);

          return {
            driver_id: d.driver_id,
            name: profile?.full_name || "Chauffeur",
            photo: profile?.profile_photo_url || null,
            vehicle: `${(d.driver as any)?.vehicle_brand || ""} ${(d.driver as any)?.vehicle_model || ""}`.trim(),
            commission_percentage: d.commission_percentage,
            is_salaried: d.is_salaried || false,
            payment_schedule: d.payment_schedule || "per_course",
            payment_agreement_signed: d.payment_agreement_signed || false,
            last_payment_date: d.last_payment_date,
            total_revenue: totalRevenue,
            commission_owed: commissionOwed,
            courses_count: driverFactures.length,
            unpaid_courses: unpaidFactures.length,
          };
        });

      setDrivers(driversWithCommissions);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async (driverId: string, schedule: string) => {
    setSigningAgreement(true);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          payment_schedule: schedule,
          payment_agreement_signed: true,
          payment_agreement_signed_at: new Date().toISOString(),
        })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("driver_id", driverId);

      if (error) throw error;

      toast.success("Accord de paiement signé");
      setShowAgreementDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la signature");
    } finally {
      setSigningAgreement(false);
    }
  };

  const handleMarkPaid = async (driverId: string) => {
    setMarkingPaid(driverId);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          last_payment_date: new Date().toISOString(),
        })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("driver_id", driverId);

      if (error) throw error;

      toast.success("Commissions marquées comme payées");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setMarkingPaid(null);
    }
  };

  const getScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case "per_course": return "Par course";
      case "weekly": return "Hebdomadaire";
      case "monthly": return "Mensuel";
      default: return schedule;
    }
  };

  const getTotalOwed = () => {
    return drivers.reduce((sum, d) => sum + d.commission_owed, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/20 rounded-xl">
                <HandCoins className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total commissions à récupérer</p>
                <p className="text-2xl font-bold text-success">{getTotalOwed().toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chauffeurs à commission</p>
                <p className="text-2xl font-bold">{drivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note about TVA */}
      <Card className="bg-info/5 border-info/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-info mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-info">TVA automatique</p>
              <p className="text-muted-foreground">
                TVA à 10% pour les courses classiques, 20% pour les mises à disposition.
                Ces taux sont appliqués automatiquement lors du calcul des prix.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {drivers.length === 0 ? (
        <Card className="p-12 text-center">
          <Euro className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            Aucun chauffeur indépendant avec commission configurée
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {drivers.map((driver) => (
            <Card key={driver.driver_id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={driver.photo || ""} />
                    <AvatarFallback>
                      {driver.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{driver.name}</h4>
                        <p className="text-sm text-muted-foreground">{driver.vehicle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {driver.payment_agreement_signed ? (
                          <Badge variant="secondary" className="bg-success/20 text-success gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Accord signé
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sans accord
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {driver.commission_percentage}% commission
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {driver.total_revenue.toFixed(0)}€
                        </p>
                        <p className="text-xs text-muted-foreground">CA depuis dernier paiement</p>
                      </div>
                      <div className="text-center p-3 bg-success/10 rounded-lg">
                        <p className="text-2xl font-bold text-success">
                          {driver.commission_owed.toFixed(2)}€
                        </p>
                        <p className="text-xs text-muted-foreground">À récupérer</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{driver.unpaid_courses}</p>
                        <p className="text-xs text-muted-foreground">Courses non réglées</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getScheduleLabel(driver.payment_schedule)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {driver.last_payment_date 
                            ? `Dernier: ${format(new Date(driver.last_payment_date), "dd/MM/yyyy", { locale: fr })}`
                            : "Jamais payé"
                          }
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2 justify-end">
                      {!driver.payment_agreement_signed && (
                        <Dialog open={showAgreementDialog && selectedDriver?.driver_id === driver.driver_id} onOpenChange={(open) => {
                          setShowAgreementDialog(open);
                          if (open) setSelectedDriver(driver);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <FileCheck className="w-4 h-4" />
                              Signer accord
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Accord de paiement des commissions</DialogTitle>
                              <DialogDescription>
                                Définissez les modalités de paiement avec {driver.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <p className="text-sm font-medium mb-2">Fréquence de paiement</p>
                                <Select
                                  defaultValue={driver.payment_schedule}
                                  onValueChange={(value) => {
                                    if (selectedDriver) {
                                      setSelectedDriver({ ...selectedDriver, payment_schedule: value });
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="per_course">Par course (après chaque course)</SelectItem>
                                    <SelectItem value="weekly">Hebdomadaire (chaque semaine)</SelectItem>
                                    <SelectItem value="monthly">Mensuel (fin de mois)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Card className="bg-muted/50">
                                <CardContent className="py-3 text-sm">
                                  <p className="font-medium">Résumé de l'accord</p>
                                  <ul className="mt-2 space-y-1 text-muted-foreground">
                                    <li>• Commission: {driver.commission_percentage}%</li>
                                    <li>• Fréquence: {getScheduleLabel(selectedDriver?.payment_schedule || driver.payment_schedule)}</li>
                                    <li>• Le chauffeur doit vous reverser ce pourcentage sur chaque course</li>
                                  </ul>
                                </CardContent>
                              </Card>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setShowAgreementDialog(false)}
                              >
                                Annuler
                              </Button>
                              <Button
                                onClick={() => handleSignAgreement(
                                  driver.driver_id,
                                  selectedDriver?.payment_schedule || driver.payment_schedule
                                )}
                                disabled={signingAgreement}
                              >
                                {signingAgreement && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Confirmer l'accord
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      {driver.commission_owed > 0 && (
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => handleMarkPaid(driver.driver_id)}
                          disabled={markingPaid === driver.driver_id}
                        >
                          {markingPaid === driver.driver_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Marquer comme payé
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};