import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Rocket, 
  Play, 
  Loader2, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface TrialStartBannerProps {
  driverId: string;
  billingType?: string;
  stripeAccountStatus?: string;
  trialStatus?: string;
  subscriptionPaid?: boolean;
  freeAccessGranted?: boolean;
  freeAccessEndDate?: string | null;
  trialStartDate?: string | null;
  onTrialStarted?: () => void;
}

export function TrialStartBanner({ 
  driverId, 
  billingType,
  stripeAccountStatus,
  trialStatus,
  subscriptionPaid,
  freeAccessGranted,
  freeAccessEndDate,
  trialStartDate,
  onTrialStarted
}: TrialStartBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // ========== LOGIQUE DE VISIBILITÉ ==========
  
  // 1. NE PAS AFFICHER si l'utilisateur a un abonnement payé
  if (subscriptionPaid) {
    return null;
  }

  // 2. NE PAS AFFICHER si l'utilisateur a un accès gratuit permanent (fin en 2099 ou null = illimité)
  if (freeAccessGranted) {
    const endDate = freeAccessEndDate ? new Date(freeAccessEndDate) : null;
    const isUnlimited = !endDate || endDate.getFullYear() >= 2099;
    
    if (isUnlimited) {
      // Accès gratuit illimité - pas besoin de période d'essai
      return null;
    }
    
    // Accès gratuit temporaire - vérifier s'il est encore valide
    const now = new Date();
    if (endDate && endDate > now) {
      // Accès gratuit temporaire encore valide - pas besoin de période d'essai
      return null;
    }
  }

  // 3. NE PAS AFFICHER si l'essai est déjà démarré
  if (trialStartDate) {
    return null;
  }

  // 4. Afficher UNIQUEMENT si le statut d'essai est "pending" ou "pending_equipment"
  if (trialStatus !== 'pending_equipment' && trialStatus !== 'pending') {
    return null;
  }

  const isStripeReady = stripeAccountStatus === 'active';

  // Stripe is mandatory - trial can start only when Stripe is ready
  const canStartTrial = isStripeReady;

  const handleStartTrial = async () => {
    if (!confirmed) {
      toast.error('Veuillez confirmer que vous êtes prêt');
      return;
    }

    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-driver-trial', {
        body: { driver_id: driverId }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('🎉 Votre compte est activé ! Bienvenue sur SoloCab.');
        setDialogOpen(false);
        onTrialStarted?.();
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast.error('Erreur lors de l\'activation du compte');
    } finally {
      setActivating(false);
    }
  };

  const getSubtitle = () => {
    return isStripeReady 
      ? 'Votre compte est validé !' 
      : 'En attente de la validation de votre profil';
  };

  const getConfirmationText = () => {
    return 'Je confirme que mon profil est complet et prêt à recevoir des clients.';
  };

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Prêt à activer votre compte ?</h3>
                <p className="text-xs text-muted-foreground">
                  {getSubtitle()}
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="gap-2"
              disabled={!canStartTrial}
            >
              <Play className="w-4 h-4" />
              Démarrer
            </Button>
          </div>
          
          {/* Info sur l'attente Stripe */}
          {!isStripeReady && (
            <div className="mt-3 p-2 bg-warning/10 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">
                Votre profil est en cours de validation.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Activer votre compte
            </DialogTitle>
            <DialogDescription>
              Une fois activé, vous aurez accès à toutes les fonctionnalités gratuitement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Récap des avantages */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>QR codes et page de réservation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Coach IA personnalisé</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Calculateur de prix automatique</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Statistiques et suivi</span>
              </div>
            </div>

            {/* Confirmation */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox 
                id="confirm-ready"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label htmlFor="confirm-ready" className="text-sm cursor-pointer">
                {getConfirmationText()}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStartTrial}
              disabled={!confirmed || activating}
              className="gap-2"
            >
              {activating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Activer mon compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
