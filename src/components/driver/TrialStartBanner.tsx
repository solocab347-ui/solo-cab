import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Rocket, 
  Play, 
  Loader2, 
  Package,
  CreditCard,
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
  onTrialStarted?: () => void;
}

export function TrialStartBanner({ 
  driverId, 
  billingType,
  stripeAccountStatus,
  trialStatus,
  onTrialStarted
}: TrialStartBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Ne pas afficher si l'essai est déjà actif ou si ce n'est pas en attente
  if (trialStatus !== 'pending_equipment' && trialStatus !== 'pending') {
    return null;
  }

  const isStripeChoice = billingType === 'solocab_stripe';
  const isEquipmentPurchase = billingType === 'buy_equipment';
  const isStripeReady = stripeAccountStatus === 'active';

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
        toast.success('🎉 Votre période d\'essai de 14 jours a commencé !');
        setDialogOpen(false);
        onTrialStarted?.();
      }
    } catch (error: any) {
      console.error('Error starting trial:', error);
      toast.error('Erreur lors de l\'activation de l\'essai');
    } finally {
      setActivating(false);
    }
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
                <h3 className="font-semibold text-sm">Prêt à démarrer votre essai gratuit ?</h3>
                <p className="text-xs text-muted-foreground">
                  {isStripeChoice 
                    ? (isStripeReady 
                        ? 'Votre compte Stripe est validé !' 
                        : 'En attente de la validation Stripe')
                    : isEquipmentPurchase 
                      ? 'Confirmez la réception de votre matériel'
                      : 'Démarrez vos 14 jours gratuits dès maintenant'}
                </p>
              </div>
            </div>
            
            <Button 
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="gap-2"
              disabled={isStripeChoice && !isStripeReady}
            >
              <Play className="w-4 h-4" />
              Démarrer
            </Button>
          </div>
          
          {/* Info sur l'attente Stripe */}
          {isStripeChoice && !isStripeReady && (
            <div className="mt-3 p-2 bg-warning/10 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground">
                Votre compte Stripe est en cours de validation. Vous serez notifié dès qu'il sera prêt.
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
              Démarrer votre essai gratuit
            </DialogTitle>
            <DialogDescription>
              Une fois activé, vous aurez accès à toutes les fonctionnalités pendant 14 jours.
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
                {isEquipmentPurchase 
                  ? 'Je confirme avoir reçu mon terminal de paiement et être prêt à encaisser mes clients.'
                  : isStripeChoice
                    ? 'Je confirme que mon compte Stripe est configuré et prêt à recevoir des paiements.'
                    : 'Je confirme que mon matériel d\'encaissement est prêt et fonctionnel.'}
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
              Démarrer mes 14 jours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
