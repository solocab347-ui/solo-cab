import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReportContextType = "message" | "ride_message" | "profile" | "other";

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: ReportContextType;
  contextId?: string | null;
  reportedUserId?: string | null;
  reportedUserName?: string;
}

const REASONS = [
  { value: "harassment", label: "Harcèlement ou intimidation" },
  { value: "hate_speech", label: "Discours haineux ou discrimination" },
  { value: "sexual_content", label: "Contenu sexuel ou inapproprié" },
  { value: "spam", label: "Spam ou arnaque" },
  { value: "violence", label: "Violence ou menaces" },
  { value: "illegal", label: "Activité illégale" },
  { value: "other", label: "Autre (préciser)" },
];

export function ReportContentDialog({
  open,
  onOpenChange,
  contextType,
  contextId,
  reportedUserId,
  reportedUserName,
}: ReportContentDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setReason("");
    setDetails("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Vous devez être connecté pour signaler");
        return;
      }
      const finalReason =
        reason === "other" ? details.trim() : REASONS.find((r) => r.value === reason)?.label || reason;

      const { error } = await supabase.from("content_reports").insert({
        reporter_id: userData.user.id,
        reported_user_id: reportedUserId ?? null,
        context_type: contextType,
        context_id: contextId ?? null,
        reason: finalReason,
        details: reason === "other" ? null : details.trim() || null,
      });
      if (error) throw error;
      toast.success("Signalement envoyé. Notre équipe va l'examiner sous 24h.");
      handleClose(false);
    } catch (e: any) {
      console.error("[report]", e);
      toast.error("Impossible d'envoyer le signalement");
    } finally {
      setLoading(false);
    }
  };

  const isValid = reason && (reason !== "other" || details.trim().length >= 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flag className="w-5 h-5" />
            Signaler {reportedUserName ? reportedUserName : "ce contenu"}
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à garder SoloCab sûr. Les signalements sont examinés sous 24h par notre équipe de modération.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Label className="text-base font-medium">Motif</Label>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center space-x-2">
                <RadioGroupItem value={r.value} id={`rep-${r.value}`} />
                <Label htmlFor={`rep-${r.value}`} className="font-normal cursor-pointer">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label>{reason === "other" ? "Précisez (obligatoire)" : "Détails (facultatif)"}</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Décrivez ce qui s'est passé..."
              className="min-h-[80px]"
              maxLength={1000}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flag className="w-4 h-4 mr-2" />}
            Envoyer le signalement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
