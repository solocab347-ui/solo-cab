import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Shield,
  Smartphone,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  Truck,
  QrCode,
  Users,
} from "lucide-react";

export const NfcHeroSection = () => {
  const features = [
    {
      icon: Smartphone,
      title: "Scan instantané",
      description: "Vos clients scannent et accèdent directement à votre profil",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Shield,
      title: "Qualité professionnelle",
      description: "Plaque robuste et résistante aux intempéries",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Zap,
      title: "Configuration facile",
      description: "Liée automatiquement à votre profil SoloCab",
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: Users,
      title: "Plus de clients",
      description: "Facilitez la prise de contact avec un simple scan",
      gradient: "from-purple-500 to-pink-600",
    },
  ];

  const benefits = [
    "Livraison en 5-7 jours ouvrés",
    "Lien QR code inclus",
    "Résistant aux intempéries",
    "Compatible tous smartphones",
  ];

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Primary CTA Section */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20 max-w-4xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
          🏷️ Plaque NFC VTC Professionnelle
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
          Votre <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Plaque NFC</span> professionnelle
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
          Permettez à vos clients de vous contacter en un scan. Une plaque NFC programmée avec le lien vers votre profil SoloCab.
        </p>

        {/* Price Cards - Two options */}
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          {/* Standard option */}
          <Card className="p-5 bg-white/5 border-white/20">
            <p className="text-sm text-gray-400 mb-2">Plaque seule</p>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-3xl font-bold text-white">14,99€</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Liée à votre numéro de téléphone
            </p>
            <Link to="/plaque-nfc">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Commander
              </Button>
            </Link>
          </Card>

          {/* With subscription - Recommended */}
          <Card className="p-5 bg-gradient-to-br from-primary/20 to-orange-500/20 border-primary/40 relative">
            <Badge className="absolute -top-2 right-4 bg-primary text-white text-xs">
              -20%
            </Badge>
            <p className="text-sm text-primary mb-2 font-medium">Avec abonnement SoloCab</p>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-3xl font-bold text-white">11,99€</span>
              <span className="text-sm text-gray-500 line-through">14,99€</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Profil pro + réservations + avis
            </p>
            <Link to="/inscription-chauffeur">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                <Star className="w-4 h-4 mr-2" />
                S'inscrire
              </Button>
            </Link>
          </Card>
        </div>

        {/* Benefits List */}
        <div className="flex flex-wrap justify-center gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="mb-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">Comment ça marche ?</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold mb-3 mx-auto">1</div>
            <h4 className="font-semibold text-white mb-2">Commandez</h4>
            <p className="text-sm text-gray-400">Passez commande en ligne en quelques clics</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold mb-3 mx-auto">2</div>
            <h4 className="font-semibold text-white mb-2">Recevez</h4>
            <p className="text-sm text-gray-400">Livraison en 5-7 jours à votre adresse</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold mb-3 mx-auto">3</div>
            <h4 className="font-semibold text-white mb-2">Installez</h4>
            <p className="text-sm text-gray-400">Placez la plaque sur votre véhicule</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold mb-3 mx-auto">4</div>
            <h4 className="font-semibold text-white mb-2">Scannez</h4>
            <p className="text-sm text-gray-400">Vos clients accèdent à votre profil</p>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
        {features.map((feature, index) => (
          <Card 
            key={index} 
            className="p-6 hover:shadow-elegant transition-all cursor-pointer group bg-white/5 backdrop-blur-sm border-white/10 hover:border-orange-500/50"
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${feature.gradient}`}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base mb-2 text-white group-hover:text-orange-400 transition-colors">{feature.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* Track Order Section */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center p-4 rounded-xl bg-gradient-to-r from-orange-500/5 to-red-600/5 border border-white/5">
        <p className="text-gray-300">
          <Truck className="w-5 h-5 inline mr-2 text-blue-500" />
          Vous avez déjà commandé ?
        </p>
        <Link to="/suivi-plaque-nfc">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Suivre ma commande
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Bottom CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-3">Prêt à booster votre visibilité ?</h3>
        <p className="text-gray-400 mb-6">
          Commandez votre plaque NFC et facilitez le contact avec vos futurs clients. 
          <strong className="text-primary"> -20% avec un abonnement SoloCab !</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/inscription-chauffeur">
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg w-full sm:w-auto">
              <Star className="w-5 h-5 mr-2" />
              S'inscrire chauffeur - Plaque dès 11,99€
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/plaque-nfc">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
              <CreditCard className="w-5 h-5 mr-2" />
              Plaque seule à 14,99€
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
