import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Loader2,
  Rocket,
  Clock,
  CheckCircle2,
  Package,
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingTrialStartStepProps {
  driverId: string;
  billingType?: 'own_equipment' | 'buy_equipment' | 'solocab_stripe';
  stripeAccountStatus?: string;
  documentsStatus?: string;
  onComplete: () => void;
  onGoToDocuments?: () => void;
  loading: boolean;
}

export function OnboardingTrialStartStep({ 
  driverId, 
  billingType,
  stripeAccountStatus,
  documentsStatus: initialDocumentsStatus,
  onComplete,
  onGoToDocuments,
  loading 
}: OnboardingTrialStartStepProps) {
  const [activating, setActivating] = useState(false);
  
  const [documentsStatus, setDocumentsStatus] = useState(initialDocumentsStatus);
  
  const [refreshing, setRefreshing] = useState(false);

  // Polling rapide + Realtime pour mise à jour INSTANTANÉE
  useEffect(() => {
    let isMounted = true;
    
    // Fonction de fetch direct - vérifie la BDD directement
    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('documents_status')
          .eq('id', driverId)
          .single();
        
        if (!isMounted || error) return;
        
        const newStatus = data?.documents_status;
        if (newStatus && newStatus !== documentsStatus) {
          console.log('[TrialStartStep] Document status changed:', documentsStatus, '->', newStatus);
          setDocumentsStatus(newStatus);
          if (newStatus === 'validated') {
            toast.success('🎉 Vos documents ont été validés ! Vous pouvez démarrer votre essai.');
          }
        }
      } catch (err) {
        console.error('Error fetching status:', err);
      }
    };

    // Fetch immédiat au chargement - données fraîches dès le départ
    fetchStatus();

    // Polling toutes les 5s (réduit de 2s → 5s pour économiser la DB; Realtime gère l'instant)
    const interval = setInterval(fetchStatus, 5000);

    // Écouter les changements en temps réel via centralized manager
    const cleanup = subscriptionManager.subscribe(
      `driver-docs-realtime-${driverId}`,
      { table: 'drivers', event: 'UPDATE', filter: `id=eq.${driverId}` },
      (payload) => {
        if (!isMounted) return;
        const newDocStatus = (payload.new as any)?.documents_status;
        if (newDocStatus && newDocStatus !== documentsStatus) {
          setDocumentsStatus(newDocStatus);
          if (newDocStatus === 'validated') {
            toast.success('🎉 Vos documents ont été validés ! Vous pouvez démarrer votre essai.');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearInterval(interval);
      cleanup();
    };
  }, [driverId]); // Removed documentsStatus to avoid re-creating interval

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

  // Stripe is now always mandatory
  const isStripeReady = stripeAccountStatus === 'active';
  const isStripeNotReady = stripeAccountStatus !== 'active';
  
  // Documents status check
  // - 'validated' = admin has approved
  // - 'submitted' = all docs uploaded, waiting for admin validation
  // - anything else = docs missing/incomplete
  const areDocumentsValidated = documentsStatus === 'validated';
  const areDocumentsPending = documentsStatus === 'submitted'; // All docs uploaded, waiting admin
  const areDocumentsMissing = !areDocumentsValidated && !areDocumentsPending;

  // Activation requires validated documents + Stripe ready
  const canActivate = () => {
    if (!areDocumentsValidated) return false;
    if (!isStripeReady) return false;
    return true;
  };



  const handleActivateAccount = async () => {
    if (!canActivate()) return;

    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-driver-trial', {
        body: { driver_id: driverId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('🎉 Votre compte est activé ! Bienvenue sur SoloCab.');
        onComplete();
      } else if (data?.already_active) {
        toast.info('Votre compte est déjà actif');
        onComplete();
      } else if (data?.already_subscribed) {
        toast.info('Vous avez déjà un abonnement');
        onComplete();
      }
    } catch (error: any) {
      console.error('Error activating account:', error);
      toast.error('Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const handleSkipAndWait = async () => {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
        })
        .eq('id', driverId);

      if (error) {
        if (error.message?.includes('Stripe Connect')) {
          toast.error('Configurez d\'abord votre compte de paiement Stripe Connect avant de finaliser.', {
            duration: 6000,
            action: {
              label: 'Configurer',
              onClick: () => window.location.href = '/driver-welcome?step=stripe',
            },
          });
          return;
        }
        throw error;
      }

      toast.success('Inscription complète. Activez votre compte quand vous êtes prêt !');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
      {/* Hero - simplified */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-5"
      >
        <Rocket className="w-8 h-8 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-foreground">Prêt à démarrer ? 🚀</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Activez votre compte gratuit et commencez à développer votre clientèle
        </p>
      </motion.div>

      {/* Conditions - clean cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm space-y-3 mb-6"
      >
        {/* Documents status */}
        <div className={cn(
          "w-full p-4 rounded-2xl border transition-all",
          areDocumentsValidated 
            ? "border-emerald-500/40 bg-emerald-500/5" 
            : areDocumentsPending
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-border bg-muted/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              areDocumentsValidated ? "bg-emerald-500" : areDocumentsPending ? "bg-amber-500" : "bg-muted"
            )}>
              {areDocumentsValidated 
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : areDocumentsPending
                  ? <Clock className="w-4 h-4 text-white" />
                  : <FileText className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            <div className="text-left flex-1">
              <h3 className={cn(
                "font-semibold text-sm",
                areDocumentsValidated ? "text-emerald-500" : areDocumentsPending ? "text-amber-500" : "text-foreground"
              )}>
                {areDocumentsValidated 
                  ? "Documents validés ✓" 
                  : areDocumentsPending 
                    ? "En attente de validation"
                    : "Documents à déposer"}
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                {areDocumentsValidated 
                  ? "Tes documents sont approuvés" 
                  : areDocumentsPending
                    ? "Validation sous 24-48h"
                    : "Dépose tes documents pour continuer"}
              </p>
            </div>
            {/* Button to go back to documents */}
            {areDocumentsMissing && onGoToDocuments && (
              <button
                onClick={onGoToDocuments}
                className="text-xs text-primary font-medium hover:underline flex-shrink-0"
              >
                Déposer →
              </button>
            )}
          </div>
        </div>

        {/* Stripe Connect status - always shown */}
        <div className={cn(
            "w-full p-4 rounded-2xl border",
            isStripeReady 
              ? "border-emerald-500/40 bg-emerald-500/5" 
              : "border-amber-500/40 bg-amber-500/5"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isStripeReady ? "bg-emerald-500" : "bg-amber-500"
              )}>
                {isStripeReady 
                  ? <CheckCircle2 className="w-4 h-4 text-white" />
                  : <Clock className="w-4 h-4 text-white" />
                }
              </div>
              <div className="text-left">
                <h3 className={cn(
                  "font-semibold text-sm",
                  isStripeReady ? "text-emerald-500" : "text-amber-500"
                )}>
                  {isStripeReady ? "Compte activé ✓" : "Validation en cours..."}
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {isStripeReady ? "Tu peux encaisser tes clients" : "L'essai démarrera après validation"}
                </p>
              </div>
            </div>
          </div>
      </motion.div>

      {/* Info - minimal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm p-3 rounded-xl bg-primary/5 border border-primary/15 mb-6 text-left"
      >
        <p className="text-xs text-foreground/80">
          <strong className="text-primary">🎁 Votre compte sera activé</strong> dès que vos documents sont validés par notre équipe et que vous appuyez sur le bouton ci-dessous.
          <span className="text-emerald-500 font-medium"> Accès gratuit et illimité !</span>
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm space-y-3"
      >
        {canActivate() ? (
          <Button 
            onClick={handleActivateAccount} 
            disabled={activating || loading}
            className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
          >
            {activating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" />
                Activer mon compte
              </>
            )}
          </Button>
        ) : (
          <>
            {areDocumentsMissing && onGoToDocuments ? (
              <Button 
                onClick={onGoToDocuments}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                <FileText className="w-4 h-4 mr-2" />
                Déposer mes documents
              </Button>
            ) : !areDocumentsValidated ? (
              <>
                <Button 
                  onClick={refreshStatus}
                  disabled={refreshing}
                  variant="outline"
                  className="w-full h-12"
                >
                  {refreshing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Actualiser le statut
                </Button>
                <p className="text-muted-foreground text-xs text-center">
                  Vos documents sont en cours de validation.
                </p>
              </>
            ) : (
              <Button 
                onClick={handleSkipAndWait}
                disabled={loading}
                variant="outline"
                className="w-full h-12"
              >
                <Clock className="w-4 h-4 mr-2" />
                Attendre la validation
              </Button>
            )}
          </>
        )}
      </motion.div>



    </div>
  );
}
