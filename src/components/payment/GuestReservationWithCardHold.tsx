import { useState } from "react";
import { CardHoldForm } from "../shared/CardHoldForm";
import { DepositPaymentForm } from "./DepositPaymentForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Shield, Wallet } from "lucide-react";
import { useDriverStripeStatus } from "@/hooks/useDriverStripeStatus";

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

// ── Status Cards ──
function StatusCard({ icon: Icon, title, subtitle, variant = "default" }: {
  icon: typeof CheckCircle;
  title: string;
  subtitle: string;
  variant?: "default" | "success";
}) {
  return (
    <Card className={variant === "success" ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="text-center space-y-3">
          <Icon className="h-12 w-12 text-primary mx-auto" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Deposit Step ──
function DepositStep({ depositPercentage, depositAmount, totalAmount, courseId, driverId, clientEmail, clientName, onSuccess, onSkip }: {
  depositPercentage: number;
  depositAmount: number;
  totalAmount: number;
  courseId: string;
  driverId: string;
  clientEmail?: string;
  clientName?: string;
  onSuccess: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Acompte de réservation</p>
              <p className="text-sm text-muted-foreground">
                Un acompte de {depositPercentage}% est demandé pour confirmer votre réservation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DepositPaymentForm
        courseId={courseId}
        driverId={driverId}
        depositAmount={depositAmount}
        totalAmount={totalAmount}
        clientEmail={clientEmail}
        clientName={clientName}
        onSuccess={onSuccess}
      />

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Continuer sans acompte (empreinte bancaire uniquement)
        </Button>
      </div>
    </div>
  );
}

// ── Card Hold Step ──
function CardHoldStep({ driverId, courseId, clientEmail, clientName, holdAmountCents, onSuccess }: {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  holdAmountCents: number;
  onSuccess: () => void;
}) {
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
        holdAmountCents={holdAmountCents}
        onSuccess={onSuccess}
      />

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

// ── Main Orchestrator ──
export function GuestReservationWithCardHold({
  driverId,
  courseId,
  clientEmail,
  clientName,
  estimatedAmount,
  trackingToken,
  onComplete,
}: GuestReservationWithCardHoldProps) {
  const { hasStripeConnect, isLoading: isCheckingStripe } = useDriverStripeStatus(driverId);
  const [step, setStep] = useState<Step>("checking");
  const [depositConfig, setDepositConfig] = useState<{ enabled: boolean; percentage: number }>({ enabled: false, percentage: 20 });

  // Derive step from Stripe status (runs once when loading completes)
  if (step === "checking" && !isCheckingStripe) {
    if (!hasStripeConnect) {
      setTimeout(onComplete, 1500);
      // Can't setState during render, use queueMicrotask
      queueMicrotask(() => setStep("no_hold_required"));
    } else {
      // TODO: fetch deposit config if needed
      queueMicrotask(() => setStep("card_hold"));
    }
  }

  const handleComplete = () => {
    setStep("complete");
    setTimeout(onComplete, 2000);
  };

  if (step === "checking" || isCheckingStripe) {
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
    return <StatusCard icon={CheckCircle} title="Réservation envoyée !" subtitle="Votre demande a été transmise au chauffeur." variant="success" />;
  }

  if (step === "complete") {
    return <StatusCard icon={CheckCircle} title="Réservation confirmée !" subtitle="Votre réservation est sécurisée." variant="success" />;
  }

  if (step === "deposit" && depositConfig.enabled) {
    const depositAmount = Math.round((estimatedAmount * depositConfig.percentage) / 100 * 100) / 100;
    return (
      <DepositStep
        depositPercentage={depositConfig.percentage}
        depositAmount={depositAmount}
        totalAmount={estimatedAmount}
        courseId={courseId}
        driverId={driverId}
        clientEmail={clientEmail}
        clientName={clientName}
        onSuccess={handleComplete}
        onSkip={() => setStep("card_hold")}
      />
    );
  }

  return (
    <CardHoldStep
      driverId={driverId}
      courseId={courseId}
      clientEmail={clientEmail}
      clientName={clientName}
      holdAmountCents={Math.round(estimatedAmount * 100)}
      onSuccess={handleComplete}
    />
  );
}
