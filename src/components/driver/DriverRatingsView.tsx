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
  MapPin,
  Calendar,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DriverRating {
  id: string;
  course_id: string;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  status: string;
  ai_decision: string | null;
  ai_justification: string | null;
  adjusted_rating: number | null;
  driver_response: string | null;
  created_at: string;
  // Joined course data
  course?: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
  } | null;
}

const REASON_LABELS: Record<string, string> = {
  late: "Retard chauffeur",
  dangerous_driving: "Conduite dangereuse",
  bad_behavior: "Mauvais comportement",
  dirty_vehicle: "Véhicule sale",
  bad_communication: "Mauvaise communication",
  bad_route: "Mauvais itinéraire",
  payment_issue: "Problème paiement",
  other: "Autre",
};

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

      // Fetch ratings with course details (no client personal info)
      const { data, error } = await supabase
        .from("course_ratings")
        .select(`
          id, course_id, rating, reason, reason_detail, status,
          ai_decision, ai_justification, adjusted_rating,
          driver_response, created_at,
          course:courses!course_ratings_course_id_fkey (
            pickup_address, destination_address, scheduled_date
          )
        `)
        .eq("driver_id", driverData.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRatings((data as any[]) || []);
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

      const rating = ratings.find((r) => r.id === ratingId);
      if (rating) {
        await supabase
          .from("courses")
          .update({ client_rating: rating.rating })
          .eq("id", rating.course_id);
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
      await supabase
        .from("course_ratings")
        .update({
          driver_response: "contested",
          driver_response_at: new Date().toISOString(),
          status: "contested",
        })
        .eq("id", contestRating.id);

      await supabase.from("rating_disputes").insert({
        rating_id: contestRating.id,
        initiated_by: "driver",
        dispute_reason: contestReason.trim(),
        resolution: "pending",
      });

      // Don't trigger AI immediately - wait for client response or 48h timeout
      // The AI arbitration will be triggered when:
      // 1. The client responds to the contestation
      // 2. The 48h deadline passes (auto-cancel function handles this)

      toast.success("Contestation envoyée — le client a 48h pour répondre");
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const CourseInfo = ({ course, date }: { course?: DriverRating["course"]; date: string }) => (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>{formatDate(date)}</span>
      </div>
      {course && (
        <>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
            <span className="truncate">{course.pickup_address}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-destructive shrink-0" />
            <span className="truncate">{course.destination_address}</span>
          </div>
        </>
      )}
    </div>
  );

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
                    <Badge className={statusConfig.pending_review.color} variant="secondary">
                      {statusConfig.pending_review.icon}
                      <span className="ml-1">{statusConfig.pending_review.label}</span>
                    </Badge>
                  </div>

                  {/* Course details - NO client personal info */}
                  <CourseInfo course={r.course} date={r.created_at} />

                  {/* What the client reported */}
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                    <p className="text-xs font-semibold text-destructive">Ce qui vous est reproché :</p>
                    {r.reason && (
                      <p className="text-sm font-medium">{REASON_LABELS[r.reason] || r.reason}</p>
                    )}
                    {r.reason_detail && (
                      <p className="text-sm text-muted-foreground italic">"{r.reason_detail}"</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAccept(r.id)} disabled={processing}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accepter
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setContestRating(r); setContestReason(""); }} disabled={processing}>
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
              <Card key={r.id} className="p-3 space-y-2">
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
                    {formatDate(r.created_at)}
                  </span>
                </div>
                {r.reason && (
                  <p className="text-xs text-muted-foreground">
                    Motif : {REASON_LABELS[r.reason] || r.reason}
                  </p>
                )}
                {r.ai_justification && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">🤖 {r.ai_justification}</p>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Contest dialog */}
      <Dialog open={!!contestRating} onOpenChange={() => setContestRating(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Contester la note de {contestRating?.rating}★
            </DialogTitle>
            <DialogDescription>
              Le client ne sera pas identifié. Seules les circonstances de la course sont communiquées.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Course info */}
            {contestRating?.course && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-xs font-semibold">Détails de la course</p>
                <CourseInfo course={contestRating.course} date={contestRating.created_at} />
              </div>
            )}

            {/* What was reported */}
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-1">
              <p className="text-xs font-semibold text-destructive">Reproche du client :</p>
              {contestRating?.reason && (
                <p className="text-sm font-medium">{REASON_LABELS[contestRating.reason] || contestRating.reason}</p>
              )}
              {contestRating?.reason_detail && (
                <p className="text-sm text-muted-foreground italic">"{contestRating.reason_detail}"</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Votre explication :</p>
              <Textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                placeholder="Expliquez pourquoi cette note est injustifiée (ex: embouteillage sur la route, client en retard, GPS défaillant...)"
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{contestReason.length}/500</p>
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">ℹ️ Comment ça fonctionne :</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>Un arbitrage IA analyse automatiquement la situation</li>
                <li>Le client devra se justifier sous 48h</li>
                <li>Si le client ne répond pas, la note est automatiquement annulée</li>
                <li>Vous êtes limité à 2 contestations par jour</li>
              </ul>
            </div>

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
