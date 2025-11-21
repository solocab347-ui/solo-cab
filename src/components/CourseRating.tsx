import { useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";

interface CourseRatingProps {
  courseId: string;
  currentRating?: number | null;
  onRatingSubmitted?: () => void;
}

export const CourseRating = ({ courseId, currentRating, onRatingSubmitted }: CourseRatingProps) => {
  const [rating, setRating] = useState<number>(currentRating || 0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ client_rating: rating })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Merci pour votre évaluation !");
      onRatingSubmitted?.();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Erreur lors de l'enregistrement de la note");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentRating) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= currentRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-2">Note attribuée</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
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
      {rating > 0 && !currentRating && (
        <Button
          onClick={handleRatingSubmit}
          disabled={isSubmitting}
          size="sm"
          className="w-fit"
        >
          {isSubmitting ? "Envoi..." : "Valider la note"}
        </Button>
      )}
    </div>
  );
};
