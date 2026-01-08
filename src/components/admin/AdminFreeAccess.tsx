import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Gift, User, Calendar, Clock, XCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Driver {
  id: string;
  user_id: string;
  free_access_granted: boolean;
  free_access_start_date: string | null;
  free_access_end_date: string | null;
  free_access_type: string | null;
  subscription_stripe_id: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface FleetManager {
  id: string;
  user_id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
  free_access_granted: boolean;
  free_access_start_date: string | null;
  free_access_end_date: string | null;
  free_access_type: string | null;
  subscription_stripe_id: string | null;
  trial_ends_at: string | null;
}

const AdminFreeAccess = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fleetManagers, setFleetManagers] = useState<FleetManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchDriversWithFreeAccess(), fetchFleetManagersWithFreeAccess()]);
    setLoading(false);
  };

  const fetchDriversWithFreeAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          free_access_granted,
          free_access_start_date,
          free_access_end_date,
          free_access_type,
          subscription_stripe_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("free_access_granted", true)
        .order("free_access_start_date", { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchFleetManagersWithFreeAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select(`
          id,
          user_id,
          company_name,
          contact_email,
          contact_name,
          free_access_granted,
          free_access_start_date,
          free_access_end_date,
          free_access_type,
          subscription_stripe_id,
          trial_ends_at
        `)
        .eq("free_access_granted", true)
        .order("free_access_start_date", { ascending: false });

      if (error) throw error;
      setFleetManagers(data || []);
    } catch (error: any) {
      console.error("Error fetching fleet managers:", error);
    }
  };

  const handleSuspendDriverFreeAccess = async (driver: Driver) => {
    setSuspending(driver.id);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          free_access_granted: false,
          free_access_start_date: null,
          free_access_end_date: null,
          free_access_type: null,
        })
        .eq("id", driver.id);

      if (error) throw error;

      if (driver.subscription_stripe_id) {
        await supabase.functions.invoke("manage-driver-subscription", {
          body: { driver_id: driver.id, action: "resume" },
        });
      }

      toast.success("Accès gratuit suspendu avec succès");
      fetchDriversWithFreeAccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur lors de la suspension");
    } finally {
      setSuspending(null);
    }
  };

  const handleSuspendFleetManagerFreeAccess = async (fm: FleetManager) => {
    setSuspending(fm.id);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          free_access_granted: false,
          free_access_start_date: null,
          free_access_end_date: null,
          free_access_type: null,
          subscription_status: "inactive",
          subscription_paid: false,
        })
        .eq("id", fm.id);

      if (error) throw error;

      toast.success("Accès gratuit gestionnaire suspendu");
      fetchFleetManagersWithFreeAccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur lors de la suspension");
    } finally {
      setSuspending(null);
    }
  };

  const getDurationLabel = (type: string | null) => {
    switch (type) {
      case "1_month": return "1 mois";
      case "2_months": return "2 mois";
      case "3_months": return "3 mois";
      case "6_months": return "6 mois";
      case "unlimited": return "Illimité";
      case "trial": return "Essai";
      case "custom": return "Personnalisé";
      default: return "Non défini";
    }
  };

  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const remaining = differenceInDays(new Date(endDate), new Date());
    return remaining > 0 ? remaining : 0;
  };

  const getStatusBadge = (endDate: string | null, type: string | null) => {
    if (type === "unlimited" || !endDate) {
      return <Badge className="bg-green-500">Illimité</Badge>;
    }
    
    const remaining = getRemainingDays(endDate);
    if (remaining === null || remaining === 0) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    if (remaining <= 7) {
      return <Badge className="bg-yellow-500">Expire bientôt</Badge>;
    }
    return <Badge className="bg-green-500">Actif</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Accès Gratuits</h2>
            <p className="text-muted-foreground">
              {drivers.length} chauffeur{drivers.length !== 1 ? "s" : ""} • {fleetManagers.length} gestionnaire{fleetManagers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Tabs defaultValue="drivers" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="drivers" className="gap-2">
              <User className="w-4 h-4" />
              Chauffeurs ({drivers.length})
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Building2 className="w-4 h-4" />
              Gestionnaires ({fleetManagers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <div className="space-y-3">
              {drivers.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun accès gratuit chauffeur en cours</p>
                </div>
              ) : (
                drivers.map((driver) => {
                  const profile = driver.profiles as any;
                  const remainingDays = getRemainingDays(driver.free_access_end_date);

                  return (
                    <Card key={driver.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{profile?.full_name || "Non renseigné"}</p>
                            <p className="text-sm text-muted-foreground mb-2">{profile?.email}</p>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              {getStatusBadge(driver.free_access_end_date, driver.free_access_type)}
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {getDurationLabel(driver.free_access_type)}
                              </div>

                              {driver.free_access_start_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Début: {format(new Date(driver.free_access_start_date), "dd/MM/yyyy", { locale: fr })}
                                </div>
                              )}

                              {driver.free_access_end_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Fin: {format(new Date(driver.free_access_end_date), "dd/MM/yyyy", { locale: fr })}
                                </div>
                              )}

                              {remainingDays !== null && remainingDays > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {remainingDays} jour{remainingDays > 1 ? "s" : ""} restant{remainingDays > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={suspending === driver.id}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Suspendre
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspendre l'accès gratuit</AlertDialogTitle>
                              <AlertDialogDescription>
                                Suspendre l'accès de {profile?.full_name} ? L'abonnement Stripe sera réactivé si existant.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSuspendDriverFreeAccess(driver)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Suspendre
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="fleet">
            <div className="space-y-3">
              {fleetManagers.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun accès gratuit gestionnaire en cours</p>
                </div>
              ) : (
                fleetManagers.map((fm) => {
                  const remainingDays = getRemainingDays(fm.free_access_end_date);

                  return (
                    <Card key={fm.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{fm.company_name}</p>
                            <p className="text-sm text-muted-foreground mb-2">{fm.contact_name} • {fm.contact_email}</p>
                            
                            <div className="flex flex-wrap items-center gap-3">
                              {getStatusBadge(fm.free_access_end_date, fm.free_access_type)}
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {getDurationLabel(fm.free_access_type)}
                              </div>

                              {fm.free_access_start_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Début: {format(new Date(fm.free_access_start_date), "dd/MM/yyyy", { locale: fr })}
                                </div>
                              )}

                              {fm.free_access_end_date && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Fin: {format(new Date(fm.free_access_end_date), "dd/MM/yyyy", { locale: fr })}
                                </div>
                              )}

                              {remainingDays !== null && remainingDays > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {remainingDays} jour{remainingDays > 1 ? "s" : ""} restant{remainingDays > 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={suspending === fm.id}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Suspendre
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspendre l'accès gratuit</AlertDialogTitle>
                              <AlertDialogDescription>
                                Suspendre l'accès de {fm.company_name} ? Le gestionnaire devra souscrire un abonnement.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSuspendFleetManagerFreeAccess(fm)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Suspendre
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminFreeAccess;
