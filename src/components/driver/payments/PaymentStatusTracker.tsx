import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  CreditCard,
  Wallet,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStatusTrackerProps {
  courseId: string;
  className?: string;
}

interface PaymentState {
  depositStatus: string | null;
  depositAmount: number | null;
  cardHoldStatus: string | null;
  finalPaymentStatus: string | null;
  finalPaymentAmount: number | null;
  totalAmount: number | null;
  paymentMethod: string | null;
}

export function PaymentStatusTracker({ courseId, className }: PaymentStatusTrackerProps) {
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (error) throw error;

        const courseData = data as any;
        setPaymentState({
          depositStatus: courseData.deposit_status,
          depositAmount: courseData.deposit_amount,
          cardHoldStatus: courseData.card_hold_status,
          finalPaymentStatus: courseData.final_payment_status,
          finalPaymentAmount: courseData.final_payment_amount,
          totalAmount: courseData.final_payment_amount || courseData.guest_estimated_price,
          paymentMethod: courseData.payment_method,
        });
      } catch (err) {
        console.error("Error fetching payment status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`payment-status-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courses',
          filter: `id=eq.${courseId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setPaymentState({
            depositStatus: newData.deposit_status,
            depositAmount: newData.deposit_amount,
            cardHoldStatus: newData.card_hold_status,
            finalPaymentStatus: newData.final_payment_status,
            finalPaymentAmount: newData.final_payment_amount,
            totalAmount: newData.final_payment_amount || newData.guest_estimated_price,
            paymentMethod: newData.payment_method,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "paid":
      case "succeeded":
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
      case "forfeited":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
      case "processing":
      case "requires_action":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const configs: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      paid: { label: "Payé", variant: "default" },
      succeeded: { label: "Confirmé", variant: "default" },
      confirmed: { label: "Confirmé", variant: "default" },
      failed: { label: "Échec", variant: "destructive" },
      forfeited: { label: "Conservé", variant: "secondary" },
      pending: { label: "En attente", variant: "outline" },
      processing: { label: "En cours", variant: "outline" },
      requires_action: { label: "Action requise", variant: "outline" },
      refunded: { label: "Remboursé", variant: "secondary" },
    };

    const config = configs[status || ""] || { label: "Non défini", variant: "outline" as const };

    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentState) return null;

  const hasDeposit = paymentState.depositAmount && paymentState.depositAmount > 0;
  const hasCardHold = paymentState.cardHoldStatus === "confirmed";
  const remainingAmount = (paymentState.totalAmount || 0) - (
    paymentState.depositStatus === "paid" ? (paymentState.depositAmount || 0) : 0
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Suivi des paiements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total amount */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Montant total</span>
          <span className="font-semibold">{(paymentState.totalAmount || 0).toFixed(2)}€</span>
        </div>

        <Separator />

        {/* Card hold status */}
        {hasCardHold && !hasDeposit && (
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon(paymentState.cardHoldStatus)}
              <span>Empreinte bancaire</span>
            </div>
            {getStatusBadge(paymentState.cardHoldStatus)}
          </div>
        )}

        {/* Deposit status */}
        {hasDeposit && (
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon(paymentState.depositStatus)}
              <span className="flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Acompte ({paymentState.depositAmount?.toFixed(2)}€)
              </span>
            </div>
            {getStatusBadge(paymentState.depositStatus)}
          </div>
        )}

        {/* Final payment status */}
        {paymentState.finalPaymentStatus && paymentState.finalPaymentStatus !== "pending" && (
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon(paymentState.finalPaymentStatus)}
              <span>
                Paiement final
                {paymentState.finalPaymentAmount && ` (${paymentState.finalPaymentAmount.toFixed(2)}€)`}
              </span>
            </div>
            {getStatusBadge(paymentState.finalPaymentStatus)}
          </div>
        )}

        {/* Remaining to pay */}
        {remainingAmount > 0 && paymentState.finalPaymentStatus !== "succeeded" && (
          <>
            <Separator />
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Reste à payer</span>
              <span className="text-primary">{remainingAmount.toFixed(2)}€</span>
            </div>
          </>
        )}

        {/* Warning for requires_action */}
        {paymentState.finalPaymentStatus === "requires_action" && (
          <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded-md">
            <AlertTriangle className="h-3 w-3" />
            <span>Le client doit valider le paiement (3D Secure)</span>
          </div>
        )}

        {/* Success state */}
        {paymentState.finalPaymentStatus === "succeeded" && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 dark:bg-green-900/20 p-2 rounded-md">
            <CheckCircle className="h-3 w-3" />
            <span>Tous les paiements ont été encaissés</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
