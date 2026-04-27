import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Handshake, Shield, CreditCard, Users, ArrowRight, CheckCircle2, 
  Loader2, Zap, TrendingUp, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PartnershipStripeGateProps {
  driverId: string;
  stripeStatus: 'not_connected' | 'pending' | 'active';
  onRefresh: () => void;
}

export function PartnershipStripeGate({ driverId, stripeStatus, onRefresh }: PartnershipStripeGateProps) {
  const [loading, setLoading] = useState(false);

  const startStripeOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Aucun lien reçu');
      }
    } catch (err: any) {
      console.error('Stripe onboarding error:', err);
      toast.error("Erreur lors de l'inscription Stripe Connect");
    } finally {
      setLoading(false);
    }
  };

  const advantages = [
    {
      icon: <Users className="h-5 w-5 text-primary" />,
      title: 'Réseau de partage',
      description: 'Partagez vos courses avec des chauffeurs du réseau SoloCab et recevez des courses de vos partenaires',
    },
    {
      icon: <CreditCard className="h-5 w-5 text-primary" />,
      title: 'Répartition automatique des gains',
      description: 'Les frais de transaction sont automatiquement réparties via Stripe Connect entre vous et vos partenaires',
    },
    {
      icon: <Shield className="h-5 w-5 text-primary" />,
      title: 'Transparence totale',
      description: 'Visualisez les montants, frais de transaction et reversements pour chaque course partagée',
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      title: 'Augmentez vos revenus',
      description: 'Gagnez une commission de 20% à 25% sur chaque course que vous partagez avec un partenaire',
    },
  ];

  if (stripeStatus === 'pending') {
    return (
      <div className="space-y-6">
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-warning animate-spin" />
            </div>
            <CardTitle className="text-xl">Vérification en cours</CardTitle>
            <CardDescription className="text-base">
              Votre compte Stripe Connect est en cours de vérification. 
              Une fois validé, vous pourrez accéder au réseau de partage.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={onRefresh}>
              <Zap className="h-4 w-4 mr-2" />
              Vérifier le statut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 sm:p-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 shadow-lg">
            <Handshake className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Rejoignez le Réseau de Partage SoloCab
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Partagez vos courses, augmentez vos revenus et collaborez avec d'autres chauffeurs VTC du réseau SoloCab.
          </p>
          <Badge variant="secondary" className="mt-4 bg-primary/10 text-primary border-primary/20">
            <Globe className="h-3 w-3 mr-1" />
            Ouvert à tous les chauffeurs SoloCab
          </Badge>
        </div>
      </Card>

      {/* Why Stripe Connect is required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Pourquoi Stripe Connect est requis ?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le réseau de partage SoloCab utilise <strong>Stripe Connect</strong> pour garantir une répartition 
            <strong> sécurisée, automatique et transparente</strong> des gains entre chauffeurs partenaires.
          </p>
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-2">
            <p className="text-sm font-medium text-foreground">Concrètement, cela permet :</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Le paiement client est encaissé par le chauffeur qui réalise la course</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>La commission du partenaire est automatiquement reversée (20% à 25%)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Des factures détaillées sont générées pour les deux parties</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>SoloCab prélève uniquement 0,25€ de frais de transaction par partage</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span><strong>Versement hebdomadaire</strong> : les frais de transaction sont agrégés et versés chaque lundi pour minimiser les frais bancaires</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Advantages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {advantages.map((adv, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 h-fit shrink-0">
                {adv.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">{adv.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{adv.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            Prêt à rejoindre le réseau ?
          </h2>
          <p className="text-sm text-muted-foreground">
            L'inscription à Stripe Connect est gratuite et ne prend que quelques minutes.
            Vos virements sont versés directement sur votre compte bancaire en J+2.
          </p>
          <Button 
            size="lg" 
            onClick={startStripeOnboarding} 
            disabled={loading}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white shadow-lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5 mr-2" />
            )}
            S'inscrire à Stripe Connect
          </Button>
          <p className="text-xs text-muted-foreground">
            En vous inscrivant, vous acceptez les conditions d'utilisation de Stripe Connect et de SoloCab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
