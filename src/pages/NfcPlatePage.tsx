import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Smartphone,
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
  Crown,
  X,
  Shield,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";
import nfcPlateLarge from "@/assets/nfc-plate-large-clean.png";
import nfcPlateSmall from "@/assets/nfc-plate-small-clean.png";

type PlateType = "premium" | "standard";
type PurchaseMode = "with_subscription" | "plate_only";

const PLATES = {
  premium: {
    name: "Plaque NFC Premium",
    subtitle: "Plastique noir mat",
    format: "Format carte de visite",
    material: "Plastique",
    price: 29.99,
    promoPrice: 23.99,
    image: nfcPlateLarge,
    features: [
      "Finition noir mat premium",
      "Ultra résistante",
      "Idéale véhicule",
      "Format pratique",
    ],
    color: "orange",
  },
  standard: {
    name: "Plaque NFC Bois",
    subtitle: "Bois naturel écologique",
    format: "Format ovale compact",
    material: "Bois naturel",
    price: 14.99,
    promoPrice: 11.99,
    image: nfcPlateSmall,
    features: [
      "Design naturel",
      "Écologique",
      "Élégant",
      "Compact",
    ],
    color: "green",
  },
};

const NfcPlatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState<PlateType>("premium");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("with_subscription");

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

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.first_name || !formData.last_name) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!formData.shipping_address || !formData.shipping_city || !formData.shipping_postal_code) {
      toast.error("Veuillez remplir l'adresse de livraison complète");
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
          plate_type: selectedPlate === "premium" ? "large" : "small",
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("URL de paiement non générée");

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erreur commande:", error);
      toast.error(error.message || "Erreur lors de la commande");
      setLoading(false);
    }
  };

  const currentPlate = PLATES[selectedPlate];
  const displayPrice = purchaseMode === "with_subscription" ? currentPlate.promoPrice : currentPlate.price;

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

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section - Simple and clear */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
            <Truck className="w-3 h-3 mr-1" />
            Livraison gratuite en 5-7 jours
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Choisissez votre <span className="text-primary">Plaque NFC</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Un simple scan et vos clients accèdent à votre profil. Compatible tous smartphones.
          </p>
        </div>

        {/* Two Plates Side by Side - Premium first */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {/* Premium Plate */}
          <button
            onClick={() => setSelectedPlate("premium")}
            className={`relative text-left p-0 rounded-2xl border-2 transition-all overflow-hidden ${
              selectedPlate === "premium"
                ? "border-orange-500 ring-2 ring-orange-500/30"
                : "border-white/20 hover:border-orange-500/50"
            }`}
          >
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            {selectedPlate === "premium" && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6">
              <img 
                src={nfcPlateLarge} 
                alt="Plaque NFC Premium" 
                className="w-full h-36 object-contain mx-auto"
              />
            </div>
            
            <div className="p-5 bg-white/5">
              <h3 className="text-lg font-bold text-white mb-1">Plastique noir</h3>
              <p className="text-sm text-gray-400 mb-3">Format carte de visite • Ultra résistant</p>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-orange-500">
                  29,99€
                </p>
                <p className="text-sm text-primary">
                  23,99€ avec abo (-20%)
                </p>
              </div>
            </div>
          </button>

          {/* Standard Plate */}
          <button
            onClick={() => setSelectedPlate("standard")}
            className={`relative text-left p-0 rounded-2xl border-2 transition-all overflow-hidden ${
              selectedPlate === "standard"
                ? "border-green-500 ring-2 ring-green-500/30"
                : "border-white/20 hover:border-green-500/50"
            }`}
          >
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-green-500 text-white">
                <TreeDeciduous className="w-3 h-3 mr-1" />
                Éco
              </Badge>
            </div>
            {selectedPlate === "standard" && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 p-6">
              <img 
                src={nfcPlateSmall} 
                alt="Plaque NFC Bois" 
                className="w-full h-36 object-contain mx-auto"
              />
            </div>
            
            <div className="p-5 bg-white/5">
              <h3 className="text-lg font-bold text-white mb-1">Bois naturel</h3>
              <p className="text-sm text-gray-400 mb-3">Format ovale • Écologique & élégant</p>
              
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-500">
                  14,99€
                </p>
                <p className="text-sm text-primary">
                  11,99€ avec abo (-20%)
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Purchase Mode Selection */}
        <div className="max-w-4xl mx-auto mb-10">
          <h2 className="text-xl font-bold text-white mb-4 text-center">
            Comment souhaitez-vous utiliser votre plaque ?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* With Subscription - Recommended */}
            <button
              onClick={() => setPurchaseMode("with_subscription")}
              className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                purchaseMode === "with_subscription"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-white/20 bg-white/5 hover:border-primary/50"
              }`}
            >
              <Badge className="absolute -top-2.5 left-4 bg-primary text-white text-xs">
                ⭐ Recommandé
              </Badge>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">Plaque + SoloCab</h3>
                  <p className="text-sm text-primary mb-3">Abonnement inclus</p>
                  
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Profil professionnel complet</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Réservations en ligne</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Avis clients & CRM</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span><strong className="text-primary">-20%</strong> sur la plaque</span>
                    </li>
                  </ul>
                  
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-2xl font-bold text-white">
                      {PLATES[selectedPlate].promoPrice.toFixed(2)}€
                      <span className="text-sm font-normal text-gray-400 ml-2">+ 9,99€/mois</span>
                    </p>
                    <p className="text-xs text-gray-500">14 jours d'essai gratuit</p>
                  </div>
                </div>
              </div>
            </button>

            {/* Plate Only */}
            <button
              onClick={() => setPurchaseMode("plate_only")}
              className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                purchaseMode === "plate_only"
                  ? "border-gray-400 bg-gray-500/10 ring-2 ring-gray-500/30"
                  : "border-white/20 bg-white/5 hover:border-gray-400/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">Plaque seule</h3>
                  <p className="text-sm text-gray-400 mb-3">Sans abonnement</p>
                  
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>Lien vers votre téléphone</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>QR code + NFC inclus</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-500">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>Pas de profil public</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-500">
                      <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>Pas de réservation</span>
                    </li>
                  </ul>
                  
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-2xl font-bold text-white">
                      {PLATES[selectedPlate].price.toFixed(2)}€
                    </p>
                    <p className="text-xs text-gray-500">Paiement unique</p>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto mb-10">
        {purchaseMode === "with_subscription" ? (
            <Link to="/devenir-chauffeur" className="block">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                <Star className="w-5 h-5 mr-2" />
                S'inscrire et commander - {PLATES[selectedPlate].promoPrice.toFixed(2)}€
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          ) : (
            <Card className="p-6 bg-white/5 border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Commander ma plaque - {PLATES[selectedPlate].price.toFixed(2)}€
              </h3>
              
              <form onSubmit={handleOrder} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Email *</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="votre@email.com"
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Téléphone</Label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="06 00 00 00 00"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Prénom *</Label>
                    <Input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Jean"
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Nom *</Label>
                    <Input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Dupont"
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Adresse de livraison
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Adresse *</Label>
                      <Input
                        type="text"
                        name="shipping_address"
                        value={formData.shipping_address}
                        onChange={handleChange}
                        placeholder="123 rue de la République"
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Code postal *</Label>
                        <Input
                          type="text"
                          name="shipping_postal_code"
                          value={formData.shipping_postal_code}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                            setFormData(prev => ({ ...prev, shipping_postal_code: value }));
                          }}
                          placeholder="75001"
                          maxLength={5}
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Ville *</Label>
                        <Input
                          type="text"
                          name="shipping_city"
                          value={formData.shipping_city}
                          onChange={handleChange}
                          placeholder="Paris"
                          className="bg-white/10 border-white/20 text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      Commander - {PLATES[selectedPlate].price.toFixed(2)}€
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                  <Shield className="w-3 h-3" />
                  Paiement sécurisé par Stripe
                </p>
              </form>
            </Card>
          )}
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mb-10">
          <h3 className="text-lg font-bold text-white text-center mb-6">
            Inclus avec chaque plaque
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-gray-300">Compatible tous smartphones</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <QrCode className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-gray-300">QR code + NFC</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm text-gray-300">Scan instantané</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10 text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-sm text-gray-300">Livraison 5-7 jours</p>
            </Card>
          </div>
        </div>

        {/* Track Order Link */}
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-4 bg-white/5 border-white/10 inline-flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-500" />
            <span className="text-gray-300">Vous avez déjà commandé ?</span>
            <Link to="/suivi-plaque-nfc">
              <Button variant="link" className="text-primary p-0 h-auto">
                Suivre ma commande →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NfcPlatePage;
