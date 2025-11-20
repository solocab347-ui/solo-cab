import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ChauffeurLanding = () => {
  const [revenue, setRevenue] = useState([5000]);

  const calculateCosts = (monthlyRevenue: number) => {
    const uber = { rate: 0.25, monthly: monthlyRevenue * 0.25, annual: monthlyRevenue * 0.25 * 12 };
    const bolt = { rate: 0.23, monthly: monthlyRevenue * 0.23, annual: monthlyRevenue * 0.23 * 12 };
    const heetch = { rate: 0.18, monthly: monthlyRevenue * 0.18, annual: monthlyRevenue * 0.18 * 12 };
    const lecab = { rate: 0.15, monthly: monthlyRevenue * 0.15, annual: monthlyRevenue * 0.15 * 12 };
    const solocab = { monthly: 1, annual: 599.88 };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <Link to="/login">
            <Button className="bg-gradient-premium">
              <Zap className="w-4 h-4 mr-2" />
              Connexion
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge className="mb-6 bg-destructive/10 text-destructive border-destructive/20">
              STOP aux commissions !
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Libérez-vous des{" "}
              <span className="bg-gradient-premium bg-clip-text text-transparent">
                plateformes
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Gardez 100% de vos revenus. Gérez votre activité en toute indépendance.
              Fidélisez VOS clients sans intermédiaire.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-2xl mx-auto">
              <Card className="p-6 bg-gradient-dark text-primary-foreground">
                <div className="text-sm opacity-80 mb-2">Commission</div>
                <div className="text-4xl font-bold">0%</div>
              </Card>
              <Card className="p-6 bg-gradient-premium text-premium-foreground">
                <div className="text-sm opacity-80 mb-2">Vos revenus</div>
                <div className="text-4xl font-bold">100%</div>
              </Card>
              <Card className="p-6 bg-gradient-dark text-primary-foreground">
                <div className="text-sm opacity-80 mb-2">Clients</div>
                <div className="text-4xl font-bold">VOS</div>
              </Card>
            </div>

            <Link to="/login">
              <Button size="lg" className="bg-gradient-premium text-lg px-8 py-6">
                Je reprends le contrôle
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              1€/mois (Test) • Sans commission
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-premium/10 text-premium border-premium/20">
              REPRENEZ VOTRE INDÉPENDANCE
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              SoloCab : Une vraie plateforme de mise en relation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fidélisez vos clients SANS intermédiaire
            </p>
            <p className="text-muted-foreground mt-4 max-w-3xl mx-auto">
              Contrairement aux plateformes actuelles qui imposent leurs règles, leurs tarifs et leurs commissions,
              SoloCab vous redonne le contrôle. Nous sommes simplement un outil de mise en relation entre vous et vos
              clients. VOUS définissez VOS règles, VOS tarifs, VOTRE relation client.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 border-destructive/50">
              <div className="flex items-center gap-2 mb-6">
                <X className="w-6 h-6 text-destructive" />
                <h3 className="text-2xl font-bold">Plateformes classiques</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Imposent leurs tarifs et leurs règles
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Prélèvent 15% à 25% de commission
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Vos clients ne vous appartiennent pas
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Peuvent désactiver votre compte à tout moment
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Vous perdez tout si vous partez
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-gradient-premium text-premium-foreground border-premium">
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-6 h-6" />
                <h3 className="text-2xl font-bold">SoloCab</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>VOUS définissez vos tarifs et vos conditions</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>49,99€/mois tout compris, 0% commission</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>VOS clients vous appartiennent à 100%</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Vous gardez le contrôle total de votre activité</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Exportez votre base quand vous voulez</span>
                </li>
              </ul>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-premium">
                Je reprends mon indépendance maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Sans engagement • Résiliable à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* QR Code Innovation Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-premium/10 text-premium border-premium/20">
              🚀 INNOVATION
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Votre QR Code Personnel
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              L'outil révolutionnaire qui change tout ! Vos clients s'inscrivent en 30 secondes et rejoignent
              automatiquement votre base.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-premium-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Inscription Ultra-Rapide</h3>
                    <p className="text-muted-foreground">
                      Scan + 3 champs = Client inscrit. Fini la saisie manuelle !
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-6 h-6 text-premium-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Lien Automatique</h3>
                    <p className="text-muted-foreground">
                      Le client est directement rattaché à VOUS, aucune manipulation
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center flex-shrink-0">
                    <QrCode className="w-6 h-6 text-premium-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Affichez-le Partout</h3>
                    <p className="text-muted-foreground">
                      Dans votre véhicule, sur vos cartes de visite, par SMS...
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-accent/50 border-accent">
                <p className="text-sm">
                  <strong>💡 Astuce :</strong> Vos clients Uber/Bolt actuels peuvent scanner votre QR et réserver
                  directement avec vous à l'avenir !
                </p>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-dark text-primary-foreground text-center">
              <div className="w-48 h-48 bg-background rounded-lg mx-auto mb-6 flex items-center justify-center">
                <QrCode className="w-32 h-32 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Votre QR Code Unique</h3>
              <p className="opacity-80 mb-4">Généré instantanément à votre inscription</p>
              <Badge className="bg-premium text-premium-foreground">
                Scan → Inscription → Client
              </Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* Communication Tools Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Restez connecté avec VOS clients
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fidélisez et développez votre clientèle avec nos outils de communication
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 hover:shadow-elegant transition-shadow">
              <MessageCircle className="w-12 h-12 text-premium mb-4" />
              <h3 className="text-2xl font-bold mb-3">Messagerie Intégrée</h3>
              <p className="text-muted-foreground">
                Échangez directement avec vos clients sans donner votre numéro personnel. Relation client
                professionnelle et privée.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-elegant transition-shadow">
              <Gift className="w-12 h-12 text-premium mb-4" />
              <h3 className="text-2xl font-bold mb-3">Offres Promotionnelles</h3>
              <p className="text-muted-foreground">
                Envoyez des offres spéciales à vos clients fidèles. Augmentez votre taux de réservation avec des
                promotions ciblées.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-elegant transition-shadow">
              <Users className="w-12 h-12 text-premium mb-4" />
              <h3 className="text-2xl font-bold mb-3">Base Clients Privée</h3>
              <p className="text-muted-foreground">
                Tous vos clients vous appartiennent. Consultez l'historique, les préférences, et personnalisez votre
                service.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Success Keys Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4">Chauffeur VTC indépendant</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Les clés de votre succès</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-premium rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-premium-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Fidélisez</h3>
              <p className="text-muted-foreground">Vos clients</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-premium rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-premium-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gagnez</h3>
              <p className="text-muted-foreground">Du temps</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-premium rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-premium-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Développez</h3>
              <p className="text-muted-foreground">Votre activité</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-premium rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-premium-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Soyez libre</h3>
              <p className="text-muted-foreground">Indépendant</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Les outils de votre indépendance</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tout ce qu'il vous faut pour gérer votre activité sans dépendre de personne
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Contrôle total</h3>
              </div>
              <p className="text-muted-foreground mb-2">VOS tarifs, VOS règles</p>
              <p className="text-sm text-muted-foreground">
                Fixez librement vos prix. Prix de base, tarif au km, tarif à la minute. Vous décidez.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Indépendance</h3>
              </div>
              <p className="text-muted-foreground mb-2">VOTRE base clients</p>
              <p className="text-sm text-muted-foreground">
                Vos clients vous appartiennent. Créez votre clientèle fidèle sans intermédiaire.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Gain de temps</h3>
              </div>
              <p className="text-muted-foreground mb-2">Gestion simplifiée</p>
              <p className="text-sm text-muted-foreground">
                Planning, réservations, confirmations. Tout est centralisé et automatique.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Automatisation</h3>
              </div>
              <p className="text-muted-foreground mb-2">Facturation instantanée</p>
              <p className="text-sm text-muted-foreground">
                Devis et factures générés automatiquement. Professionnalisme garanti.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Fidélisation</h3>
              </div>
              <p className="text-muted-foreground mb-2">Contact direct clients</p>
              <p className="text-sm text-muted-foreground">
                Messagerie intégrée. Relation client privilégiée et personnalisée.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <QrCode className="w-6 h-6 text-premium" />
                <h3 className="text-xl font-bold">Simplicité</h3>
              </div>
              <p className="text-muted-foreground mb-2">Inscription QR Code</p>
              <p className="text-sm text-muted-foreground">
                Vos clients s'inscrivent en 30 secondes avec votre QR code personnel.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Calculez vos économies</h2>
            <p className="text-xl text-muted-foreground">
              Combien économiseriez-vous avec SoloCab ?
            </p>
          </div>

          <Card className="p-8 max-w-5xl mx-auto">
            <div className="mb-12">
              <Label className="text-lg font-semibold mb-4 block">
                Quel est votre chiffre d'affaires mensuel moyen ?
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={revenue}
                  onValueChange={setRevenue}
                  min={1000}
                  max={15000}
                  step={500}
                  className="flex-1"
                />
                <div className="text-3xl font-bold text-premium min-w-[120px]">
                  {revenue[0].toLocaleString()}€
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-muted">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">U</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Uber</h4>
                    <p className="text-xs text-muted-foreground">Commission : 5% à 45%</p>
                    <p className="text-xs text-muted-foreground">(Moyenne : 25%)</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût mensuel</span>
                    <span className="font-semibold">{costs.uber.monthly.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût annuel</span>
                    <span className="font-semibold">{costs.uber.annual.toFixed(2)}€</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-1">Économies annuelles</div>
                  <div className="text-2xl font-bold text-premium">+{costs.uber.savings.toFixed(0)}€</div>
                  <div className="text-xs text-premium">{costs.uber.percentage}%</div>
                </div>
              </Card>

              <Card className="p-6 bg-muted">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">B</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Bolt</h4>
                    <p className="text-xs text-muted-foreground">Commission : 23%</p>
                    <p className="text-xs text-muted-foreground">(Moyenne : 23%)</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût mensuel</span>
                    <span className="font-semibold">{costs.bolt.monthly.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût annuel</span>
                    <span className="font-semibold">{costs.bolt.annual.toFixed(2)}€</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-1">Économies annuelles</div>
                  <div className="text-2xl font-bold text-premium">+{costs.bolt.savings.toFixed(0)}€</div>
                  <div className="text-xs text-premium">{costs.bolt.percentage}%</div>
                </div>
              </Card>

              <Card className="p-6 bg-muted">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">H</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Heetch</h4>
                    <p className="text-xs text-muted-foreground">Commission : 18%</p>
                    <p className="text-xs text-muted-foreground">(Moyenne : 18%)</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût mensuel</span>
                    <span className="font-semibold">{costs.heetch.monthly.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût annuel</span>
                    <span className="font-semibold">{costs.heetch.annual.toFixed(2)}€</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-1">Économies annuelles</div>
                  <div className="text-2xl font-bold text-premium">+{costs.heetch.savings.toFixed(0)}€</div>
                  <div className="text-xs text-premium">{costs.heetch.percentage}%</div>
                </div>
              </Card>

              <Card className="p-6 bg-muted">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">L</span>
                  </div>
                  <div>
                    <h4 className="font-bold">LeCab</h4>
                    <p className="text-xs text-muted-foreground">Commission : 15%</p>
                    <p className="text-xs text-muted-foreground">(Moyenne : 15%)</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût mensuel</span>
                    <span className="font-semibold">{costs.lecab.monthly.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coût annuel</span>
                    <span className="font-semibold">{costs.lecab.annual.toFixed(2)}€</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground mb-1">Économies annuelles</div>
                  <div className="text-2xl font-bold text-premium">+{costs.lecab.savings.toFixed(0)}€</div>
                  <div className="text-xs text-premium">{costs.lecab.percentage}%</div>
                </div>
              </Card>
            </div>

            <Card className="p-8 bg-gradient-premium text-premium-foreground">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Avec SoloCab</h3>
                  <p className="opacity-80">Tarif fixe, sans commission sur vos courses</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="text-sm opacity-80 mb-2">Coût mensuel (Test symbolique)</div>
                  <div className="text-4xl font-bold">{costs.solocab.monthly}€</div>
                </div>
                <div>
                  <div className="text-sm opacity-80 mb-2">Coût annuel</div>
                  <div className="text-4xl font-bold">{costs.solocab.annual}€</div>
                </div>
              </div>
            </Card>

            <div className="text-center mt-8">
              <Link to="/login">
                <Button size="lg" className="bg-gradient-dark">
                  S'inscrire
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Questions Fréquentes</h2>
            <p className="text-xl text-muted-foreground">Tout ce que vous devez savoir</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left">
                Q1. Comment fonctionne l'inscription de mes clients avec le QR code ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Votre QR code unique est généré dès votre inscription. Vos clients le scannent avec leur smartphone,
                remplissent 3 champs (nom, email, mot de passe) et sont automatiquement liés à votre compte. Ils
                peuvent ensuite réserver directement avec vous depuis leur espace client.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q2">
              <AccordionTrigger className="text-left">
                Q2. Et si je n'ai pas encore de clients à moi ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Aucun problème ! Vous pouvez activer votre profil public sur SoloCab. Les clients pourront vous trouver
                dans notre vitrine publique et s'inscrire directement avec vous. C'est une excellente façon de
                construire votre base de clients fidèles tout en gardant 100% de vos revenus.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q3">
              <AccordionTrigger className="text-left">
                Q3. Puis-je garder les plateformes en parallèle pendant la transition ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolument ! C'est même recommandé. Utilisez les plateformes classiques pour acquérir de nouveaux
                clients, puis proposez-leur de scanner votre QR code pour les prochaines courses. Progressivement, vous
                construirez votre base de clients fidèles et pourrez réduire votre dépendance aux plateformes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q4">
              <AccordionTrigger className="text-left">
                Q4. Comment puis-je fixer mes tarifs par rapport aux plateformes ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Vous êtes totalement libre ! Vous pouvez proposer des tarifs légèrement inférieurs aux plateformes (car
                vous n'avez pas de commission à payer) tout en gagnant plus. Par exemple, si une course coûte 30€ sur
                Uber (dont 7,50€ de commission), vous pouvez la facturer 27€ à votre client direct : il économise 3€,
                et vous gagnez 4,50€ de plus !
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q5">
              <AccordionTrigger className="text-left">
                Q5. Est-ce que mes données et celles de mes clients sont sécurisées ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oui, totalement. Toutes les données sont chiffrées et hébergées sur des serveurs sécurisés conformes au
                RGPD. Vos clients vous appartiennent : vous pouvez exporter votre base de données à tout moment. Nous
                ne vendons aucune donnée et ne contactons jamais vos clients directement.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q6">
              <AccordionTrigger className="text-left">
                Q6. Que se passe-t-il si j'annule mon abonnement ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Vous pouvez annuler à tout moment, sans frais. Avant de partir, vous pouvez exporter toutes vos données
                (clients, historique, factures). Vos clients restent vos clients ! Vous gardez leurs coordonnées et
                pouvez continuer à travailler avec eux en dehors de SoloCab.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Les chauffeurs qui ont fait le choix de l'indépendance
            </h2>
            <p className="text-xl text-muted-foreground">Ils ont repris le contrôle et ne regrettent pas</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center">
              <div className="text-5xl font-bold text-premium mb-2">+40%</div>
              <p className="text-lg font-semibold mb-2">de revenus conservés</p>
              <p className="text-sm text-muted-foreground">Sans commission plateforme</p>
            </Card>

            <Card className="p-8 text-center">
              <div className="text-5xl font-bold text-premium mb-2">100%</div>
              <p className="text-lg font-semibold mb-2">vos clients</p>
              <p className="text-sm text-muted-foreground">Base de données privée</p>
            </Card>

            <Card className="p-8 text-center">
              <div className="text-5xl font-bold text-premium mb-2">30s</div>
              <p className="text-lg font-semibold mb-2">inscription client</p>
              <p className="text-sm text-muted-foreground">Via QR Code unique</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-premium text-premium-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Prêt à reprendre le contrôle de votre activité ?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Rejoignez les chauffeurs qui ont repris le contrôle de leur activité. Abonnement test à 1€/mois.
          </p>

          <Link to="/login">
            <Button size="lg" className="bg-premium-foreground text-premium hover:bg-premium-foreground/90 text-lg px-8 py-6">
              S'inscrire maintenant
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm opacity-90">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Activation immédiate</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>1€/mois (Test)</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Support 7j/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto px-4 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2025 SoloCab. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChauffeurLanding;
