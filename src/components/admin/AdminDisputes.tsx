import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Search, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Dispute {
  id: string;
  course_id: string;
  reported_by_user_id: string;
  reported_against_user_id: string;
  reporter_type: string;
  status: string;
  reason: string;
  description: string;
  admin_notes: string | null;
  created_at: string;
  reporter_profile: {
    full_name: string;
    email: string;
  };
  reported_against_profile: {
    full_name: string;
    email: string;
  };
  course: {
    course_number: string;
    pickup_address: string;
    destination_address: string;
  };
}

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterStatus, disputes]);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for each dispute
      const disputesWithProfiles = await Promise.all(
        (data || []).map(async (dispute) => {
          const [reporterProfile, reportedAgainstProfile, course] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", dispute.reported_by_user_id)
              .single(),
            supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", dispute.reported_against_user_id)
              .single(),
            supabase
              .from("courses")
              .select("course_number, pickup_address, destination_address")
              .eq("id", dispute.course_id)
              .single(),
          ]);

          return {
            ...dispute,
            reporter_profile: reporterProfile.data || { full_name: "N/A", email: "N/A" },
            reported_against_profile: reportedAgainstProfile.data || { full_name: "N/A", email: "N/A" },
            course: course.data || { course_number: "N/A", pickup_address: "N/A", destination_address: "N/A" },
          };
        })
      );

      setDisputes(disputesWithProfiles);
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      toast.error("Erreur lors du chargement des signalements");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...disputes];

    if (searchTerm) {
      filtered = filtered.filter((dispute) => {
        const reporterName = (dispute.reporter_profile as any)?.full_name?.toLowerCase() || "";
        const reporterEmail = (dispute.reporter_profile as any)?.email?.toLowerCase() || "";
        const reportedAgainstName = (dispute.reported_against_profile as any)?.full_name?.toLowerCase() || "";
        const reportedAgainstEmail = (dispute.reported_against_profile as any)?.email?.toLowerCase() || "";
        const term = searchTerm.toLowerCase();
        return reporterName.includes(term) || reporterEmail.includes(term) || 
               reportedAgainstName.includes(term) || reportedAgainstEmail.includes(term);
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((dispute) => dispute.status === filterStatus);
    }

    setFilteredDisputes(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">En cours</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Résolu</Badge>;
      case "potential_abuse":
        return <Badge className="bg-red-500">Abus potentiel</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return disputes.length;
    return disputes.filter((d) => d.status === status).length;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedDispute) return;

    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes || selectedDispute.admin_notes,
      };

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("disputes")
        .update(updateData)
        .eq("id", selectedDispute.id);

      if (error) throw error;

      toast.success("Statut mis à jour avec succès");
      setDialogOpen(false);
      setSelectedDispute(null);
      setAdminNotes("");
      fetchDisputes();
    } catch (error: any) {
      console.error("Error updating dispute:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
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
      <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-100">Gestion des Signalements</h2>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-white">{getStatusCount("all")}</p>
              <p className="text-sm text-slate-300">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-900/50 border-yellow-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-300">{getStatusCount("pending")}</p>
              <p className="text-sm text-yellow-200">En attente</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-900/50 border-blue-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-300">{getStatusCount("in_progress")}</p>
              <p className="text-sm text-blue-200">En cours</p>
            </CardContent>
          </Card>
          <Card className="bg-green-900/50 border-green-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-300">{getStatusCount("resolved")}</p>
              <p className="text-sm text-green-200">Résolus</p>
            </CardContent>
          </Card>
          <Card className="bg-red-900/50 border-red-700">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-300">{getStatusCount("potential_abuse")}</p>
              <p className="text-sm text-red-200">Abus potentiels</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              className={filterStatus === "all" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              Tous
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              onClick={() => setFilterStatus("pending")}
            >
              En attente
            </Button>
            <Button
              variant={filterStatus === "in_progress" ? "default" : "outline"}
              onClick={() => setFilterStatus("in_progress")}
            >
              En cours
            </Button>
            <Button
              variant={filterStatus === "resolved" ? "default" : "outline"}
              onClick={() => setFilterStatus("resolved")}
            >
              Résolus
            </Button>
          </div>
        </div>

        {/* Disputes List */}
        <div className="space-y-3">
          {filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun signalement trouvé</p>
            </div>
          ) : (
            filteredDisputes.map((dispute) => {
              const reporter = dispute.reporter_profile as any;
              const reportedAgainst = dispute.reported_against_profile as any;
              const course = dispute.course as any;

              return (
                <Card key={dispute.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(dispute.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(dispute.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p className="font-semibold mb-1">
                        Course: {course?.course_number || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Signalé par:</strong> {reporter?.full_name} ({dispute.reporter_type === "driver" ? "Chauffeur" : "Client"})
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Contre:</strong> {reportedAgainst?.full_name} ({dispute.reporter_type === "driver" ? "Client" : "Chauffeur"})
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Motif:</strong> {dispute.reason}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {dispute.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setAdminNotes(dispute.admin_notes || "");
                        setDialogOpen(true);
                      }}
                    >
                      Traiter
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {/* Dispute Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du signalement</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4 pt-4">
              <div>
                <p className="text-sm font-medium mb-1">Course</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedDispute.course as any)?.course_number} - 
                  {(selectedDispute.course as any)?.pickup_address} → {(selectedDispute.course as any)?.destination_address}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Signalé par</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedDispute.reporter_profile as any)?.full_name} ({selectedDispute.reporter_type === "driver" ? "Chauffeur" : "Client"})
                  <br />
                  {(selectedDispute.reporter_profile as any)?.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Signalement contre</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedDispute.reported_against_profile as any)?.full_name}
                  <br />
                  {(selectedDispute.reported_against_profile as any)?.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Motif</p>
                <p className="text-sm">{selectedDispute.reason}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedDispute.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Notes administratives</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajouter des notes sur ce signalement..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                {selectedDispute.status !== "in_progress" && (
                  <Button
                    onClick={() => handleUpdateStatus("in_progress")}
                    disabled={updating}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mettre en cours
                  </Button>
                )}
                {selectedDispute.status !== "resolved" && (
                  <Button
                    onClick={() => handleUpdateStatus("resolved")}
                    disabled={updating}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Résoudre
                  </Button>
                )}
                {selectedDispute.status !== "potential_abuse" && (
                  <Button
                    onClick={() => handleUpdateStatus("potential_abuse")}
                    disabled={updating}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Marquer abus
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
