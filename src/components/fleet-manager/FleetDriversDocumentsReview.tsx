import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Search, 
  Loader2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  User,
  Car,
  Calendar
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetDriversDocumentsReviewProps {
  fleetManagerId: string;
}

interface DocumentInfo {
  name: string;
  url: string;
  uploadedAt: string;
}

interface RequiredDocument {
  id: string;
  document_key: string;
  label: string;
  description: string | null;
  is_required: boolean;
}

interface DriverWithDocuments {
  id: string;
  driver_id: string;
  status: string;
  joined_at: string;
  temporary_access_granted: boolean | null;
  temporary_access_reason: string | null;
  temporary_access_expires_at: string | null;
  rejected_documents: any | null;
  documents_rejection_reason: string | null;
  driver: {
    id: string;
    vehicle_model: string;
    vehicle_brand: string | null;
    documents: Record<string, DocumentInfo> | null;
    fleet_documents_status: string | null;
    fleet_documents_deadline: string | null;
    fleet_documents_submitted_at: string | null;
    user_id: string;
    profile?: {
      full_name: string;
      email: string;
      profile_photo_url: string | null;
    };
  };
}

export const FleetDriversDocumentsReview = ({ fleetManagerId }: FleetDriversDocumentsReviewProps) => {
  const [drivers, setDrivers] = useState<DriverWithDocuments[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "submitted" | "validated" | "rejected">("all");
  const [selectedDriver, setSelectedDriver] = useState<DriverWithDocuments | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [rejectedDocKeys, setRejectedDocKeys] = useState<string[]>([]);
  const [temporaryAccessReason, setTemporaryAccessReason] = useState("");
  const [temporaryAccessDays, setTemporaryAccessDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Fetch required documents
      const { data: reqDocs } = await supabase
        .from("fleet_required_documents")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId)
        .order("display_order", { ascending: true });

      setRequiredDocs(reqDocs || []);

      // Fetch drivers with documents
      const { data: driversData, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          id,
          driver_id,
          status,
          joined_at,
          temporary_access_granted,
          temporary_access_reason,
          temporary_access_expires_at,
          rejected_documents,
          documents_rejection_reason,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            documents,
            fleet_documents_status,
            fleet_documents_deadline,
            fleet_documents_submitted_at,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (error) throw error;

      // Fetch profiles
      if (driversData && driversData.length > 0) {
        const userIds = driversData
          .filter((d: any) => d.driver)
          .map((d: any) => d.driver.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, profile_photo_url")
          .in("id", userIds);

        const driversWithProfiles = driversData.map((d: any) => ({
          ...d,
          driver: d.driver ? {
            ...d.driver,
            profile: profiles?.find(p => p.id === d.driver.user_id)
          } : null
        }));

        setDrivers(driversWithProfiles.filter((d: any) => d.driver));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDocuments = async (driverId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "validated",
        })
        .eq("id", driverId);

      if (error) throw error;

      // Send notification
      const driver = drivers.find(d => d.driver_id === driverId);
      if (driver?.driver.user_id) {
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "✅ Documents validés",
          message: "Vos documents ont été validés par le gestionnaire de flotte.",
          type: "success",
        });
      }

      toast.success("Documents validés avec succès");
      setShowReviewDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error validating documents:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDocuments = async (driverId: string, fleetDriverId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer la raison du rejet");
      return;
    }

    setProcessing(true);
    try {
      // Mettre à jour le statut des documents du chauffeur
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          fleet_documents_status: "rejected",
        })
        .eq("id", driverId);

      if (driverError) throw driverError;

      // Stocker les documents rejetés et la raison dans fleet_manager_drivers
      const { error: fmdError } = await supabase
        .from("fleet_manager_drivers")
        .update({
          rejected_documents: rejectedDocKeys,
          documents_rejection_reason: rejectionReason
        })
        .eq("id", fleetDriverId);

      if (fmdError) throw fmdError;

      // Send notification with reason
      const driver = drivers.find(d => d.driver_id === driverId);
      if (driver?.driver.user_id) {
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "❌ Documents rejetés",
          message: `Certains documents ont été rejetés. Motif : ${rejectionReason}`,
          type: "error",
        });
      }

      toast.success("Documents rejetés");
      setShowReviewDialog(false);
      setRejectionReason("");
      setRejectedDocKeys([]);
      fetchData();
    } catch (error) {
      console.error("Error rejecting documents:", error);
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessing(false);
    }
  };

  const handleGrantTemporaryAccess = async (fleetDriverId: string, driverUserId: string) => {
    if (!temporaryAccessReason.trim()) {
      toast.error("Veuillez indiquer la raison de l'accès temporaire");
      return;
    }

    setProcessing(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + temporaryAccessDays);

      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          temporary_access_granted: true,
          temporary_access_reason: temporaryAccessReason,
          temporary_access_granted_at: new Date().toISOString(),
          temporary_access_expires_at: expiresAt.toISOString()
        })
        .eq("id", fleetDriverId);

      if (error) throw error;

      // Notifier le chauffeur
      await supabase.from("notifications").insert({
        user_id: driverUserId,
        title: "🔓 Accès temporaire accordé",
        message: `Un accès temporaire de ${temporaryAccessDays} jours vous a été accordé pendant la validation de vos documents.`,
        type: "info",
      });

      toast.success(`Accès temporaire de ${temporaryAccessDays} jours accordé`);
      setTemporaryAccessReason("");
      setTemporaryAccessDays(7);
      fetchData();
    } catch (error) {
      console.error("Error granting temporary access:", error);
      toast.error("Erreur lors de l'attribution de l'accès");
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeTemporaryAccess = async (fleetDriverId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          temporary_access_granted: false,
          temporary_access_reason: null,
          temporary_access_granted_at: null,
          temporary_access_expires_at: null
        })
        .eq("id", fleetDriverId);

      if (error) throw error;

      toast.success("Accès temporaire révoqué");
      fetchData();
    } catch (error) {
      console.error("Error revoking temporary access:", error);
      toast.error("Erreur lors de la révocation");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-success"><CheckCircle className="w-3 h-3 mr-1" />Validés</Badge>;
      case "submitted":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejetés</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Incomplet</Badge>;
    }
  };

  const getDocumentProgress = (documents: Record<string, DocumentInfo> | null) => {
    if (!documents || !requiredDocs.length) return { uploaded: 0, total: requiredDocs.length };
    
    const requiredKeys = requiredDocs.filter(d => d.is_required).map(d => d.document_key);
    const uploadedCount = requiredKeys.filter(key => documents[key]?.url).length;
    
    return { uploaded: uploadedCount, total: requiredKeys.length };
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = !search || 
      d.driver.profile?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.driver.profile?.email.toLowerCase().includes(search.toLowerCase());
    
    const status = d.driver.fleet_documents_status || "pending";
    const matchesFilter = filter === "all" || status === filter;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents des chauffeurs
        </CardTitle>
        <CardDescription>
          Consultez et validez les documents soumis par vos chauffeurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un chauffeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "Tous" },
              { value: "submitted", label: "En attente" },
              { value: "pending", label: "Incomplet" },
              { value: "validated", label: "Validés" },
              { value: "rejected", label: "Rejetés" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold">{drivers.length}</div>
            <div className="text-sm text-muted-foreground">Total chauffeurs</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-500">
              {drivers.filter(d => d.driver.fleet_documents_status === "submitted").length}
            </div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-success">
              {drivers.filter(d => d.driver.fleet_documents_status === "validated").length}
            </div>
            <div className="text-sm text-muted-foreground">Validés</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-destructive">
              {drivers.filter(d => !d.driver.fleet_documents_status || d.driver.fleet_documents_status === "pending").length}
            </div>
            <div className="text-sm text-muted-foreground">Incomplets</div>
          </div>
        </div>

        {/* Drivers List */}
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun chauffeur trouvé
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrivers.map((driver) => {
              const progress = getDocumentProgress(driver.driver.documents as Record<string, DocumentInfo> | null);
              const deadline = driver.driver.fleet_documents_deadline;
              const daysRemaining = deadline ? differenceInDays(new Date(deadline), new Date()) : null;

              return (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={driver.driver.profile?.profile_photo_url || ""} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{driver.driver.profile?.full_name || "Sans nom"}</p>
                        {getStatusBadge(driver.driver.fleet_documents_status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {driver.driver.vehicle_brand} {driver.driver.vehicle_model}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {progress.uploaded}/{progress.total} documents
                        </span>
                        {daysRemaining !== null && daysRemaining > 0 && (
                          <span className={`flex items-center gap-1 ${daysRemaining <= 2 ? 'text-destructive' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {daysRemaining}j restants
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowReviewDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documents de {selectedDriver?.driver.profile?.full_name}</DialogTitle>
              <DialogDescription>
                Vérifiez les documents soumis et validez ou rejetez
              </DialogDescription>
            </DialogHeader>

            {selectedDriver && (
              <div className="space-y-4 py-4">
                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Statut actuel</span>
                  {getStatusBadge(selectedDriver.driver.fleet_documents_status)}
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  {requiredDocs.map((reqDoc) => {
                    const docs = selectedDriver.driver.documents as Record<string, DocumentInfo> | null;
                    const uploadedDoc = docs?.[reqDoc.document_key];
                    const isRejected = rejectedDocKeys.includes(reqDoc.document_key);

                    return (
                      <div
                        key={reqDoc.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${isRejected ? 'border-destructive bg-destructive/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedDriver.driver.fleet_documents_status === "submitted" && (
                            <Checkbox
                              id={`reject-${reqDoc.document_key}`}
                              checked={isRejected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRejectedDocKeys([...rejectedDocKeys, reqDoc.document_key]);
                                } else {
                                  setRejectedDocKeys(rejectedDocKeys.filter(k => k !== reqDoc.document_key));
                                }
                              }}
                            />
                          )}
                          {uploadedDoc ? (
                            <CheckCircle className="w-5 h-5 text-success" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{reqDoc.label}</p>
                            {reqDoc.description && (
                              <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                            )}
                            {uploadedDoc && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Téléchargé le {format(new Date(uploadedDoc.uploadedAt), "dd/MM/yyyy", { locale: fr })}
                              </p>
                            )}
                          </div>
                        </div>

                        {uploadedDoc && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(uploadedDoc.url, "_blank")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rejection reason */}
                {selectedDriver.driver.fleet_documents_status === "submitted" && rejectedDocKeys.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Motif de rejet ({rejectedDocKeys.length} document(s) sélectionné(s))</label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ex: La carte VTC est expirée..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Temporary Access Section */}
                {(selectedDriver.driver.fleet_documents_status !== "validated") && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Accès temporaire
                    </h4>
                    
                    {selectedDriver.temporary_access_granted ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              Accès temporaire actif
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-500">
                              Expire le {selectedDriver.temporary_access_expires_at ? format(new Date(selectedDriver.temporary_access_expires_at), "dd/MM/yyyy", { locale: fr }) : "N/A"}
                            </p>
                            {selectedDriver.temporary_access_reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Raison: {selectedDriver.temporary_access_reason}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeTemporaryAccess(selectedDriver.id)}
                            disabled={processing}
                          >
                            Révoquer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Accordez un accès temporaire au chauffeur pendant la validation de ses documents.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Durée (jours)</label>
                            <Select
                              value={temporaryAccessDays.toString()}
                              onValueChange={(v) => setTemporaryAccessDays(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[3, 5, 7, 14, 30].map((d) => (
                                  <SelectItem key={d} value={d.toString()}>{d} jours</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Raison</label>
                          <Input
                            value={temporaryAccessReason}
                            onChange={(e) => setTemporaryAccessReason(e.target.value)}
                            placeholder="Ex: En attente de réception du document original"
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGrantTemporaryAccess(selectedDriver.id, selectedDriver.driver.user_id)}
                          disabled={processing || !temporaryAccessReason.trim()}
                          className="w-full"
                        >
                          {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Accorder l'accès temporaire
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                Fermer
              </Button>
              {selectedDriver?.driver.fleet_documents_status === "submitted" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectDocuments(selectedDriver.driver_id, selectedDriver.id)}
                    disabled={processing || rejectedDocKeys.length === 0}
                  >
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Rejeter ({rejectedDocKeys.length})
                  </Button>
                  <Button
                    onClick={() => handleValidateDocuments(selectedDriver.driver_id)}
                    disabled={processing}
                    className="bg-success hover:bg-success/90"
                  >
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Valider
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
