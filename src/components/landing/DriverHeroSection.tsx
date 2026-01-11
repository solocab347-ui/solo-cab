import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import {
  Globe,
  Users,
  QrCode,
  DollarSign,
  ClipboardList,
  BarChart3,
  Star,
  Target,
  ArrowRight,
  CheckCircle,
  Zap,
  Car,
  Shield,
} from "lucide-react";

export const DriverHeroSection = () => {
  const { t } = useLocale();

  const driverFeatures = [
    {
      icon: Globe,
      title: t('landing.driver.publicProfile'),
      description: t('landing.driver.publicProfileDesc'),
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Users,
      title: t('landing.driver.privateClients'),
      description: t('landing.driver.privateClientsDesc'),
      gradient: "from-pink-500 to-purple-600",
    },
    {
      icon: QrCode,
      title: t('landing.driver.personalQR'),
      description: t('landing.driver.personalQRDesc'),
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: DollarSign,
      title: t('landing.driver.zeroCommission'),
      description: t('landing.driver.zeroCommissionDesc'),
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: ClipboardList,
      title: t('landing.driver.completeManagement'),
      description: t('landing.driver.completeManagementDesc'),
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: BarChart3,
      title: t('landing.driver.statisticsGoals'),
      description: t('landing.driver.statisticsGoalsDesc'),
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: Star,
      title: t('landing.driver.ratingSystem'),
      description: t('landing.driver.ratingSystemDesc'),
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: Target,
      title: t('landing.driver.marketingCampaigns'),
      description: t('landing.driver.marketingCampaignsDesc'),
      gradient: "from-red-500 to-pink-600",
    },
  ];

  const benefits = [
    "Inscription gratuite en 5 minutes",
    "0% de commission sur vos courses",
    "Votre propre page de profil public",
    "QR code personnel à partager",
  ];

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Primary CTA Section at Top */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 max-w-4xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          🚖 Chauffeur VTC indépendant
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
          {t('landing.driver.heroTitle').split(' ').slice(0, 2).join(' ')} <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">{t('landing.driver.heroTitle').split(' ').slice(2).join(' ')}</span>
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
          {t('landing.driver.heroSubtitle')}
        </p>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link to="/devenir-chauffeur">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto">
              <Zap className="w-5 h-5 mr-2" />
              Devenir chauffeur SoloCab
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 w-full sm:w-auto">
              <Car className="w-5 h-5 mr-2" />
              Déjà chauffeur ? Connexion
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

      {/* Why Join */}
      <div className="mb-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">Pourquoi rejoindre SoloCab ?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold mb-3 mx-auto">
              <DollarSign className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white mb-2">0% Commission</h4>
            <p className="text-sm text-gray-400">Gardez 100% de vos revenus, aucun frais sur vos courses</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold mb-3 mx-auto">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white mb-2">Visibilité en ligne</h4>
            <p className="text-sm text-gray-400">Votre page profil personnalisée visible sur Google</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold mb-3 mx-auto">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white mb-2">Indépendance totale</h4>
            <p className="text-sm text-gray-400">Vous êtes maître de votre activité et de vos tarifs</p>
          </Card>
        </div>
      </div>

      {/* Mid-Section CTA */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-600/5 border border-white/5">
        <p className="text-gray-300">
          <Star className="w-5 h-5 inline mr-2 text-amber-500" />
          Rejoignez la première plateforme 100% indépendante
        </p>
        <Link to="/devenir-chauffeur">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
            Créer mon profil chauffeur
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
        {driverFeatures.map((feature, index) => (
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-3">Lancez votre activité dès aujourd'hui !</h3>
        <p className="text-gray-400 mb-6">Créez votre profil en quelques minutes et commencez à recevoir des clients</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/devenir-chauffeur">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg w-full sm:w-auto">
              <Zap className="w-5 h-5 mr-2" />
              {t('landing.driver.joinCommunity')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/chauffeurs">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
              Voir les chauffeurs inscrits
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
