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
  QrCode,
  Wifi,
  Shield,
  ArrowRight,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingNfcStepProps {
  hasNfcPlate: boolean;
  driverId: string;
}

type PlateType = 'standard' | 'premium' | null;

const plates = {
  standard: {
    name: 'Plaque NFC Standard',
    price: 29.99,
    description: 'Format carte de visite élégant',
    features: [
      'Scan NFC instantané',
      'QR Code de secours intégré',
      'Design professionnel noir mat',
      'Personnalisation avec votre nom'
    ],
    color: 'from-zinc-600 to-zinc-800',
    icon: CreditCard,
    popular: false
  },
  premium: {
    name: 'Plaque NFC Premium',
    price: 49.99,
    description: 'Format XXL avec support adhésif',
    features: [
      'Tout de la version Standard',
      'Format large (10x6 cm)',
      'Support adhésif 3M inclus',
      'Finition dorée premium',
      'Résistant UV & intempéries'
    ],
    color: 'from-amber-500 to-amber-600',
    icon: Crown,
    popular: true
  }
};

export function OnboardingNfcStep({ hasNfcPlate, driverId }: OnboardingNfcStepProps) {
  const [selectedPlate, setSelectedPlate] = useState<PlateType>(null);
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
            transition={{ type: "spring", duration: 0.6 }}
            className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-primary" />
          </motion.div>
          <h3 className="text-lg font-bold">Votre plaque NFC est en route ! 🎉</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Vous avez déjà commandé votre plaque NFC SoloCab lors de votre inscription.
            Elle sera livrée sous 5-7 jours ouvrés.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Vous pouvez passer à l'étape suivante.
          </p>
        </div>
      </div>
    );
  }

  const handleOrder = async () => {
    if (!selectedPlate || !deliveryAddress.trim()) {
      toast.error('Veuillez saisir une adresse de livraison');
      return;
    }

    setOrdering(true);
    try {
      const plate = plates[selectedPlate];
      console.log('NFC plate order:', { driverId, plateType: selectedPlate, price: plate.price, deliveryAddress });
      
      // Simuler un délai d'appel API
      await new Promise(resolve => setTimeout(resolve, 500));

      setOrderSuccess(true);
      toast.success(`Commande de ${plate.name} enregistrée !`);
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error('Erreur lors de la commande');
    } finally {
      setOrdering(false);
    }
  };

  if (orderSuccess) {
    const plate = selectedPlate ? plates[selectedPlate] : null;
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Package className="w-10 h-10 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-green-500">Commande confirmée ! 🎉</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Votre <strong>{plate?.name}</strong> sera livrée sous 5-7 jours ouvrés.
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              {deliveryAddress}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (selectedPlate) {
    const plate = plates[selectedPlate];
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        {/* Order Form */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Finaliser ma commande
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPlate(null)}
                className="text-xs"
              >
                ← Retour
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Plate Summary */}
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-8 bg-gradient-to-br ${plate.color} rounded flex items-center justify-center`}>
                  <plate.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{plate.name}</p>
                  <p className="text-xs text-muted-foreground">{plate.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{plate.price.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">TTC</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Adresse de livraison
              </Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="123 Rue de la République, 75001 Paris"
                className="h-11"
              />
            </div>

            <Button
              onClick={handleOrder}
              disabled={ordering || !deliveryAddress.trim()}
              className={`w-full h-12 bg-gradient-to-r ${plate.color} hover:opacity-90`}
              size="lg"
            >
              {ordering ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              Commander - {plate.price.toFixed(2)} €
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Paiement sécurisé par carte bancaire. Livraison sous 5-7 jours ouvrés.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Section with Animation */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-3"
      >
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative inline-block mb-3"
        >
          <div className="flex items-center gap-2 justify-center">
            <motion.div 
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="w-14 h-10 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-lg shadow-lg flex items-center justify-center"
            >
              <CreditCard className="w-6 h-6 text-white" />
            </motion.div>
            <motion.div 
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 0.3 }}
              className="w-14 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg flex items-center justify-center"
            >
              <Crown className="w-6 h-6 text-white" />
            </motion.div>
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
          >
            <Wifi className="w-3 h-3 text-primary-foreground" />
          </motion.div>
        </motion.div>
        <h2 className="text-lg font-bold">Boostez votre fidélisation client</h2>
        <p className="text-muted-foreground text-xs mt-1">
          La technologie NFC au service de votre activité
        </p>
      </motion.div>

      {/* How it works - Animated */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 rounded-xl border border-primary/20"
      >
        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Comment ça marche ?
        </h4>
        <div className="flex items-center gap-2 text-xs">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            className="flex-1 text-center p-2 bg-background rounded-lg"
          >
            <Smartphone className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <span className="text-[10px]">Client scanne</span>
          </motion.div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="flex-1 text-center p-2 bg-background rounded-lg"
          >
            <Users className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <span className="text-[10px]">Accède à votre profil</span>
          </motion.div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            className="flex-1 text-center p-2 bg-background rounded-lg"
          >
            <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <span className="text-[10px]">Vous recontacte</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Two Plate Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-center">Choisissez votre plaque</h4>
        
        {/* Standard Plate */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            className={`cursor-pointer transition-all hover:border-zinc-500 hover:shadow-md`}
            onClick={() => setSelectedPlate('standard')}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-14 h-10 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-lg flex items-center justify-center shrink-0 shadow">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold">{plates.standard.name}</h4>
                    <span className="text-base font-bold">{plates.standard.price.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{plates.standard.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {plates.standard.features.slice(0, 3).map((feature, i) => (
                      <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Plate */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card 
            className={`cursor-pointer transition-all border-amber-500/50 hover:border-amber-500 hover:shadow-lg bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden`}
            onClick={() => setSelectedPlate('premium')}
          >
            <div className="absolute top-0 right-0">
              <Badge className="bg-amber-500 text-white text-[9px] rounded-none rounded-bl-lg">
                POPULAIRE
              </Badge>
            </div>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <motion.div 
                  animate={{ boxShadow: ['0 0 0 0 rgba(245, 158, 11, 0)', '0 0 0 8px rgba(245, 158, 11, 0.3)', '0 0 0 0 rgba(245, 158, 11, 0)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-14 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                >
                  <Crown className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-amber-600">{plates.premium.name}</h4>
                    <span className="text-base font-bold text-amber-600">{plates.premium.price.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{plates.premium.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {plates.premium.features.slice(0, 4).map((feature, i) => (
                      <span key={i} className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats / Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-2 text-center"
      >
        <div className="p-2 bg-green-500/10 rounded-lg">
          <p className="text-lg font-bold text-green-600">+30%</p>
          <p className="text-[9px] text-muted-foreground">Clients fidélisés</p>
        </div>
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <p className="text-lg font-bold text-blue-600">0%</p>
          <p className="text-[9px] text-muted-foreground">Commission</p>
        </div>
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <p className="text-lg font-bold text-amber-600">500+</p>
          <p className="text-[9px] text-muted-foreground">Chauffeurs équipés</p>
        </div>
      </motion.div>

      {/* Skip option */}
      <p className="text-center text-[10px] text-muted-foreground pt-2">
        💡 Vous pouvez aussi passer cette étape et commander plus tard dans votre espace chauffeur.
      </p>
    </div>
  );
}
