import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Car, Shield, Star, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

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
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
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
            <Link to="#services" className="text-muted-foreground hover:text-foreground transition-colors">
              Services
            </Link>
            <Link to="/chauffeurs" className="text-muted-foreground hover:text-foreground transition-colors">
              Chauffeurs
            </Link>
            <Link to="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">
              Avantages
            </Link>
            <Link to="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-gradient-premium hover:opacity-90 transition-opacity">
                Commencer
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              <Star className="w-4 h-4 text-premium" />
              Plateforme VTC Premium
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Votre chauffeur privé,{" "}
            <span className="bg-gradient-premium bg-clip-text text-transparent">
              en toute exclusivité
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connectez-vous avec des chauffeurs professionnels pour un service de transport
            personnalisé et exclusif. Simple, sécurisé, élégant.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-premium hover:opacity-90 transition-opacity text-lg px-8">
                Réserver une course
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Devenir chauffeur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="container mx-auto px-4 py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Une expérience sans égale
            </h2>
            <p className="text-muted-foreground text-lg">
              Des fonctionnalités pensées pour votre confort et votre sécurité
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-elegant transition-all duration-300 border-border">
              <div className="w-12 h-12 bg-gradient-trust rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-trust-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurité garantie</h3>
              <p className="text-muted-foreground">
                Chauffeurs vérifiés et validés. Vos trajets sont assurés et sécurisés.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-elegant transition-all duration-300 border-border">
              <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-premium-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Service exclusif</h3>
              <p className="text-muted-foreground">
                Accès via QR code à votre chauffeur dédié. Relation unique et personnalisée.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-elegant transition-all duration-300 border-border">
              <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestion simplifiée</h3>
              <p className="text-muted-foreground">
                Réservation, devis et paiement en ligne. Dashboard complet pour tous.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pourquoi choisir{" "}
                <span className="bg-gradient-premium bg-clip-text text-transparent">
                  SoloCab
                </span>
                ?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-premium mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Inscription rapide via QR code</h4>
                    <p className="text-muted-foreground">
                      Scannez le code de votre chauffeur et accédez instantanément à ses services
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-premium mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Devis automatiques transparents</h4>
                    <p className="text-muted-foreground">
                      Calculez vos trajets en temps réel et recevez votre devis instantanément
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-premium mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Paiement sécurisé intégré</h4>
                    <p className="text-muted-foreground">
                      Stripe garantit la sécurité de vos transactions et vos factures automatiques
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-premium mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Tableaux de bord personnalisés</h4>
                    <p className="text-muted-foreground">
                      Interface dédiée pour chauffeurs, clients et administrateurs
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-dark rounded-2xl p-8 text-primary-foreground shadow-elegant">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-80">Clients satisfaits</span>
                  <span className="text-2xl font-bold">1,500+</span>
                </div>
                <div className="h-px bg-primary-foreground/20"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-80">Chauffeurs actifs</span>
                  <span className="text-2xl font-bold">250+</span>
                </div>
                <div className="h-px bg-primary-foreground/20"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-80">Note moyenne</span>
                  <span className="text-2xl font-bold flex items-center gap-1">
                    4.9
                    <Star className="w-5 h-5 text-premium fill-premium" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-premium rounded-2xl p-12 text-center shadow-premium">
          <h2 className="text-3xl md:text-4xl font-bold text-premium-foreground mb-4">
            Prêt à démarrer votre aventure ?
          </h2>
          <p className="text-premium-foreground/80 text-lg mb-8">
            Rejoignez des centaines de chauffeurs et clients qui font confiance à SoloCab
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Créer un compte
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-premium rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold bg-gradient-dark bg-clip-text text-transparent">
                SoloCab
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SoloCab. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
