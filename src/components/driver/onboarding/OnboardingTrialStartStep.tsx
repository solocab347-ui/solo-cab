import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  Rocket,
  Package,
  CreditCard,
  Clock,
  Play,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OnboardingTrialStartStepProps {
  driverId: string;
  billingType: 'own_equipment' | 'buy_equipment' | 'solocab_stripe';
  stripeAccountStatus?: string;
  onComplete: () => void;
  loading: boolean;
}

export function OnboardingTrialStartStep({ 
  driverId, 
  billingType,
  stripeAccountStatus,
  onComplete,
  loading 
}: OnboardingTrialStartStepProps) {
  const [activating, setActivating] = useState(false);
  const [equipmentReceived, setEquipmentReceived] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);

  // Déterminer l'état en fonction du type de facturation
  const isStripeChoice = billingType === 'solocab_stripe';
  const isEquipmentPurchase = billingType === 'buy_equipment';
  const isOwnEquipment = billingType === 'own_equipment';

  // Stripe Connect doit être complètement configuré
  const isStripeReady = isStripeChoice && stripeAccountStatus === 'active';
  const isStripeNotReady = isStripeChoice && stripeAccountStatus !== 'active';

  // Peut démarrer l'essai ?
  const canStartTrial = () => {
    if (isOwnEquipment) return confirmReady;
    if (isEquipmentPurchase) return equipmentReceived;
    if (isStripeChoice) return isStripeReady;
    return false;
  };

  const handleStartTrial = async () => {
    if (!canStartTrial()) return;

    setActivating(true);
    try {
      // Appeler la fonction d'activation de l'essai
      const { data, error } = await supabase.functions.invoke('activate-driver-trial', {
        body: { driver_id: driverId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('🎉 Votre période d\'essai de 14 jours a commencé !');
        onComplete();
      } else if (data?.already_active) {
        toast.info('Votre période d\'essai est déjà active');
        onComplete();
      } else if (data?.already_subscribed) {
        toast.info('Vous avez déjà un abonnement actif');
        onComplete();
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast.error('Erreur lors de l\'activation de l\'essai');
    } finally {
      setActivating(false);
    }
  };

  const handleSkipAndWait = async () => {
    // Marquer l'onboarding comme complet mais sans activer l'essai
    try {
      await supabase
        .from('drivers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
          trial_status: 'pending_equipment', // Statut spécial
        })
        .eq('id', driverId);

      toast.success('Votre inscription est complète. Démarrez votre essai quand vous êtes prêt !');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="text-center space-y-4 py-2">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center"
      >
        <Rocket className="w-8 h-8 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold">Démarrez votre essai gratuit 🚀</h2>
        <p className="text-muted-foreground text-sm mt-1">
          14 jours pour développer votre clientèle privée
        </p>
      </motion.div>

      {/* Condition spécifique selon le type de facturation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        {/* Propre équipement */}
        {isOwnEquipment && (
          <Card className={`border-2 transition-all cursor-pointer ${
            confirmReady ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
          }`}
          onClick={() => setConfirmReady(!confirmReady)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  confirmReady ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {confirmReady && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-sm">Je confirme que mon matériel est prêt</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mon terminal de paiement ou mon application d'encaissement est configuré et fonctionnel.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achat d'équipement TPE */}
        {isEquipmentPurchase && (
          <>
            <Alert className="bg-warning/10 border-warning/30">
              <Package className="h-4 w-4 text-warning" />
              <AlertDescription className="text-xs">
                Vous avez choisi d'acheter un terminal de paiement. Vos 14 jours d'essai ne commenceront 
                qu'une fois votre matériel reçu pour ne pas vous pénaliser.
              </AlertDescription>
            </Alert>

            <Card className={`border-2 transition-all cursor-pointer ${
              equipmentReceived ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
            }`}
            onClick={() => setEquipmentReceived(!equipmentReceived)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    equipmentReceived ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {equipmentReceived && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-sm">J'ai reçu mon terminal de paiement</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Mon TPE est fonctionnel et je suis prêt à encaisser mes clients.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Stripe Connect */}
        {isStripeChoice && (
          <>
            {isStripeNotReady ? (
              <Alert className="bg-warning/10 border-warning/30">
                <Clock className="h-4 w-4 text-warning" />
                <AlertDescription className="text-xs">
                  Votre compte Stripe n'est pas encore activé. Vos 14 jours d'essai ne commenceront 
                  qu'une fois votre compte Stripe validé pour vous permettre d'encaisser immédiatement.
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="border-2 border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-semibold text-sm text-primary">
                        Compte Stripe activé ✓
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Vous pouvez maintenant encaisser vos clients en ligne.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>

      {/* Avantages de l'essai */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <h4 className="font-medium text-sm mb-2">Pendant vos 14 jours gratuits :</h4>
            <ul className="text-left text-[11px] text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                QR codes et page de réservation personnalisée
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                Coach IA pour développer votre clientèle
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                Calculateur de prix et gestion des courses
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                Statistiques et suivi de performance
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-2 pt-2"
      >
        {canStartTrial() ? (
          <Button 
            onClick={handleStartTrial} 
            disabled={activating || loading}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 h-12"
          >
            {activating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                Démarrer mes 14 jours gratuits
              </>
            )}
          </Button>
        ) : (
          <>
            <Button 
              onClick={handleSkipAndWait}
              disabled={loading}
              variant="outline"
              size="lg"
              className="w-full h-12"
            >
              <Clock className="w-5 h-5 mr-2" />
              {isStripeNotReady 
                ? 'Attendre la validation Stripe' 
                : 'Attendre la réception du matériel'}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Vous pourrez démarrer votre essai depuis votre tableau de bord
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
