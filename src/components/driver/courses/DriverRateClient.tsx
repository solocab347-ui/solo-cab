import { useState } from "react";
import { Star, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CLIENT_RATING_REASONS = [
  { value: "no_payment", label: "Non-paiement / refus de payer" },
  { value: "no_show", label: "Absent au point de prise en charge" },
  { value: "bad_behavior", label: "Comportement inapproprié" },
  { value: "late", label: "Retard important du client" },
  { value: "damage", label: "Dégradation du véhicule" },
  { value: "bad_communication", label: "Mauvaise communication" },
  { value: "other", label: "Autre" },
];

interface DriverRateClientProps {
  courseId: string;
  driverId: string;
  clientId?: string | null;
  clientName: string;
  onRated?: () => void;
}

export function DriverRateClient({
  courseId,
  driverId,
  clientId,
  clientName,
  onRated,
}: DriverRateClientProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (star: number) => {
    setRating(star);
    setShowForm(star <= 3);
    if (star > 3) {
      setReason("");
      setReasonDetail("");
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (rating <= 3 && !reason) {
      toast.error("Sélectionnez un motif");
      return;
    }
    if (rating <= 3 && !reasonDetail.trim()) {
      toast.error("Décrivez brièvement la situation");
      return;
    }

    setSubmitting(true);
    try {
      const status = rating >= 4 ? "validated" : "pending_review";

      const { error } = await supabase.from("course_ratings").insert({
        course_id: courseId,
        driver_id: driverId,
        client_id: clientId || null,
        rating,
        reason: rating <= 3 ? reason : null,
        reason_detail: rating <= 3 ? reasonDetail.trim() : null,
        status,
        rating_direction: "driver_to_client",
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous avez déjà noté ce client pour cette course");
        } else {
          throw error;
        }
        return;
      }

      setSubmitted(true);
      if (rating >= 4) {
        toast.success("Note envoyée !");
      } else {
        toast.success(
          "Note enregistrée. Le client pourra la contester sous 48h."
        );
      }
      onRated?.();
    } catch (err) {
      console.error("Error rating client:", err);
      toast.error("Erreur lors de l'envoi de la note");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-5 h-5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Note attribuée à {clientName}
        </p>
        {rating <= 3 && (
          <p className="text-xs text-center text-blue-600 dark:text-blue-400">
            Le client a 48h pour contester. Sans réponse, la note sera validée.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-center">
        Évaluer {clientName}
      </p>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
            disabled={submitting}
          >
            <Star
              className={`w-7 h-7 ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      {showForm && rating <= 3 && rating > 0 && (
        <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Précisez le motif
          </div>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
          >
            <option value="">Sélectionnez un motif</option>
            {CLIENT_RATING_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Textarea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            placeholder="Décrivez la situation..."
            className="text-sm min-h-[50px]"
            maxLength={500}
            rows={2}
          />
        </div>
      )}

      {rating > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="sm"
          className="w-full gap-1.5"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Envoyer ma note ({rating}/5)
        </Button>
      )}
    </div>
  );
}
