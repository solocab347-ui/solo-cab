import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface BookingCardStepProps {
  /** If user is authenticated */
  isAuthenticated: boolean;
  /** Guest info (required if !isAuthenticated) */
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  /** Called when card is successfully registered */
  onCardReady: (info: { customerId: string; paymentMethodId?: string }) => void;
  /** Estimated price for display */
  estimatedPrice?: number;
}

// ─── Inner card form (must be inside Elements provider) ───
function InlineCardForm({ 
  clientSecret, 
  onSuccess, 
  onRequireFresh,
  estimatedPrice,
}: { 
  clientSecret: string; 
  onSuccess: () => void;
  onRequireFresh: () => Promise<string | null>;
  estimatedPrice?: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState({ number: false, expiry: false, cvc: false });

  const isFormComplete = cardComplete.number && cardComplete.expiry && cardComplete.cvc;

  const elementStyle = {
    base: {
      fontSize: '16px',
      color: 'hsl(var(--foreground))',
      fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: 'hsl(var(--muted-foreground))' },
    },
    invalid: { color: 'hsl(var(--destructive))' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error("Formulaire de carte non prêt");

      // Get fresh intent for max reliability
      const freshSecret = await onRequireFresh();
      const secret = freshSecret || clientSecret;

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(secret, {
        payment_method: { card: cardNumberElement },
      });

      if (stripeError) {
        setError(stripeError.message || "Erreur de validation carte");
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        // Persist card for registered users
        try {
          await supabase.functions.invoke('persist-card-default', {
            body: { setup_intent_id: setupIntent.id },
          });
        } catch {
          // Non-blocking for guest
        }
        toast.success('✅ Carte vérifiée avec succès !');
        onSuccess();
      } else if (setupIntent?.status === 'requires_action') {
        toast.info('Vérification 3D Secure en cours...');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Numéro de carte</label>
          <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
            <CardNumberElement
              options={{ style: elementStyle, showIcon: true, placeholder: '1234 5678 9012 3456' }}
              onChange={(e) => setCardComplete(prev => ({ ...prev, number: e.complete }))}
              className="w-full"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Expiration</label>
            <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
              <CardExpiryElement
                options={{ style: elementStyle, placeholder: 'MM / AA' }}
                onChange={(e) => setCardComplete(prev => ({ ...prev, expiry: e.complete }))}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">CVC</label>
            <div className="flex h-11 items-center rounded-lg border bg-background/50 px-3">
              <CardCvcElement
                options={{ style: elementStyle, placeholder: '123' }}
                onChange={(e) => setCardComplete(prev => ({ ...prev, cvc: e.complete }))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        🔒 Aucun prélèvement immédiat.{' '}
        {estimatedPrice 
          ? `Le montant de ${estimatedPrice.toFixed(0)}€ TTC sera bloqué après acceptation du chauffeur.`
          : 'Le montant TTC sera bloqué sur votre carte après acceptation du chauffeur.'}
      </p>

      <Button type="submit" disabled={saving || !stripe || !isFormComplete} className="w-full h-11">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        Valider ma carte bancaire
      </Button>
    </form>
  );
}

// ─── Main exported component ───
export function BookingCardStep({ 
  isAuthenticated, 
  guestName, 
  guestEmail, 
  guestPhone,
  onCardReady,
  estimatedPrice,
}: BookingCardStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardVerified, setCardVerified] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey.startsWith('pk_')) return null;
    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  const createSetupIntent = useCallback(async (persistInState = true): Promise<string | null> => {
    try {
      let data: any;
      if (isAuthenticated) {
        const res = await supabase.functions.invoke('create-setup-intent');
        if (res.error) throw res.error;
        data = res.data;
      } else {
        const res = await supabase.functions.invoke('create-guest-setup-intent', {
          body: { guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone },
        });
        if (res.error) throw res.error;
        data = res.data;
      }

      if (!data?.client_secret || !data?.publishable_key) {
        throw new Error('Erreur de configuration Stripe');
      }

      if (persistInState) {
        setClientSecret(data.client_secret);
        setStripePublishableKey(data.publishable_key);
        setCustomerId(data.customer_id || null);
      }
      return data.client_secret;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la préparation du paiement');
      return null;
    }
  }, [isAuthenticated, guestName, guestEmail, guestPhone]);

  const initializeForm = useCallback(async () => {
    setLoading(true);
    await createSetupIntent();
    setLoading(false);
  }, [createSetupIntent]);

  useEffect(() => {
    // Auto-initialize for card payment
    if (!clientSecret && !loading && !cardVerified) {
      initializeForm();
    }
  }, [clientSecret, loading, cardVerified, initializeForm]);

  if (cardVerified) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Carte vérifiée ✓</p>
            <p className="text-xs text-muted-foreground">
              Le montant TTC sera bloqué sur votre carte après acceptation du chauffeur.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || !clientSecret || !stripePromise) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Préparation du paiement sécurisé...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground text-sm">Vérification carte bancaire</h4>
        </div>
        <Elements stripe={stripePromise} key={clientSecret} options={{ clientSecret }}>
          <InlineCardForm
            clientSecret={clientSecret}
            onSuccess={() => {
              setCardVerified(true);
              onCardReady({ customerId: customerId || '' });
            }}
            onRequireFresh={() => createSetupIntent(false)}
            estimatedPrice={estimatedPrice}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
