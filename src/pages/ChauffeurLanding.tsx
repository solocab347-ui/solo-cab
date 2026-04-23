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
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import SocialLinks from "@/components/SocialLinks";

const ChauffeurLanding = () => {

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Header compact - iOS safe area support */}
      <header 
        className="border-b border-border/20 sticky top-0 bg-black/95 backdrop-blur-sm z-50"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="SoloCab" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SocialLinks variant="compact" iconSize={16} className="hidden sm:flex" />
            <Link to="/login">
              <Button variant="ghost" className="text-foreground hover:bg-muted/30 text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - ACTION FIRST */}
      <section className="py-6 sm:py-10 md:py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Badge offre */}
          <div className="text-center mb-4 sm:mb-6">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-primary-foreground border-0 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              GRATUIT — Inscrivez-vous maintenant
            </Badge>
          </div>

          {/* Titre principal */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-3 sm:mb-4 text-foreground leading-tight">
            Gardez{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              100%
            </span>{" "}
            de vos revenus
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-muted-foreground text-center mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            0% de frais de transaction. Accès gratuit. Vos clients vous appartiennent.
          </p>

          {/* CTA Principal */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
            <Link to="/register-driver-promo" className="w-full sm:w-auto px-2 sm:px-0">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-primary-foreground text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 shadow-2xl shadow-blue-500/30">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                S'inscrire gratuitement
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Inscription gratuite • Aucun paiement requis
            </p>
          </div>

          {/* 3 avantages clés */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-10 px-1">
            <Card className="p-3 sm:p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-400 mb-0.5 sm:mb-1">0%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Frais</div>
            </Card>
            <Card className="p-3 sm:p-5 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-400 mb-0.5 sm:mb-1">100%</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Vos clients</div>
            </Card>
            <Card className="p-3 sm:p-5 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-400 mb-0.5 sm:mb-1">30s</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Inscription</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Ce qui est inclus - Section concise */}
      <section className="py-8 sm:py-10 px-3 sm:px-4 bg-storefront">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 text-foreground">
            Tout ce dont vous avez besoin
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            {[
              { icon: QrCode, label: "QR Code personnel", color: "text-purple-400" },
              { icon: Users, label: "Base clients privée", color: "text-blue-400" },
              { icon: CreditCard, label: "Facturation auto", color: "text-emerald-400" },
              { icon: Shield, label: "Données sécurisées", color: "text-orange-400" },
            ].map((item, index) => (
              <Card key={index} className="p-3 sm:p-4 bg-muted/30 border-border text-center">
                <item.icon className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2 ${item.color}`} />
                <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
              </Card>
            ))}
          </div>

          {/* Liste d'avantages */}
          <Card className="p-4 sm:p-6 bg-muted/30 border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {[
                "Gestion des courses simplifiée",
                "Calcul d'itinéraires intégré",
                "Messagerie avec vos clients",
                "Statistiques détaillées",
                "Promotions et fidélité",
                "Support dédié 7j/7",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Pourquoi SoloCab */}
      <section className="py-10 sm:py-14 px-3 sm:px-4 bg-storefront-light">
        <div className="container mx-auto max-w-2xl">
          <Card className="p-6 sm:p-10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-500 text-primary-foreground text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-bl-lg">
              GRATUIT
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              <span className="text-green-400">Accès gratuit</span>
            </h3>
            <p className="text-lg sm:text-2xl text-foreground mb-4">pour tous les chauffeurs VTC</p>
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 mb-5">
              <p className="text-green-400 font-medium text-sm sm:text-base">
                🎉 Aucune carte bancaire requise
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                Créez votre compte et commencez immédiatement
              </p>
            </div>

            <Link to="/register-driver-promo" className="block">
              <Button size="lg" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-primary-foreground text-base sm:text-lg py-6 sm:py-7">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                S'inscrire gratuitement
              </Button>
            </Link>

            <div className="mt-5 sm:mt-8 space-y-2 sm:space-y-3 text-left">
              <p className="text-sm sm:text-base flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                0% de frais de transaction sur toutes vos courses
              </p>
              <p className="text-sm sm:text-base flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                Accès à toutes les fonctionnalités de base
              </p>
              <p className="text-sm sm:text-base flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
                Gestion clients, courses, facturation incluse
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Comparaison détaillée Uber/Bolt vs SoloCab */}
      <section className="py-8 sm:py-12 px-3 sm:px-4 bg-storefront">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2 sm:mb-4 text-foreground">
            Comparez et économisez
          </h2>
          <p className="text-muted-foreground text-center mb-6 sm:mb-10 text-sm sm:text-base max-w-2xl mx-auto">
            Avec un chiffre d'affaires de 5 000€/mois, voici ce que vous gardez réellement
          </p>

          {/* Tableau comparatif */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Uber */}
            <Card className="p-4 sm:p-6 bg-red-500/10 border-red-500/30">
              <div className="text-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Uber</h3>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                  Frais de transaction 25%
                </Badge>
              </div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA mensuel</span>
                  <span className="text-foreground font-medium">5 000€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de transaction</span>
                  <span className="text-red-400 font-medium">-1 250€</span>
                </div>
                <div className="border-t border-border pt-2 sm:pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Vous gardez</span>
                    <span className="text-foreground font-bold text-base sm:text-lg">3 750€</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span>Clients appartiennent à Uber</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span>Tarifs imposés</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                  <span>Compte désactivable</span>
                </div>
              </div>
            </Card>

            {/* Bolt */}
            <Card className="p-4 sm:p-6 bg-orange-500/10 border-orange-500/30">
              <div className="text-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Bolt</h3>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-xs">
                  Frais de transaction 20%
                </Badge>
              </div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA mensuel</span>
                  <span className="text-foreground font-medium">5 000€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de transaction</span>
                  <span className="text-orange-400 font-medium">-1 000€</span>
                </div>
                <div className="border-t border-border pt-2 sm:pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Vous gardez</span>
                    <span className="text-foreground font-bold text-base sm:text-lg">4 000€</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                  <span>Clients appartiennent à Bolt</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                  <span>Dépendance à la plateforme</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                  <span>Pas de fidélisation possible</span>
                </div>
              </div>
            </Card>

            {/* SoloCab */}
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/50 relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-primary-foreground text-xs px-2 sm:px-3">
                  ⭐ Recommandé
                </Badge>
              </div>
              <div className="text-center mb-4 pt-2">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">SoloCab</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                  0% frais de transaction
                </Badge>
              </div>
              <div className="space-y-2 sm:space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA mensuel</span>
                  <span className="text-foreground font-medium">5 000€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de transaction</span>
                  <span className="text-green-400 font-medium">0€</span>
                </div>
                <div className="border-t border-border pt-2 sm:pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Vous gardez</span>
                    <span className="text-green-400 font-bold text-base sm:text-lg">5 000€</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span>Vos clients vous appartiennent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span>Vous fixez vos tarifs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  <span>Indépendance totale</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Économie annuelle */}
          <Card className="p-4 sm:p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-center">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-400 mb-2">
              💰 Économie annuelle : {(1250 * 12).toLocaleString()}€
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Par rapport à Uber (25% de frais de transaction) sur un CA de 5 000€/mois
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-10 sm:py-12 px-3 sm:px-4 bg-gradient-to-b from-storefront-light to-storefront-dark">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-foreground">
            Prêt à reprendre le contrôle ?
          </h2>
          <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base px-2">
            Rejoignez les chauffeurs indépendants qui ont fait le choix de la liberté.
          </p>
          
          <Link to="/register-driver-promo" className="inline-block w-full sm:w-auto px-2 sm:px-0">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-primary-foreground text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 shadow-2xl shadow-blue-500/30">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              S'inscrire gratuitement
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            Gratuit • Sans carte bancaire • Sans engagement
          </p>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-4 sm:py-6 px-3 sm:px-4 border-t border-border bg-storefront-dark">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="text-foreground font-semibold text-sm sm:text-base">SoloCab</span>
          </Link>
          <SocialLinks variant="compact" iconSize={16} />
          <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChauffeurLanding;