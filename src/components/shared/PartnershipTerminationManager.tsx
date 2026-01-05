import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Euro,
  Loader2,
  HandshakeIcon,
  XCircle
} from "lucide-react";

interface PartnershipTerminationManagerProps {
  partnershipId: string;
  partnershipType: "company_driver" | "fleet_driver";
  userRole: "initiator" | "receiver"; // Who is viewing
  partnerName: string;
  outstandingBalance: number;
  terminationPending: boolean;
  terminationRequestedBy?: string | null;
  ownConfirmedFinalPayment: boolean;
  partnerConfirmedFinalPayment: boolean;
  onRefresh: () => void;
}

export function PartnershipTerminationManager({
  partnershipId,
  partnershipType,
  userRole,
  partnerName,
  outstandingBalance,
  terminationPending,
  terminationRequestedBy,
  ownConfirmedFinalPayment,
  partnerConfirmedFinalPayment,
  onRefresh,
}: PartnershipTerminationManagerProps) {
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");

  const tableName = partnershipType === "company_driver" ? "company_driver_agreements" : "fleet_driver_partnerships";
  
  const getConfirmFields = () => {
    if (partnershipType === "company_driver") {
      return userRole === "initiator" 
        ? { own: "company_confirmed_final_payment", partner: "driver_confirmed_final_payment" }
        : { own: "driver_confirmed_final_payment", partner: "company_confirmed_final_payment" };
    } else {
      return userRole === "initiator"
        ? { own: "fleet_manager_confirmed_final_payment", partner: "driver_confirmed_final_payment" }
        : { own: "driver_confirmed_final_payment", partner: "fleet_manager_confirmed_final_payment" };
    }
  };

  // Request termination
  const requestTermination = useMutation({
    mutationFn: async () => {
      const requestedBy = partnershipType === "company_driver"
        ? (userRole === "initiator" ? "company" : "driver")
        : (userRole === "initiator" ? "fleet_manager" : "driver");

      const updateData: any = {
        termination_requested_by: requestedBy,
        termination_requested_at: new Date().toISOString(),
        termination_pending_payment_validation: outstandingBalance > 0,
        termination_reason: terminationReason || null,
      };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", partnershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        outstandingBalance > 0
          ? "Demande de fin de partenariat envoyée. Les paiements en cours doivent être validés."
          : "Partenariat terminé avec succès."
      );
      setShowTerminateDialog(false);
      setTerminationReason("");
      onRefresh();
    },
    onError: (error: any) => {
      // Check if error is about pending courses
      const errorMessage = error?.message || "";
      if (errorMessage.includes("course(s) en cours")) {
        toast.error("Impossible de terminer: des courses sont encore en cours. Veuillez les terminer d'abord.");
      } else {
        toast.error("Erreur lors de la demande de fin de partenariat");
      }
    },
  });

  // Confirm final payment
  const confirmFinalPayment = useMutation({
    mutationFn: async () => {
      const fields = getConfirmFields();
      const updateData: any = {
        [fields.own]: true,
        [`${fields.own}_at`]: new Date().toISOString(),
      };

      // If both parties have confirmed, finalize termination
      if (partnerConfirmedFinalPayment) {
        updateData.status = "terminated";
        updateData.terminated_at = new Date().toISOString();
        updateData.termination_pending_payment_validation = false;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", partnershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (partnerConfirmedFinalPayment) {
        toast.success("Partenariat terminé. Tous les paiements ont été validés.");
      } else {
        toast.success("Paiements validés. En attente de la confirmation du partenaire.");
      }
      onRefresh();
    },
    onError: () => toast.error("Erreur lors de la confirmation"),
  });

  // Cancel termination request
  const cancelTermination = useMutation({
    mutationFn: async () => {
      const fields = getConfirmFields();
      const { error } = await supabase
        .from(tableName)
        .update({
          termination_requested_by: null,
          termination_requested_at: null,
          termination_pending_payment_validation: false,
          [fields.own]: false,
          [fields.partner]: false,
          termination_reason: null,
        })
        .eq("id", partnershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande de fin de partenariat annulée");
      onRefresh();
    },
    onError: () => toast.error("Erreur lors de l'annulation"),
  });

  const isRequester = terminationRequestedBy === (
    partnershipType === "company_driver"
      ? (userRole === "initiator" ? "company" : "driver")
      : (userRole === "initiator" ? "fleet_manager" : "driver")
  );

  if (!terminationPending) {
    return (
      <Button
        variant="outline"
        className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => setShowTerminateDialog(true)}
      >
        <Ban className="w-4 h-4 mr-2" />
        Mettre fin au partenariat
      </Button>
    );
  }

  // Termination is pending
  return (
    <>
      <Card className="border-warning bg-warning/5">
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-warning">Fin de partenariat en cours</h4>
              <p className="text-sm text-muted-foreground">
                {isRequester
                  ? `Vous avez demandé la fin du partenariat avec ${partnerName}.`
                  : `${partnerName} a demandé la fin du partenariat.`}
              </p>
            </div>
          </div>

          {outstandingBalance > 0 && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <Euro className="h-4 w-4" />
              <AlertTitle>Validation des paiements requise</AlertTitle>
              <AlertDescription>
                Solde restant: <strong>{outstandingBalance.toFixed(2)} €</strong>
                <br />
                Les deux parties doivent valider les paiements pour finaliser la fin du partenariat.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 flex-wrap">
            <Badge variant={ownConfirmedFinalPayment ? "default" : "outline"} className={ownConfirmedFinalPayment ? "bg-green-500" : ""}>
              {ownConfirmedFinalPayment ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              Vous: {ownConfirmedFinalPayment ? "Validé" : "En attente"}
            </Badge>
            <Badge variant={partnerConfirmedFinalPayment ? "default" : "outline"} className={partnerConfirmedFinalPayment ? "bg-green-500" : ""}>
              {partnerConfirmedFinalPayment ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
              {partnerName}: {partnerConfirmedFinalPayment ? "Validé" : "En attente"}
            </Badge>
          </div>

          <div className="flex gap-2">
            {!ownConfirmedFinalPayment && (
              <Button
                onClick={() => confirmFinalPayment.mutate()}
                disabled={confirmFinalPayment.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirmFinalPayment.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Valider les paiements
              </Button>
            )}

            {isRequester && !partnerConfirmedFinalPayment && (
              <Button
                variant="outline"
                onClick={() => cancelTermination.mutate()}
                disabled={cancelTermination.isPending}
              >
                {cancelTermination.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Annuler la demande
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Terminate dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              Mettre fin au partenariat
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de demander la fin du partenariat avec {partnerName}.
              {outstandingBalance > 0 && (
                <span className="block mt-2 text-warning">
                  ⚠️ Il reste un solde de {outstandingBalance.toFixed(2)} € à régler. 
                  Les deux parties devront valider les paiements pour finaliser.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Expliquez brièvement la raison de la fin du partenariat..."
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTerminateDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => requestTermination.mutate()}
              disabled={requestTermination.isPending}
            >
              {requestTermination.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Confirmer la fin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
