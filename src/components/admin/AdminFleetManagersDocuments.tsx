import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Truck, 
  FileText, 
  Check, 
  X, 
  Eye, 
  Loader2, 
  Clock, 
  AlertTriangle,
  Search,
  Building2
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetManagerWithDocs {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  siret: string;
  status: string;
  documents: Record<string, { name: string; url: string; uploadedAt: string }>;
  documents_status: string;
  documents_deadline: string | null;
  documents_submitted_at: string | null;
  created_at: string;
}

const DOCUMENT_LABELS: Record<string, string> = {
  piece_identite_recto: "Pièce d'identité (Recto)",
  piece_identite_verso: "Pièce d'identité (Verso)",
  kbis: "Extrait Kbis",
  capacite_transport: "Capacité de transport",
  attestation_assurance: "Attestation d'assurance",
};

export const AdminFleetManagersDocuments = () => {
  const [fleetManagers, setFleetManagers] = useState<FleetManagerWithDocs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedManager, setSelectedManager] = useState<FleetManagerWithDocs | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFleetManagers();
  }, []);

  const fetchFleetManagers = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFleetManagers(data as unknown as FleetManagerWithDocs[]);
    } catch (error) {
      console.error("Error fetching fleet managers:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDocuments = async () => {
    if (!selectedManager) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          documents_status: "validated",
          status: "validated",
        })
        .eq("id", selectedManager.id);

      if (error) throw error;

      toast.success("Documents validés avec succès");
      setIsDialogOpen(false);
      setSelectedManager(null);
      fetchFleetManagers();
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erreur lors de la validation");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectDocuments = async () => {
    if (!selectedManager || !rejectionReason.trim()) {
      toast.error("Veuillez indiquer la raison du rejet");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          documents_status: "rejected",
        })
        .eq("id", selectedManager.id);

      if (error) throw error;

      // TODO: Send email notification about rejection

      toast.success("Documents rejetés");
      setIsDialogOpen(false);
      setSelectedManager(null);
      setRejectionReason("");
      fetchFleetManagers();
    } catch (error) {
      console.error("Rejection error:", error);
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessing(false);
    }
  };

  const openReviewDialog = (manager: FleetManagerWithDocs) => {
    setSelectedManager(manager);
    setRejectionReason("");
    setIsDialogOpen(true);
  };

  const getDeadlineInfo = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const daysRemaining = differenceInDays(deadlineDate, new Date());
    const isExpired = isPast(deadlineDate);
    return { deadlineDate, daysRemaining, isExpired };
  };

  const filteredManagers = fleetManagers.filter((fm) => {
    const matchesSearch =
      fm.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fm.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fm.contact_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || fm.documents_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "validated":
        return <Badge variant="default"><Check className="w-3 h-3 mr-1" />Validé</Badge>;
      case "submitted":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />À vérifier</Badge>;
      case "rejected":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = fleetManagers.filter((fm) => fm.documents_status === "submitted").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Gestionnaires de Flotte - Documents
              </CardTitle>
              <CardDescription>
                Validez les documents des gestionnaires de flotte
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {pendingCount} à vérifier
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="submitted">À vérifier</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fleet Managers List */}
          {filteredManagers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun gestionnaire de flotte trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredManagers.map((fm) => {
                const deadlineInfo = getDeadlineInfo(fm.documents_deadline);
                const docs = fm.documents || {};
                const docCount = Object.keys(docs).length;

                return (
                  <div
                    key={fm.id}
                    className={`p-4 border rounded-lg ${
                      fm.documents_status === "submitted"
                        ? "border-amber-500/50 bg-amber-500/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{fm.company_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {fm.contact_name} - {fm.contact_email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            SIRET: {fm.siret}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              <FileText className="w-3 h-3 mr-1" />
                              {docCount}/5 documents
                            </Badge>
                            {deadlineInfo && fm.documents_status === "pending" && (
                              <Badge
                                variant={deadlineInfo.isExpired ? "destructive" : "outline"}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {deadlineInfo.isExpired
                                  ? "Délai dépassé"
                                  : `${deadlineInfo.daysRemaining}j restants`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(fm.documents_status)}
                        {(fm.documents_status === "submitted" || docCount > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewDialog(fm)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Examiner
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedManager?.company_name}
            </DialogTitle>
            <DialogDescription>
              Vérifiez les documents soumis et validez ou rejetez-les
            </DialogDescription>
          </DialogHeader>

          {selectedManager && (
            <div className="space-y-4">
              {/* Company Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact</p>
                    <p className="font-medium">{selectedManager.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedManager.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">SIRET</p>
                    <p className="font-medium">{selectedManager.siret}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inscrit le</p>
                    <p className="font-medium">
                      {format(new Date(selectedManager.created_at), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <h4 className="font-medium">Documents soumis</h4>
                {Object.entries(selectedManager.documents || {}).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Aucun document soumis</p>
                ) : (
                  Object.entries(selectedManager.documents || {}).map(([key, doc]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">{DOCUMENT_LABELS[key] || key}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.name} - Téléchargé le{" "}
                            {format(new Date(doc.uploadedAt), "d/MM/yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Voir
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Rejection Reason */}
              {selectedManager.documents_status !== "validated" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Raison du rejet (optionnel)
                  </label>
                  <Textarea
                    placeholder="Indiquez la raison si vous rejetez les documents..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fermer
            </Button>
            {selectedManager?.documents_status !== "validated" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleRejectDocuments}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Rejeter
                    </>
                  )}
                </Button>
                <Button onClick={handleValidateDocuments} disabled={processing}>
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Valider
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFleetManagersDocuments;
