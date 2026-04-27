import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2,
  Loader2,
  RefreshCw,
  CreditCard,
  Banknote,
  Shield,
  Euro,
  Lock,
  Users,
  ExternalLink,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { openExternalUrl } from '@/lib/openExternalUrl';

interface OnboardingBillingStepProps {
  data: {
    billingType: 'own_equipment' | 'buy_equipment' | 'solocab_stripe' | null;
  };
  onUpdate: (updates: Partial<OnboardingBillingStepProps['data']>) => void;
}

export function OnboardingBillingStep({ data, onUpdate }: OnboardingBillingStepProps) {
  const [searchParams] = useSearchParams();
  const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState(false);
  const [stripeStatusLoading, setStripeStatusLoading] = useState(false);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    connected: boolean;
    status: string;
    charges_enabled: boolean;
    details_submitted: boolean;
  } | null>(null);

  // Force billing type to solocab_stripe
  useEffect(() => {
    if (data.billingType !== 'solocab_stripe') {
      onUpdate({ billingType: 'solocab_stripe' });
    }
  }, []);

  const checkStripeStatus = async () => {
    setStripeStatusLoading(true);
    try {
      const { data: statusData, error } = await supabase.functions.invoke('stripe-connect-status');
      if (error) throw error;
      setStripeConnectStatus(statusData);
      if (statusData?.connected && statusData.details_submitted) {
        toast.success('✅ Votre compte est configuré !', {
          description: statusData.charges_enabled 
            ? 'Vous pouvez recevoir des paiements.'
            : 'En attente de vérification.',
        });
      }
    } catch (error: any) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setStripeStatusLoading(false);
    }
  };

  useEffect(() => {
    checkStripeStatus();
  }, []);

  useEffect(() => {
    const stripeParam = searchParams.get('stripe_connect');
    if (stripeParam === 'success') {
      checkStripeStatus();
    }
  }, [searchParams]);

  const startStripeOnboarding = async () => {
    setStripeOnboardingLoading(true);
    try {
      const { data: onboardingData, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      if (error) throw error;
      if (onboardingData?.url) {
        await openExternalUrl(onboardingData.url, {
          onClose: () => {
            // Re-check status when user comes back from Stripe
            toast.info('Vérification de votre compte Stripe...');
            checkStripeStatus();
          },
        });
        toast.info('Complétez votre inscription puis revenez ici.');
      }
    } catch (error: any) {
      console.error('Error starting Stripe onboarding:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setStripeOnboardingLoading(false);
    }
  };

  const isConnected = stripeConnectStatus?.connected;
  const isReady = stripeConnectStatus?.charges_enabled;
  const isSubmitted = stripeConnectStatus?.details_submitted;

  return (
    <div className="space-y-5 px-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
          <Banknote className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Recevez vos paiements</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Connectez votre compte pour recevoir les paiements clients directement sur votre compte bancaire.
        </p>
      </motion.div>

      {/* Status card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isReady ? (
          /* Stripe fully configured */
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-5 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-emerald-600">Paiements configurés !</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vous pouvez recevoir les paiements de vos clients.
              </p>
            </CardContent>
          </Card>
        ) : isSubmitted ? (
          /* Stripe submitted, waiting verification */
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-amber-600">Vérification en cours</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre compte est en cours de vérification. Cela prend généralement quelques minutes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkStripeStatus}
                disabled={stripeStatusLoading}
              >
                {stripeStatusLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Actualiser
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Not configured yet */
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 space-y-4">
              {/* Benefits */}
              <div className="space-y-2.5">
                {[
                  { icon: CreditCard, text: 'Paiement par carte automatisé' },
                  { icon: Lock, text: 'Acomptes et empreintes bancaires' },
                  { icon: Euro, text: 'Virements directs sur votre compte' },
                  { icon: Users, text: 'Partage de courses entre chauffeurs' },
                  { icon: Shield, text: 'Fiscalité simplifiée' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{text}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Frais : 0,50 €/course + frais bancaires (~1,5%)
                </p>
                <Button
                  onClick={startStripeOnboarding}
                  disabled={stripeOnboardingLoading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {stripeOnboardingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Configurer mes paiements
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Already started but incomplete */}
      {isConnected && !isReady && !isSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border">
            <CardContent className="p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Vous avez commencé la configuration. Reprenez là où vous en étiez.
              </p>
              <Button
                onClick={startStripeOnboarding}
                disabled={stripeOnboardingLoading}
                variant="outline"
                className="w-full"
              >
                {stripeOnboardingLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Reprendre la configuration
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          Paiements sécurisés • Vos données bancaires ne transitent jamais par SoloCab
        </p>
      </motion.div>
    </div>
  );
}
