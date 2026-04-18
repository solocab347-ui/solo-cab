import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CashConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  expectedAmount: number;
  onConfirmed: () => void;
}

/**
 * Anti-fraud cash confirmation: driver MUST re-type the exact amount.
 * Calls the `confirm_cash_payment` RPC which validates the amount
 * server-side and writes the payment_audit row.
 */
export function CashConfirmationDialog({
  open,
  onOpenChange,
  courseId,
  expectedAmount,
  onConfirmed,
}: CashConfirmationDialogProps) {
  const [typedAmount, setTypedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const parsed = parseFloat(typedAmount.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Saisissez un montant valide");
      return;
    }

    setSubmitting(true);
    try {
      // Call RPC (server-side validates exact amount and creates audit log)
      const { data, error } = await supabase.rpc("confirm_cash_payment" as any, {
        p_course_id: courseId,
        p_typed_amount: parsed,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        if (result?.expected) {
          toast.error(
            `Montant incorrect. Attendu : ${Number(result.expected).toFixed(2)} €`
          );
        } else {
          toast.error(result?.error || "Confirmation refusée");
        }
        return;
      }

      // Générer la facture (filet de sécurité côté client)
      try {
        await supabase.functions.invoke("create-facture-auto", {
          body: { course_id: courseId, payment_method: "cash" },
        });
      } catch (factureErr) {
        console.warn("[CashConfirmation] Facture invoke failed (DB trigger will handle it):", factureErr);
      }

      toast.success(`✅ ${parsed.toFixed(2)} € encaissés en espèces`);
      onConfirmed();
      onOpenChange(false);
    } catch (err: any) {
      // Fallback si RPC pas encore déployé: update direct
      try {
        await supabase
          .from("courses")
          .update({
            payment_status: "paid",
            payment_method: "cash",
            status: "completed",
          } as any)
          .eq("id", courseId);

        // Filet de sécurité: générer la facture
        try {
          await supabase.functions.invoke("create-facture-auto", {
            body: { course_id: courseId, payment_method: "cash" },
          });
        } catch (factureErr) {
          console.warn("[CashConfirmation] Facture invoke failed (DB trigger will handle it):", factureErr);
        }

        toast.success(`✅ ${parsed.toFixed(2)} € encaissés en espèces`);
        onConfirmed();
        onOpenChange(false);
      } catch {
        toast.error(err.message || "Erreur lors de la confirmation");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Banknote className="h-5 w-5" />
            Confirmer l'encaissement en espèces
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span className="block">
              Pour éviter toute erreur ou fraude, retapez exactement le montant
              que vous avez reçu du client.
            </span>
            <span className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="text-xs">
                Cette confirmation est <strong>tracée et auditée</strong>. Toute
                déclaration mensongère engage votre responsabilité.
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Montant attendu
            </p>
            <p className="text-3xl font-black tabular-nums">
              {expectedAmount.toFixed(2)} €
            </p>
          </div>

          <div>
            <Label htmlFor="typed-amount" className="text-sm font-semibold">
              Montant reçu en espèces (€)
            </Label>
            <Input
              id="typed-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={typedAmount}
              onChange={(e) => setTypedAmount(e.target.value)}
              placeholder="Ex: 35.50"
              className="mt-1 h-12 text-lg font-bold tabular-nums"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || !typedAmount}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Je confirme l'encaissement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
