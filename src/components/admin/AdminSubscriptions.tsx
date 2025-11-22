import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Gift, Search, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Driver {
  id: string;
  user_id: string;
  subscription_status: string;
  subscription_end_date: string | null;
  subscription_stripe_id: string | null;
  free_access_granted: boolean;
  free_access_end_date: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const AdminSubscriptions = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [freeAccessDuration, setFreeAccessDuration] = useState<string>("1_month");
  const [customMonths, setCustomMonths] = useState<string>("1");
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, drivers]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          subscription_status,
          subscription_end_date,
          subscription_stripe_id,
          free_access_granted,
          free_access_end_date,
          created_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("status", "validated")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...drivers];

    // Filtre de recherche par nom ou email
    if (searchTerm) {
      filtered = filtered.filter((driver) => {
        const profile = driver.profiles as any;
        const fullName = profile?.full_name?.toLowerCase() || "";
        const email = profile?.email?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || email.includes(term);
      });
    }

    // Filtre par statut
    if (filterStatus !== "all") {
      filtered = filtered.filter((driver) => {
        if (filterStatus === "active") {
          return driver.subscription_status === "active" && !driver.free_access_granted;
        }
        if (filterStatus === "free_access") {
          return driver.free_access_granted;
        }
        if (filterStatus === "inactive") {
          return driver.subscription_status !== "active" && !driver.free_access_granted;
        }
        return true;
      });
    }

    setFilteredDrivers(filtered);
  };

  const handleGrantFreeAccess = async () => {
    if (!selectedDriver) return;

    setGrantingAccess(true);
    try {
      // Si le chauffeur a un abonnement actif, l'accès gratuit commence après la fin de l'abonnement actuel
      // Sinon, il commence immédiatement
      let startDate: Date;
      
      if (selectedDriver.subscription_end_date && selectedDriver.subscription_status === 'active') {
        // L'accès gratuit commence après la fin de l'abonnement actuel
        startDate = new Date(selectedDriver.subscription_end_date);
      } else {
        // Pas d'abonnement actif, commence immédiatement
        startDate = new Date();
      }

      let endDate: Date | null = null;

      // Calculer la date de fin selon le type d'accès
      if (freeAccessDuration === "1_month") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (freeAccessDuration === "2_months") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 2);
      } else if (freeAccessDuration === "3_months") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (freeAccessDuration === "custom") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(customMonths));
      }
      // Pour "unlimited", endDate reste null

      // Mettre à jour le chauffeur dans la base de données
      const { error } = await supabase
        .from("drivers")
        .update({
          free_access_granted: true,
          free_access_start_date: startDate.toISOString(),
          free_access_end_date: endDate ? endDate.toISOString() : null,
          free_access_type: freeAccessDuration,
        })
        .eq("id", selectedDriver.id);

      if (error) throw error;

      // Suspendre l'abonnement Stripe uniquement si l'accès gratuit commence maintenant
      if (selectedDriver.subscription_stripe_id && startDate <= new Date()) {
        const { error: stripeError } = await supabase.functions.invoke("manage-driver-subscription", {
          body: {
            driver_id: selectedDriver.id,
            action: "pause",
          },
        });

        if (stripeError) {
          console.error("Erreur Stripe:", stripeError);
          toast.error("Accès gratuit accordé mais erreur lors de la suspension Stripe");
        }
      }

      // Envoyer l'email de notification
      try {
        const profile = selectedDriver.profiles as any;
        let durationText = "";
        
        if (freeAccessDuration === "1_month") {
          durationText = "1 mois";
        } else if (freeAccessDuration === "2_months") {
          durationText = "2 mois";
        } else if (freeAccessDuration === "3_months") {
          durationText = "3 mois";
        } else if (freeAccessDuration === "custom") {
          durationText = `${customMonths} mois`;
        } else {
          durationText = "Illimité";
        }

        await supabase.functions.invoke("send-email", {
          body: {
            to: profile?.email,
            type: "driver_free_access",
            data: {
              driverName: profile?.full_name,
              freeAccessDuration: durationText,
              freeAccessStartDate: format(startDate, "dd/MM/yyyy", { locale: fr }),
              freeAccessEndDate: endDate ? format(endDate, "dd/MM/yyyy", { locale: fr }) : null,
            },
          },
        });
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);
        // Ne pas bloquer si l'email échoue
      }

      const startDateStr = format(startDate, "dd/MM/yyyy", { locale: fr });
      if (startDate > new Date()) {
        toast.success(`Accès gratuit programmé à partir du ${startDateStr}`);
      } else {
        toast.success("Accès gratuit accordé avec succès");
      }
      
      setSelectedDriver(null);
      setDialogOpen(false);
      fetchDrivers();
    } catch (error: any) {
      console.error("Error granting free access:", error);
      toast.error("Erreur lors de l'attribution de l'accès gratuit");
    } finally {
      setGrantingAccess(false);
    }
  };

  const getStatusBadge = (driver: Driver) => {
    if (driver.free_access_granted) {
      return <Badge className="bg-green-500">Accès Gratuit</Badge>;
    }
    if (driver.subscription_status === "active") {
      return <Badge className="bg-primary">Abonné</Badge>;
    }
    return <Badge variant="secondary">Inactif</Badge>;
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
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gestion des Abonnements</h2>
            <p className="text-muted-foreground">
              {filteredDrivers.length} chauffeur{filteredDrivers.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Abonnés actifs</SelectItem>
              <SelectItem value="free_access">Accès gratuit</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des chauffeurs */}
        <div className="space-y-3">
          {filteredDrivers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun chauffeur trouvé</p>
          ) : (
            filteredDrivers.map((driver) => {
              const profile = driver.profiles as any;
              return (
                <Card key={driver.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{profile?.full_name || "Non renseigné"}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(driver)}
                          {driver.subscription_end_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              Expire le {format(new Date(driver.subscription_end_date), "dd/MM/yyyy", { locale: fr })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setDialogOpen(true);
                      }}
                      disabled={driver.free_access_granted}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Accès Gratuit
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {/* Dialog d'attribution d'accès gratuit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accorder un accès gratuit</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm font-medium mb-2">Chauffeur</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedDriver.profiles as any)?.full_name} ({(selectedDriver.profiles as any)?.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Durée de l'accès gratuit</p>
                <Select value={freeAccessDuration} onValueChange={setFreeAccessDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_month">1 mois</SelectItem>
                    <SelectItem value="2_months">2 mois</SelectItem>
                    <SelectItem value="3_months">3 mois</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                    <SelectItem value="unlimited">Illimité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {freeAccessDuration === "custom" && (
                <div>
                  <p className="text-sm font-medium mb-2">Nombre de mois</p>
                  <Input
                    type="number"
                    min="1"
                    value={customMonths}
                    onChange={(e) => setCustomMonths(e.target.value)}
                    placeholder="Nombre de mois"
                  />
                </div>
              )}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {selectedDriver.subscription_status === 'active' && selectedDriver.subscription_end_date ? (
                    <>⚠️ L'accès gratuit commencera après la fin de l'abonnement actuel (le {format(new Date(selectedDriver.subscription_end_date), "dd/MM/yyyy", { locale: fr })}) car le chauffeur a déjà payé pour le mois en cours.</>
                  ) : (
                    <>⚠️ L'accès gratuit commencera immédiatement. L'abonnement Stripe sera automatiquement suspendu.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleGrantFreeAccess} disabled={grantingAccess}>
                  {grantingAccess ? "Attribution..." : "Accorder"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
