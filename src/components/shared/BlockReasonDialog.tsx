import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BlockReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  partnerType: "driver" | "company";
  onBlock: (reason: string) => void;
  isLoading?: boolean;
}

const BLOCK_REASONS_DRIVER = [
  { value: "no_response", label: "Absence de réponse répétée" },
  { value: "unprofessional", label: "Comportement non professionnel" },
  { value: "service_quality", label: "Qualité de service insatisfaisante" },
  { value: "pricing_disagreement", label: "Désaccord sur les tarifs" },
  { value: "availability_issues", label: "Problèmes de disponibilité" },
  { value: "communication_issues", label: "Problèmes de communication" },
  { value: "other", label: "Autre raison (préciser)" },
];

const BLOCK_REASONS_COMPANY = [
  { value: "no_response", label: "Absence de réponse répétée" },
  { value: "payment_issues", label: "Problèmes de paiement" },
  { value: "unreasonable_demands", label: "Exigences déraisonnables" },
  { value: "disrespectful", label: "Manque de respect" },
  { value: "contract_breach", label: "Non-respect des engagements" },
  { value: "communication_issues", label: "Problèmes de communication" },
  { value: "other", label: "Autre raison (préciser)" },
];

export function BlockReasonDialog({
  open,
  onOpenChange,
  partnerName,
  partnerType,
  onBlock,
  isLoading = false,
}: BlockReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");

  const reasons = partnerType === "driver" ? BLOCK_REASONS_DRIVER : BLOCK_REASONS_COMPANY;

  const handleBlock = () => {
    const finalReason = selectedReason === "other" 
      ? customReason 
      : reasons.find(r => r.value === selectedReason)?.label || "";
    
    if (finalReason.trim()) {
      onBlock(finalReason);
    }
  };

  const isValid = selectedReason && (selectedReason !== "other" || customReason.trim().length > 0);

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
            Bloquer {partnerType === "driver" ? "ce chauffeur" : "cette entreprise"}
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de bloquer <strong>{partnerName}</strong>. 
            Cette action empêchera toute future interaction.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {partnerType === "driver" 
              ? "Ce chauffeur ne pourra plus vous voir dans les recherches et ne pourra plus vous proposer ses services."
              : "Cette entreprise ne pourra plus vous voir dans les recherches et ne pourra plus vous proposer de partenariat."
            }
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          <Label className="text-base font-medium">Motif du blocage</Label>
          
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
            {reasons.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label htmlFor={reason.value} className="font-normal cursor-pointer">
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
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
