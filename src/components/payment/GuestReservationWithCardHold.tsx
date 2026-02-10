import { useState } from "react";
import { CardHoldForm } from "./CardHoldForm";
import { DepositPaymentForm } from "./DepositPaymentForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, CreditCard, XCircle, Shield, Wallet } from "lucide-react";
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
  useState(() => {
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
          driver?.billing_type === "solocab_stripe" &&
          driver?.stripe_connect_account_id &&
          driver?.stripe_connect_charges_enabled;

        if (!hasStripeConnect) {
          // Pas de Stripe Connect → pas d'empreinte requise
          setStep("no_hold_required");
          setTimeout(onComplete, 1500);
          return;
        }

        setDriverConfig({
          hasStripeConnect,
          depositEnabled: driver?.deposit_enabled || false,
          depositPercentage: driver?.deposit_percentage || 20,
        });

        // Si le chauffeur demande un acompte, afficher le formulaire d'acompte
        if (driver?.deposit_enabled) {
          setStep("deposit");
        } else {
          // Sinon, empreinte bancaire seule
          setStep("card_hold");
        }
      } catch (error) {
        console.error("Error checking driver config:", error);
        setStep("no_hold_required");
        setTimeout(onComplete, 1500);
      }
    };

    checkDriverConfig();
  });

  const handleDepositSuccess = () => {
    setStep("complete");
    setTimeout(onComplete, 2000);
  };

  const handleCardHoldSuccess = () => {
    setStep("complete");
    setTimeout(onComplete, 2000);
  };

  const handleSkipDeposit = () => {
    // Si le client ne veut pas payer d'acompte, passer à l'empreinte bancaire seule
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
              Votre réservation est sécurisée.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirection vers le suivi...
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

  // Card hold step
  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Empreinte bancaire sécurisée</p>
              <p className="text-sm text-muted-foreground">
                Une vérification de carte à 0€ est requise pour garantir votre réservation. 
                Vous ne serez débité qu'en fin de course. En cas d'annulation tardive (moins de 1h avant), 
                des frais de 10€ s'appliquent. Si le chauffeur annule : aucun frais.
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
