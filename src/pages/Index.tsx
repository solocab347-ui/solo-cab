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
import {
  Car,
  Users,
  QrCode,
  Euro,
  BarChart3,
  Star,
  MessageSquare,
  Calendar,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Search,
  Globe,
  DollarSign,
  FileText,
  Target,
  Bell,
  Lock,
  Heart,
  ClipboardList,
  MessageCircle,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  Building2,
  Briefcase,
  Receipt,
  UserCheck,
  Truck,
} from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"clients" | "drivers" | "companies" | "fleet">("clients");

  useEffect(() => {
    // Redirect authenticated users to their dashboard - only after loading is complete
    if (!loading && user && userRole) {
      const dashboardRoutes: Record<string, string> = {
        driver: "/driver-dashboard",
        client: "/client-dashboard",
        admin: "/admin-dashboard",
        fleet_manager: "/fleet-dashboard",
        company: "/company-dashboard",
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
      icon: CreditCard,
      title: t('landing.client.securePayment'),
      description: t('landing.client.securePaymentDesc'),
      gradient: "from-purple-500 to-pink-600",
    },
  ];

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

  const companyFeatures = [
    {
      icon: Users,
      title: "Plusieurs Chauffeurs",
      description: "Accédez à un réseau de chauffeurs professionnels pour tous vos besoins",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: Receipt,
      title: "Facturation Automatique",
      description: "Factures générées automatiquement avec récapitulatif mensuel",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: Briefcase,
      title: "Compte Entreprise",
      description: "Gestion centralisée des déplacements de vos collaborateurs",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: FileText,
      title: "Justificatifs Comptables",
      description: "Téléchargez tous vos justificatifs pour votre comptabilité",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: Shield,
      title: "Chauffeurs Vérifiés",
      description: "Tous nos chauffeurs sont des professionnels certifiés VTC",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: UserCheck,
      title: "Chauffeurs Favoris",
      description: "Enregistrez vos chauffeurs préférés pour des réservations rapides",
      gradient: "from-pink-500 to-rose-600",
    },
    {
      icon: BarChart3,
      title: "Suivi des Dépenses",
      description: "Tableau de bord avec statistiques et budget mensuel",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: Calendar,
      title: "Réservation Simplifiée",
      description: "Réservez en quelques clics pour vous ou vos collaborateurs",
      gradient: "from-indigo-500 to-purple-600",
    },
  ];

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

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-[#0a1628] to-[#0f1e35]">
        <div className="container mx-auto px-4">
          {/* Toggle Buttons - Always 2 rows */}
          <div className="flex justify-center mb-12">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-2 backdrop-blur-sm border border-white/10 max-w-lg w-full">
              <button
                onClick={() => setActiveView("clients")}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap",
                  activeView === "clients"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>{t('landing.forClients')}</span>
              </button>
              <button
                onClick={() => setActiveView("drivers")}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap",
                  activeView === "drivers"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Car className="w-4 h-4 flex-shrink-0" />
                <span>{t('landing.forDrivers')}</span>
              </button>
              <button
                onClick={() => setActiveView("companies")}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap",
                  activeView === "companies"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span>{t('landing.forCompanies')}</span>
              </button>
              <button
                onClick={() => setActiveView("fleet")}
                className={cn(
                  "px-4 py-3 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap",
                  activeView === "fleet"
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span>{t('landing.fleetManager')}</span>
              </button>
            </div>
          </div>

          {/* Clients View */}
          {activeView === "clients" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
                {t('landing.client.heroTitle').split(' ').slice(0, 2).join(' ')} <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">{t('landing.client.heroTitle').split(' ').slice(2).join(' ')}</span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                {t('landing.client.heroSubtitle')}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {clientFeatures.map((feature, index) => (
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
              <div className="mt-12">
                <Link to="/chauffeurs">
                  <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg">
                    <Search className="w-5 h-5 mr-2" />
                    {t('landing.client.searchDriver')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Drivers View */}
          {activeView === "drivers" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
                {t('landing.driver.heroTitle').split(' ').slice(0, 2).join(' ')} <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">{t('landing.driver.heroTitle').split(' ').slice(2).join(' ')}</span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                {t('landing.driver.heroSubtitle')}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
              <div className="mt-12">
                <Link to="/devenir-chauffeur">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg">
                    <Zap className="w-5 h-5 mr-2" />
                    {t('landing.driver.joinCommunity')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Companies View */}
          {activeView === "companies" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{t('landing.company.heroTitle')}</span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                {t('landing.company.heroSubtitle')}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {companyFeatures.map((feature, index) => (
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
              <div className="mt-12">
                <Link to="/register-company">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg">
                    <Building2 className="w-5 h-5 mr-2" />
                    {t('landing.company.registerCompany')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Fleet Manager View */}
          {activeView === "fleet" && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
                <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">{t('landing.fleet.heroTitle')}</span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                {t('landing.fleet.heroSubtitle')}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
              <div className="mt-12">
                <Link to="/register-fleet">
                  <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg">
                    <Truck className="w-5 h-5 mr-2" />
                    {t('landing.fleet.registerFleet')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
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

      {/* For Clients Section */}
      <section className="py-20 bg-[#1a2942]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-pink-500 text-pink-500">
              Pour les Clients
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
              Trouvez Votre <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Chauffeur de Confiance</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Des professionnels indépendants, des tarifs transparents
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {clientFeatures.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 hover:shadow-elegant transition-all cursor-pointer group bg-white/5 backdrop-blur-sm border-white/10 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br transition-transform group-hover:scale-110", feature.gradient)}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-base mb-2 text-white group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/chauffeurs">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg">
                <Search className="w-5 h-5 mr-2" />
                Rechercher un chauffeur
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* For Drivers Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-blue-500 text-blue-500">
              Pour les Chauffeurs
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
              Devenez un <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Chauffeur Indépendant</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Profil automatique, clients privés, zéro commission
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {driverFeatures.map((feature, index) => (
              <Card 
                key={index} 
                className="p-6 hover:shadow-elegant transition-all cursor-pointer group bg-white/5 backdrop-blur-sm border-white/10 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br transition-transform group-hover:scale-110", feature.gradient)}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-base mb-2 text-white group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/devenir-chauffeur">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg">
                <Zap className="w-5 h-5 mr-2" />
                Rejoindre la communauté
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
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
                  <Link to="/chauffeurs" className="hover:text-white transition-colors">
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
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-white">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/privacy-policy" className="hover:text-white transition-colors">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="hover:text-white transition-colors">
                    CGU
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} SoloCab. Tous droits réservés.</p>
            <SocialLinks variant="compact" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
