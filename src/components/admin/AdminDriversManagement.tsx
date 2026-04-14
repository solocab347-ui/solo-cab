import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  Crown,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentViewer from "./DocumentViewer";
import DriverAdvancedFilter from "./DriverAdvancedFilter";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Driver {
  id: string;
  user_id: string;
  status: "pending" | "validated" | "rejected" | "on_hold";
  license_number: string;
  vehicle_model: string;
  company_name: string | null;
  documents: any;
  created_at: string;
  is_pioneer: boolean;
  is_demo_account: boolean;
  sharing_number: number | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    profile_photo_url: string | null;
  };
}

interface FilterValues {
  search: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  vehicle: string;
  company: string;
}

const AdminDriversManagement = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "validate" | "reject" | "delete" | "on_hold" | null;
    driver: Driver | null;
  }>({ open: false, action: null, driver: null });

  // Filtres pour chaque onglet
  const [pendingFilters, setPendingFilters] = useState<FilterValues>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    vehicle: "",
    company: "",
  });
  const [onHoldFilters, setOnHoldFilters] = useState<FilterValues>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    vehicle: "",
    company: "",
  });
  const [validatedFilters, setValidatedFilters] = useState<FilterValues>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    vehicle: "",
    company: "",
  });
  const [rejectedFilters, setRejectedFilters] = useState<FilterValues>({
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    vehicle: "",
    company: "",
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      // Optimisation: Sélectionner uniquement les colonnes nécessaires
      const { data, error } = await supabase
        .from("drivers")
        .select(
          `
          id,
          user_id,
          status,
          license_number,
          vehicle_model,
          company_name,
          documents,
          created_at,
          is_pioneer,
          is_demo_account,
          sharing_number,
          last_seen_at,
          profiles!inner(full_name, email, phone, profile_photo_url)
        `
        )
        .eq("is_demo_account", false) // Exclure les comptes démo
        .order("created_at", { ascending: false })
        .limit(1000); // Limite explicite pour performance

      if (error) throw error;
      setDrivers((data as Driver[]) || []);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  // Fonction de filtrage universelle
  const applyFilters = (driversList: Driver[], filters: FilterValues): Driver[] => {
    return driversList.filter((driver) => {
      // Filtre de recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = driver.profiles.full_name?.toLowerCase() || "";
        const email = driver.profiles.email?.toLowerCase() || "";
        const phone = driver.profiles.phone?.toLowerCase() || "";
        
        const matchesSearch = 
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtre par date
      if (filters.dateFrom || filters.dateTo) {
        const driverDate = new Date(driver.created_at);
        
        if (filters.dateFrom && filters.dateTo) {
          const isInRange = isWithinInterval(driverDate, {
            start: startOfDay(filters.dateFrom),
            end: endOfDay(filters.dateTo),
          });
          if (!isInRange) return false;
        } else if (filters.dateFrom) {
          if (driverDate < startOfDay(filters.dateFrom)) return false;
        } else if (filters.dateTo) {
          if (driverDate > endOfDay(filters.dateTo)) return false;
        }
      }

      // Filtre par véhicule
      if (filters.vehicle) {
        const vehicleLower = filters.vehicle.toLowerCase();
        const vehicleModel = driver.vehicle_model?.toLowerCase() || "";
        if (!vehicleModel.includes(vehicleLower)) return false;
      }

      // Filtre par entreprise
      if (filters.company) {
        const companyLower = filters.company.toLowerCase();
        const companyName = driver.company_name?.toLowerCase() || "";
        if (!companyName.includes(companyLower)) return false;
      }

      return true;
    });
  };

  const handleAction = async () => {
    if (!actionDialog.driver || !actionDialog.action) return;

    try {
      if (actionDialog.action === "delete") {
        // Suppression complète via edge function (cascade toutes les tables)
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke("cleanup-deleted-users", {
          body: { userId: actionDialog.driver.user_id },
        });

        if (response.error) throw response.error;
        if (response.data?.error) throw new Error(response.data.error);
        toast.success("Chauffeur supprimé avec succès de toutes les tables");
      } else {
        // Changer le statut
        let newStatus: "validated" | "rejected" | "on_hold";
        let successMessage: string;

        if (actionDialog.action === "validate") {
          newStatus = "validated";
          successMessage = "Chauffeur validé avec succès";
        } else if (actionDialog.action === "on_hold") {
          newStatus = "on_hold";
          successMessage = "Demande mise en attente";
        } else {
          newStatus = "rejected";
          successMessage = "Demande refusée";
        }
        
        const updateData: any = { 
          status: newStatus,
          validation_date: newStatus === "validated" ? new Date().toISOString() : null
        };
        // IMPORTANT: Synchroniser documents_status avec status pour éviter les désynchronisations
        if (newStatus === "validated") {
          updateData.documents_status = "validated";
          updateData.public_profile_enabled = true;
        }
        const { error } = await supabase
          .from("drivers")
          .update(updateData)
          .eq("id", actionDialog.driver.id);

        if (error) throw error;

        // Si validation, redémarrer la période d'essai Stripe
        if (newStatus === "validated") {
          try {
            console.log("🔄 Resetting trial period for validated driver...");
            const resetResponse = await supabase.functions.invoke("reset-trial-on-validation", {
              body: { driver_id: actionDialog.driver.id }
            });
            
            if (resetResponse.error) {
              console.error("⚠️ Trial reset error:", resetResponse.error);
            } else {
              console.log("✅ Trial period reset:", resetResponse.data);
            }
          } catch (resetErr) {
            console.error("⚠️ Trial reset failed:", resetErr);
          }
        }

        // Envoyer l'email approprié selon l'action
        if (actionDialog.action === "validate" || actionDialog.action === "reject") {
          try {
            const emailResponse = await supabase.functions.invoke("send-driver-validation-email", {
              body: {
                driver_id: actionDialog.driver.id,
                action: actionDialog.action === "validate" ? "validated" : "rejected"
              },
            });
            
            if (emailResponse.error) {
              console.error("⚠️ Erreur envoi email:", emailResponse.error);
            } else {
              console.log("✅ Email de validation envoyé au chauffeur");
            }
          } catch (emailErr: any) {
            console.error("⚠️ Erreur envoi email:", emailErr);
            toast.error(`Erreur envoi email: ${emailErr.message}`);
          }
        } else if (actionDialog.action === "on_hold") {
          // Envoyer l'email de mise en attente
          try {
            const emailResponse = await supabase.functions.invoke("send-email", {
              body: {
                to: actionDialog.driver.profiles.email,
                type: "driver_on_hold",
                data: {
                  driverName: actionDialog.driver.profiles.full_name,
                },
              },
            });
            
            if (emailResponse.error) {
              console.error("⚠️ Erreur envoi email:", emailResponse.error);
              toast.warning(`Email non envoyé: ${emailResponse.error.message}`);
            } else {
              console.log("✅ Email de mise en attente envoyé au chauffeur");
              toast.success("Email de notification envoyé au chauffeur");
            }
          } catch (emailErr: any) {
            console.error("⚠️ Erreur envoi email:", emailErr);
            toast.error(`Erreur envoi email: ${emailErr.message}`);
          }
        }

        toast.success(successMessage);
      }

      fetchDrivers();
      setActionDialog({ open: false, action: null, driver: null });
    } catch (error: any) {
      console.error("Error performing action:", error);
      toast.error("Erreur lors de l'action");
    }
  };

  const viewDocuments = (driver: Driver) => {
    setSelectedDriver(driver);
    setDocumentViewerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: "En attente", icon: Clock, className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      validated: { label: "Validé", icon: CheckCircle, className: "bg-green-500/10 text-green-500 border-green-500/20" },
      rejected: { label: "Refusé", icon: X, className: "bg-red-500/10 text-red-500 border-red-500/20" },
      on_hold: { label: "Mis en attente", icon: AlertCircle, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge variant="outline" className={statusConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const renderDriverCard = (driver: Driver) => (
    <Card key={driver.id} className="hover:shadow-elegant transition-all overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar + Info */}
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            {driver.profiles.profile_photo_url ? (
              <img
                src={driver.profiles.profile_photo_url}
                alt={driver.profiles.full_name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-dark rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl text-primary-foreground font-bold">
                  {driver.profiles.full_name.charAt(0)}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg truncate">{driver.profiles.full_name}</h3>
                {driver.sharing_number && (
                  <Badge variant="outline" className="font-mono text-xs">
                    #{driver.sharing_number}
                  </Badge>
                )}
                {driver.is_pioneer && (
                  <Badge className="bg-amber-500 text-white gap-1">
                    <Crown className="w-3 h-3" />
                    Pionnier
                  </Badge>
                )}
                {getStatusBadge(driver.status)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{driver.profiles.email}</p>
              {driver.profiles.phone && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">📱 {driver.profiles.phone}</p>
              )}
              {driver.company_name && (
                <p className="text-xs sm:text-sm font-medium mb-1 truncate">🏢 {driver.company_name}</p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                🚗 {driver.vehicle_model} • 📄 {driver.license_number}
              </p>
              <p className="text-xs text-muted-foreground">
                📅 Inscrit le {format(new Date(driver.created_at), "d MMMM yyyy", { locale: fr })}
              </p>
              {(driver as any).last_seen_at && (
                <p className="text-xs text-primary font-medium">
                  👁️ Dernière visite : {format(new Date((driver as any).last_seen_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons - responsive grid */}
          <div className="flex flex-wrap sm:flex-col gap-2 sm:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewDocuments(driver)}
              className="flex-1 sm:flex-initial"
            >
              <FileText className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Documents</span>
            </Button>

            {driver.status === "pending" && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "validate", driver })
                  }
                  className="flex-1 sm:flex-initial"
                >
                  <CheckCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Valider</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "on_hold", driver })
                  }
                  className="flex-1 sm:flex-initial"
                >
                  <Clock className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Attente</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "reject", driver })
                  }
                  className="flex-1 sm:flex-initial"
                >
                  <X className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refuser</span>
                </Button>
              </>
            )}

            {driver.status === "on_hold" && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "validate", driver })
                  }
                  className="flex-1 sm:flex-initial"
                >
                  <CheckCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Valider</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "reject", driver })
                  }
                  className="flex-1 sm:flex-initial"
                >
                  <X className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refuser</span>
                </Button>
              </>
            )}

            {(driver.status === "validated" || driver.status === "rejected") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setActionDialog({ open: true, action: "delete", driver })
                }
                className="flex-1 sm:flex-initial"
              >
                <X className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Supprimer</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chargement des chauffeurs...
      </div>
    );
  }

  // Appliquer les filtres à chaque catégorie
  const allPendingDrivers = drivers.filter((d) => d.status === "pending");
  const allOnHoldDrivers = drivers.filter((d) => d.status === "on_hold");
  const allValidatedDrivers = drivers.filter((d) => d.status === "validated");
  const allRejectedDrivers = drivers.filter((d) => d.status === "rejected");

  const pendingDrivers = applyFilters(allPendingDrivers, pendingFilters);
  const onHoldDrivers = applyFilters(allOnHoldDrivers, onHoldFilters);
  const validatedDrivers = applyFilters(allValidatedDrivers, validatedFilters);
  const rejectedDrivers = applyFilters(allRejectedDrivers, rejectedFilters);

  return (
    <div className="space-y-6">
      {/* Statistiques - Responsive 2x2 grid mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Reçues</p>
                <p className="text-lg sm:text-2xl font-bold">{allPendingDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Attente</p>
                <p className="text-lg sm:text-2xl font-bold">{allOnHoldDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Acceptées</p>
                <p className="text-lg sm:text-2xl font-bold">{allValidatedDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-destructive/10 rounded-lg flex items-center justify-center shrink-0">
                <X className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Refusées</p>
                <p className="text-lg sm:text-2xl font-bold">{allRejectedDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections par onglets - Responsive */}
      <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="pending" className="relative py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <span className="hidden sm:inline">Demandes reçues</span>
            <span className="sm:hidden">Reçues</span>
            {allPendingDrivers.length > 0 && (
              <Badge variant="destructive" className="ml-1 sm:ml-2 px-1.5 py-0.5 text-[10px] sm:text-xs">
                {allPendingDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="relative py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <span className="hidden sm:inline">En attente</span>
            <span className="sm:hidden">Attente</span>
            {allOnHoldDrivers.length > 0 && (
              <Badge variant="default" className="ml-1 sm:ml-2 px-1.5 py-0.5 text-[10px] sm:text-xs">
                {allOnHoldDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="validated" className="py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <span className="hidden sm:inline">Acceptées</span>
            <span className="sm:hidden">OK</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <span className="hidden sm:inline">Refusées</span>
            <span className="sm:hidden">Refus</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <DriverAdvancedFilter
            onFilterChange={setPendingFilters}
            onReset={() => setPendingFilters({
              search: "",
              dateFrom: undefined,
              dateTo: undefined,
              vehicle: "",
              company: "",
            })}
          />
          {pendingDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {allPendingDrivers.length === 0 
                  ? "Aucune demande en attente"
                  : "Aucun résultat"
                }
              </h3>
              <p className="text-muted-foreground">
                {allPendingDrivers.length === 0 
                  ? "Toutes les demandes d'inscription ont été traitées"
                  : "Aucun chauffeur ne correspond à vos critères de recherche"
                }
              </p>
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {pendingDrivers.length} résultat{pendingDrivers.length > 1 ? "s" : ""} 
                {allPendingDrivers.length !== pendingDrivers.length && 
                  ` sur ${allPendingDrivers.length}`
                }
              </div>
              {pendingDrivers.map(renderDriverCard)}
            </>
          )}
        </TabsContent>

        <TabsContent value="on_hold" className="space-y-4">
          <DriverAdvancedFilter
            onFilterChange={setOnHoldFilters}
            onReset={() => setOnHoldFilters({
              search: "",
              dateFrom: undefined,
              dateTo: undefined,
              vehicle: "",
              company: "",
            })}
          />
          {onHoldDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {allOnHoldDrivers.length === 0 
                  ? "Aucune demande en attente"
                  : "Aucun résultat"
                }
              </h3>
              <p className="text-muted-foreground">
                {allOnHoldDrivers.length === 0 
                  ? "Les demandes mises en attente apparaîtront ici"
                  : "Aucun chauffeur ne correspond à vos critères de recherche"
                }
              </p>
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {onHoldDrivers.length} résultat{onHoldDrivers.length > 1 ? "s" : ""} 
                {allOnHoldDrivers.length !== onHoldDrivers.length && 
                  ` sur ${allOnHoldDrivers.length}`
                }
              </div>
              {onHoldDrivers.map(renderDriverCard)}
            </>
          )}
        </TabsContent>

        <TabsContent value="validated" className="space-y-4">
          <DriverAdvancedFilter
            onFilterChange={setValidatedFilters}
            onReset={() => setValidatedFilters({
              search: "",
              dateFrom: undefined,
              dateTo: undefined,
              vehicle: "",
              company: "",
            })}
          />
          {validatedDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {allValidatedDrivers.length === 0 
                  ? "Aucun chauffeur validé"
                  : "Aucun résultat"
                }
              </h3>
              {allValidatedDrivers.length > 0 && (
                <p className="text-muted-foreground">
                  Aucun chauffeur ne correspond à vos critères de recherche
                </p>
              )}
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {validatedDrivers.length} résultat{validatedDrivers.length > 1 ? "s" : ""} 
                {allValidatedDrivers.length !== validatedDrivers.length && 
                  ` sur ${allValidatedDrivers.length}`
                }
              </div>
              {validatedDrivers.map(renderDriverCard)}
            </>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <DriverAdvancedFilter
            onFilterChange={setRejectedFilters}
            onReset={() => setRejectedFilters({
              search: "",
              dateFrom: undefined,
              dateTo: undefined,
              vehicle: "",
              company: "",
            })}
          />
          {rejectedDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <X className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {allRejectedDrivers.length === 0 
                  ? "Aucune demande refusée"
                  : "Aucun résultat"
                }
              </h3>
              {allRejectedDrivers.length > 0 && (
                <p className="text-muted-foreground">
                  Aucun chauffeur ne correspond à vos critères de recherche
                </p>
              )}
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {rejectedDrivers.length} résultat{rejectedDrivers.length > 1 ? "s" : ""} 
                {allRejectedDrivers.length !== rejectedDrivers.length && 
                  ` sur ${allRejectedDrivers.length}`
                }
              </div>
              {rejectedDrivers.map(renderDriverCard)}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Viewer */}
      {selectedDriver && (
        <DocumentViewer
          open={documentViewerOpen}
          onOpenChange={(open) => {
            setDocumentViewerOpen(open);
            if (!open) setSelectedDriver(null);
          }}
          driver={selectedDriver}
        />
      )}

      {/* Action Dialog */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          !open && setActionDialog({ open: false, action: null, driver: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === "validate" && "Valider le chauffeur"}
              {actionDialog.action === "on_hold" && "Mettre en attente"}
              {actionDialog.action === "reject" && "Refuser la demande"}
              {actionDialog.action === "delete" && "Supprimer le chauffeur"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === "validate" &&
                "Êtes-vous sûr de vouloir valider ce chauffeur ? Il pourra commencer à utiliser la plateforme."}
              {actionDialog.action === "on_hold" &&
                "Êtes-vous sûr de vouloir mettre cette demande en attente ? Le chauffeur sera en attente de validation."}
              {actionDialog.action === "reject" &&
                "Êtes-vous sûr de vouloir refuser cette demande ? Le chauffeur ne pourra pas utiliser la plateforme."}
              {actionDialog.action === "delete" &&
                "Êtes-vous sûr de vouloir supprimer ce chauffeur ? Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDriversManagement;
