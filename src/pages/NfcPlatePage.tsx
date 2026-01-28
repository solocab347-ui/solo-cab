import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Smartphone,
  Wifi,
  Star,
  CheckCircle,
  Truck,
  Package,
  MapPin,
  ArrowLeft,
  Car,
  QrCode,
  Users,
  Zap,
  TreeDeciduous,
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";
import nfcPlateLarge from "@/assets/nfc-plate-large-clean.png";
import nfcPlateSmall from "@/assets/nfc-plate-small-clean.png";

type PlateType = "large" | "small";

const PLATES = {
  large: {
    name: "Plaque NFC Premium",
    subtitle: "Plastique - Format carré",
    description: "Plaque carrée en plastique noir premium avec QR code intégré",
    material: "Plastique",
    price: 29.99,
    promoPrice: 23.99,
    priceId: "price_1SqaCu34nJZKnmmIbgUaYK8K",
    image: nfcPlateLarge,
  },
  small: {
    name: "Plaque NFC Standard",
    subtitle: "Bois naturel - Format ovale",
    description: "Plaque ovale en bois naturel, élégante et écologique",
    material: "Bois naturel",
    price: 14.99,
    promoPrice: 11.99,
    priceId: "price_1Sqdz534nJZKnmmItg1y3Nck",
    image: nfcPlateSmall,
  },
};

const NfcPlatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<PlateType>("large"); // Premium par défaut

  // Formulaire
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!/^\d{5}$/.test(formData.shipping_postal_code)) {
      toast.error("Le code postal doit contenir 5 chiffres");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-nfc-plate-order", {
        body: {
          ...formData,
          plate_type: selectedPlate,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("URL de paiement non générée");

      // Redirect to Stripe
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erreur commande:", error);
      toast.error(error.message || "Erreur lors de la commande");
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Smartphone,
      title: "Compatible tous smartphones",
      description: "Fonctionne avec iPhone et Android sans application",
    },
    {
      icon: QrCode,
      title: "Lien vers votre profil",
      description: "Vos clients accèdent directement à votre profil public",
    },
    {
      icon: Users,
      title: "Fidélisation client",
      description: "Permettez à vos clients de vous contacter facilement",
    },
    {
      icon: Zap,
      title: "Installation simple",
      description: "Collez la plaque dans votre véhicule en quelques secondes",
    },
  ];

  const currentPlate = PLATES[selectedPlate];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-white">SoloCab</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <Package className="w-3 h-3 mr-1" />
            LIVRAISON EN 5-7 JOURS
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Plaques NFC VTC{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              SoloCab
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            La plaque connectée qui transforme vos passagers en clients fidèles. 
            Un simple scan et ils accèdent à votre profil.
          </p>
        </div>

        {/* Subscription advantage banner */}
        <Card className="mb-8 p-6 bg-gradient-to-r from-primary/20 to-orange-500/20 border-primary/40 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-white mb-2">
                🎁 Économisez 20% avec l'abonnement SoloCab !
              </h2>
              <p className="text-gray-300 mb-3">
                En devenant chauffeur SoloCab, votre plaque NFC est <strong className="text-primary">liée à votre profil professionnel complet</strong> : 
                avis clients, réservations en ligne, CRM, statistiques et bien plus encore.
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Plaque Bois : <span className="line-through">14,99€</span> → <strong className="text-green-400">11,99€</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Plaque Premium : <span className="line-through">29,99€</span> → <strong className="text-green-400">23,99€</strong></span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Link to="/inscription-chauffeur">
                <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  <Car className="w-4 h-4 mr-2" />
                  S'inscrire et économiser
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Comparison: Three options - With subscription, Without subscription, Without plate */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {/* With subscription - Recommended */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-orange-500/10 border-primary/40 relative overflow-hidden order-1 md:order-1">
            <Badge className="absolute top-4 right-4 bg-primary text-white">
              ⭐ Recommandé
            </Badge>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white">Plaque + SoloCab</h3>
                <p className="text-sm text-primary">Avec abonnement</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span><strong>Profil public professionnel</strong> complet</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Système de <strong>réservation en ligne</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span><strong>Avis clients</strong> et notation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>CRM et gestion de clientèle</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Statistiques et tableau de bord</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Plaque liée à votre <strong>écosystème pro</strong></span>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-primary/30">
              <p className="text-primary text-sm mb-1 font-medium">-20% sur la plaque</p>
              <p className="text-3xl font-bold text-white">dès 11,99€</p>
              <p className="text-xs text-gray-400">+ 9,99€/mois (14 jours gratuits)</p>
            </div>
            <Link to="/inscription-chauffeur" className="block mt-4">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                <Star className="w-4 h-4 mr-2" />
                Devenir chauffeur SoloCab
              </Button>
            </Link>
          </Card>

          {/* Without subscription - Plate only */}
          <Card className="p-6 bg-white/5 border-white/20 order-2 md:order-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Plaque seule</h3>
                <p className="text-sm text-gray-400">Sans abonnement</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Lien vers votre <strong>numéro de téléphone</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>QR code + puce NFC inclus</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Scan instantané sans application</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="w-4 h-4 flex-shrink-0 text-center text-red-400">✗</span>
                <span>Pas de profil public</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="w-4 h-4 flex-shrink-0 text-center text-red-400">✗</span>
                <span>Pas de système de réservation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="w-4 h-4 flex-shrink-0 text-center text-red-400">✗</span>
                <span>Pas de suivi des avis</span>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-gray-400 text-sm mb-1">À partir de</p>
              <p className="text-3xl font-bold text-white">14,99€</p>
              <p className="text-xs text-gray-500">Paiement unique</p>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 border-white/30 text-white hover:bg-white/10"
              onClick={() => {
                const element = document.getElementById('order-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Commander une plaque seule
            </Button>
          </Card>

          {/* Without plate - Subscription only */}
          <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/30 order-3 md:order-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Wifi className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">SoloCab seul</h3>
                <p className="text-sm text-blue-400">Sans plaque NFC</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Profil public professionnel</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Système de réservation en ligne</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Avis clients et notation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>CRM et gestion de clientèle</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Partagez votre lien manuellement</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="w-4 h-4 flex-shrink-0 text-center text-yellow-400">⚠</span>
                <span className="text-yellow-400/70">Pas de scan NFC dans le véhicule</span>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-blue-500/30">
              <p className="text-blue-400 text-sm mb-1 font-medium">14 jours gratuits</p>
              <p className="text-3xl font-bold text-white">9,99€<span className="text-lg text-gray-400">/mois</span></p>
              <p className="text-xs text-gray-400">Ajoutez une plaque à -20% plus tard</p>
            </div>
            <Link to="/inscription-chauffeur" className="block mt-4">
              <Button variant="outline" className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                S'inscrire sans plaque
              </Button>
            </Link>
          </Card>
        </div>

        <div id="order-section" className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto scroll-mt-8">
          {/* Product showcase */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center lg:text-left">
              Commander une plaque seule
            </h2>
            <p className="text-gray-400 text-center lg:text-left">
              Vous ne souhaitez pas vous abonner ? Commandez simplement votre plaque NFC 
              qui sera liée à votre numéro de téléphone.
            </p>

            {/* Plate selection - Premium first */}
            <div className="grid grid-cols-2 gap-4">
              {/* Premium - First position */}
              <button
                onClick={() => setSelectedPlate("large")}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedPlate === "large"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
              >
                <Badge className="absolute -top-2 left-2 bg-orange-500 text-white text-xs">
                  Premium
                </Badge>
                {selectedPlate === "large" && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                    ✓
                  </Badge>
                )}
                <img
                  src={nfcPlateLarge}
                  alt="Plaque Premium"
                  className="w-full h-28 object-contain mb-3 mt-2"
                />
                <p className="text-white font-semibold text-sm">Plastique noir</p>
                <p className="text-orange-400 font-bold text-lg">29,99€</p>
                <p className="text-xs text-primary">23,99€ avec abo (-20%)</p>
              </button>

              {/* Standard - Second position */}
              <button
                onClick={() => setSelectedPlate("small")}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedPlate === "small"
                    ? "border-green-500 bg-green-500/10"
                    : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
              >
                <Badge className="absolute -top-2 left-2 bg-green-600 text-white text-xs">
                  <TreeDeciduous className="w-3 h-3 mr-1" />
                  Éco
                </Badge>
                {selectedPlate === "small" && (
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
                    ✓
                  </Badge>
                )}
                <img
                  src={nfcPlateSmall}
                  alt="Plaque Standard"
                  className="w-full h-28 object-contain mb-3 mt-2"
                />
                <p className="text-white font-semibold text-sm">Bois naturel</p>
                <p className="text-green-400 font-bold text-lg">14,99€</p>
                <p className="text-xs text-primary">11,99€ avec abo (-20%)</p>
              </button>
            </div>

            {/* Selected product card */}
            <Card className={`p-8 border transition-all ${
              selectedPlate === "large" 
                ? "bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/30"
                : "bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30"
            }`}>
              <div className="flex items-center justify-center mb-6">
                <img
                  src={currentPlate.image}
                  alt={currentPlate.name}
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">{currentPlate.name}</h3>
                <p className="text-gray-400 mb-4">{currentPlate.description}</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-5xl font-bold text-white">{currentPlate.price.toFixed(2)}€</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    TTC
                  </Badge>
                </div>
                <p className="text-gray-500 text-sm mb-2">
                  <span className="text-primary">{currentPlate.promoPrice.toFixed(2)}€</span> avec abonnement SoloCab
                </p>
                <p className="text-gray-400">Liée à votre numéro de téléphone</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Badge variant="outline" className="text-gray-400 border-gray-600">
                    {currentPlate.material}
                  </Badge>
                  {selectedPlate === "small" && (
                    <Badge variant="outline" className="text-green-400 border-green-500/50">
                      <TreeDeciduous className="w-3 h-3 mr-1" />
                      Écologique
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="p-4 bg-white/5 border-white/10">
                  <feature.icon className={`w-8 h-8 mb-3 ${selectedPlate === "large" ? "text-orange-500" : "text-green-500"}`} />
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </Card>
              ))}
            </div>

            {/* Delivery info */}
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Truck className="w-5 h-5 text-blue-500" />
              <AlertDescription className="text-gray-300">
                <strong>Livraison gratuite</strong> en France métropolitaine. 
                Délai de livraison : 5 à 7 jours ouvrés.
              </AlertDescription>
            </Alert>

            {/* Encourage subscription again */}
            <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-600/10 border-purple-500/30">
              <div className="flex items-start gap-4">
                <Car className="w-10 h-10 text-purple-500 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-white mb-2">💡 Conseil : Passez à SoloCab</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Avec SoloCab, votre plaque NFC devient une vraie machine à clients : 
                    profil professionnel, avis, réservations en ligne... Et en plus, 
                    vous économisez sur la plaque !
                  </p>
                  <Link to="/inscription-chauffeur">
                    <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                      <Star className="w-4 h-4 mr-2" />
                      Devenir chauffeur SoloCab
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Order form */}
          <div>
            {!showOrderForm ? (
              <Card className="p-8 bg-white/5 border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                  Commander ma plaque NFC
                </h2>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Plaque NFC professionnelle haute qualité</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Compatible tous smartphones NFC</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Livraison gratuite sous 5-7 jours</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Suivi de commande par email</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowOrderForm(true)}
                  className={`w-full py-6 text-lg text-white ${
                    selectedPlate === "large"
                      ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  }`}
                >
                  Commander maintenant - {currentPlate.price.toFixed(2)}€
                </Button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  Paiement sécurisé par Stripe
                </p>
              </Card>
            ) : (
              <Card className="p-8 bg-white/5 border-white/10">
                <Button
                  variant="ghost"
                  onClick={() => setShowOrderForm(false)}
                  className="mb-4 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>

                {/* Selected plate summary */}
                <div className={`flex items-center gap-4 p-4 rounded-lg mb-6 ${
                  selectedPlate === "large" ? "bg-orange-500/10 border border-orange-500/30" : "bg-green-500/10 border border-green-500/30"
                }`}>
                  <img src={currentPlate.image} alt={currentPlate.name} className="w-16 h-16 object-contain" />
                  <div>
                    <p className="text-white font-semibold">{currentPlate.name}</p>
                    <p className={`font-bold ${selectedPlate === "large" ? "text-orange-400" : "text-green-400"}`}>
                      {currentPlate.price.toFixed(2)}€
                    </p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-6">
                  Informations de livraison
                </h2>

                <form onSubmit={handleOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name" className="text-gray-300">Prénom *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        placeholder="Jean"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name" className="text-gray-300">Nom *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        placeholder="Dupont"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-gray-300">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="jean@example.com"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-gray-300">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="06 12 34 56 78"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className={`w-5 h-5 ${selectedPlate === "large" ? "text-orange-500" : "text-green-500"}`} />
                      <span className="font-medium text-white">Adresse de livraison</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shipping_address" className="text-gray-300">Adresse complète *</Label>
                        <Input
                          id="shipping_address"
                          name="shipping_address"
                          value={formData.shipping_address}
                          onChange={handleChange}
                          required
                          placeholder="123 rue de la Liberté"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shipping_postal_code" className="text-gray-300">Code postal *</Label>
                          <Input
                            id="shipping_postal_code"
                            name="shipping_postal_code"
                            value={formData.shipping_postal_code}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              shipping_postal_code: e.target.value.replace(/\D/g, '').slice(0, 5)
                            }))}
                            required
                            placeholder="75001"
                            maxLength={5}
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shipping_city" className="text-gray-300">Ville *</Label>
                          <Input
                            id="shipping_city"
                            name="shipping_city"
                            value={formData.shipping_city}
                            onChange={handleChange}
                            required
                            placeholder="Paris"
                            className="bg-white/10 border-white/20 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-6 text-lg text-white ${
                      selectedPlate === "large"
                        ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Package className="w-5 h-5 mr-2" />
                    )}
                    Payer {currentPlate.price.toFixed(2)}€
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    Paiement sécurisé par Stripe. Un email de suivi vous sera envoyé.
                  </p>
                </form>
              </Card>
            )}

            {/* Track order */}
            <Card className="mt-6 p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className={`w-5 h-5 ${selectedPlate === "large" ? "text-orange-500" : "text-green-500"}`} />
                Suivre ma commande
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Vous avez déjà commandé ? Entrez votre numéro de commande ou consultez l'email de confirmation.
              </p>
              <Link to="/suivi-plaque-nfc">
                <Button variant="outline" className={`w-full ${
                  selectedPlate === "large" 
                    ? "border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                    : "border-green-500/50 text-green-400 hover:bg-green-500/10"
                }`}>
                  Suivre ma commande
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NfcPlatePage;
