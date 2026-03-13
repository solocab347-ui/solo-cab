import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  Shield, 
  Info,
  Lock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CardHoldFormProps {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  onSuccess?: () => void;
  onSkip?: () => void;
  className?: string;
}

type HoldStatus = 'idle' | 'creating' | 'redirecting' | 'confirmed' | 'error';

/**
 * CardHoldForm — requests 10€ reservation hold via Stripe Checkout redirect.
 * Uses create-card-hold edge function which creates a PaymentIntent with manual capture.
 * The 10€ is authorized (held) but NOT captured until the course is completed or cancelled late.
 */
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
        toast.info('Aucune avance requise pour ce chauffeur');
        onSkip?.();
        return;
      }

      // The edge function returns a client_secret for the PaymentIntent.
      // We'll use Stripe Checkout via create-course-payment to handle card input securely.
      // For now, invoke create-course-payment with capture_method=manual and fixed amount of 10€
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-course-payment', {
        body: {
          course_id: courseId,
          client_email: clientEmail,
          client_name: clientName,
          capture_method: 'manual',
          override_amount_cents: 1000, // 10€
          payment_type: 'reservation_hold',
        },
      });

      if (checkoutError) throw checkoutError;

      if (checkoutData?.checkout_url) {
        setStatus('redirecting');
        // Redirect to Stripe Checkout
        window.open(checkoutData.checkout_url, '_blank');
        
        // After redirect, the user will come back and we poll for status
        toast.info('Complétez le paiement dans l\'onglet ouvert');
        
        // Poll for confirmation
        pollForConfirmation();
      } else {
        throw new Error('Pas de lien de paiement reçu');
      }
    } catch (err: any) {
      console.error('Card hold error:', err);
      setError(err.message || 'Erreur lors de la création de l\'avance');
      setStatus('error');
    }
  }, [driverId, courseId, clientEmail, clientName, onSkip]);

  const pollForConfirmation = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (every 5 seconds)

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        const { data: course } = await supabase
          .from('courses')
          .select('card_hold_status')
          .eq('id', courseId)
          .single();

        if (course?.card_hold_status === 'confirmed') {
          clearInterval(interval);
          setStatus('confirmed');
          toast.success('Avance de 10€ confirmée — course réservée !');
          onSuccess?.();
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, 5000);

    // Cleanup after 5 min
    setTimeout(() => clearInterval(interval), maxAttempts * 5000);
  }, [courseId, onSuccess]);

  // Idle state
  if (status === 'idle' || status === 'error') {
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

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-muted/30 border-border">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Politique d'annulation :</strong> annulation gratuite jusqu'à 1h avant la course. 
              Après ce délai, l'avance de 10€ est conservée par le chauffeur.
            </AlertDescription>
          </Alert>

          <Button onClick={initiateHold} className="w-full gap-2">
            <Lock className="w-4 h-4" />
            Payer l'avance de 10€
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Creating / Redirecting
  if (status === 'creating' || status === 'redirecting') {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
          {status === 'creating' ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Préparation du paiement sécurisé...</p>
            </>
          ) : (
            <>
              <ExternalLink className="w-8 h-8 text-primary" />
              <p className="text-sm text-foreground font-medium">Complétez le paiement</p>
              <p className="text-xs text-muted-foreground text-center">
                Un onglet de paiement Stripe s'est ouvert. 
                Revenez ici une fois le paiement effectué.
              </p>
              <Button variant="outline" size="sm" onClick={initiateHold} className="mt-2">
                Réessayer
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Confirmed
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
