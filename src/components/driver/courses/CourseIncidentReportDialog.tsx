import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseIncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  driverId: string;
  clientId?: string | null;
  clientName: string;
  guestPhone?: string | null;
}

const INCIDENT_TYPES = [
  { value: "non_payment", label: "Non-paiement", description: "Le client n'a pas pu ou refusé de payer" },
  { value: "bad_behavior", label: "Comportement inapproprié", description: "Incivilités, irrespect, agressivité" },
  { value: "damage", label: "Dégradation du véhicule", description: "Dommages causés au véhicule" },
  { value: "no_show", label: "Absence (no-show)", description: "Client absent au point de prise en charge" },
  { value: "other", label: "Autre", description: "Autre problème à signaler" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Faible", color: "text-yellow-600" },
  { value: "medium", label: "Moyen", color: "text-orange-600" },
  { value: "high", label: "Élevé", color: "text-destructive" },
];

export function CourseIncidentReportDialog({
  open,
  onOpenChange,
  courseId,
  driverId,
  clientId,
  clientName,
  guestPhone,
}: CourseIncidentReportDialogProps) {
  const [incidentType, setIncidentType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!incidentType) {
      toast.error("Sélectionnez le type de problème");
      return;
    }
    if (!description.trim()) {
      toast.error("Décrivez le problème rencontré");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("driver_course_incidents").insert({
        course_id: courseId,
        driver_id: driverId,
        client_id: clientId || null,
        guest_name: !clientId ? clientName : null,
        guest_phone: guestPhone || null,
        incident_type: incidentType,
        description: description.trim(),
        severity,
      } as any);

      if (error) throw error;

      toast.success("Signalement envoyé à l'administration");
      onOpenChange(false);
      setIncidentType("");
      setDescription("");
      setSeverity("medium");
    } catch (err: any) {
      console.error("Error submitting incident:", err);
      toast.error(err.message || "Erreur lors de l'envoi du signalement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Signalez un problème avec <strong>{clientName}</strong>. L'administration sera notifiée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type d'incident */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Type de problème</Label>
            <RadioGroup value={incidentType} onValueChange={setIncidentType} className="space-y-2">
              {INCIDENT_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    incidentType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <RadioGroupItem value={type.value} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Gravité */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Niveau de gravité</Label>
            <RadioGroup value={severity} onValueChange={setSeverity} className="flex gap-3">
              {SEVERITY_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    severity === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={level.value} />
                  <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description détaillée</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème rencontré avec le plus de détails possible..."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer le signalement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
