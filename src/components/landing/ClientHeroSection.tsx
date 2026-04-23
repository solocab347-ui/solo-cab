import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import {
  Search,
  DollarSign,
  Shield,
  Heart,
  CalendarCheck,
  MessageCircle,
  Bell,
  CreditCard,
  ArrowRight,
  CheckCircle,
  UserPlus,
  Star,
} from "lucide-react";

export const ClientHeroSection = () => {
  const { t } = useLocale();

  const clientFeatures = [
    {
      icon: Search,
      title: t('landing.client.findRightDriver'),
      description: t('landing.client.findRightDriverDesc'),
      gradient: "from-pink-500 to-purple-600",
    },
    {
      icon: DollarSign,
      title: t('landing.client.transparentPricing'),
      description: t('landing.client.transparentPricingDesc'),
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Shield,
      title: t('landing.client.verifiedDrivers'),
      description: t('landing.client.verifiedDriversDesc'),
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Heart,
      title: t('landing.client.favoriteDriver'),
      description: t('landing.client.favoriteDriverDesc'),
      gradient: "from-red-500 to-pink-600",
    },
    {
      icon: CalendarCheck,
      title: t('landing.client.easyBooking'),
      description: t('landing.client.easyBookingDesc'),
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: MessageCircle,
      title: t('landing.client.directCommunication'),
      description: t('landing.client.directCommunicationDesc'),
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: Bell,
      title: t('landing.client.realTimeNotifications'),
      description: t('landing.client.realTimeNotificationsDesc'),
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: Shield,
      title: "Service 100% gratuit",
      description: "Inscription gratuite, sans engagement et sans frais cachés",
      gradient: "from-purple-500 to-pink-600",
    },
  ];

  const benefits = [
    "Accès gratuit et sans engagement",
    "Aucuns frais de transaction sur vos trajets",
    "Chauffeurs professionnels vérifiés",
    "Réservation simple et rapide",
  ];

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Primary CTA Section at Top */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-pink-500/20 max-w-4xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0">
          🚗 Client particulier ou professionnel
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-foreground">
          {t('landing.client.heroTitle').split(' ').slice(0, 2).join(' ')} <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">{t('landing.client.heroTitle').split(' ').slice(2).join(' ')}</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
          {t('landing.client.heroSubtitle')}
        </p>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link to="/chauffeurs">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto">
              <Search className="w-5 h-5 mr-2" />
              Rechercher un chauffeur
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/register-client">
            <Button size="lg" variant="outline" className="border-pink-500 text-pink-500 hover:bg-pink-500/10 w-full sm:w-auto">
              <UserPlus className="w-5 h-5 mr-2" />
              Créer un compte gratuit
            </Button>
          </Link>
        </div>

        {/* Benefits List */}
        <div className="flex flex-wrap justify-center gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="mb-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-foreground mb-6">Comment ça marche ?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-muted/30 border-border">
            <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold mb-3 mx-auto">1</div>
            <h4 className="font-semibold text-foreground mb-2">Recherchez</h4>
            <p className="text-sm text-muted-foreground">Trouvez un chauffeur proche de vous avec notre moteur de recherche</p>
          </Card>
          <Card className="p-4 bg-muted/30 border-border">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold mb-3 mx-auto">2</div>
            <h4 className="font-semibold text-foreground mb-2">Réservez</h4>
            <p className="text-sm text-muted-foreground">Contactez directement le chauffeur et réservez votre trajet</p>
          </Card>
          <Card className="p-4 bg-muted/30 border-border">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold mb-3 mx-auto">3</div>
            <h4 className="font-semibold text-foreground mb-2">Voyagez</h4>
            <p className="text-sm text-muted-foreground">Profitez de votre trajet en toute sérénité avec votre chauffeur</p>
          </Card>
        </div>
      </div>

      {/* Mid-Section CTA */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center p-4 rounded-xl bg-gradient-to-r from-pink-500/5 to-purple-600/5 border border-border">
        <p className="text-muted-foreground">
          <Star className="w-5 h-5 inline mr-2 text-amber-500" />
          Découvrez une nouvelle façon de voyager
        </p>
        <Link to="/chauffeurs">
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
            Trouver mon chauffeur
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
        {clientFeatures.map((feature, index) => (
          <Card 
            key={index} 
            className="p-6 hover:shadow-elegant transition-all cursor-pointer group bg-muted/30 backdrop-blur-sm border-border hover:border-primary/50"
          >
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br", feature.gradient)}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base mb-2 text-foreground group-hover:text-primary transition-colors">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-pink-500/20 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-foreground mb-3">Prêt à trouver votre chauffeur ?</h3>
        <p className="text-muted-foreground mb-6">Inscrivez-vous gratuitement et accédez à tous les chauffeurs de votre région</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/chauffeurs">
            <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto">
              <Search className="w-5 h-5 mr-2" />
              {t('landing.client.searchDriver')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/register-client">
            <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted/50 w-full sm:w-auto">
              <UserPlus className="w-5 h-5 mr-2" />
              S'inscrire gratuitement
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};