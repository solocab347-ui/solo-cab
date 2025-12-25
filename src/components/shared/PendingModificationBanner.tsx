import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Edit, 
  Check, 
  X, 
  Percent, 
  Calendar,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useState } from "react";

interface PendingModificationBannerProps {
  partnershipId: string;
  pendingCommission: number;
  pendingPaymentSchedule: string;
  currentCommission: number;
  currentPaymentSchedule: string;
  reason: string;
  initiatedBy: "fleet_manager" | "driver";
  isInitiator: boolean;
  onResponse: () => void;
}

const PAYMENT_SCHEDULES: Record<string, string> = {
  per_course: "Par course",
  weekly: "Hebdomadaire",
  bi_weekly: "Bi-mensuel",
  monthly: "Mensuel",
};

export const PendingModificationBanner = ({
  partnershipId,
  pendingCommission,
  pendingPaymentSchedule,
  currentCommission,
  currentPaymentSchedule,
  reason,
  initiatedBy,
  isInitiator,
  onResponse,
}: PendingModificationBannerProps) => {
  const [processing, setProcessing] = useState(false);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      // Cast to any to handle new columns not yet in generated types
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          commission_percentage: pendingCommission,
          payment_schedule: pendingPaymentSchedule,
          pending_modification: false,
          pending_modification_by: null,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_reason: null,
          pending_modification_at: null,
          last_modified_at: new Date().toISOString(),
        } as any)
        .eq("id", partnershipId);

      if (error) throw error;

      // Notify the initiator
      const { data: partnership } = await supabase
        .from("fleet_driver_partnerships")
        .select("fleet_manager_id, driver_id")
        .eq("id", partnershipId)
        .single();

      if (partnership) {
        let notifyUserId: string | null = null;
        
        if (initiatedBy === "fleet_manager") {
          const { data: fmData } = await supabase
            .from("fleet_managers")
            .select("user_id")
            .eq("id", partnership.fleet_manager_id)
            .single();
          notifyUserId = fmData?.user_id || null;
        } else {
          const { data: driverData } = await supabase
            .from("drivers")
            .select("user_id")
            .eq("id", partnership.driver_id)
            .single();
          notifyUserId = driverData?.user_id || null;
        }

        if (notifyUserId) {
          await supabase.from("notifications").insert({
            user_id: notifyUserId,
            title: "Modification acceptée",
            message: "Votre demande de modification de partenariat a été acceptée",
            type: "success",
          });
        }
      }

      toast.success("Modification acceptée");
      onResponse();
    } catch (error) {
      console.error("Error accepting modification:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      // Cast to any to handle new columns not yet in generated types
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          pending_modification: false,
          pending_modification_by: null,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_reason: null,
          pending_modification_at: null,
        } as any)
        .eq("id", partnershipId);

      if (error) throw error;

      // Notify the initiator
      const { data: partnership } = await supabase
        .from("fleet_driver_partnerships")
        .select("fleet_manager_id, driver_id")
        .eq("id", partnershipId)
        .single();

      if (partnership) {
        let notifyUserId: string | null = null;
        
        if (initiatedBy === "fleet_manager") {
          const { data: fmData } = await supabase
            .from("fleet_managers")
            .select("user_id")
            .eq("id", partnership.fleet_manager_id)
            .single();
          notifyUserId = fmData?.user_id || null;
        } else {
          const { data: driverData } = await supabase
            .from("drivers")
            .select("user_id")
            .eq("id", partnership.driver_id)
            .single();
          notifyUserId = driverData?.user_id || null;
        }

        if (notifyUserId) {
          await supabase.from("notifications").insert({
            user_id: notifyUserId,
            title: "Modification refusée",
            message: "Votre demande de modification de partenariat a été refusée",
            type: "warning",
          });
        }
      }

      toast.success("Modification refusée");
      onResponse();
    } catch (error) {
      console.error("Error rejecting modification:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      // Cast to any to handle new columns not yet in generated types
      const { error } = await supabase
        .from("fleet_driver_partnerships")
        .update({
          pending_modification: false,
          pending_modification_by: null,
          pending_new_commission: null,
          pending_new_payment_schedule: null,
          pending_modification_reason: null,
          pending_modification_at: null,
        } as any)
        .eq("id", partnershipId);

      if (error) throw error;
      toast.success("Demande annulée");
      onResponse();
    } catch (error) {
      console.error("Error cancelling modification:", error);
      toast.error("Erreur lors de l'annulation");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Alert className="border-warning/50 bg-warning/10">
      <Edit className="w-4 h-4 text-warning" />
      <AlertTitle className="text-warning">
        {isInitiator ? "Modification en attente de réponse" : "Demande de modification reçue"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{currentCommission}%</span>
            <ArrowRight className="w-4 h-4 text-warning" />
            <Badge className="bg-warning/20 text-warning border-warning/30">
              {pendingCommission}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{PAYMENT_SCHEDULES[currentPaymentSchedule] || currentPaymentSchedule}</span>
            <ArrowRight className="w-4 h-4 text-warning" />
            <Badge className="bg-warning/20 text-warning border-warning/30">
              {PAYMENT_SCHEDULES[pendingPaymentSchedule] || pendingPaymentSchedule}
            </Badge>
          </div>
        </div>

        {reason && (
          <p className="text-sm italic text-muted-foreground">
            Raison : "{reason}"
          </p>
        )}

        <div className="flex gap-2 mt-3">
          {isInitiator ? (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Annuler la demande
            </Button>
          ) : (
            <>
              <Button 
                size="sm" 
                onClick={handleAccept}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Accepter
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleReject}
                disabled={processing}
              >
                <X className="w-4 h-4 mr-1" />
                Refuser
              </Button>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
