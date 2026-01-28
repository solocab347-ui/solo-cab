import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Smartphone,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  Truck,
  Users,
  TreeDeciduous,
  Crown,
} from "lucide-react";
import nfcPlateLarge from "@/assets/nfc-plate-large-clean.png";
import nfcPlateSmall from "@/assets/nfc-plate-small-clean.png";

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
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/20 max-w-5xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
          🏷️ Plaques NFC VTC Professionnelles
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
          Vos <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">Plaques NFC</span> professionnelles
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Permettez à vos clients de vous contacter en un scan. Choisissez votre plaque NFC programmée avec le lien vers votre profil SoloCab.
        </p>

        {/* Two Plates Display */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {/* Premium Plate - Highlighted */}
          <Card className="p-6 bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/40 relative overflow-hidden">
            <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
            
            {/* Plate Image */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <img 
                src={nfcPlateLarge} 
                alt="Plaque NFC Premium" 
                className="w-full h-32 object-contain"
              />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">Plaque Premium</h3>
            <p className="text-sm text-gray-400 mb-4">Plastique noir - Format carré</p>
            
            {/* Prices */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-gray-400">Plaque seule</span>
                <span className="text-xl font-bold text-white">29,99€</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Avec abonnement</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-white">23,99€</span>
                  <span className="text-xs text-gray-500 line-through ml-2">29,99€</span>
                </div>
              </div>
            </div>

            <Link to="/plaque-nfc">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                Commander Premium
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>

          {/* Standard Plate */}
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/30 relative overflow-hidden">
            <Badge className="absolute top-3 right-3 bg-green-500 text-white text-xs">
              <TreeDeciduous className="w-3 h-3 mr-1" />
              Écologique
            </Badge>
            
            {/* Plate Image */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <img 
                src={nfcPlateSmall} 
                alt="Plaque NFC Standard" 
                className="w-full h-32 object-contain"
              />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">Plaque Standard</h3>
            <p className="text-sm text-gray-400 mb-4">Bois naturel - Format ovale</p>
            
            {/* Prices */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm text-gray-400">Plaque seule</span>
                <span className="text-xl font-bold text-white">14,99€</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Avec abonnement</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-white">11,99€</span>
                  <span className="text-xs text-gray-500 line-through ml-2">14,99€</span>
                </div>
              </div>
            </div>

            <Link to="/plaque-nfc">
              <Button variant="outline" className="w-full border-green-500/50 text-white hover:bg-green-500/10">
                Commander Standard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Benefits List */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {benefit}
            </div>
          ))}
        </div>

        {/* Subscription advantage */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 max-w-2xl mx-auto">
          <p className="text-gray-300 text-sm">
            <Star className="w-4 h-4 inline mr-2 text-primary" />
            <strong className="text-primary">-20% avec l'abonnement SoloCab</strong> : 
            Profil professionnel, réservations en ligne, avis clients, CRM et statistiques inclus !
          </p>
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
              S'inscrire chauffeur
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/plaque-nfc">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
              Voir les plaques
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
