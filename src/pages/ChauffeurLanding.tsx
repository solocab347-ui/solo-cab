import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import {
  Check,
  Zap,
  ArrowRight,
  Sparkles,
  QrCode,
  Users,
  CreditCard,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import SocialLinks from "@/components/SocialLinks";

const ChauffeurLanding = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942]">
      {/* Header compact */}
      <header className="border-b border-border/20 sticky top-0 bg-black/90 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <SocialLinks variant="compact" iconSize={18} className="hidden sm:flex" />
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 text-sm px-3 h-9">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - ACTION FIRST */}
      <section className="py-8 sm:py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Badge offre */}
          <div className="text-center mb-6">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-sm px-4 py-1.5">
              <Sparkles className="w-4 h-4 mr-2" />
              1 MOIS GRATUIT - Offre limitée
            </Badge>
          </div>

          {/* Titre principal */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-center mb-4 text-white leading-tight">
            Gardez{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              100%
            </span>{" "}
            de vos revenus
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            0% de commission. 49,99€/mois. Vos clients vous appartiennent.
          </p>

          {/* CTA Principal - VISIBLE IMMÉDIATEMENT */}
          <div className="flex flex-col items-center gap-4 mb-10">
            <Link to="/register-driver-promo" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-10 py-7 shadow-2xl shadow-blue-500/30">
                <Zap className="w-5 h-5 mr-2" />
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500">
              Sans engagement • Résiliable à tout moment
            </p>
          </div>

          {/* 3 avantages clés - Format compact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Card className="p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">0%</div>
              <div className="text-sm text-gray-300">Commission</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">100%</div>
              <div className="text-sm text-gray-300">Vos clients</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-1">30s</div>
              <div className="text-sm text-gray-300">Inscription client</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Ce qui est inclus - Section concise */}
      <section className="py-10 px-4 bg-[#0f1e35]">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">
            Tout ce dont vous avez besoin
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { icon: QrCode, label: "QR Code personnel", color: "purple" },
              { icon: Users, label: "Base clients privée", color: "blue" },
              { icon: CreditCard, label: "Facturation auto", color: "emerald" },
              { icon: Shield, label: "Données sécurisées", color: "orange" },
            ].map((item, index) => (
              <Card key={index} className="p-4 bg-white/5 border-white/10 text-center">
                <item.icon className={`w-8 h-8 mx-auto mb-2 text-${item.color}-400`} />
                <p className="text-sm text-gray-300">{item.label}</p>
              </Card>
            ))}
          </div>

          {/* Liste d'avantages */}
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Gestion des courses simplifiée",
                "Calcul d'itinéraires intégré",
                "Messagerie avec vos clients",
                "Statistiques détaillées",
                "Promotions et fidélité",
                "Support dédié 7j/7",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Tarification claire */}
      <section className="py-10 px-4 bg-[#1a2942]">
        <div className="container mx-auto max-w-2xl">
          <Card className="p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              1 MOIS OFFERT
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Abonnement SoloCab</h3>
            
            <div className="mb-4">
              <span className="text-5xl sm:text-6xl font-bold text-white">49,99€</span>
              <span className="text-gray-400 text-lg">/mois</span>
            </div>

            <p className="text-gray-400 mb-6">
              Premier mois gratuit • Sans engagement
            </p>

            <Link to="/register-driver-promo" className="block">
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg py-6">
                <Zap className="w-5 h-5 mr-2" />
                Démarrer mon essai gratuit
              </Button>
            </Link>

            <div className="mt-6 space-y-2 text-left">
              <p className="text-sm flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                0% de commission sur toutes vos courses
              </p>
              <p className="text-sm flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                Accès à toutes les fonctionnalités
              </p>
              <p className="text-sm flex items-center gap-2 text-gray-300">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                Résiliable depuis votre espace en 1 clic
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Comparaison rapide */}
      <section className="py-10 px-4 bg-[#0f1e35]">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">
            Pourquoi SoloCab ?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 bg-red-500/10 border-red-500/30">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-red-400">✗</span> Plateformes classiques
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• 15% à 25% de commission</li>
                <li>• Clients appartiennent à la plateforme</li>
                <li>• Tarifs imposés</li>
                <li>• Compte désactivable à tout moment</li>
              </ul>
            </Card>

            <Card className="p-5 bg-green-500/10 border-green-500/30">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-green-400">✓</span> SoloCab
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• <span className="text-green-400 font-semibold">0% de commission</span></li>
                <li>• Vos clients vous appartiennent</li>
                <li>• Vous fixez vos tarifs</li>
                <li>• Vous restez maître de votre activité</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 px-4 bg-gradient-to-b from-[#1a2942] to-[#0a1628]">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
            Prêt à reprendre le contrôle ?
          </h2>
          <p className="text-gray-400 mb-6">
            Rejoignez les chauffeurs indépendants qui ont fait le choix de la liberté.
          </p>
          
          <Link to="/register-driver-promo">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-10 py-7 shadow-2xl shadow-blue-500/30">
              <Zap className="w-5 h-5 mr-2" />
              Commencer maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-sm text-gray-500 mt-4">
            1 mois gratuit • Sans carte bancaire • Sans engagement
          </p>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-6 px-4 border-t border-white/10 bg-black">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain" />
            <span className="text-white font-semibold">SoloCab</span>
          </Link>
          <SocialLinks variant="compact" iconSize={18} />
          <div className="flex gap-4 text-sm text-gray-500">
            <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChauffeurLanding;
