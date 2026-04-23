import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Check,
  Package,
  MapPin,
  Loader2,
  Sparkles,
  QrCode,
  Wifi,
  ArrowRight,
  Crown,
  Trees
} from 'lucide-react';
import { motion } from 'framer-motion';

interface OnboardingNfcStepProps {
  hasNfcPlate: boolean;
  driverId: string;
  onSkip?: () => void;
}

type PlateType = 'standard' | 'premium' | null;

// MODE PRODUCTION: Prix réels
const TEST_MODE_PRICING = false;

const plates = {
  standard: {
    name: 'Plaque NFC Bois',
    price: TEST_MODE_PRICING ? 0.50 : 14.99,
    description: 'Ovale en bois naturel, élégante',
    features: [
      'Scan NFC instantané',
      'QR Code de secours',
      'Design naturel & écologique',
      'Format compact ovale'
    ],
    color: 'from-amber-700 to-amber-900',
    icon: Trees,
    popular: false
  },
  premium: {
    name: 'Plaque NFC Premium',
    price: TEST_MODE_PRICING ? 0.50 : 29.99,
    description: 'Plastique mat, professionnelle',
    features: [
      'Tout de la version Standard',
      'Format carte de visite',
      'Finition noir mat premium',
      'Ultra résistante',
      'Idéale véhicule'
    ],
    color: 'from-zinc-700 to-zinc-900',
    icon: CreditCard,
    popular: true
  }
};

