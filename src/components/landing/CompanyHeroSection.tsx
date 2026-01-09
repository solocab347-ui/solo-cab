import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";
import {
  Users,
  Receipt,
  Briefcase,
  FileText,
  Shield,
  UserCheck,
  BarChart3,
  Calendar,
  ArrowRight,
  CheckCircle,
  Building2,
  Search,
  Star,
} from "lucide-react";

export const CompanyHeroSection = () => {
  const { t } = useLocale();

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

  const benefits = [
    "Facturation centralisée",
    "Gestion des collaborateurs",
    "Contrats avec des flottes VTC",
    "Reporting détaillé",
  ];

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Primary CTA Section at Top */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 max-w-4xl mx-auto">
        <Badge className="mb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
          🏢 Compte Entreprise
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
          <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{t('landing.company.heroTitle')}</span>
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
          {t('landing.company.heroSubtitle')}
        </p>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link to="/register-company">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg w-full sm:w-auto">
              <Building2 className="w-5 h-5 mr-2" />
              Créer un compte entreprise
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Link to="/chauffeurs">
            <Button size="lg" variant="outline" className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 w-full sm:w-auto">
              <Search className="w-5 h-5 mr-2" />
              Découvrir les chauffeurs
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

      {/* How it Works for Companies */}
      <div className="mb-12 max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-white mb-6">Simplifiez les déplacements de votre entreprise</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold mb-3 mx-auto">1</div>
            <h4 className="font-semibold text-white mb-2">Créez votre compte</h4>
            <p className="text-sm text-gray-400">Inscrivez votre entreprise et invitez vos collaborateurs</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold mb-3 mx-auto">2</div>
            <h4 className="font-semibold text-white mb-2">Partenariats flottes</h4>
            <p className="text-sm text-gray-400">Contractualisez avec des gestionnaires de flotte de confiance</p>
          </Card>
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold mb-3 mx-auto">3</div>
            <h4 className="font-semibold text-white mb-2">Facture mensuelle</h4>
            <p className="text-sm text-gray-400">Recevez une facture consolidée pour tous vos trajets</p>
          </Card>
        </div>
      </div>

      {/* Mid-Section CTA */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-600/5 border border-white/5">
        <p className="text-gray-300">
          <Star className="w-5 h-5 inline mr-2 text-amber-500" />
          Optimisez les déplacements professionnels
        </p>
        <Link to="/register-company">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
            Ouvrir un compte entreprise
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
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

      {/* Bottom CTA */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-3">Prêt à professionnaliser vos déplacements ?</h3>
        <p className="text-gray-400 mb-6">Créez votre compte entreprise et centralisez tous vos trajets VTC</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register-company">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg w-full sm:w-auto">
              <Building2 className="w-5 h-5 mr-2" />
              {t('landing.company.registerCompany')}
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
