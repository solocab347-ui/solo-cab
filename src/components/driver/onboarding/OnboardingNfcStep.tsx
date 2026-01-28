import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Smartphone, 
  Users, 
  Star, 
  Zap,
  Check,
  Package,
  MapPin,
  Loader2,
  Sparkles,
  TrendingUp,
  QrCode
} from 'lucide-react';
import { motion } from 'framer-motion';

interface OnboardingNfcStepProps {
  hasNfcPlate: boolean;
  driverId: string;
}

export function OnboardingNfcStep({ hasNfcPlate, driverId }: OnboardingNfcStepProps) {
  const [wantsPlate, setWantsPlate] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Si le chauffeur a déjà une plaque NFC, afficher un message de confirmation
  if (hasNfcPlate) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-primary" />
          </motion.div>
          <h3 className="text-lg font-bold">Vous avez déjà votre plaque NFC !</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Votre plaque NFC SoloCab est déjà associée à votre compte.
            Vous pouvez passer à l'étape suivante.
          </p>
        </div>
      </div>
    );
  }

  const handleOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Veuillez saisir une adresse de livraison');
      return;
    }

    setOrdering(true);
    try {
      // Pour l'instant, on simule la commande - une migration DB sera nécessaire
      // pour ajouter les colonnes nfc_plate_requested, nfc_plate_delivery_address, etc.
      console.log('NFC plate order:', { driverId, deliveryAddress });
      
      // Simuler un délai d'appel API
      await new Promise(resolve => setTimeout(resolve, 500));

      setOrderSuccess(true);
      toast.success('Commande enregistrée ! Vous recevrez votre plaque sous 5-7 jours.');
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error('Erreur lors de la commande');
    } finally {
      setOrdering(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Package className="w-8 h-8 text-green-500" />
          </motion.div>
          <h3 className="text-lg font-bold text-green-500">Commande confirmée !</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Votre plaque NFC SoloCab sera livrée sous 5-7 jours ouvrés à l'adresse indiquée.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Vous pouvez continuer vers l'étape suivante.
          </p>
        </div>
      </div>
    );
  }

  if (wantsPlate) {
    return (
      <div className="space-y-4">
        {/* Order Form */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Commander ma plaque NFC
            </CardTitle>
            <CardDescription className="text-xs">
              Livraison sous 5-7 jours ouvrés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-gradient-to-br from-primary to-primary/60 rounded flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Plaque NFC SoloCab</p>
                  <p className="text-xs text-muted-foreground">Format carte de visite premium</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">29,99 €</p>
                <p className="text-xs text-muted-foreground">TTC</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm">
                <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                Adresse de livraison
              </Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="123 Rue de la République, 75001 Paris"
                className="h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setWantsPlate(false)}
                className="flex-1"
                disabled={ordering}
              >
                Annuler
              </Button>
              <Button
                onClick={handleOrder}
                disabled={ordering || !deliveryAddress.trim()}
                className="flex-1"
              >
                {ordering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Commander
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Le paiement sera prélevé lors de l'expédition.
              Vous pouvez aussi passer cette étape et commander plus tard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block mb-4"
        >
          <div className="w-20 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-primary-foreground" />
          </div>
        </motion.div>
        <h2 className="text-xl font-bold">La Plaque NFC SoloCab</h2>
        <p className="text-muted-foreground text-sm mt-1">
          L'outil ultime pour fidéliser vos clients
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-2">
        <Card className="border-primary/20">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Scan instantané</h4>
              <p className="text-xs text-muted-foreground">
                Le client scanne votre plaque et accède directement à votre profil SoloCab, 
                sans application à télécharger.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-1.5 bg-amber-500/10 rounded-lg shrink-0">
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Fidélisation automatique</h4>
              <p className="text-xs text-muted-foreground">
                Vos clients vous recontactent directement via votre profil, 
                sans passer par les plateformes qui prennent des commissions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-1.5 bg-green-500/10 rounded-lg shrink-0">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium">+30% de clients réguliers</h4>
              <p className="text-xs text-muted-foreground">
                Les chauffeurs avec plaque NFC convertissent 3x plus de clients 
                ponctuels en clients fidèles.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardContent className="p-3 flex items-start gap-3">
            <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0">
              <Star className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Image professionnelle</h4>
              <p className="text-xs text-muted-foreground">
                Une plaque premium qui montre votre sérieux et différencie 
                votre service des autres VTC.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison */}
      <Card className="bg-gradient-to-r from-red-500/10 to-green-500/10 border-0">
        <CardContent className="p-4">
          <h4 className="text-sm font-bold text-center mb-3">Sans vs Avec Plaque NFC</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-2">
              <p className="text-red-500 font-medium">❌ Sans plaque</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Client perdu après la course</li>
                <li>• Dépendance aux apps</li>
                <li>• Commissions à chaque course</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-green-500 font-medium">✅ Avec plaque</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Client fidélisé</li>
                <li>• Contact direct</li>
                <li>• 0% commission</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          onClick={() => setWantsPlate(true)}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          size="lg"
        >
          <CreditCard className="w-5 h-5 mr-2" />
          Commander ma plaque - 29,99 €
        </Button>
        
        <p className="text-center text-xs text-muted-foreground">
          Vous pouvez aussi passer cette étape et commander plus tard dans votre espace.
        </p>
      </div>

      {/* Social Proof */}
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>+500 chauffeurs utilisent déjà la plaque NFC</span>
      </div>
    </div>
  );
}
