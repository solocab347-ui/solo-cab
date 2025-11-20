import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Car,
  Users,
  QrCode,
  Euro,
  BarChart3,
  Star,
  MessageSquare,
  Calendar,
  FileText,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Search,
} from "lucide-react";

const Index = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (user && userRole) {
      if (userRole === "driver") {
        navigate("/driver-dashboard");
      } else if (userRole === "client") {
        navigate("/client-dashboard");
      } else if (userRole === "admin") {
        navigate("/admin-dashboard");
      }
    }
  }, [user, userRole, navigate]);

  const driverFeatures = [
    {
      icon: Users,
      title: "Profil Public Automatique",
      description: "Votre profil professionnel est visible par tous les clients potentiels",
    },
    {
      icon: Shield,
      title: "Vos Clients Privés",
      description: "Construisez votre propre base de clients fidèles sans intermédiaire",
    },
    {
      icon: QrCode,
      title: "QR Code Personnel",
      description: "Vos clients scannent votre code et s'inscrivent en 30 secondes",
    },
    {
      icon: Euro,
      title: "0% de Commission",
      description: "Gardez 100% de vos revenus. Plus de commissions aux plateformes",
    },
    {
      icon: Calendar,
      title: "Gestion Complète",
      description: "Planning, devis, factures, messages : tout au même endroit",
    },
    {
      icon: BarChart3,
      title: "Statistiques & Objectifs",
      description: "Suivez votre activité en temps réel et pilotez votre business",
    },
    {
      icon: Star,
      title: "Système de Notes",
      description: "Collectez des avis clients pour booster votre réputation",
    },
    {
      icon: MessageSquare,
      title: "Campagnes Marketing",
      description: "Envoyez des offres promotionnelles à vos clients par SMS",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/chauffeurs" className="text-foreground/80 hover:text-foreground transition-colors">
              Trouver un chauffeur
            </Link>
            <Link to="/login" className="text-foreground/80 hover:text-foreground transition-colors">
              Devenir chauffeur
            </Link>
          </nav>
          <Link to="/login">
            <Button className="bg-gradient-premium">
              Se Connecter
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 border-premium text-premium">
            La plateforme pour les chauffeurs indépendants
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-dark bg-clip-text text-transparent leading-tight">
            La plateforme pour les<br />
            chauffeurs indépendants<br />
            et les clients engagés
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Une communauté où les chauffeurs VTC reprennent leur indépendance et où les clients trouvent des professionnels de confiance. Sans intermédiaire, sans commission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/chauffeurs">
              <Button size="lg" className="bg-gradient-premium group">
                <Search className="w-5 h-5 mr-2" />
                Trouver un Chauffeur
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="group">
                <Zap className="w-5 h-5 mr-2" />
                Je suis Chauffeur
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Actions */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/chauffeurs">
              <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-premium-foreground" />
                  </div>
                  <div>
                    <Badge className="mb-2 bg-premium/10 text-premium border-premium/20">
                      Populaire
                    </Badge>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-premium transition-colors">
                      Trouver un Chauffeur
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Des chauffeurs professionnels à votre service
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-premium group-hover:gap-2">
                      Rechercher
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/login">
              <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-premium transition-colors">
                      Je suis Chauffeur
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Rejoignez la communauté des chauffeurs indépendants
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-premium group-hover:gap-2">
                      Commencer
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/login">
              <Card className="p-6 hover:shadow-elegant transition-all cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-premium-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1 group-hover:text-premium transition-colors">
                      Se Connecter
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Accédez à votre espace personnel
                    </p>
                    <Button variant="link" className="p-0 h-auto mt-2 text-premium group-hover:gap-2">
                      Connexion
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* For Drivers Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-premium text-premium">
              Pour les Chauffeurs
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Devenez un Chauffeur Indépendant
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Profil automatique, clients privés, zéro commission
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {driverFeatures.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-elegant transition-all">
                <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-premium-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-premium">
                <CheckCircle className="w-5 h-5 mr-2" />
                Rejoindre la communauté
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* For Clients Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-premium text-premium">
              Pour les Clients
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Comment rejoindre SoloCab
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deux façons de vous inscrire avec un chauffeur professionnel
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-gradient-premium">
              <QrCode className="w-12 h-12 text-premium-foreground mb-4" />
              <h3 className="text-2xl font-bold text-premium-foreground mb-3">
                Via QR Code
              </h3>
              <p className="text-premium-foreground/90 mb-6">
                Scannez le code QR de votre chauffeur pour vous inscrire comme client exclusif et accéder à ses services
              </p>
            </Card>

            <Card className="p-8">
              <Search className="w-12 h-12 text-premium mb-4" />
              <h3 className="text-2xl font-bold mb-3">
                Via la vitrine
              </h3>
              <p className="text-muted-foreground mb-6">
                Parcourez les chauffeurs publics et inscrivez-vous directement avec celui de votre choix
              </p>
              <Link to="/chauffeurs">
                <Button className="bg-gradient-premium">
                  Voir les chauffeurs
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-premium">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-premium-foreground mb-6">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-premium-foreground/90 mb-8 max-w-2xl mx-auto">
            Rejoignez une communauté de chauffeurs indépendants qui reprennent le contrôle de leur activité
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/chauffeurs">
              <Button size="lg" className="bg-premium-foreground text-premium hover:bg-premium-foreground/90">
                <Search className="w-5 h-5 mr-2" />
                Trouver un Chauffeur
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-premium-foreground/10 border-premium-foreground/20 text-premium-foreground hover:bg-premium-foreground/20">
                <Zap className="w-5 h-5 mr-2" />
                Devenir Chauffeur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold">SoloCab</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La plateforme pour les chauffeurs indépendants et les clients engagés
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Chauffeurs</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/login" className="hover:text-foreground transition-colors">
                    Devenir chauffeur
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-foreground transition-colors">
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Clients</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/chauffeurs" className="hover:text-foreground transition-colors">
                    Trouver un chauffeur
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    CGU
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SoloCab. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
