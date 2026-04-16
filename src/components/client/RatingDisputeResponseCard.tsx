import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Star,
  Shield,
  CheckCircle,
  MapPin,
  Calendar,
} from "lucide-react";

interface PendingDispute {
  id: string;
  rating_id: string;
  dispute_reason: string;
  client_response_deadline: string;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  course_date: string | null;
  pickup_address: string | null;
  destination_address: string | null;
}

export function RatingDisputeResponseCard() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<PendingDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchPendingDisputes();
  }, [user]);

  const fetchPendingDisputes = async () => {
    if (!user) return;
    try {
      // Get client id
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!clientData) { setLoading(false); return; }

      // Get contested ratings for this client where client hasn't responded
      const { data: ratings } = await supabase
        .from("course_ratings")
        .select("id, rating, reason, reason_detail, course_id, status")
        .eq("client_id", clientData.id)
        .eq("status", "contested");

      if (!ratings || ratings.length === 0) { setLoading(false); return; }

      const pendingList: PendingDispute[] = [];

      for (const r of ratings) {
        // Get dispute info
        const { data: dispute } = await supabase
          .from("rating_disputes")
          .select("id, dispute_reason, client_response_deadline, client_response")
          .eq("rating_id", r.id)
          .eq("initiated_by", "driver")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!dispute || dispute.client_response) continue;

        // Get course info
        const { data: course } = await supabase
          .from("courses")
          .select("scheduled_date, pickup_address, destination_address")
          .eq("id", r.course_id)
          .single();

        pendingList.push({
          id: dispute.id,
          rating_id: r.id,
          dispute_reason: dispute.dispute_reason || "",
          client_response_deadline: dispute.client_response_deadline || "",
          rating: r.rating,
          reason: r.reason,
          reason_detail: r.reason_detail,
          course_date: course?.scheduled_date || null,
          pickup_address: course?.pickup_address || null,
          destination_address: course?.destination_address || null,
        });
      }

      setDisputes(pendingList);
    } catch (err) {
      console.error("Error fetching disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (disputeId: string, ratingId: string) => {
    if (!response.trim()) {
      toast.error("Veuillez expliquer votre position");
      return;
    }

    setSubmitting(true);
    try {
      // Update dispute with client response
      const { error: disputeErr } = await supabase
        .from("rating_disputes")
        .update({
          client_response: response.trim(),
          client_response_at: new Date().toISOString(),
        } as any)
        .eq("id", disputeId);

      if (disputeErr) throw disputeErr;

      // Now trigger AI arbitration with both sides
      await supabase.functions.invoke("ai-rating-arbitration", {
        body: { ratingId },
      });

      toast.success("Votre réponse a été envoyée. L'arbitrage IA va analyser les deux versions.");
      setDisputes(prev => prev.filter(d => d.id !== disputeId));
      setRespondingId(null);
      setResponse("");
    } catch (err) {
      console.error("Error submitting response:", err);
      toast.error("Erreur lors de l'envoi de votre réponse");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || disputes.length === 0) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "Expiré";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Moins d'1 heure";
    return `${hours}h restantes`;
  };

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

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <Card key={dispute.id} className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Contestation en attente de votre réponse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Timer */}
            <Badge variant="outline" className="gap-1.5 text-orange-600 border-orange-500/30">
              <Clock className="h-3 w-3" />
              {getTimeRemaining(dispute.client_response_deadline)}
            </Badge>

            {/* Course context */}
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
              {dispute.course_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{formatDate(dispute.course_date)}</span>
                </div>
              )}
              {dispute.pickup_address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  <span className="truncate">{dispute.pickup_address}</span>
                </div>
              )}
              {dispute.destination_address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                  <span className="truncate">{dispute.destination_address}</span>
                </div>
              )}
            </div>

            {/* Your original rating */}
            <div className="p-2.5 rounded-lg bg-muted/30 border space-y-1">
              <p className="text-xs font-semibold">Votre note :</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3.5 w-3.5 ${s <= dispute.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
                <span className="text-xs ml-1">{dispute.rating}★</span>
              </div>
              {dispute.reason && (
                <p className="text-xs text-muted-foreground">Motif : {REASON_LABELS[dispute.reason] || dispute.reason}</p>
              )}
              {dispute.reason_detail && (
                <p className="text-xs text-muted-foreground italic">"{dispute.reason_detail}"</p>
              )}
            </div>

            {/* Driver's contestation */}
            <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
              <p className="text-xs font-semibold text-destructive">Réponse du chauffeur :</p>
              <p className="text-xs text-muted-foreground italic">"{dispute.dispute_reason}"</p>
            </div>

            {/* Response form or button */}
            {respondingId === dispute.id ? (
              <div className="space-y-2">
                <p className="text-xs font-medium">Votre version des faits :</p>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Expliquez pourquoi vous maintenez votre note. Soyez factuel et précis..."
                  maxLength={500}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">{response.length}/500</p>
                
                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                    <Shield className="h-3 w-3" /> Arbitrage impartial
                  </p>
                  <p>Un système d'analyse IA examinera les deux versions et prendra une décision juste et équilibrée.</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setRespondingId(null); setResponse(""); }}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitResponse(dispute.id, dispute.rating_id)}
                    disabled={submitting || !response.trim()}
                    className="flex-1 gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Envoyer ma réponse
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Répondez pour maintenir votre note.</strong> Sans réponse dans les 48h, elle sera annulée automatiquement.
                </p>
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => { setRespondingId(dispute.id); setResponse(""); }}
                >
                  <Send className="h-3.5 w-3.5" />
                  Donner ma version des faits
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
