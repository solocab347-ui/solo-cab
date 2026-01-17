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
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";

const NfcPlatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

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
        body: formData,
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
            Plaque NFC VTC{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Coutras
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            La plaque connectée qui transforme vos passagers en clients fidèles. 
            Un simple scan et ils accèdent à votre profil.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Product showcase */}
          <div className="space-y-6">
            <Card className="p-8 bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/30">
              <div className="flex items-center justify-center mb-6">
                <div className="w-48 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-2xl">
                  <div className="text-center text-white">
                    <Wifi className="w-12 h-12 mx-auto mb-2" />
                    <span className="font-bold">NFC COUTRAS</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-5xl font-bold text-white">29,99€</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    TTC
                  </Badge>
                </div>
                <p className="text-gray-400">Paiement unique - Pas d'abonnement</p>
              </div>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="p-4 bg-white/5 border-white/10">
                  <feature.icon className="w-8 h-8 text-orange-500 mb-3" />
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

            {/* Already a driver? */}
            <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-600/10 border-purple-500/30">
              <div className="flex items-start gap-4">
                <Car className="w-10 h-10 text-purple-500 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-white mb-2">Déjà chauffeur SoloCab ?</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Commandez votre plaque depuis votre espace chauffeur et elle sera automatiquement 
                    liée à votre profil public.
                  </p>
                  <Link to="/login">
                    <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                      Se connecter
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
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6 text-lg"
                >
                  Commander maintenant - 29,99€
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
                      <MapPin className="w-5 h-5 text-orange-500" />
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
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-6 text-lg"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Package className="w-5 h-5 mr-2" />
                    )}
                    Payer 29,99€
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
                <Package className="w-5 h-5 text-orange-500" />
                Suivre ma commande
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Vous avez déjà commandé ? Entrez votre numéro de commande ou consultez l'email de confirmation.
              </p>
              <Link to="/track-nfc-order">
                <Button variant="outline" className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
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
