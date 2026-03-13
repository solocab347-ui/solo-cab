import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Shield, CheckCircle, AlertTriangle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DepositPaymentFormProps {
  courseId: string;
  driverId: string;
  depositAmount: number;
  totalAmount: number;
  clientEmail?: string;
  clientName?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function DepositPaymentForm({
  courseId,
  driverId,
  depositAmount,
  totalAmount,
  clientEmail,
  clientName,
  onSuccess,
  onCancel,
}: DepositPaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingAmount = totalAmount - depositAmount;

  const handlePayDeposit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-deposit-payment", {
        body: {
          course_id: courseId,
          deposit_amount: depositAmount,
          total_amount: totalAmount,
          client_email: clientEmail,
          client_name: clientName,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (err: any) {
      console.error("Deposit payment error:", err);
      setError(err.message || "Erreur lors de la création du paiement");
      toast.error("Erreur lors du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Acompte de réservation
        </CardTitle>
        <CardDescription>
          Un acompte est demandé pour confirmer votre réservation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment breakdown */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant total estimé</span>
            <span className="font-medium">{totalAmount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t pt-2">
            <span>Acompte à payer maintenant</span>
            <span className="text-primary">{depositAmount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Reste à payer en fin de course</span>
            <span>{remainingAmount.toFixed(2)}€</span>
          </div>
        </div>

        {/* Security notice */}
        <Alert className="bg-primary/5 border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <strong>Paiement sécurisé</strong> - Vos informations sont protégées par Stripe.
          </AlertDescription>
        </Alert>

        {/* Cancellation policy reference */}
        <Alert className="bg-muted/30 border-border">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-foreground text-sm">
            En validant le paiement, vous acceptez notre{' '}
            <a href="/politique-annulation" target="_blank" className="underline font-medium text-primary hover:text-primary/80">
              politique d'annulation
            </a>.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
          )}
          <Button
            onClick={handlePayDeposit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Payer {depositAmount.toFixed(2)}€
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          En payant, vous acceptez les conditions d'annulation ci-dessus.
        </p>
      </CardContent>
    </Card>
  );
}
