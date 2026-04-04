import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Loader2,
  CheckCircle,
  Shield,
  Lock,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useClientSavedCard } from '@/hooks/useClientSavedCard';

interface CardHoldFormProps {
  driverId: string;
  courseId: string;
  clientEmail?: string;
  clientName?: string;
  holdAmountCents?: number;
  onSuccess?: () => void;
  onSkip?: () => void;
  className?: string;
}

type HoldStatus = 'idle' | 'checking' | 'creating' | 'auto_confirming' | 'redirecting' | 'confirmed' | 'error';

/**
 * CardHoldForm — Handles bank hold (empreinte bancaire) for course reservation.
 *
 * Flow:
 * 1. If client has saved card → automatic off-session hold (no UI, instant)
 * 2. If no saved card → redirect to Stripe Checkout for card input
 */
export function CardHoldForm({
  driverId,
  courseId,
  clientEmail,
  clientName,
  holdAmountCents,
  onSuccess,
  onSkip,
  className,
}: CardHoldFormProps) {
  const [status, setStatus] = useState<HoldStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const { hasCard, defaultCard, loading: cardLoading } = useClientSavedCard();

  useEffect(() => {
    if (cardLoading) return;

    if (hasCard && defaultCard) {
      autoHold();
    } else {
      setStatus('idle');
    }
  }, [cardLoading, hasCard]);

  const autoHold = useCallback(async () => {
    setStatus('auto_confirming');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: fnError } = await supabase.functions.invoke('create-card-hold', {
        body: {
          driver_id: driverId,
          course_id: courseId,
          client_email: clientEmail || user?.email,
          client_name: clientName,
          client_user_id: user?.id,
          hold_amount_cents: holdAmountCents,
        },
      });

      if (fnError) throw fnError;

      if (!data.card_hold_required && !data.auto_confirmed) {
        toast.info('Aucune avance requise pour ce chauffeur');
        onSkip?.();
        return;
      }

      if (data.auto_confirmed) {
        setStatus('confirmed');
        toast.success('✅ Montant bloqué automatiquement sur votre carte');
        onSuccess?.();
        return;
      }

      setStatus('idle');
    } catch (err: any) {
      console.error('Auto-hold error:', err);
      setStatus('idle');
    }
  }, [driverId, courseId, clientEmail, clientName, holdAmountCents, onSkip, onSuccess]);

  const initiateManualHold = useCallback(async () => {
    setStatus('creating');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: fnError } = await supabase.functions.invoke('create-card-hold', {
        body: {
          driver_id: driverId,
          course_id: courseId,
          client_email: clientEmail || user?.email,
          client_name: clientName,
          client_user_id: user?.id,
          hold_amount_cents: holdAmountCents,
        },
      });

      if (fnError) throw fnError;

      if (!data.card_hold_required && !data.auto_confirmed) {
        toast.info('Aucune avance requise');
        onSkip?.();
        return;
      }

      if (data.auto_confirmed) {
        setStatus('confirmed');
        toast.success('✅ Empreinte bancaire confirmée');
        onSuccess?.();
        return;
      }

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-course-payment', {
        body: {
          course_id: courseId,
          client_email: clientEmail || user?.email,
          client_name: clientName,
          client_user_id: user?.id,
          capture_method: 'manual',
          save_card: true,
        },
      });

      if (checkoutError) throw checkoutError;

      if (checkoutData?.checkout_url) {
        setStatus('redirecting');
        window.open(checkoutData.checkout_url, '_blank');
        toast.info('Complétez le paiement dans l\'onglet ouvert');
        pollForConfirmation();
      } else {
        throw new Error('Pas de lien de paiement reçu');
      }
    } catch (err: any) {
      console.error('Card hold error:', err);
      setError(err.message || 'Erreur lors de la création de l\'avance');
      setStatus('error');
    }
  }, [driverId, courseId, clientEmail, clientName, holdAmountCents, onSkip, onSuccess]);

  const pollForConfirmation = useCallback(() => {
    let attempts = 0;
    const maxAttempts = 60;

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
          toast.success('Empreinte bancaire confirmée !');
          onSuccess?.();
        }
      } catch {
      }
    }, 5000);

    setTimeout(() => clearInterval(interval), maxAttempts * 5000);
  }, [courseId, onSuccess]);

  if (status === 'checking' || status === 'auto_confirming') {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {status === 'auto_confirming'
              ? 'Validation automatique en cours...'
              : 'Vérification de votre moyen de paiement...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'confirmed') {
    return (
      <Card className={cn('border-primary/20 bg-primary/5', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Empreinte bancaire validée</p>
              <p className="text-xs text-muted-foreground">
                {defaultCard
                  ? `Carte ${defaultCard.brand.toUpperCase()} ****${defaultCard.last4} utilisée automatiquement`
                  : 'Votre course est réservée. Paiement à la fin du trajet.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'creating' || status === 'redirecting') {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {status === 'creating' ? 'Préparation du paiement...' : 'En attente de confirmation Stripe...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Entrez votre carte bancaire</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Votre carte sera <strong>enregistrée de manière sécurisée</strong> pour que vos prochains paiements soient 100% automatiques — aucune saisie requise.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80">
            <strong>Une seule fois :</strong> après cet enregistrement, vos prochaines courses seront validées et payées automatiquement, sans aucune action de votre part.
          </p>
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
            Paiement sécurisé par Stripe. Votre carte ne sera <strong>pas débitée maintenant</strong>.
            Le prélèvement s'effectue automatiquement à la fin de la course. En validant, vous acceptez notre{' '}
            <a href="/politique-annulation" target="_blank" className="underline font-medium text-primary hover:text-primary/80">
              politique d'annulation
            </a>.
          </AlertDescription>
        </Alert>

        <Button onClick={initiateManualHold} className="w-full gap-2 h-12 text-base font-semibold">
          <Lock className="w-4 h-4" />
          Enregistrer ma carte et valider
        </Button>

        {onSkip && (
          <p className="text-[10px] text-center text-muted-foreground">
            En enregistrant votre carte, les paiements futurs seront instantanés.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
