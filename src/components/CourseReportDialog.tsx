import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface CourseReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  reportedAgainstUserId: string;
  isDriver: boolean;
  currentUserId: string;
}

const CourseReportDialog = ({
  open,
  onOpenChange,
  courseId,
  reportedAgainstUserId,
  isDriver,
  currentUserId,
}: CourseReportDialogProps) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const driverReasons = [
    "Client non présent au rendez-vous",
    "Client agressif ou menaçant",
    "Client en état d'ébriété",
    "Refus de paiement",
    "Comportement inapproprié",
    "Dégradation du véhicule",
    "Autre (précisez ci-dessous)",
  ];

  const clientReasons = [
    "Chauffeur en retard",
    "Comportement inapproprié du chauffeur",
    "Véhicule non conforme",
    "Trajet non respecté",
    "Tarif contesté",
    "Conduite dangereuse",
    "Autre (précisez ci-dessous)",
  ];

  const reasons = isDriver ? driverReasons : clientReasons;

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Veuillez sélectionner un motif");
      return;
    }

    if (!description.trim()) {
      toast.error("Veuillez décrire le problème");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("disputes").insert({
        course_id: courseId,
        reported_by_user_id: currentUserId,
        reported_against_user_id: reportedAgainstUserId,
        reporter_type: isDriver ? "driver" : "client",
        reason: reason,
        description: description,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Signalement envoyé à l'administrateur");
      onOpenChange(false);
      setReason("");
      setDescription("");
    } catch (error: any) {
      console.error("Error submitting dispute:", error);
      toast.error("Erreur lors de l'envoi du signalement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré avec cette course. L'administrateur sera notifié.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Motif du signalement</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description détaillée</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez en détail ce qui s'est passé..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Soyez le plus précis possible pour faciliter le traitement de votre demande.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-warning hover:bg-warning/90"
          >
            {submitting ? "Envoi..." : "Envoyer le signalement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseReportDialog;
