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
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientBlockDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  onBlock: (reason: string) => void;
  isLoading?: boolean;
}

const BLOCK_REASONS = [
  { value: "no_response", label: "Absence de réponse" },
  { value: "service_quality", label: "Qualité de service insatisfaisante" },
  { value: "late", label: "Retards répétés" },
  { value: "attitude", label: "Attitude non professionnelle" },
  { value: "pricing", label: "Désaccord sur les tarifs" },
  { value: "availability", label: "Problèmes de disponibilité" },
  { value: "other", label: "Autre raison (préciser)" },
];

export function ClientBlockDriverDialog({
  open,
  onOpenChange,
  driverName,
  onBlock,
  isLoading = false,
}: ClientBlockDriverDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");

  const handleBlock = () => {
    const finalReason =
      selectedReason === "other"
        ? customReason
        : BLOCK_REASONS.find((r) => r.value === selectedReason)?.label || "";

    if (finalReason.trim()) {
      onBlock(finalReason);
    }
  };

  const isValid =
    selectedReason && (selectedReason !== "other" || customReason.trim().length > 0);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedReason("");
      setCustomReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="w-5 h-5" />
            Bloquer ce chauffeur
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de bloquer <strong>{driverName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            En bloquant ce chauffeur, il sera retiré de votre liste et vous ne
            le verrez plus dans la vitrine publique. Vous pourrez le débloquer
            plus tard si vous changez d'avis.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          <Label className="text-base font-medium">Motif du blocage</Label>

          <RadioGroup
            value={selectedReason}
            onValueChange={setSelectedReason}
            className="space-y-2"
          >
            {BLOCK_REASONS.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label
                  htmlFor={reason.value}
                  className="font-normal cursor-pointer"
                >
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label>Précisez votre motif</Label>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Expliquez la raison du blocage..."
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Ban className="w-4 h-4 mr-2" />
            )}
            Confirmer le blocage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
