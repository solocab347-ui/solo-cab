import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Clock, XCircle, User, Car, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  cancelledBy: "driver" | "client";
  scheduledDate: string;
  hasDeposit?: boolean;
  depositAmount?: number;
  hasCardHold?: boolean;
  paymentMethod?: string;
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = {
  driver: [
    { value: "vehicle_issue", label: "Problème avec le véhicule" },
    { value: "personal_emergency", label: "Urgence personnelle" },
    { value: "schedule_conflict", label: "Conflit d'agenda" },
    { value: "other", label: "Autre raison" },
  ],
  client: [
    { value: "plans_changed", label: "Changement de programme" },
    { value: "found_alternative", label: "Alternative trouvée" },
    { value: "no_longer_needed", label: "Plus besoin du transport" },
    { value: "other", label: "Autre raison" },
  ],
};

// Constantes selon le cahier des charges
const FREE_CANCELLATION_HOURS_WITH_DEPOSIT = 4; // T-4h avec acompte
const FREE_CANCELLATION_HOURS_NO_DEPOSIT = 1; // T-1h sans acompte
const CANCELLATION_FEE_NO_DEPOSIT = 10; // 10€ sans acompte

export function CancellationDialog({
  open,
  onOpenChange,
  courseId,
  cancelledBy,
  scheduledDate,
  hasDeposit = false,
  depositAmount = 0,
  hasCardHold = false,
  paymentMethod,
  onSuccess,
}: CancellationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Calculate hours until pickup
  const hoursUntilPickup = (new Date(scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60);
  
  // Déterminer la fenêtre d'annulation selon le type de course
  const freeCancellationHours = hasDeposit 
    ? FREE_CANCELLATION_HOURS_WITH_DEPOSIT 
    : FREE_CANCELLATION_HOURS_NO_DEPOSIT;
  
  const isWithinPenaltyWindow = hoursUntilPickup <= freeCancellationHours;

  const getWarningMessage = () => {
    if (cancelledBy === "driver") {
      // Le chauffeur annule → toujours remboursement client
      if (hasDeposit) {
        return {
          type: "info" as const,
          message: `En annulant, l'acompte de ${depositAmount?.toFixed(2)}€ sera remboursé au client.`,
        };
      }
      return {
        type: "info" as const,
        message: "Aucun frais pour le client.",
      };
    }

    // Client qui annule
    if (hasDeposit) {
      // Course avec acompte
      if (hoursUntilPickup > freeCancellationHours) {
        return {
          type: "info" as const,
          message: `Annulation gratuite. Votre acompte de ${depositAmount?.toFixed(2)}€ sera remboursé.`,
        };
      } else {
        return {
          type: "warning" as const,
          message: `⚠️ Annulation moins de ${freeCancellationHours}h avant la course. L'acompte de ${depositAmount?.toFixed(2)}€ n'est pas remboursable.`,
        };
      }
    } else {
      // Course sans acompte
      if (hoursUntilPickup > freeCancellationHours) {
        return {
          type: "info" as const,
          message: "Annulation gratuite.",
        };
      } else {
        if (hasCardHold) {
          return {
            type: "warning" as const,
            message: `⚠️ Annulation moins de ${freeCancellationHours}h avant la course. Des frais de ${CANCELLATION_FEE_NO_DEPOSIT}€ seront prélevés.`,
          };
        }
        return {
          type: "warning" as const,
          message: `⚠️ Annulation tardive (moins de ${freeCancellationHours}h avant).`,
        };
      }
    }
  };

  const warningInfo = getWarningMessage();

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Veuillez sélectionner un motif d'annulation");
      return;
    }

    const reason = selectedReason === "other" ? customReason : 
      CANCELLATION_REASONS[cancelledBy].find(r => r.value === selectedReason)?.label || selectedReason;

    if (selectedReason === "other" && !customReason.trim()) {
      toast.error("Veuillez préciser le motif d'annulation");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-cancellation-fee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            course_id: courseId,
            cancelled_by: cancelledBy,
            reason,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erreur lors de l'annulation");

      if (data.deposit_forfeited) {
        toast.warning(`Course annulée. L'acompte de ${depositAmount?.toFixed(2)}€ est conservé par le chauffeur.`);
      } else if (data.fee_charged) {
        toast.warning(`Course annulée. Frais de ${data.fee_amount}€ prélevés.`);
      } else if (data.deposit_refunded) {
        toast.success("Course annulée. L'acompte a été remboursé.");
      } else {
        toast.success("Course annulée avec succès.");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Cancellation error:", error);
      toast.error(error.message || "Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  const reasons = CANCELLATION_REASONS[cancelledBy];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Annuler la course
          </DialogTitle>
          <DialogDescription>
            {cancelledBy === "driver" 
              ? "Êtes-vous sûr de vouloir annuler cette course ?"
              : "Voulez-vous vraiment annuler votre réservation ?"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Who is cancelling indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {cancelledBy === "driver" ? (
              <>
                <Car className="h-4 w-4" />
                <span>Annulation par le chauffeur</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>Annulation par le client</span>
              </>
            )}
          </div>

          {/* Time until pickup */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              Course prévue dans{" "}
              <strong>
                {hoursUntilPickup > 0 
                  ? `${Math.floor(hoursUntilPickup)}h${Math.round((hoursUntilPickup % 1) * 60)}min`
                  : "passée"
                }
              </strong>
            </span>
          </div>

          {/* Policy reminder */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            <p className="font-medium mb-1">
              <a href="/politique-annulation" target="_blank" className="underline text-primary hover:text-primary/80">
                Voir la politique d'annulation complète
              </a>
            </p>
            {hasDeposit ? (
              <ul className="list-disc list-inside space-y-0.5">
                <li>Avant T-{FREE_CANCELLATION_HOURS_WITH_DEPOSIT}h : remboursement intégral</li>
                <li>Après T-{FREE_CANCELLATION_HOURS_WITH_DEPOSIT}h : acompte non remboursable</li>
                <li>Si le chauffeur annule : remboursement complet</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-0.5">
                <li>Avant T-{FREE_CANCELLATION_HOURS_NO_DEPOSIT}h : aucun frais</li>
                <li>Après T-{FREE_CANCELLATION_HOURS_NO_DEPOSIT}h : frais d'annulation tardive</li>
                <li>Si le chauffeur annule : aucun frais</li>
              </ul>
            )}
          </div>

          {/* Warning/Info */}
          <Alert variant={warningInfo.type === "warning" ? "destructive" : "default"}>
            {warningInfo.type === "warning" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <AlertDescription>{warningInfo.message}</AlertDescription>
          </Alert>

          {/* Reason selection */}
          <div className="space-y-3">
            <Label>Motif de l'annulation *</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom reason */}
          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Précisez *</Label>
              <Textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Décrivez le motif..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Retour
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || !selectedReason}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Annulation...
              </>
            ) : (
              "Confirmer l'annulation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
