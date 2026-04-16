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

interface PendingItem {
  id: string; // dispute id or rating id
  rating_id: string;
  type: "respond_to_contestation" | "driver_rated_you";
  dispute_reason?: string;
  client_response_deadline: string;
  rating: number;
  reason: string | null;
  reason_detail: string | null;
  course_date: string | null;
  pickup_address: string | null;
  destination_address: string | null;
}

const REASON_LABELS: Record<string, string> = {
  late: "Retard chauffeur",
  dangerous_driving: "Conduite dangereuse",
  bad_behavior: "Mauvais comportement",
  dirty_vehicle: "Véhicule sale",
  bad_communication: "Mauvaise communication",
  bad_route: "Mauvais itinéraire",
  payment_issue: "Problème paiement",
  no_payment: "Non-paiement / refus de payer",
  no_show: "Absent au point de prise en charge",
  damage: "Dégradation du véhicule",
  other: "Autre",
};

export function RatingDisputeResponseCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchPendingItems();
  }, [user]);

  const fetchPendingItems = async () => {
    if (!user) return;
    try {
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!clientData) { setLoading(false); return; }

      const pendingList: PendingItem[] = [];

      // 1. Contested client_to_driver ratings (driver contested your rating, you must respond)
      const { data: contestedRatings } = await supabase
        .from("course_ratings")
        .select("id, rating, reason, reason_detail, course_id, status, rating_direction")
        .eq("client_id", clientData.id)
        .eq("status", "contested")
        .eq("rating_direction", "client_to_driver");

      if (contestedRatings) {
        for (const r of contestedRatings) {
          const { data: dispute } = await supabase
            .from("rating_disputes")
            .select("id, dispute_reason, client_response_deadline, client_response")
            .eq("rating_id", r.id)
            .eq("initiated_by", "driver")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!dispute || dispute.client_response) continue;

          const { data: course } = await supabase
            .from("courses")
            .select("scheduled_date, pickup_address, destination_address")
            .eq("id", r.course_id)
            .single();

          pendingList.push({
            id: dispute.id,
            rating_id: r.id,
            type: "respond_to_contestation",
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
      }

      // 2. Driver-to-client pending ratings (driver rated you low, you can contest)
      const { data: driverRatings } = await supabase
        .from("course_ratings")
        .select("id, rating, reason, reason_detail, course_id, status, rating_direction, client_response_deadline")
        .eq("client_id", clientData.id)
        .eq("status", "pending_review")
        .eq("rating_direction", "driver_to_client");

      if (driverRatings) {
        for (const r of driverRatings) {
          const { data: course } = await supabase
            .from("courses")
            .select("scheduled_date, pickup_address, destination_address")
            .eq("id", r.course_id)
            .single();

          pendingList.push({
            id: r.id,
            rating_id: r.id,
            type: "driver_rated_you",
            client_response_deadline: r.client_response_deadline || new Date(Date.now() + 48 * 3600000).toISOString(),
            rating: r.rating,
            reason: r.reason,
            reason_detail: r.reason_detail,
            course_date: course?.scheduled_date || null,
            pickup_address: course?.pickup_address || null,
            destination_address: course?.destination_address || null,
          });
        }
      }

      setItems(pendingList);
    } catch (err) {
      console.error("Error fetching pending disputes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToContestation = async (disputeId: string, ratingId: string) => {
    if (!response.trim()) {
      toast.error("Veuillez expliquer votre position");
      return;
    }
    setSubmitting(true);
    try {
      await supabase
        .from("rating_disputes")
        .update({
          client_response: response.trim(),
          client_response_at: new Date().toISOString(),
        } as any)
        .eq("id", disputeId);

      await supabase.functions.invoke("ai-rating-arbitration", {
        body: { ratingId },
      });

      toast.success("Réponse envoyée. L'arbitrage IA va analyser les deux versions.");
      setItems(prev => prev.filter(d => d.id !== disputeId));
      setRespondingId(null);
      setResponse("");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptDriverRating = async (ratingId: string) => {
    setSubmitting(true);
    try {
      await supabase
        .from("course_ratings")
        .update({ status: "validated" } as any)
        .eq("id", ratingId);

      toast.success("Note acceptée");
      setItems(prev => prev.filter(d => d.rating_id !== ratingId));
    } catch (err) {
      toast.error("Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContestDriverRating = async (ratingId: string) => {
    if (!response.trim()) {
      toast.error("Veuillez expliquer votre contestation");
      return;
    }
    setSubmitting(true);
    try {
      await supabase
        .from("course_ratings")
        .update({
          status: "contested",
        } as any)
        .eq("id", ratingId);

      await supabase.from("rating_disputes").insert({
        rating_id: ratingId,
        initiated_by: "client",
        dispute_reason: response.trim(),
        resolution: "pending",
      } as any);

      // Trigger AI with client's contestation
      await supabase.functions.invoke("ai-rating-arbitration", {
        body: { ratingId },
      });

      toast.success("Contestation envoyée — arbitrage IA en cours");
      setItems(prev => prev.filter(d => d.rating_id !== ratingId));
      setRespondingId(null);
      setResponse("");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erreur lors de la contestation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || items.length === 0) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const getTimeRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "Expiré";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Moins d'1 heure";
    return `${hours}h restantes`;
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {item.type === "respond_to_contestation"
                ? "Le chauffeur conteste votre note"
                : "Le chauffeur vous a noté"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="gap-1.5 text-orange-600 border-orange-500/30">
              <Clock className="h-3 w-3" />
              {getTimeRemaining(item.client_response_deadline)}
            </Badge>

            {/* Course context */}
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
              {item.course_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>{formatDate(item.course_date)}</span>
                </div>
              )}
              {item.pickup_address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  <span className="truncate">{item.pickup_address}</span>
                </div>
              )}
              {item.destination_address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                  <span className="truncate">{item.destination_address}</span>
                </div>
              )}
            </div>

            {/* Rating details */}
            <div className="p-2.5 rounded-lg bg-muted/30 border space-y-1">
              <p className="text-xs font-semibold">
                {item.type === "respond_to_contestation" ? "Votre note initiale :" : "Note reçue :"}
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-3.5 w-3.5 ${s <= item.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                ))}
                <span className="text-xs ml-1">{item.rating}★</span>
              </div>
              {item.reason && (
                <p className="text-xs text-muted-foreground">Motif : {REASON_LABELS[item.reason] || item.reason}</p>
              )}
              {item.reason_detail && (
                <p className="text-xs text-muted-foreground italic">"{item.reason_detail}"</p>
              )}
            </div>

            {/* Contestation details (if responding to driver's contest) */}
            {item.type === "respond_to_contestation" && item.dispute_reason && (
              <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                <p className="text-xs font-semibold text-destructive">Réponse du chauffeur :</p>
                <p className="text-xs text-muted-foreground italic">"{item.dispute_reason}"</p>
              </div>
            )}

            {/* Response form */}
            {respondingId === item.id ? (
              <div className="space-y-2">
                <p className="text-xs font-medium">
                  {item.type === "respond_to_contestation"
                    ? "Votre version des faits :"
                    : "Pourquoi contestez-vous cette note ?"}
                </p>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Soyez factuel et précis dans votre explication..."
                  maxLength={500}
                  rows={3}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">{response.length}/500</p>

                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                    <Shield className="h-3 w-3" /> Arbitrage impartial
                  </p>
                  <p>Un système IA analysera les deux versions et rendra un verdict juste.</p>
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
                    onClick={() => {
                      if (item.type === "respond_to_contestation") {
                        handleRespondToContestation(item.id, item.rating_id);
                      } else {
                        handleContestDriverRating(item.rating_id);
                      }
                    }}
                    disabled={submitting || !response.trim()}
                    className="flex-1 gap-1.5"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Envoyer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {item.type === "respond_to_contestation" ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      <strong>Répondez pour maintenir votre note.</strong> Sans réponse dans les 48h, elle sera annulée.
                    </p>
                    <Button size="sm" className="w-full gap-1.5" onClick={() => { setRespondingId(item.id); setResponse(""); }}>
                      <Send className="h-3.5 w-3.5" />
                      Donner ma version des faits
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez <strong>accepter</strong> cette note ou la <strong>contester</strong> sous 48h.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcceptDriverRating(item.rating_id)}
                        disabled={submitting}
                        className="flex-1 gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setRespondingId(item.id); setResponse(""); }}
                        disabled={submitting}
                        className="flex-1 gap-1.5"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Contester
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
