import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Loader2,
  Rocket,
  Play,
  Clock,
  CheckCircle2,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [confirmReady, setConfirmReady] = useState(false);

  const isStripeChoice = billingType === 'solocab_stripe';
  const isEquipmentPurchase = billingType === 'buy_equipment';
  const isOwnEquipment = billingType === 'own_equipment';

  const isStripeReady = isStripeChoice && stripeAccountStatus === 'active';
  const isStripeNotReady = isStripeChoice && stripeAccountStatus !== 'active';

  const canStartTrial = () => {
    if (isOwnEquipment) return confirmReady;
    if (isEquipmentPurchase) return confirmReady;
    if (isStripeChoice) return isStripeReady;
    return false;
  };

  const handleStartTrial = async () => {
    if (!canStartTrial()) return;

    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-driver-trial', {
        body: { driver_id: driverId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('🎉 Vos 14 jours gratuits commencent !');
        onComplete();
      } else if (data?.already_active) {
        toast.info('Votre essai est déjà actif');
        onComplete();
      } else if (data?.already_subscribed) {
        toast.info('Vous avez déjà un abonnement');
        onComplete();
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast.error('Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const handleSkipAndWait = async () => {
    try {
      await supabase
        .from('drivers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
          trial_status: 'pending_equipment',
        })
        .eq('id', driverId);

      toast.success('Inscription complète. Démarrez votre essai quand vous êtes prêt !');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      {/* Hero */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-20 h-20 bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center mb-4"
      >
        <Rocket className="w-10 h-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-white">Prêt à démarrer ? 🚀</h2>
        <p className="text-white/60 text-sm mt-1">
          14 jours gratuits pour développer ta clientèle
        </p>
      </motion.div>

      {/* Condition card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm mb-6"
      >
        {/* Own equipment or buy equipment */}
        {(isOwnEquipment || isEquipmentPurchase) && (
          <button
            type="button"
            onClick={() => setConfirmReady(!confirmReady)}
            className={cn(
              "w-full p-4 rounded-2xl border-2 transition-all text-left",
              confirmReady 
                ? "border-emerald-500 bg-emerald-500/10" 
                : "border-white/20 bg-white/5 hover:border-white/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                confirmReady ? "bg-emerald-500 border-emerald-500" : "border-white/40"
              )}>
                {confirmReady && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  {isEquipmentPurchase 
                    ? "J'ai reçu mon terminal" 
                    : "Mon matériel est prêt"}
                </h3>
                <p className="text-white/50 text-xs mt-1">
                  {isEquipmentPurchase 
                    ? "Mon TPE est fonctionnel" 
                    : "Mon équipement de paiement est configuré"}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Stripe Connect */}
        {isStripeChoice && (
          <div className={cn(
            "w-full p-4 rounded-2xl border-2",
            isStripeReady 
              ? "border-emerald-500 bg-emerald-500/10" 
              : "border-amber-500/50 bg-amber-500/10"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                isStripeReady ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {isStripeReady 
                  ? <CheckCircle2 className="w-4 h-4 text-white" />
                  : <Clock className="w-4 h-4 text-white" />
                }
              </div>
              <div>
                <h3 className={cn(
                  "font-semibold text-sm",
                  isStripeReady ? "text-emerald-400" : "text-amber-400"
                )}>
                  {isStripeReady ? "Compte Stripe activé ✓" : "Validation Stripe en cours..."}
                </h3>
                <p className="text-white/50 text-xs mt-1">
                  {isStripeReady 
                    ? "Tu peux encaisser tes clients" 
                    : "L'essai démarrera après validation"}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Benefits - compact */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm bg-white/5 rounded-xl p-3 mb-6"
      >
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            "QR codes personnalisés",
            "Coach IA intégré",
            "Calculateur de prix",
            "Statistiques complètes"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-white/60">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-sm space-y-3"
      >
        {canStartTrial() ? (
          <Button 
            onClick={handleStartTrial} 
            disabled={activating || loading}
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-emerald-500"
          >
            {activating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Lancer mon indépendance
              </>
            )}
          </Button>
        ) : (
          <>
            <Button 
              onClick={handleSkipAndWait}
              disabled={loading}
              variant="outline"
              className="w-full h-12 border-white/20 text-white hover:bg-white/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              {isStripeNotReady ? 'Attendre Stripe' : 'Attendre mon matériel'}
            </Button>
            <p className="text-white/40 text-xs text-center">
              Tu pourras démarrer depuis ton tableau de bord
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
