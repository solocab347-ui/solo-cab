import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Gift, User, Calendar, Clock, XCircle } from "lucide-react";
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

const AdminFreeAccess = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState<string | null>(null);

  useEffect(() => {
    fetchDriversWithFreeAccess();
  }, []);

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
      toast.error("Erreur lors du chargement des accès gratuits");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendFreeAccess = async (driver: Driver) => {
    setSuspending(driver.id);
    try {
      // Réactiver l'abonnement Stripe
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

      // Reprendre l'abonnement Stripe si existant
      if (driver.subscription_stripe_id) {
        const { error: stripeError } = await supabase.functions.invoke("manage-driver-subscription", {
          body: {
            driver_id: driver.id,
            action: "resume",
          },
        });

        if (stripeError) {
          console.error("Erreur Stripe:", stripeError);
          toast.error("Accès suspendu mais erreur lors de la reprise de l'abonnement Stripe");
        }
      }

      toast.success("Accès gratuit suspendu avec succès");
      fetchDriversWithFreeAccess();
    } catch (error: any) {
      console.error("Error suspending free access:", error);
      toast.error("Erreur lors de la suspension de l'accès gratuit");
    } finally {
      setSuspending(null);
    }
  };

  const getDurationLabel = (type: string | null) => {
    switch (type) {
      case "1_month":
        return "1 mois";
      case "2_months":
        return "2 mois";
      case "3_months":
        return "3 mois";
      case "unlimited":
        return "Illimité";
      case "custom":
        return "Personnalisé";
      default:
        return "Non défini";
    }
  };

  const getRemainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const remaining = differenceInDays(new Date(endDate), new Date());
    return remaining > 0 ? remaining : 0;
  };

  const getStatusBadge = (endDate: string | null) => {
    if (!endDate) {
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
              {drivers.length} chauffeur{drivers.length > 1 ? "s" : ""} avec accès gratuit
            </p>
          </div>
        </div>

        {/* Liste des chauffeurs avec accès gratuit */}
        <div className="space-y-3">
          {drivers.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun accès gratuit en cours</p>
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
                          {getStatusBadge(driver.free_access_end_date)}
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Durée: {getDurationLabel(driver.free_access_type)}
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
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={suspending === driver.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Suspendre
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Suspendre l'accès gratuit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir suspendre l'accès gratuit de {profile?.full_name} ?
                            <br />
                            <br />
                            L'abonnement Stripe sera automatiquement réactivé si le chauffeur en possède un.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleSuspendFreeAccess(driver)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      </Card>
    </div>
  );
};

export default AdminFreeAccess;
