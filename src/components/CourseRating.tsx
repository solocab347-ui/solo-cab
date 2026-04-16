import { useState } from "react";
import { Star, AlertTriangle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const LOW_RATING_REASONS = [
  { value: "late", label: "Retard chauffeur" },
  { value: "dangerous_driving", label: "Conduite dangereuse" },
  { value: "bad_behavior", label: "Mauvais comportement" },
  { value: "dirty_vehicle", label: "Véhicule sale" },
  { value: "bad_communication", label: "Mauvaise communication" },
  { value: "bad_route", label: "Mauvais itinéraire" },
  { value: "payment_issue", label: "Problème paiement" },
  { value: "other", label: "Autre" },
];

interface CourseRatingProps {
  courseId: string;
  driverId?: string;
  clientId?: string;
  currentRating?: number | null;
  onRatingSubmitted?: () => void;
}

export const CourseRating = ({
  courseId,
  driverId,
  clientId,
  currentRating,
  onRatingSubmitted,
}: CourseRatingProps) => {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [showPostSubmitInfo, setShowPostSubmitInfo] = useState(false);

  const handleStarClick = (star: number) => {
    setRating(star);
    if (star <= 3) {
      setShowReasonForm(true);
    } else {
      setShowReasonForm(false);
      setReason("");
      setReasonDetail("");
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    if (rating <= 3) {
      if (!reason) {
        toast.error("Veuillez sélectionner un motif");
        return;
      }
      if (!reasonDetail.trim()) {
        toast.error("Veuillez expliquer brièvement ce qui s'est passé");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Determine status: 4-5★ validated immediately, 1-3★ pending review
      const status = rating >= 4 ? "validated" : "pending_review";

      // Get client_id and driver_id if not provided
      let finalClientId = clientId;
      let finalDriverId = driverId;

      if (!finalClientId || !finalDriverId) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("client_id, driver_id")
          .eq("id", courseId)
          .single();

        if (courseData) {
          finalClientId = finalClientId || courseData.client_id;
          finalDriverId = finalDriverId || courseData.driver_id;
        }
      }

      if (!finalClientId || !finalDriverId) {
        toast.error("Impossible de récupérer les informations de la course");
        return;
      }

      const { error } = await supabase.from("course_ratings").insert({
        course_id: courseId,
        client_id: finalClientId,
        driver_id: finalDriverId,
        rating,
        reason: rating <= 3 ? reason : null,
        reason_detail: rating <= 3 ? reasonDetail.trim() : null,
        status,
        client_response_deadline:
          rating <= 3
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null,
      });

      if (error) throw error;

      // Also update legacy client_rating on courses table
      if (status === "validated") {
        await supabase
          .from("courses")
          .update({ client_rating: rating })
          .eq("id", courseId);
      }

      if (rating >= 4) {
        toast.success("Merci pour votre évaluation !");
      } else {
        toast.success(
          "Votre note a été enregistrée. Le chauffeur pourra la contester sous 48h. Suivez l'évolution dans votre espace."
        );
      }

      setShowPostSubmitInfo(rating <= 3);
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      if (error?.code === "23505") {
        toast.error("Vous avez déjà noté cette course");
      } else {
        toast.error("Erreur lors de l'enregistrement de la note");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentRating || showPostSubmitInfo) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= (currentRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            Note attribuée
          </span>
        </div>
        {(showPostSubmitInfo || (currentRating && currentRating <= 3)) && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1.5">
            <p className="font-semibold text-blue-700 dark:text-blue-300">ℹ️ Suivi de votre note</p>
            <p className="text-muted-foreground">
              Votre note a bien été enregistrée. Le chauffeur peut la <strong>contester</strong> s'il estime qu'elle est injustifiée.
            </p>
            <p className="text-muted-foreground">
              Si le chauffeur conteste, vous recevrez une <strong>notification</strong> et disposerez de <strong>48 heures</strong> pour donner votre version des faits.
            </p>
            <p className="text-muted-foreground">
              <strong>Sans réponse de votre part sous 48h, la note sera automatiquement annulée.</strong>
            </p>
            <p className="text-muted-foreground">
              Un arbitrage IA impartial prendra la décision finale en tenant compte des deux versions.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
            disabled={isSubmitting}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (hoveredRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {rating > 0 ? `${rating}/5` : "Notez cette course"}
        </span>
      </div>

      {/* Low rating reason form */}
      {showReasonForm && rating <= 3 && (
        <div className="space-y-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Note basse — merci de préciser le motif</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Motif *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sélectionnez un motif" />
              </SelectTrigger>
              <SelectContent>
                {LOW_RATING_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Expliquez brièvement ce qui s'est passé *
            </Label>
            <Textarea
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="Décrivez la situation..."
              className="text-sm min-h-[60px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reasonDetail.length}/500
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Cette note sera examinée par notre système d'arbitrage IA avant
            d'être appliquée. Le chauffeur pourra contester si nécessaire.
          </p>
        </div>
      )}

      {/* Submit */}
      {rating > 0 && (
        <Button
          onClick={handleRatingSubmit}
          disabled={isSubmitting}
          size="sm"
          className="w-fit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Envoi...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-1" /> Valider la note
            </>
          )}
        </Button>
      )}
    </div>
  );
};
