import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  Shield, 
  Info,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';

interface CardHoldFormProps {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  onSuccess?: (paymentMethodId: string) => void;
  onSkip?: () => void;
  className?: string;
}

type HoldStatus = 'idle' | 'creating' | 'ready' | 'confirming' | 'confirmed' | 'error';

export function CardHoldForm({
  driverId,
  courseId,
  clientEmail,
  clientName,
  onSuccess,
  onSkip,
  className,
}: CardHoldFormProps) {
  const [status, setStatus] = useState<HoldStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

  // Card input state (simple form - no Stripe Elements needed for redirect flow)
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState(clientName || '');

  const initiateHold = useCallback(async () => {
    setStatus('creating');
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-card-hold', {
        body: {
          driver_id: driverId,
          course_id: courseId,
          client_email: clientEmail,
          client_name: clientName,
        },
      });

      if (fnError) throw fnError;

      if (!data.card_hold_required) {
        // Driver doesn't use Stripe Connect - no hold needed
        toast.info('Aucune avance requise pour ce chauffeur');
        onSkip?.();
        return;
      }

      setClientSecret(data.client_secret);
      setStripeAccountId(data.stripe_account_id);
      setStatus('ready');
    } catch (err: any) {
      console.error('Card hold creation error:', err);
      setError(err.message || 'Erreur lors de la création de l\'avance');
      setStatus('error');
    }
  }, [driverId, courseId, clientEmail, clientName, onSkip]);

  const confirmHold = useCallback(async () => {
    if (!clientSecret || !stripeAccountId) return;

    setStatus('confirming');
    setError(null);

    try {
      // Load Stripe with the connected account
      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (!stripePublicKey) {
        throw new Error('Configuration Stripe manquante');
      }

      const stripe = await loadStripe(stripePublicKey, {
        stripeAccount: stripeAccountId,
      });

      if (!stripe) {
        throw new Error('Impossible de charger Stripe');
      }

      // Parse expiry
      const [expMonth, expYear] = expiry.split('/').map(s => s.trim());
      if (!expMonth || !expYear) {
        throw new Error('Date d\'expiration invalide (MM/AA)');
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
          cvc,
        },
        billing_details: {
          name: cardName || clientName,
          email: clientEmail,
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // Confirm the PaymentIntent with the payment method
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // For manual capture, status should be "requires_capture"
      if (paymentIntent?.status === 'requires_capture') {
        // Confirm on backend
        const { data: confirmData, error: backendError } = await supabase.functions.invoke('confirm-card-hold', {
          body: {
            payment_intent_id: paymentIntent.id,
            course_id: courseId,
          },
        });

        if (backendError) throw backendError;

        setStatus('confirmed');
        toast.success('Avance de 10€ confirmée — votre course est réservée !');
        onSuccess?.(confirmData.payment_method_id);
      } else {
        throw new Error(`Statut inattendu: ${paymentIntent?.status}`);
      }
    } catch (err: any) {
      console.error('Card hold confirmation error:', err);
      setError(err.message || 'Erreur lors de la confirmation');
      setStatus('error');
    }
  }, [clientSecret, stripeAccountId, cardNumber, expiry, cvc, cardName, clientEmail, clientName, courseId, onSuccess]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 16);
    return v.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
    return v;
  };

  // Idle state - explain and start
  if (status === 'idle') {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Avance de réservation — 10€</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pour confirmer votre réservation, une avance de <strong>10€</strong> est requise. 
                Ce montant sera <strong>déduit du prix final</strong> de votre course.
              </p>
            </div>
          </div>

          <Alert className="bg-muted/30 border-border">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Politique d'annulation :</strong> annulation gratuite jusqu'à 1h avant la course. 
              En cas d'annulation tardive (moins d'1h avant), l'avance de 10€ est conservée par le chauffeur.
            </AlertDescription>
          </Alert>

          <Button onClick={initiateHold} className="w-full gap-2">
            <Lock className="w-4 h-4" />
            Confirmer avec ma carte bancaire
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Creating hold
  if (status === 'creating') {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Préparation du paiement sécurisé...</p>
        </CardContent>
      </Card>
    );
  }

  // Confirmed
  if (status === 'confirmed') {
    return (
      <Card className={cn("border-emerald-500/30 bg-emerald-500/5", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Avance de 10€ confirmée</p>
              <p className="text-xs text-muted-foreground">Votre course est réservée. Les 10€ seront déduits du montant final.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ready or confirming - show card form
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Avance de réservation — 10€
          </h3>
          <Badge variant="outline" className="text-xs text-primary border-primary/30">
            <Lock className="w-3 h-3 mr-1" />
            Sécurisé
          </Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nom sur la carte</Label>
            <Input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Jean Dupont"
              className="h-9 text-sm"
              disabled={status === 'confirming'}
            />
          </div>

          <div>
            <Label className="text-xs">Numéro de carte</Label>
            <Input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="h-9 text-sm font-mono"
              maxLength={19}
              disabled={status === 'confirming'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Expiration</Label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                className="h-9 text-sm font-mono"
                maxLength={5}
                disabled={status === 'confirming'}
              />
            </div>
            <div>
              <Label className="text-xs">CVC</Label>
              <Input
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                className="h-9 text-sm font-mono"
                maxLength={4}
                type="password"
                disabled={status === 'confirming'}
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Les 10€ sont bloqués sur votre carte mais <strong>non débités</strong>. 
            Ils seront déduits du prix final ou libérés en cas d'annulation gratuite.
          </p>
        </div>

        <Button
          onClick={confirmHold}
          disabled={status === 'confirming' || !cardNumber || !expiry || !cvc}
          className="w-full gap-2"
        >
          {status === 'confirming' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirmation en cours...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Payer l'avance de 10€
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
