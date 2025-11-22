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
import { format } from "date-fns";
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
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    profile_photo_url: string | null;
  };
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

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select(
          `
          *,
          profiles:profiles!inner(full_name, email, phone, profile_photo_url)
        `
        )
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

  const handleAction = async () => {
    if (!actionDialog.driver || !actionDialog.action) return;

    try {
      if (actionDialog.action === "delete") {
        // Supprimer le chauffeur
        const { error } = await supabase
          .from("drivers")
          .delete()
          .eq("id", actionDialog.driver.id);

        if (error) throw error;
        toast.success("Chauffeur supprimé avec succès");
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
        
        const { error } = await supabase
          .from("drivers")
          .update({ 
            status: newStatus,
            validation_date: newStatus === "validated" ? new Date().toISOString() : null
          })
          .eq("id", actionDialog.driver.id);

        if (error) throw error;

        // Envoyer l'email approprié selon l'action
        if (actionDialog.action === "validate" || actionDialog.action === "reject") {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: actionDialog.driver.profiles.email,
                type: "driver_validation",
                data: {
                  driverName: actionDialog.driver.profiles.full_name,
                  validationStatus: actionDialog.action === "validate" ? "approved" : "rejected",
                  rejectionReason: actionDialog.action === "reject" ? "Documents incomplets ou non conformes" : undefined,
                },
              },
            });
            console.log("✅ Email de validation envoyé au chauffeur");
          } catch (emailErr) {
            console.error("⚠️ Erreur envoi email (non bloquant):", emailErr);
          }
        } else if (actionDialog.action === "on_hold") {
          // Envoyer l'email de mise en attente
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                to: actionDialog.driver.profiles.email,
                type: "driver_on_hold",
                data: {
                  driverName: actionDialog.driver.profiles.full_name,
                },
              },
            });
            console.log("✅ Email de mise en attente envoyé au chauffeur");
          } catch (emailErr) {
            console.error("⚠️ Erreur envoi email (non bloquant):", emailErr);
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
    <Card key={driver.id} className="hover:shadow-elegant transition-all">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {driver.profiles.profile_photo_url ? (
            <img
              src={driver.profiles.profile_photo_url}
              alt={driver.profiles.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
              <span className="text-2xl text-primary-foreground font-bold">
                {driver.profiles.full_name.charAt(0)}
              </span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg">{driver.profiles.full_name}</h3>
              {getStatusBadge(driver.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-1">{driver.profiles.email}</p>
            {driver.profiles.phone && (
              <p className="text-sm text-muted-foreground mb-2">📱 {driver.profiles.phone}</p>
            )}
            {driver.company_name && (
              <p className="text-sm font-medium mb-2">🏢 {driver.company_name}</p>
            )}
            <p className="text-sm text-muted-foreground mb-2">
              🚗 {driver.vehicle_model} • 📄 {driver.license_number}
            </p>
            <p className="text-xs text-muted-foreground">
              📅 Inscrit le {format(new Date(driver.created_at), "d MMMM yyyy", { locale: fr })}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewDocuments(driver)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>

            {driver.status === "pending" && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "validate", driver })
                  }
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "on_hold", driver })
                  }
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Mettre en attente
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "reject", driver })
                  }
                >
                  <X className="w-4 h-4 mr-2" />
                  Refuser
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
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setActionDialog({ open: true, action: "reject", driver })
                  }
                >
                  <X className="w-4 h-4 mr-2" />
                  Refuser
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
              >
                <X className="w-4 h-4 mr-2" />
                Supprimer
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

  const pendingDrivers = drivers.filter((d) => d.status === "pending");
  const onHoldDrivers = drivers.filter((d) => d.status === "on_hold");
  const validatedDrivers = drivers.filter((d) => d.status === "validated");
  const rejectedDrivers = drivers.filter((d) => d.status === "rejected");

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Demandes reçues</p>
                <p className="text-2xl font-bold">{pendingDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mises en attente</p>
                <p className="text-2xl font-bold">{onHoldDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Demandes acceptées</p>
                <p className="text-2xl font-bold">{validatedDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Demandes refusées</p>
                <p className="text-2xl font-bold">{rejectedDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections par onglets */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="relative">
            Demandes reçues
            {pendingDrivers.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs">
                {pendingDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="relative">
            En attente
            {onHoldDrivers.length > 0 && (
              <Badge variant="default" className="ml-2 px-2 py-0.5 text-xs">
                {onHoldDrivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="validated">Acceptées</TabsTrigger>
          <TabsTrigger value="rejected">Refusées</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune demande en attente</h3>
              <p className="text-muted-foreground">
                Toutes les demandes d'inscription ont été traitées
              </p>
            </Card>
          ) : (
            pendingDrivers.map(renderDriverCard)
          )}
        </TabsContent>

        <TabsContent value="on_hold" className="space-y-4">
          {onHoldDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune demande en attente</h3>
              <p className="text-muted-foreground">
                Les demandes mises en attente apparaîtront ici
              </p>
            </Card>
          ) : (
            onHoldDrivers.map(renderDriverCard)
          )}
        </TabsContent>

        <TabsContent value="validated" className="space-y-4">
          {validatedDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucun chauffeur validé</h3>
            </Card>
          ) : (
            validatedDrivers.map(renderDriverCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <X className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Aucune demande refusée</h3>
            </Card>
          ) : (
            rejectedDrivers.map(renderDriverCard)
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
