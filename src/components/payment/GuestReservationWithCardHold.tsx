import { useState, useEffect } from "react";
import { CardHoldForm } from "./CardHoldForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, CreditCard, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GuestReservationWithCardHoldProps {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  estimatedAmount: number;
  trackingToken: string;
  onComplete: () => void;
}

export function GuestReservationWithCardHold({
  driverId,
  courseId,
  clientEmail,
  clientName,
  estimatedAmount,
  trackingToken,
  onComplete,
}: GuestReservationWithCardHoldProps) {
  const [step, setStep] = useState<"checking" | "card_hold" | "complete" | "no_hold_required">("checking");
  const [requiresCardHold, setRequiresCardHold] = useState(false);

  useEffect(() => {
    checkIfCardHoldRequired();
  }, [driverId]);

  const checkIfCardHoldRequired = async () => {
    try {
      // Check if driver uses Stripe Connect
      const { data: driver } = await supabase
        .from("drivers")
        .select("billing_type, stripe_connect_account_id, stripe_connect_charges_enabled")
        .eq("id", driverId)
        .single();

      const hasStripeConnect = 
        driver?.billing_type === "solocab_stripe" &&
        driver?.stripe_connect_account_id &&
        driver?.stripe_connect_charges_enabled;

      if (hasStripeConnect) {
        setRequiresCardHold(true);
        setStep("card_hold");
      } else {
        setRequiresCardHold(false);
        setStep("no_hold_required");
        // Auto-complete after a brief delay
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (error) {
      console.error("Error checking card hold requirement:", error);
      setStep("no_hold_required");
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  const handleCardHoldSuccess = () => {
    setStep("complete");
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (step === "checking") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Vérification des options de paiement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "no_hold_required") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="font-semibold text-foreground">Réservation envoyée !</h3>
            <p className="text-sm text-muted-foreground">
              Votre demande a été transmise au chauffeur.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirection vers le suivi...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "complete") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="font-semibold text-foreground">Réservation confirmée !</h3>
            <p className="text-sm text-muted-foreground">
              Votre empreinte bancaire a été validée. Aucun montant n'a été prélevé.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirection vers le suivi...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Étape finale : empreinte bancaire</p>
              <p className="text-sm text-muted-foreground">
                Une empreinte de 0€ est requise pour garantir votre réservation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CardHoldForm
        driverId={driverId}
        courseId={courseId}
        clientEmail={clientEmail}
        clientName={clientName}
        estimatedAmount={estimatedAmount}
        onSuccess={handleCardHoldSuccess}
      />
    </div>
  );
}
