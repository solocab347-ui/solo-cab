import { useState, useEffect } from "react";
import { CardHoldForm } from "../shared/CardHoldForm";
import { DepositPaymentForm } from "./DepositPaymentForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Shield, Wallet } from "lucide-react";
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

type Step = "checking" | "deposit" | "card_hold" | "complete" | "no_hold_required";

export function GuestReservationWithCardHold({
  driverId,
  courseId,
  clientEmail,
  clientName,
  estimatedAmount,
  trackingToken,
  onComplete,
}: GuestReservationWithCardHoldProps) {
  const [step, setStep] = useState<Step>("checking");
  const [driverConfig, setDriverConfig] = useState<{
    hasStripeConnect: boolean;
    depositEnabled: boolean;
    depositPercentage: number;
  } | null>(null);

  // Check driver config on mount
  useEffect(() => {
    const checkDriverConfig = async () => {
      try {
        const { data: driver } = await supabase
          .from("drivers")
          .select(`
            billing_type, 
            stripe_connect_account_id, 
            stripe_connect_charges_enabled,
            deposit_enabled,
            deposit_percentage
          `)
          .eq("id", driverId)
          .single();

        const hasStripeConnect = 
          !!driver?.stripe_connect_account_id &&
          driver?.stripe_connect_charges_enabled === true;

        if (!hasStripeConnect) {
          setStep("no_hold_required");
          setTimeout(onComplete, 1500);
          return;
        }

        setDriverConfig({
          hasStripeConnect,
          depositEnabled: driver?.deposit_enabled || false,
          depositPercentage: driver?.deposit_percentage || 20,
        });

        if (driver?.deposit_enabled) {
          setStep("deposit");
        } else {
          setStep("card_hold");
        }
      } catch (error) {
        console.error("Error checking driver config:", error);
        setStep("no_hold_required");
        setTimeout(onComplete, 1500);
      }
    };

    checkDriverConfig();
  }, [driverId, onComplete]);

  const handleDepositSuccess = () => {
    setStep("complete");
    setTimeout(onComplete, 2000);
  };

  const handleCardHoldSuccess = () => {
    setStep("complete");
    setTimeout(onComplete, 2000);
  };

  const handleSkipDeposit = () => {
    setStep("card_hold");
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
              Votre réservation est sécurisée.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "deposit" && driverConfig) {
    const depositAmount = Math.round((estimatedAmount * driverConfig.depositPercentage) / 100 * 100) / 100;
    
    return (
      <div className="space-y-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Acompte de réservation</p>
                <p className="text-sm text-muted-foreground">
                  Un acompte de {driverConfig.depositPercentage}% est demandé pour confirmer votre réservation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DepositPaymentForm
          courseId={courseId}
          driverId={driverId}
          depositAmount={depositAmount}
          totalAmount={estimatedAmount}
          clientEmail={clientEmail}
          clientName={clientName}
          onSuccess={handleDepositSuccess}
        />

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={handleSkipDeposit}>
            Continuer sans acompte (empreinte bancaire uniquement)
          </Button>
        </div>
      </div>
    );
  }

  // Card hold step - uses the unified shared/CardHoldForm (Checkout redirect)
  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Paiement sécurisé</p>
              <p className="text-sm text-muted-foreground">
                Enregistrez votre carte une seule fois. Vos prochains paiements seront 100% automatiques.
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
        onSuccess={handleCardHoldSuccess}
      />

      {/* Account creation suggestion for guests */}
      {!clientEmail && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <p className="text-xs text-center text-muted-foreground">
              💡 <a href="/register-client" className="underline font-medium text-primary hover:text-primary/80">Créez un compte gratuit</a> pour retrouver votre carte enregistrée et ne plus jamais la ressaisir.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
