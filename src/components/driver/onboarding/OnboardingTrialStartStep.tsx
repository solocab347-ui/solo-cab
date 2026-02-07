import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Loader2,
  Rocket,
  Play,
  Clock,
  CheckCircle2,
  Package,
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WelcomeVideoModal } from '../WelcomeVideoModal';

interface OnboardingTrialStartStepProps {
  driverId: string;
  billingType?: 'own_equipment' | 'buy_equipment' | 'solocab_stripe';
  stripeAccountStatus?: string;
  documentsStatus?: string;
  onComplete: () => void;
  loading: boolean;
}

export function OnboardingTrialStartStep({ 
  driverId, 
  billingType,
  stripeAccountStatus,
  documentsStatus: initialDocumentsStatus,
  onComplete,
  loading 
}: OnboardingTrialStartStepProps) {
  const [activating, setActivating] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);
  const [documentsStatus, setDocumentsStatus] = useState(initialDocumentsStatus);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Polling rapide + Realtime pour mise à jour instantanée
  useEffect(() => {
    // Fonction de fetch direct
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('documents_status')
        .eq('id', driverId)
        .single();
      
      if (data?.documents_status && data.documents_status !== documentsStatus) {
        setDocumentsStatus(data.documents_status);
        if (data.documents_status === 'validated') {
          toast.success('🎉 Vos documents ont été validés !');
        }
      }
    };

    // Polling toutes les 3 secondes pour réactivité maximale
    const interval = setInterval(fetchStatus, 3000);

    // Écouter les changements en temps réel (backup)
    const channel = supabase
      .channel(`driver-docs-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const newDocStatus = (payload.new as any)?.documents_status;
          if (newDocStatus && newDocStatus !== documentsStatus) {
            setDocumentsStatus(newDocStatus);
            if (newDocStatus === 'validated') {
              toast.success('🎉 Vos documents ont été validés !');
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [driverId, documentsStatus]);

  // Rafraîchir manuellement le statut
  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('documents_status')
        .eq('id', driverId)
        .single();

      if (data && !error) {
        setDocumentsStatus(data.documents_status);
        if (data.documents_status === 'validated') {
          toast.success('Documents validés ! Vous pouvez démarrer votre essai.');
        } else {
          toast.info('Statut actualisé : ' + (data.documents_status === 'submitted' ? 'en attente de validation' : 'documents incomplets'));
        }
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isStripeChoice = billingType === 'solocab_stripe';
  const isEquipmentPurchase = billingType === 'buy_equipment';
  const isOwnEquipment = billingType === 'own_equipment' || !billingType;

  const isStripeReady = isStripeChoice && stripeAccountStatus === 'active';
  const isStripeNotReady = isStripeChoice && stripeAccountStatus !== 'active';
  
  // Documents status check
  // - 'validated' = admin has approved
  // - 'submitted' = all docs uploaded, waiting for admin validation
  // - anything else = docs missing/incomplete
  const areDocumentsValidated = documentsStatus === 'validated';
  const areDocumentsPending = documentsStatus === 'submitted'; // All docs uploaded, waiting admin
  const areDocumentsMissing = !areDocumentsValidated && !areDocumentsPending;

  // NOUVEAU: L'essai peut démarrer dès que les documents sont validés par l'admin
  // Plus de condition de paiement - l'essai est GRATUIT pendant 14 jours
  const canStartTrial = () => {
    // Documents must be validated by admin first - SEULE condition obligatoire
    if (!areDocumentsValidated) return false;
    
    // Pour Stripe Connect, attendre que le compte soit activé
    if (isStripeChoice && !isStripeReady) return false;
    
    // Pour équipement propre ou acheté, confirmer la disponibilité
    if (isOwnEquipment || isEquipmentPurchase) return confirmReady;
    
    // Si Stripe ready, on peut démarrer
    return true;
  };

  // Afficher la vidéo de bienvenue puis lancer l'essai
  const handleLaunchWithVideo = () => {
    setShowWelcomeVideo(true);
  };

  const handleVideoComplete = () => {
    setShowWelcomeVideo(false);
    handleStartTrial();
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
        className="mb-4"
      >
        <h2 className="text-2xl font-bold text-white">Prêt à démarrer ? 🚀</h2>
        <p className="text-white/60 text-sm mt-1">
          14 jours gratuits pour développer ta clientèle
        </p>
      </motion.div>

      {/* Info explicative sur la période d'essai */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30"
      >
        <p className="text-xs text-white/80 text-left">
          <strong className="text-primary">🎁 Vos 14 jours ne démarrent que lorsque :</strong>
        </p>
        <ul className="text-xs text-white/60 mt-1 space-y-0.5 text-left list-disc ml-4">
          <li>Vos documents sont validés par notre équipe</li>
          <li>Vous appuyez sur "Lancer mon indépendance"</li>
        </ul>
        <p className="text-xs text-emerald-400 mt-1.5 text-left font-medium">
          → Vous ne perdez aucun jour !
        </p>
      </motion.div>

      {/* Condition cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm mb-6 space-y-3"
      >
        {/* Documents status */}
        <div className={cn(
          "w-full p-4 rounded-2xl border-2",
          areDocumentsValidated 
            ? "border-emerald-500 bg-emerald-500/10" 
            : areDocumentsPending
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-muted bg-muted/10"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              areDocumentsValidated ? "bg-emerald-500" : areDocumentsPending ? "bg-amber-500" : "bg-muted"
            )}>
              {areDocumentsValidated 
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : areDocumentsPending
                  ? <Clock className="w-4 h-4 text-white" />
                  : <FileText className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            <div>
              <h3 className={cn(
                "font-semibold text-sm",
                areDocumentsValidated ? "text-emerald-400" : areDocumentsPending ? "text-amber-400" : "text-muted-foreground"
              )}>
                {areDocumentsValidated 
                  ? "Documents validés ✓" 
                  : areDocumentsPending 
                    ? "En attente de validation admin"
                    : "Documents à déposer"}
              </h3>
              <p className="text-muted-foreground text-xs mt-1">
                {areDocumentsValidated 
                  ? "Tes documents sont validés" 
                  : areDocumentsPending
                    ? "L'admin valide sous 24-48h"
                    : "Dépose tes documents pour validation"}
              </p>
            </div>
          </div>
        </div>
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
            onClick={handleLaunchWithVideo} 
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
            {!areDocumentsValidated ? (
              <>
                <Button 
                  onClick={refreshStatus}
                  disabled={refreshing}
                  variant="outline"
                  className="w-full h-12 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  {refreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {areDocumentsPending ? 'Actualiser le statut' : 'Vérifier mes documents'}
                </Button>
                <p className="text-muted-foreground text-xs text-center">
                  {areDocumentsPending 
                    ? "Vos documents sont en cours de validation par l'admin. Vous serez notifié automatiquement."
                    : "Déposez vos documents pour continuer"}
                </p>
              </>
            ) : (
              <Button 
                onClick={handleSkipAndWait}
                disabled={loading}
                variant="outline"
                className="w-full h-12 border-border text-foreground hover:bg-muted"
              >
                <Clock className="w-4 h-4 mr-2" />
                {isStripeNotReady ? 'Attendre Stripe' : 'Attendre mon matériel'}
              </Button>
            )}
          </>
        )}
      </motion.div>

      {/* Modal vidéo de bienvenue obligatoire */}
      <WelcomeVideoModal
        open={showWelcomeVideo}
        onOpenChange={setShowWelcomeVideo}
        driverId={driverId}
        onComplete={handleVideoComplete}
      />
    </div>
  );
}
