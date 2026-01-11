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
  Check,
} from "lucide-react";

interface DocumentValidation {
  id: string;
  document_type: string;
  document_url: string;
  validated_at: string;
}

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
  validations?: DocumentValidation[];
}

interface FleetDriverDocumentsValidationProps {
  fleetManagerId: string;
}

const REQUIRED_DOCUMENTS = [
  { key: "id_card_recto", label: "Pièce d'identité (Recto)" },
  { key: "id_card_verso", label: "Pièce d'identité (Verso)" },
  { key: "vtc_card", label: "Carte professionnelle VTC" },
  { key: "driving_license", label: "Permis de conduire" },
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
  const [validatingDoc, setValidatingDoc] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; type: string; driverName: string } | null>(null);

  useEffect(() => {
    fetchDriversWithDocuments();
  }, [fleetManagerId]);

  const fetchDriversWithDocuments = async () => {
    try {
      // Fetch drivers with their documents
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

      // Fetch existing validations
      const { data: validationsData } = await supabase
        .from("fleet_driver_document_validations")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId);

      const validationsByDriver: Record<string, DocumentValidation[]> = {};
      validationsData?.forEach(v => {
        if (!validationsByDriver[v.driver_id]) {
          validationsByDriver[v.driver_id] = [];
        }
        validationsByDriver[v.driver_id].push(v);
      });

      const driversData = (data || []).map((d: any) => ({
        ...d,
        driver: Array.isArray(d.driver) ? d.driver[0] : d.driver,
        validations: validationsByDriver[d.driver_id] || [],
      })).filter((d: any) => 
        d.driver?.fleet_documents_status === "submitted" || 
        d.driver?.fleet_documents_status === "pending" ||
        d.driver?.fleet_documents_status === "validated"
      );

      setDrivers(driversData);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateSingleDocument = async (driver: DriverWithDocuments, docKey: string, docUrl: string, docName: string) => {
    if (!driver.driver) return;
    setValidatingDoc(`${driver.driver_id}-${docKey}`);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Upsert validation
      const { error } = await supabase
        .from("fleet_driver_document_validations")
        .upsert({
          fleet_manager_id: fleetManagerId,
          driver_id: driver.driver_id,
          document_type: docKey,
          document_url: docUrl,
          document_name: docName,
          validated_by_user_id: userId,
          validated_at: new Date().toISOString(),
          status: "validated"
        }, {
          onConflict: "fleet_manager_id,driver_id,document_type"
        });

      if (error) throw error;

      // Check if all documents are now validated
      const updatedValidations = [...(driver.validations || [])];
      const existingIdx = updatedValidations.findIndex(v => v.document_type === docKey);
      if (existingIdx >= 0) {
        updatedValidations[existingIdx] = { ...updatedValidations[existingIdx], document_url: docUrl };
      } else {
        updatedValidations.push({ id: '', document_type: docKey, document_url: docUrl, validated_at: new Date().toISOString() });
      }

      const allDocsValidated = REQUIRED_DOCUMENTS.every(doc => {
        const uploadedDoc = driver.driver?.documents?.[doc.key];
        const validation = updatedValidations.find(v => v.document_type === doc.key);
        return uploadedDoc && validation;
      });

      // If all documents validated, update driver status
      if (allDocsValidated) {
        await supabase
          .from("drivers")
          .update({
            fleet_documents_status: "validated",
            status: "validated"
          })
          .eq("id", driver.driver_id);

        // Notify driver
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "✅ Tous vos documents sont validés",
          message: "Tous vos documents ont été validés par votre gestionnaire de flotte. Vous pouvez maintenant effectuer des courses.",
          type: "success",
          link: "/fleet-driver-dashboard",
        });

        toast.success("Tous les documents sont validés ! Le chauffeur peut maintenant travailler.");
      } else {
        toast.success("Document validé avec succès");
      }

      // Close viewing dialog after validation
      setViewingDoc(null);
      fetchDriversWithDocuments();
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setValidatingDoc(null);
    }
  };

  const handleValidateAll = async () => {
    if (!selectedDriver?.driver) return;
    setProcessing(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      // Validate all documents
      const validations = REQUIRED_DOCUMENTS.map(doc => {
        const uploadedDoc = selectedDriver.driver?.documents?.[doc.key];
        if (!uploadedDoc) return null;
        return {
          fleet_manager_id: fleetManagerId,
          driver_id: selectedDriver.driver_id,
          document_type: doc.key,
          document_url: uploadedDoc.url,
          document_name: uploadedDoc.name,
          validated_by_user_id: userId,
          validated_at: new Date().toISOString(),
          status: "validated"
        };
      }).filter(Boolean);

      if (validations.length > 0) {
        for (const validation of validations) {
          await supabase
            .from("fleet_driver_document_validations")
            .upsert(validation, {
              onConflict: "fleet_manager_id,driver_id,document_type"
            });
        }
      }

      // Update driver documents status
      await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "validated",
          status: "validated",
        })
        .eq("id", selectedDriver.driver.id);

      // Create notification for driver
      await supabase.from("notifications").insert({
        user_id: selectedDriver.driver.user_id,
        title: "✅ Documents validés",
        message: "Vos documents ont été validés par votre gestionnaire de flotte. Vous pouvez maintenant effectuer des courses.",
        type: "success",
        link: "/fleet-driver-dashboard",
      });

      toast.success("Tous les documents validés avec succès !");
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
      await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "rejected",
        })
        .eq("id", selectedDriver.driver.id);

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

  const isDocumentValidated = (driver: DriverWithDocuments, docKey: string) => {
    return driver.validations?.some(v => v.document_type === docKey);
  };

  const getDocumentStatus = (driver: DriverWithDocuments, docKey: string) => {
    const uploadedDoc = driver.driver?.documents?.[docKey];
    const isValidated = isDocumentValidated(driver, docKey);
    
    if (isValidated) return "validated";
    if (uploadedDoc) return "submitted";
    return "pending";
  };

  const getDriverValidationProgress = (driver: DriverWithDocuments) => {
    const validated = REQUIRED_DOCUMENTS.filter(doc => isDocumentValidated(driver, doc.key)).length;
    const submitted = REQUIRED_DOCUMENTS.filter(doc => driver.driver?.documents?.[doc.key]).length;
    return { validated, submitted, total: REQUIRED_DOCUMENTS.length };
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
  const validatedDrivers = drivers.filter(d => d.driver?.fleet_documents_status === "validated");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Validation des documents chauffeurs
        </CardTitle>
        <CardDescription>
          Visualisez et validez les documents individuellement. Une fois tous validés, le chauffeur peut travailler.
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
              {pendingDrivers.map((driver) => {
                const progress = getDriverValidationProgress(driver);
                return (
                  <div
                    key={driver.id}
                    className="p-4 border rounded-lg bg-warning/5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
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
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {progress.validated}/{progress.total} validés
                            </Badge>
                            {progress.validated === progress.total && (
                              <Badge className="bg-success text-xs">Prêt</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDriver(driver)}
                        >
                          <Eye className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Voir documents</span>
                        </Button>
                        {progress.validated === progress.total && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setActionType("validate");
                            }}
                          >
                            <CheckCircle className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Tout valider</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
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

        {/* Validated Drivers */}
        {validatedDrivers.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Documents validés ({validatedDrivers.length})
            </h3>
            <div className="space-y-3">
              {validatedDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg bg-success/5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
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
                  <Badge className="bg-success w-fit">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Validé
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingDrivers.length === 0 && waitingDrivers.length === 0 && validatedDrivers.length === 0 && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Aucun chauffeur n'a encore soumis de documents.
            </AlertDescription>
          </Alert>
        )}

        {/* Document Preview Dialog with Individual Validation */}
        <Dialog open={!!selectedDriver && !actionType} onOpenChange={() => setSelectedDriver(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Documents de {selectedDriver?.driver?.profile?.full_name}
              </DialogTitle>
              <DialogDescription>
                Cliquez sur "Voir" pour visualiser un document, puis validez-le individuellement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {REQUIRED_DOCUMENTS.map((doc) => {
                const uploadedDoc = selectedDriver?.driver?.documents?.[doc.key];
                const status = selectedDriver ? getDocumentStatus(selectedDriver, doc.key) : "pending";
                const isValidated = status === "validated";
                const isValidating = validatingDoc === `${selectedDriver?.driver_id}-${doc.key}`;

                return (
                  <div
                    key={doc.key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg ${
                      isValidated ? 'bg-success/10 border-success/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isValidated ? (
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                      ) : uploadedDoc ? (
                        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">{doc.label}</span>
                        {isValidated && (
                          <span className="text-xs text-success">Document validé</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {uploadedDoc && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingDoc({
                              url: uploadedDoc.url,
                              type: doc.label,
                              driverName: selectedDriver?.driver?.profile?.full_name || ''
                            })}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir
                          </Button>
                          {!isValidated && (
                            <Button
                              size="sm"
                              disabled={isValidating}
                              onClick={() => selectedDriver && handleValidateSingleDocument(
                                selectedDriver,
                                doc.key,
                                uploadedDoc.url,
                                uploadedDoc.name
                              )}
                            >
                              {isValidating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Valider
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                      {!uploadedDoc && (
                        <Badge variant="outline" className="text-xs">Non fourni</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
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
                Rejeter tous
              </Button>
              {selectedDriver && getDriverValidationProgress(selectedDriver).validated === REQUIRED_DOCUMENTS.length && (
                <Button onClick={() => setActionType("validate")}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Confirmer validation
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Viewer Dialog */}
        <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewingDoc?.type}</DialogTitle>
              <DialogDescription>
                Document de {viewingDoc?.driverName}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center min-h-[400px] bg-muted/30 rounded-lg overflow-hidden">
              {viewingDoc?.url && (
                viewingDoc.url.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingDoc.url}
                    className="w-full h-[500px]"
                    title={viewingDoc.type}
                  />
                ) : (
                  <img
                    src={viewingDoc.url}
                    alt={viewingDoc.type}
                    className="max-w-full max-h-[500px] object-contain"
                  />
                )
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingDoc(null)}>
                Fermer
              </Button>
              <Button onClick={() => window.open(viewingDoc?.url, "_blank")}>
                <Eye className="w-4 h-4 mr-1" />
                Ouvrir en plein écran
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Validation Confirmation Dialog */}
        <Dialog open={actionType === "validate"} onOpenChange={() => setActionType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la validation finale</DialogTitle>
              <DialogDescription>
                Tous les documents de {selectedDriver?.driver?.profile?.full_name} ont été vérifiés et validés.
                Le chauffeur pourra commencer à effectuer des courses.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionType(null)} disabled={processing}>
                Annuler
              </Button>
              <Button onClick={handleValidateAll} disabled={processing}>
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
