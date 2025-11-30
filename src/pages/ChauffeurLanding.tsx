import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import logo from "@/assets/logo-solocab.png";
import {
  Car,
  Check,
  X,
  QrCode,
  MessageCircle,
  Gift,
  Users,
  TrendingUp,
  Clock,
  Zap,
  FileText,
  UserPlus,
  Shield,
  Download,
  ArrowRight,
  ChevronDown,
  DollarSign,
  Percent,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SocialLinks from "@/components/SocialLinks";

const ChauffeurLanding = () => {
  const [revenue, setRevenue] = useState([5000]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Check if promo is active (jusqu'au 31 décembre 2025)
  const isPromoActive = () => {
    const now = new Date();
    const endDate = new Date('2025-12-31T23:59:59');
    return now <= endDate;
  };

  const calculateCosts = (monthlyRevenue: number) => {
    const uber = { rate: 0.25, monthly: monthlyRevenue * 0.25, annual: monthlyRevenue * 0.25 * 12 };
    const bolt = { rate: 0.23, monthly: monthlyRevenue * 0.23, annual: monthlyRevenue * 0.23 * 12 };
    const heetch = { rate: 0.18, monthly: monthlyRevenue * 0.18, annual: monthlyRevenue * 0.18 * 12 };
    const lecab = { rate: 0.15, monthly: monthlyRevenue * 0.15, annual: monthlyRevenue * 0.15 * 12 };
    const solocab = { monthly: 49.99, annual: 599.88 };

    return {
      uber: {
        ...uber,
        savings: uber.annual - solocab.annual,
        percentage: ((uber.annual - solocab.annual) / uber.annual * 100).toFixed(1),
      },
      bolt: {
        ...bolt,
        savings: bolt.annual - solocab.annual,
        percentage: ((bolt.annual - solocab.annual) / bolt.annual * 100).toFixed(1),
      },
      heetch: {
        ...heetch,
        savings: heetch.annual - solocab.annual,
        percentage: ((heetch.annual - solocab.annual) / heetch.annual * 100).toFixed(1),
      },
      lecab: {
        ...lecab,
        savings: lecab.annual - solocab.annual,
        percentage: ((lecab.annual - solocab.annual) / lecab.annual * 100).toFixed(1),
      },
      solocab,
    };
  };

  const costs = calculateCosts(revenue[0]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1e35] to-[#1a2942]">
      {/* Header with black background */}
      <header className="border-b border-border/20 sticky top-0 bg-black backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <SocialLinks variant="compact" iconSize={18} className="hidden sm:flex" />
            <Link to="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10 text-sm sm:text-base px-3 sm:px-4 h-9 sm:h-10">
                Connexion
              </Button>
            </Link>
            <Link to="/register-driver-promo">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm sm:text-base px-3 sm:px-4 h-9 sm:h-10">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                S'inscrire
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-[#0a1628] to-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge className="mb-6 bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-sm">
              ⚡ STOP aux commissions !
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
              Libérez-vous des{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                plateformes
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Gardez 100% de vos revenus. Gérez votre activité en toute indépendance.
              Fidélisez VOS clients sans intermédiaire.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12 max-w-3xl mx-auto px-4">
              <Card className="p-6 md:p-8 bg-gradient-to-br from-emerald-500 to-green-600 border-0 rounded-2xl">
                <div className="text-xs md:text-sm text-white/80 mb-2">Commission</div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">0%</div>
                <div className="text-xs md:text-sm text-white/70">Vos revenus</div>
                <div className="text-white/80 text-xs mt-2">100% conservés</div>
              </Card>
              <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-500 to-blue-600 border-0 rounded-2xl">
                <div className="text-xs md:text-sm text-white/80 mb-2">Vos clients</div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">100%</div>
                <div className="text-xs md:text-sm text-white/70">vous appartiennent</div>
                <div className="text-white/80 text-xs mt-2">Base de données privée</div>
              </Card>
              <Card className="p-6 md:p-8 bg-gradient-to-br from-purple-500 to-purple-600 border-0 rounded-2xl">
                <div className="text-xs md:text-sm text-white/80 mb-2">Inscription client</div>
                <div className="text-4xl md:text-5xl font-bold text-white mb-1">30s</div>
                <div className="text-xs md:text-sm text-white/70">via QR code</div>
                <div className="text-white/80 text-xs mt-2">Via QR Code unique</div>
              </Card>
            </div>

            {/* Pricing with promo */}
            {isPromoActive() ? (
              <div className="mb-8">
                <Card className="relative border-premium/30 bg-gradient-to-br from-premium/5 to-background p-6 max-w-2xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-premium opacity-10 blur-xl"></div>
                  <Badge className="mb-3 bg-gradient-premium text-premium-foreground shadow-premium relative z-10">
                    <Sparkles className="w-3 h-3 mr-1" />
                    OFFRE DÉCEMBRE 2025 - Valable tout le mois
                  </Badge>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <span className="text-3xl font-bold text-muted-foreground line-through">49,99€</span>
                      <ArrowRight className="w-6 h-6 text-premium" />
                      <span className="text-5xl font-bold text-premium">9,99€</span>
                    </div>
                    <p className="text-lg text-center mb-2">
                      pour le premier mois, puis <span className="font-semibold">49,99€/mois</span>
                    </p>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Profitez de 40€ de réduction sur votre premier mois d'abonnement
                    </p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span>Abonnement mensuel sans engagement</span>
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span>Résiliable à tout moment depuis votre dashboard</span>
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span>0% de commission sur vos courses</span>
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="mb-8">
                <Card className="p-6 max-w-2xl mx-auto bg-[#1a2332]/50 border-blue-500/30">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white mb-2">49,99€/mois</p>
                    <p className="text-lg text-gray-400 mb-4">Tout compris • 0% de commission</p>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm flex items-center gap-2 justify-center">
                        <Check className="w-4 h-4 text-success" />
                        <span>Abonnement mensuel sans engagement</span>
                      </p>
                      <p className="text-sm flex items-center gap-2 justify-center">
                        <Check className="w-4 h-4 text-success" />
                        <span>Résiliable à tout moment depuis votre dashboard</span>
                      </p>
                      <p className="text-sm flex items-center gap-2 justify-center">
                        <Check className="w-4 h-4 text-success" />
                        <span>Gardez 100% de vos revenus</span>
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <Link to="/register-driver-promo">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-6 shadow-xl">
                Je reprends le contrôle
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              REPRENEZ VOTRE INDÉPENDANCE
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              SoloCab : <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Une vraie plateforme de mise en relation</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
              Fidélisez vos clients <span className="text-cyan-400 font-semibold">SANS intermédiaire</span>
            </p>
            <p className="text-gray-500 mt-4 max-w-3xl mx-auto">
              Contrairement aux plateformes actuelles qui <span className="text-red-400">imposent leurs règles</span>, leurs tarifs et leurs commissions,
              SoloCab vous redonne le contrôle. Nous sommes simplement <span className="text-cyan-400">un outil de mise en relation</span> entre vous et vos
              clients. <span className="text-white font-semibold">VOUS</span> définissez <span className="text-white font-semibold">VOS</span> règles, <span className="text-white font-semibold">VOS</span> tarifs, <span className="text-white font-semibold">VOTRE</span> relation client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto px-4">
            <Card className="p-6 md:p-8 bg-[#1a2332]/50 border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <X className="w-6 h-6 text-red-500" />
                <h3 className="text-2xl font-bold text-white">Plateformes classiques</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-gray-400">
                    • Imposent <span className="text-red-400">leurs tarifs</span> et <span className="text-red-400">leurs règles</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400">
                    • Prélèvent <span className="text-red-400">15% à 25% de commission</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400">
                    • <span className="text-red-400">Vos clients ne vous appartiennent pas</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400">
                    • Peuvent <span className="text-red-400">désactiver votre compte</span> à tout moment
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400">
                    • Vous <span className="text-red-400">perdez tout</span> si vous partez
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="p-6 md:p-8 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-green-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-6 h-6 text-green-400" />
                <h3 className="text-2xl font-bold text-white">✅ SoloCab</h3>
              </div>
              <ul className="space-y-4 text-white">
                <li className="flex items-start gap-3">
                  <span>• <span className="font-semibold">VOUS définissez</span> vos tarifs et vos conditions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>• <span className="font-semibold">49,99€/mois</span> tout compris, <span className="text-green-400 font-semibold">0% commission</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span>• <span className="font-semibold">VOS clients vous appartiennent</span> à 100%</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>• Vous gardez le <span className="font-semibold">contrôle total</span> de votre activité</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>• <span className="font-semibold">Exportez votre base</span> quand vous voulez</span>
                </li>
              </ul>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link to="/register-driver-promo">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl">
                Je reprends mon indépendance maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Sans engagement • Résiliable à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* QR Code Innovation Section */}
      <section className="py-20 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
              🚀 INNOVATION
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Votre <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">QR Code Personnel</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              L'outil révolutionnaire qui change tout ! Vos clients s'inscrivent en <span className="text-purple-400 font-semibold">30 secondes</span> et rejoignent
              automatiquement votre base.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto items-center px-4">
            <div className="space-y-4 md:space-y-6">
              <Card className="p-4 md:p-6 bg-[#0f1e35]/50 border-emerald-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-white">Inscription Ultra-Rapide</h3>
                    <p className="text-sm md:text-base text-gray-400">
                      Scan + 3 champs = Client inscrit. Fini la saisie manuelle !
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-[#0f1e35]/50 border-blue-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-white">Lien Automatique</h3>
                    <p className="text-sm md:text-base text-gray-400">
                      Le client est directement rattaché à VOUS, aucune manipulation
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-[#0f1e35]/50 border-orange-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-white">Affichez-le Partout</h3>
                    <p className="text-sm md:text-base text-gray-400">
                      Dans votre véhicule, sur vos cartes de visite, par SMS...
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 md:p-6 bg-yellow-500/10 border-yellow-500/30 backdrop-blur-sm">
                <p className="text-xs md:text-sm text-gray-300">
                  <strong className="text-yellow-400">💡 Astuce :</strong> Vos clients Uber/Bolt actuels peuvent scanner votre QR et réserver
                  directement avec vous à l'avenir !
                </p>
              </Card>
            </div>

            <Card className="p-6 md:p-8 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-purple-500/30 backdrop-blur-sm text-center">
              <div className="w-32 h-32 md:w-48 md:h-48 bg-white rounded-xl mx-auto mb-4 md:mb-6 flex items-center justify-center">
                <div className="w-28 h-28 md:w-40 md:h-40 border-2 md:border-4 border-purple-500 rounded-lg flex items-center justify-center">
                  <QrCode className="w-20 h-20 md:w-32 md:h-32 text-purple-500" />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">Votre QR Code Unique</h3>
              <p className="text-sm md:text-base text-gray-400 mb-4">Généré instantanément à votre inscription</p>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                Scan → Inscription → Client
              </Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* Communication Tools Section */}
      <section className="py-20 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Restez connecté avec <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">VOS clients</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Fidélisez et développez votre clientèle avec nos outils de communication
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto px-4">
            <Card className="p-6 md:p-8 bg-[#1a2332]/50 border-blue-500/30 backdrop-blur-sm hover:border-blue-500/50 transition-all">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 md:w-8 md:h-8 text-blue-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-white text-center">Messagerie Intégrée</h3>
              <p className="text-sm md:text-base text-gray-400 text-center">
                Échangez directement avec vos clients sans donner votre numéro personnel. Relation client
                professionnelle et privée.
              </p>
            </Card>

            <Card className="p-6 md:p-8 bg-[#1a2332]/50 border-pink-500/30 backdrop-blur-sm hover:border-pink-500/50 transition-all">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-7 h-7 md:w-8 md:h-8 text-pink-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-white text-center">Offres Promotionnelles</h3>
              <p className="text-sm md:text-base text-gray-400 text-center">
                Envoyez des offres spéciales à vos clients fidèles. Augmentez votre taux de réservation avec des
                promotions ciblées.
              </p>
            </Card>

            <Card className="p-6 md:p-8 bg-[#1a2332]/50 border-cyan-500/30 backdrop-blur-sm hover:border-cyan-500/50 transition-all">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white text-center">Base Clients Privée</h3>
              <p className="text-gray-400 text-center">
                Tous vos clients vous appartiennent. Consultez l'historique, les préférences, et personnalisez votre
                service.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Success Keys Section */}
      <section className="py-20 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Chauffeur VTC indépendant</h2>
            <p className="text-xl text-gray-400">Les clés de votre succès</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 text-center bg-[#0f1e35]/50 border-blue-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Fidélisez</h3>
              <p className="text-gray-400">Vos clients</p>
            </Card>

            <Card className="p-6 text-center bg-[#0f1e35]/50 border-emerald-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Gagnez</h3>
              <p className="text-gray-400">Du temps</p>
            </Card>

            <Card className="p-6 text-center bg-[#0f1e35]/50 border-purple-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Développez</h3>
              <p className="text-gray-400">Votre activité</p>
            </Card>

            <Card className="p-6 text-center bg-[#0f1e35]/50 border-orange-500/20 backdrop-blur-sm">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Soyez libre</h3>
              <p className="text-gray-400">Indépendant</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Les outils de votre indépendance
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Tout ce qu'il vous faut pour gérer votre activité sans dépendre de personne
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 bg-[#1a2332]/50 border-blue-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Contrôle total</h3>
              <p className="text-sm text-blue-400 mb-2">VOS tarifs, VOS règles</p>
              <p className="text-gray-400 text-sm">
                Fixez librement vos prix. Prix de base, tarif au km, tarif à la minute. Vous décidez.
              </p>
            </Card>

            <Card className="p-6 bg-[#1a2332]/50 border-purple-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Indépendance</h3>
              <p className="text-sm text-purple-400 mb-2">VOTRE base clients</p>
              <p className="text-gray-400 text-sm">
                Vos clients vous appartiennent. Créez votre clientèle fidèle sans intermédiaire.
              </p>
            </Card>

            <Card className="p-6 bg-[#1a2332]/50 border-emerald-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Gain de temps</h3>
              <p className="text-sm text-emerald-400 mb-2">Gestion simplifiée</p>
              <p className="text-gray-400 text-sm">
                Planning, réservations, confirmations. Tout est centralisé et automatique.
              </p>
            </Card>

            <Card className="p-6 bg-[#1a2332]/50 border-orange-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Automatisation</h3>
              <p className="text-sm text-orange-400 mb-2">Facturation instantanée</p>
              <p className="text-gray-400 text-sm">
                Devis et factures générés automatiquement. Professionnalisme garanti.
              </p>
            </Card>

            <Card className="p-6 bg-[#1a2332]/50 border-pink-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-pink-500/20 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Fidélisation</h3>
              <p className="text-sm text-pink-400 mb-2">Contact direct clients</p>
              <p className="text-gray-400 text-sm">
                Messagerie intégrée. Relation client privilégiée et personnalisée.
              </p>
            </Card>

            <Card className="p-6 bg-[#1a2332]/50 border-indigo-500/20 backdrop-blur-sm">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                <QrCode className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Simplicité</h3>
              <p className="text-sm text-indigo-400 mb-2">Inscription QR Code</p>
              <p className="text-gray-400 text-sm">
                Vos clients s'inscrivent en 30 secondes avec votre QR code personnel.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Savings Calculator Section */}
      <section className="py-20 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Calculez vos économies
            </h2>
            <p className="text-xl text-gray-400">
              Combien économiseriez-vous avec SoloCab ?
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-12">
            <div className="mb-8">
              <Label className="text-white text-lg mb-4 block">
                Quel est votre chiffre d'affaires mensuel moyen ?
              </Label>
              <Slider
                value={revenue}
                onValueChange={setRevenue}
                min={1000}
                max={15000}
                step={100}
                className="mb-4"
              />
              <div className="text-center">
                <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {revenue[0].toLocaleString()}€
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-[#1a2332]/80 border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">U</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Uber</p>
                    <p className="text-xs text-gray-500">Commission : 5% à 45%</p>
                    <p className="text-xs text-gray-500">(Moyenne : 25%)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Coût mensuel</p>
                    <p className="text-2xl font-bold text-red-400">{costs.uber.monthly.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Coût annuel</p>
                    <p className="text-xl font-bold text-white">{costs.uber.annual.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Économies annuelles</p>
                    <p className="text-xl font-bold text-emerald-400">+{costs.uber.savings.toFixed(2)}€</p>
                    <p className="text-xs text-emerald-400">{costs.uber.percentage}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[#1a2332]/80 border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Bolt</p>
                    <p className="text-xs text-gray-500">Commission : 23%</p>
                    <p className="text-xs text-gray-500">(Moyenne : 23%)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Coût mensuel</p>
                    <p className="text-2xl font-bold text-red-400">{costs.bolt.monthly.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Coût annuel</p>
                    <p className="text-xl font-bold text-white">{costs.bolt.annual.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Économies annuelles</p>
                    <p className="text-xl font-bold text-emerald-400">+{costs.bolt.savings.toFixed(2)}€</p>
                    <p className="text-xs text-emerald-400">{costs.bolt.percentage}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[#1a2332]/80 border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Heetch</p>
                    <p className="text-xs text-gray-500">Commission : 18%</p>
                    <p className="text-xs text-gray-500">(Moyenne : 18%)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Coût mensuel</p>
                    <p className="text-2xl font-bold text-red-400">{costs.heetch.monthly.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Coût annuel</p>
                    <p className="text-xl font-bold text-white">{costs.heetch.annual.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Économies annuelles</p>
                    <p className="text-xl font-bold text-emerald-400">+{costs.heetch.savings.toFixed(2)}€</p>
                    <p className="text-xs text-emerald-400">{costs.heetch.percentage}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[#1a2332]/80 border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">L</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">LeCab</p>
                    <p className="text-xs text-gray-500">Commission : 15%</p>
                    <p className="text-xs text-gray-500">(Moyenne : 15%)</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Coût mensuel</p>
                    <p className="text-2xl font-bold text-red-400">{costs.lecab.monthly.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Coût annuel</p>
                    <p className="text-xl font-bold text-white">{costs.lecab.annual.toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Économies annuelles</p>
                    <p className="text-xl font-bold text-emerald-400">+{costs.lecab.savings.toFixed(2)}€</p>
                    <p className="text-xs text-emerald-400">{costs.lecab.percentage}%</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-blue-500/30 text-center">
              <h3 className="text-2xl font-bold mb-4 text-white">Avec SoloCab</h3>
              <p className="text-gray-400 mb-4">
                Tarif fixe, sans commission sur vos courses
              </p>
              <div className="space-y-2 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Coût mensuel</p>
                  <p className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">49,99€</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mt-4">Coût annuel</p>
                  <p className="text-3xl font-bold text-white">{costs.solocab.annual.toFixed(2)}€</p>
                </div>
              </div>
              <Link to="/register-driver-promo">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl">
                  S'inscrire
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f]">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-12 bg-[#0f1e35]/50 border-border/20 backdrop-blur-sm text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Ils ont repris le contrôle et ne regrettent pas
            </h2>

            <div className="grid md:grid-cols-3 gap-6 my-12">
              <Card className="p-8 bg-gradient-to-br from-emerald-500 to-green-600 border-0 rounded-2xl">
                <div className="text-6xl font-bold text-white mb-2">+40%</div>
                <div className="text-lg text-white/90 mb-1">de revenus conservés</div>
                <div className="text-sm text-white/70">Sans commission plateforme</div>
              </Card>
              <Card className="p-8 bg-gradient-to-br from-blue-500 to-blue-600 border-0 rounded-2xl">
                <div className="text-6xl font-bold text-white mb-2">100%</div>
                <div className="text-lg text-white/90 mb-1">vos clients</div>
                <div className="text-sm text-white/70">Base de données privée</div>
              </Card>
              <Card className="p-8 bg-gradient-to-br from-purple-500 to-purple-600 border-0 rounded-2xl">
                <div className="text-6xl font-bold text-white mb-2">30s</div>
                <div className="text-lg text-white/90 mb-1">inscription client</div>
                <div className="text-sm text-white/70">Via QR Code unique</div>
              </Card>
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-bold mb-4 text-white">
                Prêt à reprendre le contrôle de votre activité ?
              </h3>
              <p className="text-gray-400 mb-2">
                Rejoignez les chauffeurs qui ont repris le contrôle de leur activité.
              </p>
              <p className="text-gray-400 mb-6">Abonnement à 49,99€/mois.</p>
              <Link to="/register-driver-promo">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-6 shadow-xl">
                  S'inscrire maintenant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>Activation immédiate</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>49,99€/mois</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span>Support 7j/7</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#0f1e35]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Questions Fréquentes
            </h2>
            <p className="text-xl text-gray-400">
              Tout ce que vous devez savoir
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q1. Comment fonctionne l'inscription de mes clients avec le QR code ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Votre QR code personnel est généré automatiquement lors de votre inscription. Affichez-le dans votre
                  véhicule ou partagez-le par SMS/email. Lorsqu'un client le scanne, il arrive directement sur un
                  formulaire d'inscription pré-rempli avec votre ID. En 30 secondes, le client est inscrit et rattaché
                  automatiquement à votre base privée. Aucune manipulation nécessaire !
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q2. Et si je n'ai pas encore de clients à moi ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  C'est justement l'intérêt de SoloCab ! Vous pouvez continuer à travailler sur Uber/Bolt pendant la
                  transition. À chaque course réussie sur ces plateformes, proposez discrètement à vos clients de
                  scanner votre QR code pour réserver directement avec vous à l'avenir. Petit à petit, vous construisez
                  VOTRE propre base de clients fidèles, sans commission. La transition se fait en douceur !
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q3. Puis-je garder les plateformes en parallèle pendant la transition ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Absolument ! Nous recommandons même de garder vos comptes Uber/Bolt actifs pendant que vous
                  constituez votre clientèle sur SoloCab. Utilisez les plateformes pour trouver de nouveaux clients,
                  puis convertissez-les progressivement vers votre base privée via votre QR code. C'est une stratégie
                  gagnante : vous gardez vos revenus actuels tout en construisant votre indépendance future.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q4. Comment puis-je fixer mes tarifs par rapport aux plateformes ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Sur SoloCab, VOUS définissez librement vos prix : prix de base, tarif au km, tarif à la minute. Notre
                  conseil : proposez des tarifs légèrement plus avantageux que les plateformes (10-15% de moins) pour
                  inciter vos clients à réserver directement avec vous. Même avec cette réduction, vous gagnez plus car
                  vous ne payez aucune commission ! C'est gagnant-gagnant : le client paie moins cher, vous gagnez
                  plus.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q5. Est-ce que mes données et celles de mes clients sont sécurisées ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Oui, la sécurité est notre priorité. Toutes les données sont cryptées et hébergées sur des serveurs
                  sécurisés conformes RGPD. Vos clients vous appartiennent à 100% - leurs données ne sont jamais
                  partagées avec d'autres chauffeurs ou plateformes. Vous pouvez exporter votre base de données
                  complète à tout moment. Contrairement aux plateformes classiques, vous gardez le contrôle total de
                  vos informations.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-[#1a2332]/50 border border-border/20 rounded-lg px-6 backdrop-blur-sm">
                <AccordionTrigger className="text-white hover:text-blue-400">
                  Q6. Que se passe-t-il si j'annule mon abonnement ?
                </AccordionTrigger>
                <AccordionContent className="text-gray-400">
                  Pas de piège ! Vous pouvez résilier à tout moment sans frais cachés. Avant votre départ, vous pouvez
                  exporter l'intégralité de votre base clients (noms, contacts, historique des courses). Vos données
                  vous appartiennent. Nous ne vous retenons pas en otage contrairement aux plateformes classiques.
                  Votre indépendance signifie aussi la liberté de partir quand vous voulez, avec vos clients.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-black border-t border-border/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-500" />
              <span className="text-xl font-bold text-white">SoloCab</span>
            </div>
            <SocialLinks variant="compact" />
            <p className="text-gray-500 text-sm">
              © 2024 SoloCab. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChauffeurLanding;
