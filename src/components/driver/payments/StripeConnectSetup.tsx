import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { openExternalUrl } from '@/lib/openExternalUrl';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Loader2,
  Shield,
  Banknote,
  Handshake,
  RefreshCw
} from 'lucide-react';

interface StripeConnectStatus {
  connected: boolean;
  status: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  account_id?: string;
}

interface StripeConnectSetupProps {
  driverId: string;
  onStatusChange?: (status: StripeConnectStatus) => void;
}

export function StripeConnectSetup({ driverId, onStatusChange }: StripeConnectSetupProps) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-status');
      
      if (error) throw error;
      
      setStatus(data);
      onStatusChange?.(data);
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check for return from Stripe onboarding
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_connect') === 'success') {
      toast.success('Configuration Stripe terminée ! Vérification en cours...');
      // Remove the query param
      window.history.replaceState({}, '', window.location.pathname);
      checkStatus();
    } else if (urlParams.get('stripe_connect') === 'refresh') {
      toast.info('Veuillez reprendre la configuration Stripe');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [driverId]);

  const startOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      
      if (error) throw error;
      
      if (data?.url) {
        await openExternalUrl(data.url, {
          onClose: () => {
            toast.info('Vérification de votre compte Stripe...');
            checkStatus();
          },
        });
        toast.info('Complétez votre inscription Stripe puis revenez à l\'app.');
      }
    } catch (error: any) {
      console.error('Error starting onboarding:', error);
      toast.error(error.message || '\'Erreur lors du démarrage de linscription');
    } finally {
      setOnboardingLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isFullyActive = status?.charges_enabled && status?.payouts_enabled;
  const isPending = status?.connected && !isFullyActive;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Stripe Connect</CardTitle>
              <CardDescription>Paiements pour le partage de courses</CardDescription>
            </div>
          </div>
          {isFullyActive && (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Actif
            </Badge>
          )}
          {isPending && (
            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              En attente
            </Badge>
          )}
          {!status?.connected && (
            <Badge className="bg-muted text-muted-foreground">
              Non configuré
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Explanation */}
        <Alert className="border-indigo-500/30 bg-indigo-500/10">
          <Handshake className="h-4 w-4 text-indigo-500" />
          <AlertTitle className="text-indigo-400">Pourquoi Stripe Connect ?</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Pour partager des courses avec d'autres chauffeurs, vous devez configurer un compte Stripe Connect. 
            Cela permet d'encaisser les paiements clients automatiquement et de redistribuer les frais de transaction entre partenaires.
          </AlertDescription>
        </Alert>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-green-500" />
            <span className="text-sm">Paiements sécurisés</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Banknote className="h-5 w-5 text-blue-500" />
            <span className="text-sm">Virements automatiques</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Handshake className="h-5 w-5 text-purple-500" />
            <span className="text-sm">Frais de transaction partenaires</span>
          </div>
        </div>

        <Separator />

        {/* Status Details */}
        {status?.connected && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Statut du compte</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                {status.charges_enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>Encaissements {status.charges_enabled ? 'activés' : 'en attente'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {status.payouts_enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>Virements {status.payouts_enabled ? 'activés' : 'en attente'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!status?.connected && (
            <Button 
              onClick={startOnboarding}
              disabled={onboardingLoading}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {onboardingLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Configurer Stripe Connect
            </Button>
          )}
          
          {isPending && (
            <Button 
              onClick={startOnboarding}
              disabled={onboardingLoading}
              className="flex-1"
            >
              {onboardingLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Compléter l'inscription
            </Button>
          )}
          
          {status?.connected && (
            <Button 
              variant="outline" 
              onClick={checkStatus}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser le statut
            </Button>
          )}
        </div>

        {isFullyActive && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-400">Compte prêt !</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Vous pouvez maintenant partager des courses avec vos partenaires et recevoir les paiements automatiquement.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
