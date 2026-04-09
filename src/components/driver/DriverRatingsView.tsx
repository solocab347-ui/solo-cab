import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Star,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DriverRating {
  id: string;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  status: string;
  ai_decision: string | null;
  ai_justification: string | null;
  adjusted_rating: number | null;
  driver_response: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  validated: { label: "Validée", icon: <CheckCircle className="w-4 h-4" />, color: "bg-green-500/10 text-green-600" },
  pending_review: { label: "En attente", icon: <Clock className="w-4 h-4" />, color: "bg-yellow-500/10 text-yellow-600" },
  contested: { label: "Contestée", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-orange-500/10 text-orange-600" },
  ai_resolved: { label: "Résolue IA", icon: <Shield className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-600" },
  cancelled: { label: "Annulée", icon: <XCircle className="w-4 h-4" />, color: "bg-red-500/10 text-red-600" },
};

const DriverRatingsView = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [reliabilityScore, setReliabilityScore] = useState<number>(80);
  const [contestRating, setContestRating] = useState<DriverRating | null>(null);
  const [contestReason, setContestReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: driverData } = await supabase
        .from("drivers")
        .select("id, reliability_score")
        .eq("user_id", user.id)
        .single();

      if (!driverData) return;

      setReliabilityScore(driverData.reliability_score || 80);

      const { data, error } = await supabase
        .from("course_ratings")
        .select("*")
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRatings((data as DriverRating[]) || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur chargement des notes");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (ratingId: string) => {
    setProcessing(true);
    try {
      await supabase
        .from("course_ratings")
        .update({
          driver_response: "accepted",
          driver_response_at: new Date().toISOString(),
          status: "validated",
        })
        .eq("id", ratingId);

      // Get the rating to apply it
      const rating = ratings.find((r) => r.id === ratingId);
      if (rating) {
        // We need to get course_id - fetch from course_ratings
        const { data: ratingData } = await supabase
          .from("course_ratings")
          .select("course_id, rating")
          .eq("id", ratingId)
          .single();

        if (ratingData) {
          await supabase
            .from("courses")
            .update({ client_rating: ratingData.rating })
            .eq("id", ratingData.course_id);
        }
      }

      toast.success("Note acceptée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    } finally {
      setProcessing(false);
    }
  };

  const handleContest = async () => {
    if (!contestRating || !contestReason.trim()) {
      toast.error("Veuillez expliquer votre contestation");
      return;
    }

    setProcessing(true);
    try {
      // Update rating status
      await supabase
        .from("course_ratings")
        .update({
          driver_response: "contested",
          driver_response_at: new Date().toISOString(),
          status: "contested",
        })
        .eq("id", contestRating.id);

      // Create dispute
      await supabase.from("rating_disputes").insert({
        rating_id: contestRating.id,
        initiated_by: "driver",
        dispute_reason: contestReason.trim(),
        resolution: "pending",
      });

      // Trigger AI arbitration
      await supabase.functions.invoke("ai-rating-arbitration", {
        body: { ratingId: contestRating.id },
      });

      toast.success("Contestation envoyée — arbitrage IA en cours");
      setContestRating(null);
      setContestReason("");
      fetchData();
    } catch (error: any) {
      if (error?.message?.includes("2 contestations")) {
        toast.error("Maximum 2 contestations par jour atteint");
      } else {
        toast.error("Erreur lors de la contestation");
      }
    } finally {
      setProcessing(false);
    }
  };

  const validatedRatings = ratings.filter((r) => r.status === "validated" || (r.status === "ai_resolved" && r.ai_decision === "maintained"));
  const pendingRatings = ratings.filter((r) => r.status === "pending_review" || r.status === "contested");
  const cancelledRatings = ratings.filter((r) => r.status === "cancelled" || (r.status === "ai_resolved" && r.ai_decision === "cancelled"));

  const avgRating =
    validatedRatings.length > 0
      ? validatedRatings.reduce((sum, r) => sum + (r.adjusted_rating || r.rating), 0) / validatedRatings.length
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Note moyenne</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{validatedRatings.length}</p>
          <p className="text-xs text-muted-foreground">Validées</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pendingRatings.length}</p>
          <p className="text-xs text-muted-foreground">En arbitrage</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{reliabilityScore}</p>
          <p className="text-xs text-muted-foreground">Score confiance</p>
        </Card>
      </div>

      {/* Pending ratings needing response */}
      {pendingRatings.filter((r) => r.status === "pending_review" && !r.driver_response).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Notes en attente de votre réponse
          </h3>
          {pendingRatings
            .filter((r) => r.status === "pending_review" && !r.driver_response)
            .map((r) => (
              <Card key={r.id} className="p-4 border-yellow-200 dark:border-yellow-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {r.reason && <p className="text-sm font-medium">Motif : {r.reason}</p>}
                  {r.reason_detail && <p className="text-sm text-muted-foreground">{r.reason_detail}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAccept(r.id)} disabled={processing}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setContestRating(r)} disabled={processing}>
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Contester
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* All ratings */}
      <div className="space-y-3">
        <h3 className="font-semibold">Historique des notes</h3>
        {ratings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Aucune note reçue</p>
          </Card>
        ) : (
          ratings.map((r) => {
            const config = statusConfig[r.status] || statusConfig.validated;
            return (
              <Card key={r.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= (r.adjusted_rating || r.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <Badge className={config.color} variant="secondary">
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                    {r.adjusted_rating && r.adjusted_rating !== r.rating && (
                      <span className="text-xs text-muted-foreground line-through">{r.rating}★</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                {r.ai_justification && (
                  <p className="text-xs text-blue-600 mt-2">🤖 {r.ai_justification}</p>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Contest dialog */}
      <Dialog open={!!contestRating} onOpenChange={() => setContestRating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contester la note de {contestRating?.rating}★</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {contestRating?.reason_detail && (
              <div className="p-3 bg-muted rounded text-sm">
                <p className="font-medium mb-1">Le client dit :</p>
                <p className="text-muted-foreground">{contestRating.reason_detail}</p>
              </div>
            )}
            <Textarea
              value={contestReason}
              onChange={(e) => setContestReason(e.target.value)}
              placeholder="Expliquez pourquoi vous contestez cette note..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Un arbitrage IA sera lancé automatiquement. Vous êtes limité à 2 contestations par jour.
            </p>
            <Button onClick={handleContest} disabled={processing || !contestReason.trim()} className="w-full">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Envoyer la contestation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverRatingsView;
