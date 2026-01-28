import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Users, 
  Calendar, 
  Euro, 
  Car, 
  FileText, 
  Star, 
  Shield,
  MapPin,
  MessageSquare,
  Handshake,
  ChevronRight,
  Rocket,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LibertyGuide } from "@/components/onboarding/LibertyGuide";

const FEATURES = [
  {
    icon: <Users className="w-6 h-6" />,
    title: "Gestion des clients",
    description: "Fidélisez vos clients avec un système de gestion complet et des suivis personnalisés.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Planning intelligent",
    description: "Gérez vos réservations et votre emploi du temps avec notre calendrier interactif.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: <Euro className="w-6 h-6" />,
    title: "Tarification flexible",
    description: "Définissez vos tarifs par zone, avec majorations automatiques aux heures de pointe.",
    color: "from-amber-500 to-orange-500"
  },
  {
    icon: <Car className="w-6 h-6" />,
    title: "Vitrine publique",
    description: "Créez votre profil professionnel visible par les clients potentiels.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Facturation automatique",
    description: "Générez des factures professionnelles en un clic pour chaque course.",
    color: "from-rose-500 to-red-500"
  },
  {
    icon: <Handshake className="w-6 h-6" />,
    title: "Partenariats chauffeurs",
    description: "Partagez vos courses avec d'autres chauffeurs de confiance.",
    color: "from-indigo-500 to-violet-500"
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: "Secteurs géographiques",
    description: "Définissez vos zones d'intervention pour être trouvé par les bons clients.",
    color: "from-teal-500 to-cyan-500"
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Assistant personnel",
    description: "Un assistant intégré pour vous aider dans toutes vos démarches.",
    color: "from-fuchsia-500 to-pink-500"
  }
];

const DriverWelcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showGuide, setShowGuide] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  
  const isPioneer = searchParams.get("pioneer") === "true";
  const driverId = searchParams.get("driver_id");

  // Ne pas ouvrir automatiquement le guide - laisser l'utilisateur choisir

  // Animation des fonctionnalités
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoToDashboard = () => {
    // Marquer comme premier login pour ouvrir le guide
    localStorage.setItem("liberty-first-login", "true");
    navigate("/driver-dashboard");
  };

  const handleOpenGuide = () => {
    setShowGuide(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-1"
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-400" />
              </div>
            </motion.div>
          </div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Bienvenue sur{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              SoloCab
            </span>
            {" "}!
          </motion.h1>

          {isPioneer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4"
            >
              <Star className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-semibold">Membre Pioneer</span>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-white/70 max-w-2xl mx-auto"
          >
            Votre inscription est confirmée ! Découvrez toutes les fonctionnalités 
            à votre disposition pour développer votre activité VTC.
          </motion.p>
        </motion.div>

        {/* Success card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto mb-12"
        >
          <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Inscription réussie !</h2>
            <p className="text-white/70 text-sm">
              Votre période d'essai de <strong className="text-amber-400">14 jours gratuits</strong> commence maintenant.
              Profitez-en pour configurer votre espace et attirer vos premiers clients !
            </p>
          </Card>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            <Rocket className="inline-block w-6 h-6 mr-2 text-amber-400" />
            Fonctionnalités disponibles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card className={`
                  p-5 h-full bg-white/5 border-white/10 hover:border-white/20 
                  hover:bg-white/10 transition-all cursor-pointer group
                  ${currentFeatureIndex === index ? 'ring-2 ring-amber-500/50' : ''}
                `}>
                  <div className={`
                    w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} 
                    flex items-center justify-center mb-4 text-white
                    group-hover:scale-110 transition-transform
                  `}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 30 days reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <Card className="p-6 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  14 jours pour compléter vos documents
                </h3>
                <p className="text-white/70 text-sm mb-3">
                  Vous disposez d'un accès complet pendant 14 jours. Profitez-en pour téléverser 
                  vos documents professionnels (permis, carte VTC, assurance...) via l'onglet "Documents" 
                  de votre tableau de bord.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-white/5 text-white/80 border-white/20">
                    <FileText className="w-3 h-3 mr-1" />
                    Carte VTC
                  </Badge>
                  <Badge variant="outline" className="bg-white/5 text-white/80 border-white/20">
                    <FileText className="w-3 h-3 mr-1" />
                    Permis
                  </Badge>
                  <Badge variant="outline" className="bg-white/5 text-white/80 border-white/20">
                    <FileText className="w-3 h-3 mr-1" />
                    Assurance
                  </Badge>
                  <Badge variant="outline" className="bg-white/5 text-white/80 border-white/20">
                    <FileText className="w-3 h-3 mr-1" />
                    Kbis
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            onClick={handleOpenGuide}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-amber-500/25"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Commencer le tutoriel Liberty
          </Button>
          
          <Button
            onClick={handleGoToDashboard}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white font-semibold px-8 py-6 text-lg rounded-xl"
          >
            Accéder au dashboard
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Liberty tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-center mt-8"
        >
          <p className="text-white/50 text-sm flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Liberty vous guidera pas à pas pour configurer votre espace
          </p>
        </motion.div>
      </div>

      {/* Liberty Guide Modal */}
      <LibertyGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onNavigate={(path) => {
          navigate("/driver-dashboard");
        }}
      />
    </div>
  );
};

export default DriverWelcome;
