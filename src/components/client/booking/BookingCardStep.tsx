import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface BookingCardStepProps {
  isAuthenticated: boolean;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  onCardReady: (info: { customerId: string; paymentMethodId?: string }) => void;
  estimatedPrice?: number;
}

function InlinePaymentForm({ 
  clientSecret, 
  onSuccess, 
  estimatedPrice,
}: { 
  clientSecret: string; 
  onSuccess: (paymentMethodId?: string) => void;
  estimatedPrice?: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Erreur de validation");
        return;
      }

      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || "Erreur de validation carte");
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        const pmId = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id;
        // Non-blocking: persist card default in background
        supabase.functions.invoke('persist-card-default', {
          body: { setup_intent_id: setupIntent.id },
        }).catch(() => { /* silently ignore */ });
        toast.success('✅ Moyen de paiement vérifié avec succès !');
        onSuccess(pmId);
      } else if (setupIntent?.status === 'requires_action') {
        toast.info('Vérification en cours...');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement 
        onReady={() => setReady(true)}
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

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

      <Button type="submit" disabled={saving || !stripe || !ready} className="w-full h-11">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        Valider mon moyen de paiement
      </Button>
    </form>
  );
}

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
            <p className="text-sm font-semibold text-foreground">Paiement vérifié ✓</p>
            <p className="text-xs text-muted-foreground">
              Le montant TTC sera bloqué après acceptation du chauffeur.
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
          <h4 className="font-semibold text-foreground text-sm">Vérification du moyen de paiement</h4>
        </div>
        <Elements 
          stripe={stripePromise} 
          key={clientSecret} 
          options={{ 
            clientSecret,
            locale: 'fr',
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: 'hsl(var(--primary))',
                borderRadius: '8px',
              },
            },
          }}
        >
          <InlinePaymentForm
            clientSecret={clientSecret}
            onSuccess={() => {
              setCardVerified(true);
              onCardReady({ customerId: customerId || '' });
            }}
            estimatedPrice={estimatedPrice}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}
