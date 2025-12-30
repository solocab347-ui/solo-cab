import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Edit, 
  Percent, 
  Calendar, 
  AlertTriangle, 
  Loader2,
  ArrowRight,
  Euro
} from "lucide-react";

interface PartnershipModificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnershipId: string;
  currentCommissionType?: string;
  currentCommission: number;
  currentCommissionFixedAmount?: number | null;
  currentPaymentSchedule: string;
  partnerName: string;
  initiatorType: "fleet_manager" | "driver";
  onSuccess: () => void;
}

const PAYMENT_SCHEDULES = [
  { value: "per_course", label: "Par course" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "bi_weekly", label: "Bi-mensuel" },
  { value: "monthly", label: "Mensuel" },
];

export const PartnershipModificationDialog = ({
  open,
  onOpenChange,
  partnershipId,
  currentCommissionType = "percentage",
  currentCommission,
  currentCommissionFixedAmount,
  currentPaymentSchedule,
  partnerName,
  initiatorType,
  onSuccess,
}: PartnershipModificationDialogProps) => {
  const [newCommissionType, setNewCommissionType] = useState(currentCommissionType);
  const [newCommission, setNewCommission] = useState(currentCommission.toString());
  const [newFixedAmount, setNewFixedAmount] = useState(currentCommissionFixedAmount?.toString() || "");
  const [newPaymentSchedule, setNewPaymentSchedule] = useState(currentPaymentSchedule);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasChanges = 
    newCommissionType !== currentCommissionType ||
    (newCommissionType === "percentage" && parseFloat(newCommission) !== currentCommission) ||
    (newCommissionType === "fixed" && parseFloat(newFixedAmount) !== currentCommissionFixedAmount) ||
    newPaymentSchedule !== currentPaymentSchedule;

  const getCommissionDisplay = (type: string, percentage: number, fixedAmount?: number | null) => {
    if (type === "fixed" && fixedAmount) {
      return `${fixedAmount}€/course`;
    }
    return `${percentage}%`;
  };

  const handleSubmit = async () => {
    if (!hasChanges) {
      toast.error("Aucune modification détectée");
      return;
    }

    if (!reason.trim()) {
      toast.error("Veuillez indiquer la raison de la modification");
      return;
    }

    setSubmitting(true);

    try {
      // Get partnership details to find the other party
      const { data: partnership, error: fetchError } = await supabase
        .from("fleet_driver_partnerships")
        .select("fleet_manager_id, driver_id")
        .eq("id", partnershipId)
        .single();

      if (fetchError) throw fetchError;

      // Update the partnership with modification request
      const { error: updateError } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          pending_modification: true,
          pending_modification_by: initiatorType,
          pending_new_commission_type: newCommissionType,
          pending_new_commission: newCommissionType === "percentage" ? parseFloat(newCommission) : 0,
          pending_new_commission_fixed_amount: newCommissionType === "fixed" ? parseFloat(newFixedAmount) : null,
          pending_new_payment_schedule: newPaymentSchedule,
          pending_modification_reason: reason,
          pending_modification_at: new Date().toISOString(),
        } as any)
        .eq("id", partnershipId);

      if (updateError) throw updateError;

      // Notify the other party
      let notifyUserId: string | null = null;
      const newCommissionDisplay = newCommissionType === "fixed" 
        ? `${newFixedAmount}€/course` 
        : `${newCommission}%`;
      
      if (initiatorType === "fleet_manager") {
        // Notify driver
        const { data: driverData } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", partnership.driver_id)
          .single();
        notifyUserId = driverData?.user_id || null;
      } else {
        // Notify fleet manager
        const { data: fmData } = await supabase
          .from("fleet_managers")
          .select("user_id")
          .eq("id", partnership.fleet_manager_id)
          .single();
        notifyUserId = fmData?.user_id || null;
      }

      if (notifyUserId) {
        await supabase.from("notifications").insert({
          user_id: notifyUserId,
          title: "Demande de modification de partenariat",
          message: `${partnerName} propose de modifier les termes du partenariat (Commission: ${newCommissionDisplay})`,
          type: "partnership",
          link: initiatorType === "fleet_manager" ? "/driver-dashboard?tab=fleet-partnerships" : "/fleet-dashboard?tab=partnerships"
        });
      }

      toast.success("Demande de modification envoyée");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error submitting modification:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Modifier le partenariat
          </DialogTitle>
          <DialogDescription>
            Proposez une modification des termes. L'autre partie devra accepter pour que les changements prennent effet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <AlertDescription>
              Cette modification nécessite l'accord de <strong>{partnerName}</strong> pour prendre effet.
            </AlertDescription>
          </Alert>

          {/* Type de commission */}
          <div className="space-y-2">
            <Label>Type de commission</Label>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-muted-foreground">
                {currentCommissionType === "fixed" ? "Montant fixe" : "Pourcentage"}
              </Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Select value={newCommissionType} onValueChange={setNewCommissionType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Commission value */}
          {newCommissionType === "percentage" ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Commission (%)
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-lg font-semibold">
                    {getCommissionDisplay(currentCommissionType, currentCommission, currentCommissionFixedAmount)}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <Input
                  type="number"
                  value={newCommission}
                  onChange={(e) => setNewCommission(e.target.value)}
                  min={0}
                  max={50}
                  step={0.5}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Montant fixe par course (€)
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-lg font-semibold">
                    {getCommissionDisplay(currentCommissionType, currentCommission, currentCommissionFixedAmount)}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <Input
                  type="number"
                  value={newFixedAmount}
                  onChange={(e) => setNewFixedAmount(e.target.value)}
                  min={0}
                  step={0.5}
                  className="w-24"
                  placeholder="Ex: 5"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>
          )}

          {/* Payment Schedule */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fréquence de paiement
            </Label>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-muted-foreground">
                {PAYMENT_SCHEDULES.find(s => s.value === currentPaymentSchedule)?.label || currentPaymentSchedule}
              </Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Select value={newPaymentSchedule} onValueChange={setNewPaymentSchedule}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_SCHEDULES.map((schedule) => (
                    <SelectItem key={schedule.value} value={schedule.value}>
                      {schedule.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Raison de la modification *</Label>
            <Textarea
              placeholder="Expliquez pourquoi vous souhaitez modifier ces termes..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !hasChanges || !reason.trim()}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};