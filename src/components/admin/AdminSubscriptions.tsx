import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Gift, Search, Calendar, User, RefreshCw, 
  Clock, CheckCircle, XCircle, AlertTriangle, Ban, Loader2, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { DeleteUserDialog } from "./dialogs/DeleteUserDialog";

interface Driver {
  id: string;
  user_id: string;
  subscription_status: string | null;
  subscription_end_date: string | null;
  subscription_stripe_id: string | null;
  subscription_paid: boolean | null;
  free_access_granted: boolean;
  free_access_end_date: string | null;
  free_access_type: string | null;
  created_at: string;
  is_demo_account: boolean;
  status: string | null;
  validation_date: string | null;
  is_pioneer: boolean | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface SubscriptionStats {
  total: number;
  awaitingValidation: number;
  trialing: number;
  active: number;
  pastDue: number;
  canceled: number;
  freeAccess: number;
  noSubscription: number;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, drivers]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          subscription_status,
          subscription_end_date,
          subscription_stripe_id,
          subscription_paid,
          free_access_granted,
          free_access_end_date,
          free_access_type,
          created_at,
          is_demo_account,
          status,
          validation_date,
          is_pioneer,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("is_demo_account", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const validDrivers = (data || []).filter(d => d.profiles) as Driver[];
      setDrivers(validDrivers);
      
      // Calculer les stats avec distinction validation/essai
      // Un utilisateur est "en attente de validation" s'il n'a pas de validation_date
      // et a un statut 'pending' ou 'on_hold'
      const newStats: SubscriptionStats = {
        total: validDrivers.length,
        awaitingValidation: validDrivers.filter(d => 
          !d.validation_date && (d.status === 'pending' || d.status === 'on_hold')
        ).length,
        trialing: validDrivers.filter(d => 
          d.subscription_status === 'trialing' && d.validation_date
        ).length,
        active: validDrivers.filter(d => 
          d.subscription_status === 'active' && !d.free_access_granted && d.validation_date
        ).length,
        pastDue: validDrivers.filter(d => d.subscription_status === 'past_due').length,
        canceled: validDrivers.filter(d => d.subscription_status === 'canceled').length,
        freeAccess: validDrivers.filter(d => d.free_access_granted).length,
        noSubscription: validDrivers.filter(d => 
          !d.subscription_status && !d.free_access_granted && d.validation_date
        ).length,
      };
      setStats(newStats);
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
        const profile = driver.profiles;
        const fullName = profile?.full_name?.toLowerCase() || "";
        const email = profile?.email?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || email.includes(term);
      });
    }

    // Filtre par statut
    if (filterStatus !== "all") {
      filtered = filtered.filter((driver) => {
        switch (filterStatus) {
          case "awaiting_validation":
            return !driver.validation_date && (driver.status === 'pending' || driver.status === 'on_hold');
          case "trialing":
            return driver.subscription_status === "trialing" && driver.validation_date;
          case "active":
            return driver.subscription_status === "active" && !driver.free_access_granted && driver.validation_date;
          case "past_due":
            return driver.subscription_status === "past_due";
          case "canceled":
            return driver.subscription_status === "canceled";
          case "free_access":
            return driver.free_access_granted;
          case "no_subscription":
            return !driver.subscription_status && !driver.free_access_granted && driver.validation_date;
          default:
            return true;
        }
      });
    }

    setFilteredDrivers(filtered);
  };

  const handleGrantFreeAccess = async () => {
    if (!selectedDriver) return;

    setGrantingAccess(true);
    try {
      let startDate: Date;
      
      if (selectedDriver.subscription_end_date && selectedDriver.subscription_status === 'active') {
        startDate = new Date(selectedDriver.subscription_end_date);
      } else {
        startDate = new Date();
      }

      let endDate: Date | null = null;
      // IMPORTANT: Utiliser "time_limited" pour tous les accès temporaires
      // et "unlimited" ou "administrative" pour les accès permanents
      let accessType: string;

      if (freeAccessDuration === "1_month") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        accessType = "time_limited"; // Type normalisé pour le cron job
      } else if (freeAccessDuration === "2_months") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 2);
        accessType = "time_limited";
      } else if (freeAccessDuration === "3_months") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        accessType = "time_limited";
      } else if (freeAccessDuration === "custom") {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(customMonths));
        accessType = "time_limited";
      } else if (freeAccessDuration === "administrative") {
        // Accès administratif = JAMAIS de paiement, protégé
        accessType = "administrative";
        endDate = null; // Pas de date de fin
      } else {
        // "unlimited" = accès pionnier permanent
        accessType = "unlimited";
        endDate = null; // Pas de date de fin
      }

      const { error } = await supabase
        .from("drivers")
        .update({
          free_access_granted: true,
          free_access_start_date: startDate.toISOString(),
          free_access_end_date: endDate ? endDate.toISOString() : null,
          free_access_type: accessType,
          // Garantir l'accès immédiat
          subscription_status: "active",
          subscription_paid: true,
        })
        .eq("id", selectedDriver.id);

      if (error) throw error;

      // Mettre en pause l'abonnement Stripe si existant et accès commence maintenant
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

      try {
        const profile = selectedDriver.profiles;
        let durationText = "";
        
        if (freeAccessDuration === "1_month") durationText = "1 mois";
        else if (freeAccessDuration === "2_months") durationText = "2 mois";
        else if (freeAccessDuration === "3_months") durationText = "3 mois";
        else if (freeAccessDuration === "custom") durationText = `${customMonths} mois`;
        else if (freeAccessDuration === "administrative") durationText = "Illimité (Administratif)";
        else durationText = "Illimité (Pionnier)";

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
    // Vérifier d'abord si en attente de validation
    if (!driver.validation_date && (driver.status === 'pending' || driver.status === 'on_hold')) {
      return (
        <Badge className="bg-orange-500 text-xs">
          <User className="w-3 h-3 mr-1" />
          {driver.status === 'on_hold' ? "En attente" : "À valider"}
        </Badge>
      );
    }

    if (driver.free_access_granted) {
      const isLifetime = driver.free_access_type === "unlimited" || driver.free_access_type === "administrative";
      return (
        <Badge className={`text-xs ${isLifetime ? 'bg-purple-500' : 'bg-emerald-500'}`}>
          <Gift className="w-3 h-3 mr-1" />
          {driver.free_access_type === "administrative" ? "Accès Admin" : isLifetime ? "Accès Illimité" : "Accès Gratuit"}
        </Badge>
      );
    }
    
    switch (driver.subscription_status) {
      case "trialing":
        return (
          <Badge className="bg-sky-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Essai gratuit
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-primary text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Abonné
          </Badge>
        );
      case "past_due":
        return (
          <Badge className="bg-amber-500 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Paiement en retard
          </Badge>
        );
      case "canceled":
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Résilié
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <Ban className="w-3 h-3 mr-1" />
            Sans abonnement
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gestion des Abonnements</h2>
              <p className="text-sm text-muted-foreground">
                {stats?.total} chauffeur{(stats?.total || 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDrivers}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats cards - Responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'awaiting_validation' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'awaiting_validation' ? 'all' : 'awaiting_validation')}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{stats?.awaitingValidation}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'trialing' ? 'ring-2 ring-sky-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'trialing' ? 'all' : 'trialing')}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              <div>
                <p className="text-lg font-bold">{stats?.trialing}</p>
                <p className="text-xs text-muted-foreground">Essai</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'active' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-bold">{stats?.active}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'past_due' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'past_due' ? 'all' : 'past_due')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{stats?.pastDue}</p>
                <p className="text-xs text-muted-foreground">Impayés</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'canceled' ? 'ring-2 ring-destructive' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'canceled' ? 'all' : 'canceled')}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-lg font-bold">{stats?.canceled}</p>
                <p className="text-xs text-muted-foreground">Résiliés</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'free_access' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'free_access' ? 'all' : 'free_access')}
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{stats?.freeAccess}</p>
                <p className="text-xs text-muted-foreground">Gratuits</p>
              </div>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filterStatus === 'no_subscription' ? 'ring-2 ring-muted-foreground' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'no_subscription' ? 'all' : 'no_subscription')}
          >
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{stats?.noSubscription}</p>
                <p className="text-xs text-muted-foreground">Sans abo</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="awaiting_validation">En attente validation</SelectItem>
              <SelectItem value="trialing">Essai (validés)</SelectItem>
              <SelectItem value="active">Abonnés actifs</SelectItem>
              <SelectItem value="past_due">Paiement en retard</SelectItem>
              <SelectItem value="canceled">Résiliés</SelectItem>
              <SelectItem value="free_access">Accès gratuit</SelectItem>
              <SelectItem value="no_subscription">Sans abonnement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des chauffeurs */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredDrivers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun chauffeur trouvé</p>
          ) : (
            filteredDrivers.map((driver) => {
              const profile = driver.profiles;
              return (
                <Card key={driver.id} className="p-3">
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{profile?.full_name || "Non renseigné"}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {getStatusBadge(driver)}
                          {driver.subscription_end_date && driver.subscription_status !== 'canceled' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(driver.subscription_end_date), "dd/MM/yy", { locale: fr })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDriver(driver);
                          setDialogOpen(true);
                        }}
                        disabled={driver.free_access_granted && (driver.free_access_type === 'unlimited' || driver.free_access_type === 'administrative')}
                        className="flex-1 sm:flex-none"
                      >
                        <Gift className="w-4 h-4 mr-1" />
                        <span className={isMobile ? "text-xs" : ""}>
                          {driver.free_access_granted && (driver.free_access_type === 'unlimited' || driver.free_access_type === 'administrative') 
                            ? "Protégé" 
                            : driver.free_access_granted 
                              ? "Modifier" 
                              : "Accès Gratuit"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDriverToDelete(driver);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {/* Dialog d'attribution d'accès gratuit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accorder un accès gratuit</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedDriver.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedDriver.profiles?.email}</p>
                <div className="mt-2">{getStatusBadge(selectedDriver)}</div>
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
                    <SelectItem value="unlimited">Illimité (Pionnier)</SelectItem>
                    <SelectItem value="administrative">Illimité (Administratif - Protégé)</SelectItem>
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
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {selectedDriver.subscription_status === 'active' && selectedDriver.subscription_end_date ? (
                    <>⚠️ L'accès gratuit commencera après la fin de l'abonnement actuel (le {format(new Date(selectedDriver.subscription_end_date), "dd/MM/yyyy", { locale: fr })}).</>
                  ) : (
                    <>⚠️ L'accès gratuit commencera immédiatement. L'abonnement Stripe sera suspendu si existant.</>
                  )}
                </p>
              </div>
              
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleGrantFreeAccess} disabled={grantingAccess}>
                  {grantingAccess ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Attribution...
                    </>
                  ) : "Accorder"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de suppression */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        driver={driverToDelete}
        onDeleted={fetchDrivers}
      />
    </div>
  );
};

export default AdminSubscriptions;
