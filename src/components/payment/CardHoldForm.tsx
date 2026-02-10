import { useState, useEffect } from "react";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CardHoldFormProps {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  estimatedAmount: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CardHoldForm({
  driverId,
  courseId,
  clientEmail,
  clientName,
  estimatedAmount,
  onSuccess,
  onCancel,
}: CardHoldFormProps) {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<{
    clientSecret: string;
    stripeAccountId: string;
    depositEnabled: boolean;
    depositPercentage: number;
  } | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize Stripe and get SetupIntent
  useEffect(() => {
    const initializeCardHold = async () => {
      try {
        setInitializing(true);
        setError(null);

        // Create card hold SetupIntent
        const { data, error: fnError } = await supabase.functions.invoke("create-card-hold", {
          body: {
            driver_id: driverId,
            course_id: courseId,
            client_email: clientEmail,
            client_name: clientName,
            amount: estimatedAmount,
          },
        });

        if (fnError) throw fnError;

        if (!data.card_hold_required) {
          // Driver doesn't use Stripe Connect, skip card hold
          onSuccess();
          return;
        }

        // Get Stripe publishable key
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!stripePublishableKey) {
          throw new Error("Stripe not configured");
        }

        // Load Stripe with connected account
        const stripeInstance = await loadStripe(stripePublishableKey, {
          stripeAccount: data.stripe_account_id,
        });

        if (!stripeInstance) {
          throw new Error("Failed to load Stripe");
        }

        setStripe(stripeInstance);
        setSetupData({
          clientSecret: data.client_secret,
          stripeAccountId: data.stripe_account_id,
          depositEnabled: data.deposit_enabled,
          depositPercentage: data.deposit_percentage,
        });

        // Create Elements
        const elementsInstance = stripeInstance.elements({
          clientSecret: data.client_secret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#6366f1",
              colorBackground: "#ffffff",
              colorText: "#1f2937",
              colorDanger: "#ef4444",
              fontFamily: "system-ui, sans-serif",
              borderRadius: "8px",
            },
          },
        });

        setElements(elementsInstance);

        // Mount payment element
        const paymentElement = elementsInstance.create("payment", {
          layout: "tabs",
        });

        // Wait for element to mount
        setTimeout(() => {
          const container = document.getElementById("card-element");
          if (container) {
            paymentElement.mount(container);
            paymentElement.on("change", (event) => {
              setCardComplete(event.complete);
              setError(null);
            });
          }
        }, 100);

      } catch (err: any) {
        console.error("Card hold initialization error:", err);
        setError(err.message || "Erreur lors de l'initialisation");
      } finally {
        setInitializing(false);
      }
    };

    initializeCardHold();
  }, [driverId, courseId, clientEmail, clientName, estimatedAmount, onSuccess]);

  const handleSubmit = async () => {
    if (!stripe || !elements || !setupData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Confirm SetupIntent
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (setupIntent?.status === "succeeded") {
        // Confirm card hold in backend
        const { error: confirmError } = await supabase.functions.invoke("confirm-card-hold", {
          body: {
            setup_intent_id: setupIntent.id,
            course_id: courseId,
          },
        });

        if (confirmError) {
          throw confirmError;
        }

        setSuccess(true);
        toast.success("Empreinte bancaire validée !");
        
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Card hold submission error:", err);
      setError(err.message || "Erreur lors de la validation");
      toast.error("Échec de la validation de la carte");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h3 className="font-semibold text-foreground">Empreinte bancaire validée</h3>
            <p className="text-sm text-muted-foreground">
              Votre carte a été enregistrée avec succès. Aucun montant n'a été prélevé.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (initializing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement du formulaire de paiement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Empreinte bancaire
        </CardTitle>
        <CardDescription>
          Une empreinte bancaire de <strong>0€</strong> est requise pour confirmer votre réservation.
          Aucun montant ne sera prélevé maintenant. Vous serez débité uniquement en fin de course 
          pour le prix convenu sur votre devis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security notice */}
        {/* Qu'est-ce qu'une empreinte bancaire ? */}
        <Alert className="bg-primary/5 border-primary/20">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground text-sm">
            <strong>Qu'est-ce qu'une empreinte bancaire ?</strong>
            <p className="mt-1">
              C'est une vérification de votre carte bancaire à <strong>0€</strong>. 
              Aucun montant n'est prélevé lors de la réservation. Votre carte est simplement 
              enregistrée de manière sécurisée via Stripe pour garantir votre réservation.
            </p>
            <p className="mt-1">
              Votre carte ne sera débitée <strong>qu'en fin de course</strong> pour le montant convenu, 
              ou en cas d'annulation tardive (frais de 10€).
            </p>
          </AlertDescription>
        </Alert>

        {/* Politique d'annulation */}
        <Alert className="bg-warning/10 border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-foreground text-sm">
            <strong>Politique d'annulation :</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><strong>Annulation gratuite</strong> jusqu'à 1h avant la course</li>
              <li><strong>Annulation tardive</strong> (moins de 1h avant) : frais de 10€ prélevés automatiquement sur votre carte</li>
              <li><strong>Si le chauffeur annule</strong> : aucun frais pour vous, quelle que soit l'heure</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Stripe Elements container */}
        <div className="p-4 border rounded-lg bg-card">
          <div id="card-element" className="min-h-[100px]" />
        </div>

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
            onClick={handleSubmit}
            disabled={loading || !cardComplete}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Valider l'empreinte
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          En validant, vous acceptez les conditions d'annulation ci-dessus.
        </p>
      </CardContent>
    </Card>
  );
}
