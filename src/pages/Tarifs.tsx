import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Check,
  Star,
  Calendar,
  Shield,
  CreditCard,
  Car,
  Users,
  QrCode,
  BarChart3,
  FileText,
  Smartphone,
  ArrowRight,
  Zap,
  Award,
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";
import SocialLinks from "@/components/SocialLinks";

const Tarifs = () => {
  // Prix des abonnements chauffeurs
  const monthlyPrice = 29.99;
  const annualPrice = 305.90;
  const annualMonthlyEquiv = (annualPrice / 12).toFixed(2);
  const savings = (monthlyPrice * 12 - annualPrice).toFixed(2);

  // Prix des plaques NFC
  const nfcPlates = [
    {
      name: "Plaque Plastique Grand Format",
      price: 29.99,
      description: "Format carré, robuste et professionnel",
      features: ["12cm x 12cm", "Plastique résistant", "Fixation adhésive 3M", "Personnalisée avec votre QR code"],
    },
    {
      name: "Plaque Bois Petit Format",
      price: 14.99,
      description: "Format ovale, élégant et écologique",
      features: ["8cm x 5cm", "Bois naturel gravé", "Finition premium", "Parfait pour le tableau de bord"],
    },
  ];

  const subscriptionFeatures = [
    { icon: Car, label: "Gestion illimitée de courses" },
    { icon: Users, label: "Fichier clients illimité" },
    { icon: QrCode, label: "QR Code personnel" },
    { icon: FileText, label: "Devis et factures automatiques" },
    { icon: BarChart3, label: "Statistiques détaillées" },
    { icon: Shield, label: "Profil public sur la vitrine" },
    { icon: Smartphone, label: "Application mobile" },
    { icon: Zap, label: "Support 7j/7" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Navigation */}
      <header className="border-b border-border bg-storefront-dark backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/chauffeurs" className="text-muted-foreground hover:text-foreground transition-colors">
              Trouver un chauffeur
            </Link>
            <Link to="/devenir-chauffeur" className="text-muted-foreground hover:text-foreground transition-colors">
              Devenir chauffeur
            </Link>
            <Link to="/plaque-nfc" className="text-muted-foreground hover:text-foreground transition-colors">
              Plaque NFC
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <SocialLinks variant="compact" iconSize={20} />
            <Link to="/login">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-primary-foreground shadow-lg">
                Se Connecter
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4">
          <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-primary-foreground border-0">
            💰 Tarification transparente
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
            Tous nos <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">tarifs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Une tarification simple et transparente. Zéro commission sur vos courses, 
            vous gardez 100% de vos revenus.
          </p>
        </div>
      </section>

      {/* Abonnements Chauffeurs */}
      <section className="py-16 bg-storefront">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <Car className="w-4 h-4 mr-1" />
              Abonnement Chauffeur VTC
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Un prix unique, zéro commission
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Contrairement aux plateformes classiques qui prélèvent 20-25% sur chaque course,
              SoloCab propose un abonnement fixe. Vos revenus restent les vôtres.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* Abonnement Mensuel */}
            <Card className="p-8 bg-white/5 backdrop-blur-sm border-white/10 hover:border-blue-500/50 transition-all">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Calendar className="w-6 h-6 text-blue-400" />
                  <h3 className="text-2xl font-bold text-white">Mensuel</h3>
                </div>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-white">{monthlyPrice}€</span>
                  <span className="text-gray-400">/mois</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  14 jours d'essai gratuit
                </Badge>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Empreinte bancaire uniquement (0€)</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Résiliable à tout moment</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Accès complet immédiat</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Facturation après l'essai</span>
                </div>
              </div>

              <Link to="/devenir-chauffeur">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-12 text-lg">
                  Commencer l'essai gratuit
                </Button>
              </Link>
            </Card>

            {/* Abonnement Annuel */}
            <Card className="p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500/50 transition-all relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1">
                  <Star className="w-4 h-4 mr-1 inline" />
                  Économisez 15%
                </Badge>
              </div>

              <div className="text-center mb-6 pt-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                  <h3 className="text-2xl font-bold text-white">Annuel</h3>
                </div>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-white">{annualPrice}€</span>
                  <span className="text-gray-400">/an</span>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  soit <span className="text-green-400 font-semibold">{annualMonthlyEquiv}€/mois</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  Économisez {savings}€/an
                </Badge>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Tous les avantages du mensuel</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>15% de réduction garantie</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Paiement unique pour l'année</span>
                </div>
                <div className="flex items-center gap-3 text-amber-400">
                  <CreditCard className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Non remboursable une fois payé</span>
                </div>
              </div>

              <Link to="/devenir-chauffeur">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 text-lg">
                  Choisir l'annuel
                </Button>
              </Link>
            </Card>
          </div>

          {/* Features included */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center text-white mb-8">
              ✓ Inclus dans tous les abonnements
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subscriptionFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <feature.icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info relance paiement */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 max-w-2xl mx-auto">
              En cas de problème de paiement, vous recevrez jusqu'à 3 relances avant la suspension de votre compte.
              Vous pourrez toujours accéder à la gestion de votre abonnement pour régulariser votre situation.
            </p>
          </div>
        </div>
      </section>

      {/* Plaques NFC */}
      <section className="py-16 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
              <CreditCard className="w-4 h-4 mr-1" />
              Plaques NFC Professionnelles
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Plaques NFC VTC
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Facilitez l'accès à votre profil pour vos clients avec nos plaques NFC personnalisées.
              Un simple toucher et ils accèdent directement à votre page de réservation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {nfcPlates.map((plate, index) => (
              <Card key={index} className="p-8 bg-white/5 backdrop-blur-sm border-white/10 hover:border-orange-500/50 transition-all">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{plate.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plate.description}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{plate.price.toFixed(2)}€</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {plate.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-300">
                      <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link to="/plaque-nfc">
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                    Commander
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>

          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-orange-500" />
                </div>
                <div className="text-center md:text-left">
                  <h4 className="text-lg font-bold text-white mb-2">Offre spéciale inscription</h4>
                  <p className="text-gray-400">
                    Lors de votre inscription comme chauffeur, vous pouvez commander votre plaque NFC 
                    directement dans le processus d'inscription. Elle sera expédiée dès validation 
                    de votre compte.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparatif avec plateformes */}
      <section className="py-16 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Comparez et économisez
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Avec un chiffre d'affaires de 5 000€/mois, voici ce que vous pourriez économiser
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-red-500/10 border-red-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Plateformes classiques</h3>
              <p className="text-gray-400 mb-4">Uber, Bolt, etc. - Commission 20-25%</p>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">CA mensuel</span>
                  <span className="text-white font-semibold">5 000€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Commission (~25%)</span>
                  <span className="text-red-400 font-semibold">-1 250€</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Vous gardez</span>
                    <span className="text-white font-bold text-xl">3 750€</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8 bg-green-500/10 border-green-500/30">
              <h3 className="text-xl font-bold text-white mb-4">Avec SoloCab</h3>
              <p className="text-gray-400 mb-4">Abonnement fixe - 0% commission</p>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">CA mensuel</span>
                  <span className="text-white font-semibold">5 000€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Abonnement</span>
                  <span className="text-green-400 font-semibold">-{monthlyPrice}€</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Vous gardez</span>
                    <span className="text-green-400 font-bold text-xl">{(5000 - monthlyPrice).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <Card className="inline-block p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
              <p className="text-2xl font-bold text-green-400">
                💰 Économie annuelle : {((1250 - monthlyPrice) * 12).toFixed(2)}€
              </p>
              <p className="text-gray-400 mt-2">
                Soit +{(((1250 - monthlyPrice) * 12 / 1250 / 12) * 100).toFixed(0)}% de revenus en plus par rapport aux plateformes
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à reprendre le contrôle ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez les chauffeurs indépendants qui gardent 100% de leurs revenus
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devenir-chauffeur">
              <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <Zap className="w-5 h-5 mr-2" />
                Commencer l'essai gratuit
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                En savoir plus
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2024 SoloCab. Tous droits réservés.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/mentions-legales" className="text-sm text-gray-400 hover:text-white">
                Mentions légales
              </Link>
              <Link to="/cgv" className="text-sm text-gray-400 hover:text-white">
                CGV
              </Link>
              <SocialLinks variant="compact" iconSize={18} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Tarifs;
