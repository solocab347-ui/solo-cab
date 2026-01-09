import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import {
  Truck,
  Users,
  BarChart3,
  Calendar,
  Receipt,
  TrendingUp,
  Shield,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Building2,
  Star,
  Car,
} from "lucide-react";

export const FleetHeroSection = () => {
  const { t } = useLocale();

  const fleetFeatures = [
    {
      icon: Truck,
      title: "Gestion Multi-Véhicules",
      description: "Gérez l'ensemble de votre flotte de véhicules depuis un seul tableau de bord",
      gradient: "from-indigo-500 to-violet-600",
    },
    {
      icon: Users,
      title: "Équipe de Chauffeurs",
      description: "Attribuez des chauffeurs à vos véhicules et suivez leur activité",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: BarChart3,
      title: "Analytics Avancés",
      description: "Statistiques détaillées sur les performances de votre flotte",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: Calendar,
      title: "Planning Centralisé",
      description: "Planifiez les courses et optimisez l'utilisation de vos véhicules",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: Receipt,
      title: "Facturation Groupée",
      description: "Factures consolidées pour tous vos chauffeurs et véhicules",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: TrendingUp,
      title: "Rentabilité par Véhicule",
      description: "Analysez la rentabilité de chaque véhicule de votre flotte",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Shield,
      title: "Conformité Garantie",
      description: "Suivi des documents et assurances de tous vos véhicules",
      gradient: "from-red-500 to-pink-600",
    },
    {
      icon: MessageSquare,
      title: "Communication Équipe",
      description: "Messagerie intégrée pour coordonner votre équipe de chauffeurs",
      gradient: "from-cyan-500 to-blue-600",
    },
  ];

  const benefits = [
    "Gérez tous vos chauffeurs",
    "Page publique de votre flotte",
    "Contrats entreprises",
    "Dispatch automatique",
  ];

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Primary CTA Section at Top */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-600/10 border border-indigo-500/20 max-w-4xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0">
          🚐 Gestionnaire de flotte VTC
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
          <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">{t('landing.fleet.heroTitle')}</span>
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
          {t('landing.fleet.heroSubtitle')}
        </p>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link to="/register-fleet">
            <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg w-full sm:w-auto">
              <Truck className="w-5 h-5 mr-2" />
              Créer mon compte flotte
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/devenir-chauffeur">
            <Button size="lg" variant="outline" className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 w-full sm:w-auto">
              <Car className="w-5 h-5 mr-2" />
              Ou devenir chauffeur solo
            </Button>
          </Link>
        </div>

        {/* Benefits List */}
        <div className="flex flex-wrap justify-center gap-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* How it Works for Fleet Managers */}
      <div className="mb-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">Développez votre activité de flotte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold mb-3 mx-auto">1</div>
            <h4 className="font-semibold text-white mb-2">Inscrivez votre flotte</h4>
            <p className="text-sm text-gray-400">Créez votre compte et ajoutez vos chauffeurs partenaires</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center font-bold mb-3 mx-auto">2</div>
            <h4 className="font-semibold text-white mb-2">Gérez les contrats</h4>
            <p className="text-sm text-gray-400">Établissez des partenariats avec des entreprises clientes</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold mb-3 mx-auto">3</div>
            <h4 className="font-semibold text-white mb-2">Dispatchez les courses</h4>
            <p className="text-sm text-gray-400">Attribuez les courses à vos chauffeurs et suivez tout</p>
          </Card>
        </div>
      </div>

      {/* Mid-Section CTA */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center p-4 rounded-xl bg-gradient-to-r from-indigo-500/5 to-violet-600/5 border border-white/5">
        <p className="text-gray-300">
          <Star className="w-5 h-5 inline mr-2 text-amber-500" />
          Rejoignez les gestionnaires de flotte qui réussissent
        </p>
        <Link to="/register-fleet">
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white">
            Créer ma flotte maintenant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
        {fleetFeatures.map((feature, index) => (
          <Card 
            key={index} 
            className="p-6 hover:shadow-elegant transition-all cursor-pointer group bg-white/5 backdrop-blur-sm border-white/10 hover:border-primary/50"
          >
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br", feature.gradient)}>
              <feature.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base mb-2 text-white group-hover:text-primary transition-colors">{feature.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-600/10 border border-indigo-500/20 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-3">Prêt à structurer votre flotte VTC ?</h3>
        <p className="text-gray-400 mb-6">Créez votre compte et commencez à gérer vos chauffeurs efficacement</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register-fleet">
            <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg w-full sm:w-auto">
              <Truck className="w-5 h-5 mr-2" />
              {t('landing.fleet.registerFleet')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
              Déjà inscrit ? Connexion
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
