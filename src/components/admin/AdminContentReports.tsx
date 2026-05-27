import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flag, Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  context_type: string;
  context_id: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  pending: { label: "En attente", variant: "destructive" },
  reviewing: { label: "En cours", variant: "default" },
  resolved: { label: "Résolu", variant: "secondary" },
  dismissed: { label: "Rejeté", variant: "outline" },
};

const CONTEXT_LABEL: Record<string, string> = {
  message: "Message (messagerie)",
  ride_message: "Chat de course",
  profile: "Profil utilisateur",
  other: "Autre",
};

export default function AdminContentReports() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending") query = query.in("status", ["pending", "reviewing"]);
      const { data, error } = await query;
      if (error) throw error;
      setReports((data || []) as ContentReport[]);
    } catch (e: any) {
      console.error("[reports]", e);
      toast.error("Erreur de chargement des signalements");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    setActing(id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("content_reports")
        .update({
          status,
          reviewed_by: userData.user?.id ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Signalement mis à jour");
      await fetchReports();
    } catch (e: any) {
      console.error("[update report]", e);
      toast.error("Échec de la mise à jour");
    } finally {
      setActing(null);
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending" || r.status === "reviewing").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-destructive" />
          Signalements de contenu
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">À traiter</TabsTrigger>
            <TabsTrigger value="all">Tous</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Flag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Aucun signalement {filter === "pending" ? "en attente" : ""}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const status = STATUS_LABEL[r.status];
                  return (
                    <div
                      key={r.id}
                      className="border border-border rounded-lg p-4 space-y-2 bg-card"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <Badge variant="outline">
                              {CONTEXT_LABEL[r.context_type] || r.context_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{r.reason}</p>
                          {r.details && (
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {r.details}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                            <p>Rapporteur : <code className="text-[10px]">{r.reporter_id}</code></p>
                            {r.reported_user_id && (
                              <p>Utilisateur signalé : <code className="text-[10px]">{r.reported_user_id}</code></p>
                            )}
                            {r.context_id && (
                              <p>Référence : <code className="text-[10px]">{r.context_id}</code></p>
                            )}
                          </div>
                        </div>
                      </div>
                      {(r.status === "pending" || r.status === "reviewing") && (
                        <div className="flex gap-2 pt-2 border-t border-border">
                          {r.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(r.id, "reviewing")}
                              disabled={acting === r.id}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Prendre en charge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateStatus(r.id, "resolved")}
                            disabled={acting === r.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Résoudre
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(r.id, "dismissed")}
                            disabled={acting === r.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
