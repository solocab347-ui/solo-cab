import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-solocab.png";
import SocialLinks from "@/components/SocialLinks";
import { ClientHeroSection } from "@/components/landing/ClientHeroSection";
import { DriverHeroSection } from "@/components/landing/DriverHeroSection";
import { NfcHeroSection } from "@/components/landing/NfcHeroSection";
import PricingSection from "@/components/landing/PricingSection";
import {
  Car,
  Users,
  ArrowRight,
  Search,
  Zap,
  Heart,
  Handshake,
  Star,
  Shield,
  DollarSign,
  CreditCard,
} from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"clients" | "drivers" | "nfc">("clients");

  useEffect(() => {
    // Redirect authenticated users to their dashboard - only after loading is complete
    if (!loading && user && userRole) {
      const dashboardRoutes: Record<string, string> = {
        driver: "/driver-dashboard",
        client: "/client-dashboard",
        admin: "/admin-dashboard",
      };
      
      const route = dashboardRoutes[userRole];
      if (route) {
        navigate(route, { replace: true });
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show minimal loading state during auth check to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942]">
      {/* Navigation with black background */}
      <header className="border-b border-white/10 bg-black backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/chauffeurs" className="text-gray-400 hover:text-white transition-colors">
              {t('landing.findDriver')}
            </Link>
            <Link to="/devenir-chauffeur" className="text-gray-400 hover:text-white transition-colors">
              {t('landing.becomeDriver')}
            </Link>
            <Link to="/plaque-nfc" className="text-gray-400 hover:text-white transition-colors">
              Plaque NFC
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <SocialLinks variant="compact" iconSize={20} />
            <Link to="/login">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg">
                {t('landing.connect')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Values Banner - Prominent section */}
      <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-b border-amber-500/20">
        <div className="container mx-auto px-4 py-4">
          <Link to="/nos-valeurs" className="flex items-center justify-center gap-3 group">
            <div className="flex items-center gap-2 text-amber-400">
              <Heart className="w-5 h-5 fill-amber-400" />
              <span className="font-bold text-lg">Nos Valeurs</span>
            </div>
            <span className="text-gray-300 hidden sm:inline">
              L'humain avant le profit • Technologie au service de l'humain • Relations saines
            </span>
            <div className="flex items-center gap-1 text-amber-400 group-hover:text-amber-300 transition-colors">
              <span className="text-sm font-medium">Découvrir</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-[#0a1628] to-[#0f1e35]">
        <div className="container mx-auto px-4">
          {/* Toggle Buttons - 3 options aligned */}
          <div className="flex justify-center mb-12">
            <div className="flex flex-wrap justify-center gap-2 rounded-lg bg-white/5 p-2 backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setActiveView("clients")}
                className={cn(
                  "px-4 sm:px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center gap-2",
                  activeView === "clients"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="hidden sm:inline">{t('landing.forClients')}</span>
                <span className="sm:hidden">Clients</span>
              </button>
              <button
                onClick={() => setActiveView("drivers")}
                className={cn(
                  "px-4 sm:px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center gap-2",
                  activeView === "drivers"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Car className="w-5 h-5" />
                <span className="hidden sm:inline">{t('landing.forDrivers')}</span>
                <span className="sm:hidden">Chauffeurs</span>
              </button>
              <button
                onClick={() => setActiveView("nfc")}
                className={cn(
                  "px-4 sm:px-6 py-3 rounded-md font-medium transition-all duration-300 flex items-center gap-2",
                  activeView === "nfc"
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <CreditCard className="w-5 h-5" />
                <span className="hidden sm:inline">Plaque NFC</span>
                <span className="sm:hidden">NFC</span>
              </button>
            </div>
          </div>

          {/* Clients View */}
          {activeView === "clients" && <ClientHeroSection />}

          {/* Drivers View */}
          {activeView === "drivers" && <DriverHeroSection />}

          {/* NFC View */}
          {activeView === "nfc" && <NfcHeroSection />}
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-20 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
              ✨ Zéro commission • Contrôle total
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-white">
              La plateforme pour les
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">chauffeurs indépendants</span>
              <br />
              et les <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">clients engagés</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Une communauté où les <span className="text-purple-400 font-semibold">chauffeurs VTC reprennent leur indépendance</span> et où les <span className="text-green-400 font-semibold">clients trouvent des professionnels de confiance</span>. Sans intermédiaire, sans commission.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center hover:shadow-elegant transition-all bg-white/5 backdrop-blur-sm border-white/10">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                  Populaire
                </Badge>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Trouver un Chauffeur</h3>
              <p className="text-gray-400 mb-6">
                Des chauffeurs professionnels à votre service
              </p>
              <Link to="/chauffeurs">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
                  Rechercher
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>

            <Card className="p-8 text-center hover:shadow-elegant transition-all bg-white/5 backdrop-blur-sm border-white/10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Je suis Chauffeur</h3>
              <p className="text-gray-400 mb-6">
                Rejoignez la communauté des chauffeurs indépendants
              </p>
              <Link to="/devenir-chauffeur">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                  Commencer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>

            <Card className="p-8 text-center hover:shadow-elegant transition-all bg-white/5 backdrop-blur-sm border-white/10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6">
                <ArrowRight className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Se Connecter</h3>
              <p className="text-gray-400 mb-6">
                Accédez à votre espace personnel
              </p>
              <Link to="/login">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  Connexion
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Driver Partnership Feature */}
      <section className="py-16 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border-indigo-500/20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Handshake className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Partage de courses entre chauffeurs</h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Créez des partenariats avec d'autres chauffeurs indépendants. Partagez vos courses quand vous n'êtes pas disponible et recevez des courses de vos partenaires.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Shield className="w-4 h-4 text-green-500" />
                  Partenariats de confiance
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Commission négociable
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Star className="w-4 h-4 text-amber-500" />
                  Développez votre réseau
                </div>
              </div>
              <Link to="/devenir-chauffeur">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                  En savoir plus
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Rejoignez une communauté de chauffeurs indépendants qui reprennent le contrôle de leur activité
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/chauffeurs">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                <Search className="w-5 h-5 mr-2" />
                Trouver un Chauffeur
              </Button>
            </Link>
            <Link to="/devenir-chauffeur">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Zap className="w-5 h-5 mr-2" />
                Devenir Chauffeur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-white">SoloCab</span>
              </div>
              <p className="text-sm text-gray-400">
                La plateforme pour les chauffeurs indépendants et les clients engagés
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Chauffeurs</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/devenir-chauffeur" className="hover:text-white transition-colors">
                    Devenir chauffeur
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Clients</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/chauffeurs" className="hover:text-white transition-colors">
                    Trouver un chauffeur
                  </Link>
                </li>
                <li>
                  <Link to="/register-client" className="hover:text-white transition-colors">
                    Créer un compte
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/mentions-legales" className="hover:text-white transition-colors">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="hover:text-white transition-colors">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link to="/cgv" className="hover:text-white transition-colors">
                    CGV
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2024 SoloCab. Tous droits réservés.
            </p>
            <SocialLinks variant="compact" iconSize={18} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
