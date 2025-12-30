import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { PaymentMethodSelector, getPaymentMethodLabel, getPaymentMethodIcon, PAYMENT_METHODS } from "./PaymentMethodSelector";

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  requestedPaymentMethod: string | null;
  onConfirmed: () => void;
}

export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  courseId,
  requestedPaymentMethod,
  onConfirmed,
}: PaymentConfirmationDialogProps) {
  const [saving, setSaving] = useState(false);
  const [paymentMethodUsed, setPaymentMethodUsed] = useState(requestedPaymentMethod || "card");
  const [notes, setNotes] = useState("");
  const [showMismatchAlert, setShowMismatchAlert] = useState(false);

  const handleConfirm = async () => {
    // Si le moyen de paiement a changé, demander confirmation
    if (requestedPaymentMethod && paymentMethodUsed !== requestedPaymentMethod) {
      setShowMismatchAlert(true);
      return;
    }
    
    await savePaymentConfirmation();
  };

  const savePaymentConfirmation = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("courses")
        .update({
          payment_method_used: paymentMethodUsed,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user.id,
          notes: notes ? `${notes}\n[Paiement confirmé: ${getPaymentMethodLabel(paymentMethodUsed)}]` : `[Paiement confirmé: ${getPaymentMethodLabel(paymentMethodUsed)}]`
        })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Paiement confirmé");
      onConfirmed();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setSaving(false);
      setShowMismatchAlert(false);
    }
  };

  const RequestedIcon = requestedPaymentMethod ? getPaymentMethodIcon(requestedPaymentMethod) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer le paiement</DialogTitle>
            <DialogDescription>
              Confirmez le moyen de paiement utilisé pour cette course
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Moyen demandé */}
            {requestedPaymentMethod && (
              <Card className="p-3 bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {RequestedIcon && <RequestedIcon className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">Demandé:</span>
                  </div>
                  <Badge variant="outline">{getPaymentMethodLabel(requestedPaymentMethod)}</Badge>
                </div>
              </Card>
            )}

            {/* Sélection du moyen utilisé */}
            <PaymentMethodSelector
              value={paymentMethodUsed}
              onChange={setPaymentMethodUsed}
              label="Moyen de paiement utilisé"
              compact
            />

            {/* Alerte si différent */}
            {requestedPaymentMethod && paymentMethodUsed !== requestedPaymentMethod && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Le moyen de paiement diffère de celui demandé initialement
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMismatchAlert} onOpenChange={setShowMismatchAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Moyen de paiement différent</AlertDialogTitle>
            <AlertDialogDescription>
              Le client avait demandé un paiement par <strong>{getPaymentMethodLabel(requestedPaymentMethod || "")}</strong> mais vous confirmez un paiement par <strong>{getPaymentMethodLabel(paymentMethodUsed)}</strong>.
              <br /><br />
              Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={savePaymentConfirmation}>
              Confirmer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}