export function OnboardingNfcStep({ hasNfcPlate, driverId, onSkip }: OnboardingNfcStepProps) {
  const [selectedPlate, setSelectedPlate] = useState<PlateType>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');

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
    if (!selectedPlate || !deliveryAddress.trim() || !deliveryCity.trim() || !deliveryPostalCode.trim()) {
      toast.error('Veuillez remplir tous les champs de livraison');
      return;
    }

    if (!/^\d{5}$/.test(deliveryPostalCode.trim())) {
      toast.error('Le code postal doit contenir 5 chiffres');
      return;
    }

    setOrdering(true);
    try {
      const plate = plates[selectedPlate];
      
      // Appel à l'edge function pour créer la commande
      const { data, error } = await supabase.functions.invoke('create-nfc-plate-order', {
        body: {
          driver_id: driverId,
          plate_type: selectedPlate,
          shipping_address: deliveryAddress.trim(),
          shipping_city: deliveryCity.trim(),
          shipping_postal_code: deliveryPostalCode.trim(),
          // Prix plein car hors inscription
        }
      });

      if (error) throw error;
      if (data?.url) {
        // Redirection vers Stripe
        window.location.href = data.url;
        return;
      }

      setOrderSuccess(true);
      toast.success(`Commande de ${plate.name} enregistrée !`);
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error(error.message || 'Erreur lors de la commande');
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
            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Package className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-primary">Commande confirmée ! 🎉</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Votre <strong>{plate?.name}</strong> sera livrée sous 5-7 jours ouvrés.
            </p>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              {deliveryAddress}, {deliveryPostalCode} {deliveryCity}
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
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Finaliser ma commande
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPlate(null)}
                className="text-xs"
              >
                ← Retour
              </Button>
            </div>

            {/* Selected Plate Summary */}
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-8 bg-gradient-to-br ${plate.color} rounded flex items-center justify-center`}>
                  <plate.icon className="w-5 h-5 text-primary-foreground" />
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

            <div className="space-y-3">
              <div>
                <Label htmlFor="address" className="text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Adresse de livraison *
                </Label>
                <Input
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="123 Rue de la République"
                  className="h-10 mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="postalCode" className="text-sm">Code postal *</Label>
                  <Input
                    id="postalCode"
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="75001"
                    maxLength={5}
                    className="h-10 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm">Ville *</Label>
                  <Input
                    id="city"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="Paris"
                    className="h-10 mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleOrder}
              disabled={ordering || !deliveryAddress.trim() || !deliveryCity.trim() || !deliveryPostalCode.trim()}
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
      {/* Hero Section */}
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
              className="w-14 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg shadow-lg flex items-center justify-center"
            >
              <Trees className="w-6 h-6 text-white" />
            </motion.div>
            <motion.div 
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, delay: 0.3 }}
              className="w-14 h-10 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg shadow-lg flex items-center justify-center"
            >
              <CreditCard className="w-6 h-6 text-white" />
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

      {/* How it works - Detailed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:p-4 rounded-xl border border-primary/20"
      >
        <h4 className="text-xs sm:text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          Comment ça marche ?
        </h4>
        
        {/* Étapes visuelles - responsive grid */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-start sm:gap-1 text-xs mb-3">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            className="text-center p-2 sm:p-2.5 bg-background rounded-lg flex-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium block">1. Client scanne</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">NFC ou QR Code</span>
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="text-center p-2 sm:p-2.5 bg-background rounded-lg flex-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 bg-green-500/20 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium block">2. Accède à votre profil</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">Voit vos services</span>
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            className="text-center p-2 sm:p-2.5 bg-background rounded-lg flex-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 bg-amber-500/20 rounded-full flex items-center justify-center">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium block">3. S'inscrit</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">Devient VOTRE client</span>
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
            className="text-center p-2 sm:p-2.5 bg-background rounded-lg flex-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1.5 bg-primary/20 rounded-full flex items-center justify-center">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium block">4. Vous le fidélisez</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground">Promos & contact</span>
          </motion.div>
        </div>

        {/* Message clé - QR Code disponible immédiatement */}
        <div className="bg-background/80 rounded-lg p-2.5 sm:p-3 border border-primary/10 space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/15 rounded-full flex items-center justify-center shrink-0">
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs font-medium text-primary">
                En attendant votre plaque ? Utilisez votre QR Code !
              </p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">
                Disponible dès maintenant dans votre tableau de bord. Faites-le scanner à vos clients pour une mise en relation instantanée.
              </p>
            </div>
          </div>
          
          <div className="border-t border-primary/10 pt-2">
            <p className="text-[10px] sm:text-xs text-center leading-relaxed">
              <span className="font-semibold text-primary">Vos clients, pas ceux de SoloCab !</span>
              <span className="text-muted-foreground block mt-0.5">
                Coordonnées, promotions, fidélisation — tout est pensé pour vous.
              </span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Two Plate Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-center">Choisissez votre plaque</h4>
        
        {/* Standard Plate (Bois) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            className="cursor-pointer transition-all hover:border-amber-600 hover:shadow-md"
            onClick={() => setSelectedPlate('standard')}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-14 h-10 bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg flex items-center justify-center shrink-0 shadow">
                  <Trees className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold">{plates.standard.name}</h4>
                    <span className="text-base font-bold">{plates.standard.price.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{plates.standard.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {plates.standard.features.slice(0, 3).map((feature, i) => (
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

        {/* Premium Plate (Plastique) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card 
            className="cursor-pointer transition-all border-zinc-500/50 hover:border-zinc-500 hover:shadow-lg bg-gradient-to-br from-zinc-500/5 to-transparent relative overflow-hidden"
            onClick={() => setSelectedPlate('premium')}
          >
            <div className="absolute top-0 right-0">
              <Badge className="bg-zinc-700 text-white text-[9px] rounded-none rounded-bl-lg">
                POPULAIRE
              </Badge>
            </div>
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <motion.div 
                  animate={{ boxShadow: ['0 0 0 0 rgba(113, 113, 122, 0)', '0 0 0 8px rgba(113, 113, 122, 0.3)', '0 0 0 0 rgba(113, 113, 122, 0)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-14 h-10 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                >
                  <CreditCard className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold">{plates.premium.name}</h4>
                    <span className="text-base font-bold">{plates.premium.price.toFixed(2)} €</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{plates.premium.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {plates.premium.features.slice(0, 4).map((feature, i) => (
                      <span key={i} className="text-[10px] bg-zinc-100 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
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
          <p className="text-[9px] text-muted-foreground">Frais</p>
        </div>
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <p className="text-lg font-bold text-amber-600">500+</p>
          <p className="text-[9px] text-muted-foreground">Chauffeurs équipés</p>
        </div>
      </motion.div>

      {/* Skip option - Bouton en évidence */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="pt-3"
      >
        <Button
          variant="outline"
          size="lg"
          onClick={onSkip}
          className="w-full h-12 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Je ne souhaite pas commander pour l'instant
        </Button>
        <p className="text-center text-[9px] text-muted-foreground mt-2">
          💡 Vous pourrez commander plus tard depuis votre tableau de bord
        </p>
      </motion.div>
    </div>
  );
}
