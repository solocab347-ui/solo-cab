import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Calendar, Shield, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

const PricingSection = () => {
  // Prix calculés
  const monthlyPrice = 29.99;
  const annualPrice = 305.90; // 29.99 * 12 * 0.85 = 305.90€ (15% de réduction)
  const annualMonthlyEquiv = (annualPrice / 12).toFixed(2); // ~25.49€/mois
  const savings = (monthlyPrice * 12 - annualPrice).toFixed(2); // ~17.98€ économisés

  return (
    <section className="py-20 bg-[#0f1e35]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
            💰 Tarification transparente
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
            Un prix unique,
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              zéro commission
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Contrairement aux plateformes classiques qui prélèvent 20-25% sur chaque course,
            SoloCab propose un abonnement fixe. <span className="text-green-400 font-semibold">Vos revenus restent les vôtres.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                <span>Empreinte bancaire uniquement</span>
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
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-center text-white mb-8">
            ✓ Inclus dans tous les abonnements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "Gestion des courses",
              "Suivi des clients",
              "Facturation automatique",
              "QR Code personnel",
              "Calcul d'itinéraires",
              "Statistiques détaillées",
              "Support dédié",
              "Mises à jour gratuites"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
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
  );
};

export default PricingSection;
