import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-solocab.png";
import SocialLinks from "@/components/SocialLinks";
import {
  Car,
  Users,
  ArrowRight,
  Search,
  Zap,
  Heart,
  Shield,
  DollarSign,
  CheckCircle,
  Star,
  UserPlus,
  Wallet,
  Globe,
  Scale,
  HandHeart,
  GraduationCap,
} from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"client" | "chauffeur">("client");

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const clientArguments = [
    { icon: Users, text: "Chauffeurs indépendants professionnels" },
    { icon: DollarSign, text: "Prix transparents" },
    { icon: Shield, text: "Paiement sécurisé" },
    { icon: Heart, text: "Service humain et direct" },
    { icon: Scale, text: "Pas d'algorithme abusif" },
    { icon: Star, text: "Qualité premium" },
    { icon: HandHeart, text: "Chauffeurs justement rémunérés" },
    { icon: Clock, text: "Disponibilité en temps réel" },
  ];

  const clientTrust = [
    "Des chauffeurs indépendants",
    "Une rémunération juste",
    "Une meilleure qualité de service",
    "Une relation plus humaine",
    "Une alternative aux plateformes traditionnelles",
  ];

  const driverArguments = [
    { icon: DollarSign, text: "0 commission sur les courses" },
    { icon: Users, text: "Développez votre clientèle privée" },
    { icon: Wallet, text: "Encaissement direct" },
    { icon: Zap, text: "Plateforme gratuite" },
    { icon: Globe, text: "Indépendance totale" },
    { icon: Scale, text: "Système juste de notation" },
    { icon: Car, text: "Recevez des courses SoloCab" },
    { icon: Shield, text: "Protection et sécurité" },
  ];

  const driverVision = [
    "Respecter les chauffeurs",
    "Garantir un service de qualité",
    "Créer une relation directe",
    "Supprimer les commissions abusives",
    "Construire une plateforme équitable",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Navigation */}
      <header className="border-b border-border bg-storefront-dark backdrop-blur-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/chauffeurs" className="text-muted-foreground hover:text-foreground transition-colors">
              Trouver un chauffeur
            </Link>
            <Link to="/devenir-chauffeur" className="text-muted-foreground hover:text-foreground transition-colors">
              Devenir chauffeur
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <SocialLinks variant="compact" iconSize={18} className="hidden sm:flex" />
            <Link to="/login">
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg text-xs px-3 py-1.5 h-8">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============ TOGGLE CLIENT / CHAUFFEUR ============ */}
      <section className="py-8 md:py-12 bg-gradient-to-b from-storefront-dark to-storefront">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Sélecteur Client / Chauffeur — Design premium avec glow */}
          <div className="flex justify-center mb-10">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              {/* Bouton Client */}
              <button
                onClick={() => setActiveView("client")}
                className="relative group rounded-2xl p-[2px] transition-all duration-500"
              >
                {/* Bordure lumineuse tournante */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-opacity duration-500",
                  activeView === "client" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )}>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-spin-slow" style={{ padding: '2px' }}>
                    <div className="w-full h-full rounded-2xl bg-storefront-dark" />
                  </div>
                </div>
                {/* Halo glow */}
                <div className={cn(
                  "absolute -inset-1 rounded-2xl blur-lg transition-opacity duration-500",
                  activeView === "client" 
                    ? "opacity-40 bg-gradient-to-r from-pink-500 to-purple-600" 
                    : "opacity-0 group-hover:opacity-20 bg-gradient-to-r from-pink-500 to-purple-600"
                )} />
                {/* Contenu */}
                <div className={cn(
                  "relative flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border transition-all duration-300",
                  activeView === "client"
                    ? "bg-gradient-to-br from-pink-500/20 to-purple-600/20 border-pink-500/50 shadow-lg shadow-pink-500/20"
                    : "bg-muted/20 border-border hover:border-pink-500/30"
                )}>
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                    activeView === "client"
                      ? "bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/30"
                      : "bg-muted/40"
                  )}>
                    <Search className={cn("w-7 h-7 transition-colors", activeView === "client" ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <span className={cn(
                    "font-bold text-sm transition-colors",
                    activeView === "client" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    Je cherche un chauffeur
                  </span>
                  {activeView === "client" && (
                    <div className="w-8 h-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 animate-fade-in" />
                  )}
                </div>
              </button>

              {/* Bouton Chauffeur */}
              <button
                onClick={() => setActiveView("chauffeur")}
                className="relative group rounded-2xl p-[2px] transition-all duration-500"
              >
                {/* Bordure lumineuse tournante */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl transition-opacity duration-500",
                  activeView === "chauffeur" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                )}>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 animate-spin-slow" style={{ padding: '2px' }}>
                    <div className="w-full h-full rounded-2xl bg-storefront-dark" />
                  </div>
                </div>
                {/* Halo glow */}
                <div className={cn(
                  "absolute -inset-1 rounded-2xl blur-lg transition-opacity duration-500",
                  activeView === "chauffeur" 
                    ? "opacity-40 bg-gradient-to-r from-blue-500 to-cyan-600" 
                    : "opacity-0 group-hover:opacity-20 bg-gradient-to-r from-blue-500 to-cyan-600"
                )} />
                {/* Contenu */}
                <div className={cn(
                  "relative flex flex-col items-center gap-3 py-6 px-4 rounded-2xl border transition-all duration-300",
                  activeView === "chauffeur"
                    ? "bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20"
                    : "bg-muted/20 border-border hover:border-blue-500/30"
                )}>
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300",
                    activeView === "chauffeur"
                      ? "bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30"
                      : "bg-muted/40"
                  )}>
                    <Car className={cn("w-7 h-7 transition-colors", activeView === "chauffeur" ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <span className={cn(
                    "font-bold text-sm transition-colors",
                    activeView === "chauffeur" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    Je suis chauffeur
                  </span>
                  {activeView === "chauffeur" && (
                    <div className="w-8 h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 animate-fade-in" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* ============ VUE CLIENT ============ */}
          {activeView === "client" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-foreground">
                Réservez un chauffeur professionnel{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  en toute transparence
                </span>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Une plateforme qui respecte les chauffeurs pour garantir un service juste et de qualité.
              </p>

              {/* Arguments client */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto">
                {clientArguments.map((arg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2.5">
                    <arg.icon className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{arg.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Client */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/chauffeurs">
                  <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto text-base px-8">
                    <Search className="w-5 h-5 mr-2" />
                    Réserver un chauffeur
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/comment-ca-marche">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted/50 w-full sm:w-auto">
                    Comment ça fonctionne
                  </Button>
                </Link>
              </div>

              {/* Bloc confiance client */}
              <Card className="p-6 bg-muted/20 border-border max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  SoloCab c'est :
                </h3>
                <div className="space-y-2.5">
                  {clientTrust.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ============ VUE CHAUFFEUR ============ */}
          {activeView === "chauffeur" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-foreground">
                Devenez indépendant{" "}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  avec SoloCab
                </span>
              </h1>

              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Recevez des courses et développez votre propre clientèle.
              </p>

              {/* Arguments chauffeur */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto">
                {driverArguments.map((arg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2.5">
                    <arg.icon className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{arg.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Chauffeur */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/devenir-chauffeur">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg w-full sm:w-auto text-base px-8">
                    <UserPlus className="w-5 h-5 mr-2" />
                    S'inscrire comme chauffeur
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/solocab-academy">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted/50 w-full sm:w-auto">
                    <GraduationCap className="w-5 h-5 mr-2" />
                    Découvrir SoloCab Academy
                  </Button>
                </Link>
              </div>

              {/* Bloc vision SoloCab */}
              <Card className="p-6 bg-muted/20 border-border max-w-2xl mx-auto">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center justify-center gap-2">
                  <Scale className="w-5 h-5 text-blue-500" />
                  SoloCab est conçu pour :
                </h3>
                <div className="space-y-2.5">
                  {driverVision.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ============ FOOTER SIMPLE ============ */}
      <footer className="py-12 border-t border-border bg-storefront-dark">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold text-foreground">SoloCab</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La plateforme équitable pour chauffeurs indépendants et clients exigeants.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-foreground">Client</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/chauffeurs" className="hover:text-foreground transition-colors">Trouver un chauffeur</Link></li>
                <li><Link to="/register-client" className="hover:text-foreground transition-colors">Créer un compte</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-foreground">Chauffeur</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/devenir-chauffeur" className="hover:text-foreground transition-colors">S'inscrire</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Connexion</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-foreground">Ressources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/solocab-academy" className="hover:text-foreground transition-colors">SoloCab Academy</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3 text-foreground">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/cgu" className="hover:text-foreground transition-colors">CGU</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Confidentialité</Link></li>
                <li><Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SoloCab. Tous droits réservés.
            </p>
            <SocialLinks variant="compact" iconSize={18} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
