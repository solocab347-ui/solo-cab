import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, FileText, User, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Dispute {
  id: string;
  driver_id: string;
  client_id: string | null;
  type: "dismissal" | "dispute";
  status: "pending" | "in_progress" | "resolved" | "rejected";
  reason: string;
  description: string;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  driver?: {
    profiles: {
      full_name: string;
      email: string;
      phone: string | null;
    };
  };
  client?: {
    profiles: {
      full_name: string;
      email: string;
    };
  } | null;
}

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "rejected">("resolved");

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          driver:drivers!disputes_driver_id_fkey(
            profiles:user_id(full_name, email, phone)
          ),
          client:clients!disputes_client_id_fkey(
            profiles:user_id(full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      toast.error("Erreur lors du chargement des litiges");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    try {
      const { error } = await supabase
        .from("disputes")
        .update({
          status: resolutionStatus,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedDispute.id);

      if (error) throw error;

      // Si c'est un licenciement validé, désactiver le chauffeur
      if (selectedDispute.type === "dismissal" && resolutionStatus === "resolved") {
        await supabase
          .from("drivers")
          .update({ status: "rejected" })
          .eq("id", selectedDispute.driver_id);
      }

      toast.success("Litige traité avec succès");
      setSelectedDispute(null);
      setResolutionNotes("");
      fetchDisputes();
    } catch (error: any) {
      console.error("Error resolving dispute:", error);
      toast.error("Erreur lors du traitement du litige");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      resolved: "bg-green-500/10 text-green-500 border-green-500/20",
      rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    const labels = {
      pending: "En attente",
      in_progress: "En cours",
      resolved: "Résolu",
      rejected: "Rejeté",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      dismissal: "bg-red-500/10 text-red-500 border-red-500/20",
      dispute: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };

    const labels = {
      dismissal: "Licenciement",
      dispute: "Litige",
    };

    return (
      <Badge variant="outline" className={styles[type as keyof typeof styles]}>
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesType = filterType === "all" || dispute.type === filterType;
    const matchesStatus = filterStatus === "all" || dispute.status === filterStatus;
    const matchesSearch =
      searchTerm === "" ||
      dispute.driver?.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dispute.client?.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des litiges...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Rechercher</Label>
            <Input
              placeholder="Nom, raison..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="dismissal">Licenciements</SelectItem>
                <SelectItem value="dispute">Litiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold">
                {disputes.filter((d) => d.status === "pending").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En cours</p>
              <p className="text-2xl font-bold">
                {disputes.filter((d) => d.status === "in_progress").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Licenciements</p>
              <p className="text-2xl font-bold">
                {disputes.filter((d) => d.type === "dismissal").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Litiges</p>
              <p className="text-2xl font-bold">
                {disputes.filter((d) => d.type === "dispute").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Liste des litiges */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Aucun litige trouvé</h3>
            <p className="text-muted-foreground">Aucun litige ne correspond à vos critères</p>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="p-6 hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(dispute.type)}
                      {getStatusBadge(dispute.status)}
                    </div>
                    <h3 className="font-bold">{dispute.driver?.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{dispute.driver?.profiles?.email}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(dispute.created_at), "d MMM yyyy", { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-sm font-medium">Raison :</p>
                  <p className="text-sm text-muted-foreground">{dispute.reason}</p>
                </div>
                {dispute.description && (
                  <div>
                    <p className="text-sm font-medium">Description :</p>
                    <p className="text-sm text-muted-foreground">{dispute.description}</p>
                  </div>
                )}
                {dispute.client && (
                  <div>
                    <p className="text-sm font-medium">Client concerné :</p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.client.profiles?.full_name}
                    </p>
                  </div>
                )}
                {dispute.resolution_notes && (
                  <div className="bg-secondary p-3 rounded-lg mt-2">
                    <p className="text-sm font-medium mb-1">Notes de résolution :</p>
                    <p className="text-sm text-muted-foreground">{dispute.resolution_notes}</p>
                  </div>
                )}
              </div>

              {dispute.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    onClick={() => setSelectedDispute(dispute)}
                    className="flex-1"
                  >
                    Traiter le cas
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Dialog de résolution */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Traiter le cas</DialogTitle>
            <DialogDescription>
              {selectedDispute?.type === "dismissal"
                ? "Décidez de valider ou rejeter ce licenciement"
                : "Résolvez ce litige"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Décision</Label>
              <Select
                value={resolutionStatus}
                onValueChange={(value: "resolved" | "rejected") => setResolutionStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">
                    {selectedDispute?.type === "dismissal" ? "Valider le licenciement" : "Résoudre"}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {selectedDispute?.type === "dismissal" ? "Rejeter le licenciement" : "Rejeter"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes de résolution</Label>
              <Textarea
                placeholder="Expliquez votre décision et les actions prises..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDispute(null)}>
              Annuler
            </Button>
            <Button onClick={handleResolveDispute} disabled={!resolutionNotes.trim()}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
