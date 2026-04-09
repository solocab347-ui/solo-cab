import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Star,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Ban,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RatingDispute {
  id: string;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  status: string;
  ai_decision: string | null;
  ai_justification: string | null;
  adjusted_rating: number | null;
  created_at: string;
  admin_override: boolean;
  course_id: string;
  client_id: string;
  driver_id: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  validated: { label: "Validée", color: "bg-green-500/10 text-green-600" },
  pending_review: { label: "En attente", color: "bg-yellow-500/10 text-yellow-600" },
  contested: { label: "Contestée", color: "bg-orange-500/10 text-orange-600" },
  ai_resolved: { label: "Résolue IA", color: "bg-blue-500/10 text-blue-600" },
  cancelled: { label: "Annulée", color: "bg-red-500/10 text-red-600" },
};

const decisionLabels: Record<string, string> = {
  maintained: "Note maintenue",
  adjusted: "Note ajustée",
  cancelled: "Note annulée",
  shared: "Responsabilité partagée",
};

const AdminRatingDisputes = () => {
  const [ratings, setRatings] = useState<RatingDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<RatingDispute | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideAction, setOverrideAction] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [filter]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("course_ratings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("status", filter);
      } else {
        query = query.in("status", ["pending_review", "contested", "ai_resolved", "cancelled"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRatings((data as RatingDispute[]) || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur chargement des notes");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOverride = async () => {
    if (!selectedRating || !overrideAction || !overrideReason.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updates: Record<string, unknown> = {
        admin_override: true,
        admin_override_by: user?.id,
        admin_override_reason: overrideReason,
      };

      if (overrideAction === "validate") {
        updates.status = "validated";
        await supabase
          .from("courses")
          .update({ client_rating: selectedRating.rating })
          .eq("id", selectedRating.course_id);
      } else if (overrideAction === "cancel") {
        updates.status = "cancelled";
        updates.ai_decision = "cancelled";
      } else if (overrideAction === "adjust") {
        updates.status = "ai_resolved";
        updates.ai_decision = "adjusted";
        updates.adjusted_rating = 3;
      }

      await supabase.from("course_ratings").update(updates).eq("id", selectedRating.id);

      toast.success("Décision admin appliquée");
      setSelectedRating(null);
      setOverrideReason("");
      setOverrideAction("");
      fetchRatings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de l'override");
    } finally {
      setProcessing(false);
    }
  };

  const triggerAiArbitration = async (ratingId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-rating-arbitration", {
        body: { ratingId },
      });

      if (error) throw error;
      toast.success("Arbitrage IA terminé");
      fetchRatings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur arbitrage IA");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Litiges notation IA
        </h3>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending_review", "contested", "ai_resolved", "cancelled"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Tous" : statusLabels[f]?.label || f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : ratings.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun litige trouvé</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => {
            const statusInfo = statusLabels[r.status] || { label: r.status, color: "" };
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      {r.ai_decision && (
                        <Badge variant="outline">{decisionLabels[r.ai_decision] || r.ai_decision}</Badge>
                      )}
                      {r.admin_override && (
                        <Badge className="bg-purple-500/10 text-purple-600">Override admin</Badge>
                      )}
                    </div>

                    {r.reason && (
                      <p className="text-sm">
                        <span className="font-medium">Motif :</span> {r.reason}
                      </p>
                    )}
                    {r.reason_detail && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.reason_detail}</p>
                    )}
                    {r.ai_justification && (
                      <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                        🤖 {r.ai_justification}
                      </p>
                    )}
                    {r.adjusted_rating && (
                      <p className="text-xs text-orange-600">
                        Note ajustée : {r.rating}★ → {r.adjusted_rating}★
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {(r.status === "pending_review" || r.status === "contested") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => triggerAiArbitration(r.id)}
                        disabled={processing}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRating(r)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={!!selectedRating} onOpenChange={() => setSelectedRating(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override admin — Note {selectedRating?.rating}★</DialogTitle>
          </DialogHeader>
          {selectedRating && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Motif :</span> {selectedRating.reason || "N/A"}</p>
                <p><span className="font-medium">Détail :</span> {selectedRating.reason_detail || "N/A"}</p>
                {selectedRating.ai_justification && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                    🤖 {selectedRating.ai_justification}
                  </div>
                )}
              </div>

              <Select value={overrideAction} onValueChange={setOverrideAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Action admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="validate">✅ Valider la note</SelectItem>
                  <SelectItem value="cancel">❌ Annuler la note</SelectItem>
                  <SelectItem value="adjust">⚖️ Ajuster à 3★</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Raison de l'override admin..."
              />

              <Button
                onClick={handleAdminOverride}
                disabled={processing || !overrideAction || !overrideReason.trim()}
                className="w-full"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Appliquer l'override
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRatingDisputes;
