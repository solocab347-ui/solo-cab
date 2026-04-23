import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import {
  ArrowRight,
  CheckCircle,
  Heart,
  Shield,
  DollarSign,
  Users,
  Star,
  Scale,
  Search,
  UserPlus,
  Zap,
  Car,
  Globe,
  Wallet,
  HandHeart,
  MessageCircle,
  Clock,
  CreditCard,
} from "lucide-react";

const CommentCaMarche = () => {
  const steps = [
    {
      number: "1",
      title: "Recherchez un chauffeur",
      description: "Entrez votre adresse de départ et votre destination. SoloCab recherche automatiquement les chauffeurs disponibles les plus proches de vous.",
      icon: Search,
      color: "from-pink-500 to-purple-600",
    },
    {
      number: "2",
      title: "Recevez une estimation de prix",
      description: "Avant de confirmer, vous voyez une fourchette de prix transparente basée sur les tarifs réels des chauffeurs. Pas de surprise, pas de surge pricing.",
      icon: DollarSign,
      color: "from-green-500 to-emerald-600",
    },
    {
      number: "3",
      title: "Un chauffeur accepte votre course",
      description: "Votre demande est envoyée aux chauffeurs disponibles. Dès qu'un chauffeur accepte, vous êtes notifié avec ses informations et son heure d'arrivée.",
      icon: Car,
      color: "from-blue-500 to-cyan-600",
    },
    {
      number: "4",
      title: "Suivez votre course en temps réel",
      description: "Suivez l'arrivée de votre chauffeur, le déroulement de la course et partagez votre trajet avec vos proches. Tout est transparent.",
      icon: Globe,
      color: "from-orange-500 to-amber-600",
    },
    {
      number: "5",
      title: "Payez en toute sécurité",
      description: "Le paiement est sécurisé par carte bancaire. Le chauffeur reçoit l'intégralité de sa rémunération directement. Pas d'intermédiaire abusif.",
      icon: CreditCard,
      color: "from-purple-500 to-pink-600",
    },
  ];

  const whySoloCab = [
    {
      icon: Heart,
      title: "Créée par un chauffeur VTC",
      description: "SoloCab est née de l'expérience d'un chauffeur VTC indépendant qui a vécu les injustices des plateformes traditionnelles. Chaque fonctionnalité est pensée pour l'humain.",
    },
    {
      icon: Scale,
      title: "Rémunération juste",
      description: "Les chauffeurs fixent leurs propres tarifs et reçoivent l'intégralité du montant de la course. Pas de frais de transaction abusive, pas d'algorithme opaque.",
    },
    {
      icon: Shield,
      title: "Chauffeurs vérifiés",
      description: "Chaque chauffeur est un professionnel indépendant vérifié : documents, assurances, carte VTC. Votre sécurité est notre priorité.",
    },
    {
      icon: DollarSign,
      title: "Prix transparents",
      description: "Vous connaissez le prix avant de confirmer. Pas de surge pricing, pas de frais cachés. Le prix annoncé est le prix payé.",
    },
    {
      icon: MessageCircle,
      title: "Relation directe",
      description: "Communiquez directement avec votre chauffeur. Pas d'intermédiaire, pas de chatbot. Une relation humaine et professionnelle.",
    },
    {
      icon: Star,
      title: "Notation équitable",
      description: "Notre système de notation utilise l'IA pour garantir des évaluations justes. Les notes abusives sont détectées et arbitrées automatiquement.",
    },
  ];

  const forClients = [
    "Service de qualité premium",
    "Prix connus à l'avance",
    "Paiement sécurisé par carte",
    "Suivi de course en temps réel",
    "Chauffeurs professionnels vérifiés",
    "Pas d'algorithme qui gonfle les prix",
    "Relation humaine et directe",
    "Possibilité de garder son chauffeur favori",
  ];

  const forDrivers = [
    "Zéro frais de transaction sur les courses",
    "Fixez vos propres tarifs",
    "Encaissement direct sur votre compte",
    "Développez votre propre clientèle",
    "Outils de gestion professionnels",
    "Système de notation juste par IA",
    "Indépendance totale garantie",
    "Plateforme gratuite et sans engagement",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Header */}
      <header className="border-b border-border bg-storefront-dark backdrop-blur-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/nos-valeurs">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Heart className="w-4 h-4 mr-1.5" />
                Nos valeurs
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs px-3 h-8">
                Connexion
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <Badge className="mb-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-sm px-4 py-1.5">
            <Zap className="w-4 h-4 mr-2" />
            Simple, juste et transparent
          </Badge>

          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-foreground">
            Comment fonctionne{" "}
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              SoloCab
            </span>{" "}
            ?
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            SoloCab est une plateforme créée par un chauffeur VTC indépendant, pour offrir une alternative juste aux plateformes traditionnelles.
          </p>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            <strong className="text-foreground">Notre mission :</strong> garantir une rémunération juste pour les chauffeurs et un service de qualité pour les clients. Sans commission abusive, sans algorithme opaque.
          </p>
        </div>
      </section>

      {/* Étapes */}
      <section className="py-12 bg-storefront">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Réserver un chauffeur en{" "}
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">5 étapes</span>
          </h2>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0 shadow-lg`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">ÉTAPE {step.number}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi SoloCab */}
      <section className="py-16 bg-storefront-light">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
            Pourquoi choisir{" "}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">SoloCab</span>{" "}
            ?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Une plateforme conçue par et pour les professionnels du transport, avec le respect au cœur de chaque décision.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whySoloCab.map((item, i) => (
              <Card key={i} className="p-5 bg-muted/20 border-border hover:border-primary/30 transition-all">
                <item.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pour les clients / Pour les chauffeurs */}
      <section className="py-16 bg-storefront">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Clients */}
            <Card className="p-6 bg-gradient-to-br from-pink-500/5 to-purple-600/5 border-pink-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Pour les clients</h3>
              </div>
              <div className="space-y-3">
                {forClients.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-pink-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link to="/chauffeurs" className="block mt-6">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
                  <Search className="w-4 h-4 mr-2" />
                  Réserver un chauffeur
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>

            {/* Chauffeurs */}
            <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-cyan-600/5 border-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Pour les chauffeurs</h3>
              </div>
              <div className="space-y-3">
                {forDrivers.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link to="/devenir-chauffeur" className="block mt-6">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  S'inscrire comme chauffeur
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-gradient-to-r from-pink-900/30 to-purple-900/30">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Prêt à essayer ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Rejoignez une communauté qui place l'humain au centre du transport.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/chauffeurs">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto">
                <Search className="w-5 h-5 mr-2" />
                Trouver un chauffeur
              </Button>
            </Link>
            <Link to="/devenir-chauffeur">
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted/50 w-full sm:w-auto">
                <Car className="w-5 h-5 mr-2" />
                Devenir chauffeur
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-8 border-t border-border bg-storefront-dark">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SoloCab. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CommentCaMarche;
