import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
  User,
  Car,
} from "lucide-react";

interface DriverWithDocuments {
  id: string;
  driver_id: string;
  driver?: {
    id: string;
    user_id: string;
    documents: Record<string, { name: string; url: string; uploadedAt: string }> | null;
    fleet_documents_status: string | null;
    fleet_documents_deadline: string | null;
    fleet_documents_submitted_at: string | null;
    vehicle_model: string;
    vehicle_brand: string | null;
    status: string;
    profile?: {
      full_name: string;
      email: string;
      profile_photo_url: string | null;
    };
  };
}

interface FleetDriverDocumentsValidationProps {
  fleetManagerId: string;
}

const REQUIRED_DOCUMENTS = [
  { key: "vtc_card", label: "Carte professionnelle VTC" },
  { key: "driving_license", label: "Permis de conduire" },
  { key: "id_card", label: "Pièce d'identité" },
  { key: "vehicle_registration", label: "Carte grise" },
  { key: "insurance", label: "Attestation d'assurance" },
  { key: "kbis", label: "Extrait Kbis" },
];

export const FleetDriverDocumentsValidation = ({ fleetManagerId }: FleetDriverDocumentsValidationProps) => {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverWithDocuments[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithDocuments | null>(null);
  const [actionType, setActionType] = useState<"validate" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDriversWithDocuments();
  }, [fleetManagerId]);

  const fetchDriversWithDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          id,
          driver_id,
          driver:drivers!fleet_manager_drivers_driver_id_fkey(
            id,
            user_id,
            documents,
            fleet_documents_status,
            fleet_documents_deadline,
            fleet_documents_submitted_at,
            vehicle_model,
            vehicle_brand,
            status,
            profile:profiles!drivers_user_id_fkey(
              full_name,
              email,
              profile_photo_url
            )
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (error) throw error;

      const driversData = (data || []).map((d: any) => ({
        ...d,
        driver: Array.isArray(d.driver) ? d.driver[0] : d.driver,
      })).filter((d: any) => d.driver?.fleet_documents_status === "submitted" || d.driver?.fleet_documents_status === "pending");

      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedDriver?.driver) return;
    setProcessing(true);

    try {
      // Update driver documents status
      const { error: docError } = await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "validated",
          status: "validated",
        })
        .eq("id", selectedDriver.driver.id);

      if (docError) throw docError;

      // Create notification for driver
      await supabase.from("notifications").insert({
        user_id: selectedDriver.driver.user_id,
        title: "✅ Documents validés",
        message: "Vos documents ont été validés par votre gestionnaire de flotte. Vous pouvez maintenant effectuer des courses.",
        type: "success",
        link: "/fleet-driver-dashboard",
      });

      toast.success("Documents validés avec succès !");
      setSelectedDriver(null);
      setActionType(null);
      fetchDriversWithDocuments();
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDriver?.driver) return;
    setProcessing(true);

    try {
      const { error: docError } = await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "rejected",
        })
        .eq("id", selectedDriver.driver.id);

      if (docError) throw docError;

      // Create notification for driver
      await supabase.from("notifications").insert({
        user_id: selectedDriver.driver.user_id,
        title: "❌ Documents rejetés",
        message: rejectionReason || "Certains de vos documents ont été rejetés. Veuillez les soumettre à nouveau.",
        type: "error",
        link: "/fleet-driver-dashboard",
      });

      toast.success("Documents rejetés. Le chauffeur a été notifié.");
      setSelectedDriver(null);
      setActionType(null);
      setRejectionReason("");
      fetchDriversWithDocuments();
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-success"><CheckCircle className="w-3 h-3 mr-1" /> Validés</Badge>;
      case "submitted":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> En attente</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejetés</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" /> Non soumis</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const pendingDrivers = drivers.filter(d => d.driver?.fleet_documents_status === "submitted");
  const waitingDrivers = drivers.filter(d => d.driver?.fleet_documents_status === "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Validation des documents chauffeurs
        </CardTitle>
        <CardDescription>
          Vérifiez et validez les documents de vos chauffeurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pending Validation */}
        {pendingDrivers.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              En attente de validation ({pendingDrivers.length})
            </h3>
            <div className="space-y-3">
              {pendingDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-warning/5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {(driver.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{driver.driver?.profile?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                      </p>
                      {driver.driver?.fleet_documents_submitted_at && (
                        <p className="text-xs text-muted-foreground">
                          Soumis le {format(new Date(driver.driver.fleet_documents_submitted_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDriver(driver)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setActionType("validate");
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setActionType("reject");
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for documents */}
        {waitingDrivers.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              En attente de documents ({waitingDrivers.length})
            </h3>
            <div className="space-y-3">
              {waitingDrivers.map((driver) => {
                const deadline = driver.driver?.fleet_documents_deadline 
                  ? new Date(driver.driver.fleet_documents_deadline) 
                  : null;
                const daysRemaining = deadline ? differenceInDays(deadline, new Date()) : null;

                return (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                        <AvatarFallback>
                          {(driver.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{driver.driver?.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {daysRemaining !== null && (
                        <Badge variant={daysRemaining < 0 ? "destructive" : daysRemaining <= 2 ? "destructive" : "outline"}>
                          {daysRemaining < 0 
                            ? "Délai expiré" 
                            : `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}`
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingDrivers.length === 0 && waitingDrivers.length === 0 && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Tous vos chauffeurs ont leurs documents validés.
            </AlertDescription>
          </Alert>
        )}

        {/* Document Preview Dialog */}
        <Dialog open={!!selectedDriver && !actionType} onOpenChange={() => setSelectedDriver(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Documents de {selectedDriver?.driver?.profile?.full_name}
              </DialogTitle>
              <DialogDescription>
                Vérifiez les documents avant validation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const uploadedDoc = selectedDriver?.driver?.documents?.[doc.key];
                return (
                  <div
                    key={doc.key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {uploadedDoc ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className="font-medium">{doc.label}</span>
                    </div>
                    {uploadedDoc && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(uploadedDoc.url, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedDriver(null)}
              >
                Fermer
              </Button>
              <Button
                variant="destructive"
                onClick={() => setActionType("reject")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeter
              </Button>
              <Button
                onClick={() => setActionType("validate")}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Validation Confirmation Dialog */}
        <Dialog open={actionType === "validate"} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la validation</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir valider les documents de {selectedDriver?.driver?.profile?.full_name} ?
                Le chauffeur pourra commencer à effectuer des courses.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
                Annuler
              </Button>
              <Button onClick={handleValidate} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={actionType === "reject"} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter les documents</DialogTitle>
              <DialogDescription>
                Indiquez la raison du rejet pour que le chauffeur puisse corriger ses documents.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Raison du rejet</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: La carte VTC n'est pas lisible, veuillez en télécharger une nouvelle..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                Rejeter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
