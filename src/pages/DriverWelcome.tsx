import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
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
  CheckCircle2,
  Clock,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  
  const isPioneer = searchParams.get("pioneer") === "true";
  const driverId = searchParams.get("driver_id");

  // Animation des fonctionnalités
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleContinueOnboarding = () => {
    // Continuer le tunnel d'onboarding
    navigate("/driver-dashboard");
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
            Votre paiement est confirmé ! Continuez la configuration de votre espace 
            pour développer votre activité VTC.
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
            <h2 className="text-xl font-bold text-white mb-2">Paiement confirmé !</h2>
            <p className="text-white/70 text-sm">
              Finalisez maintenant la configuration de votre espace chauffeur.
            </p>
          </Card>
        </motion.div>

        {/* Prochaines étapes - NOUVEAU */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <Card className="p-6 bg-blue-500/10 border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Prochaines étapes
                </h3>
                <ul className="text-white/70 text-sm space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-400">1</span>
                    </div>
                    <span>Configurez vos <strong className="text-white">tarifs et informations</strong> dans le tunnel d'inscription</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-400">2</span>
                    </div>
                    <span>Téléversez vos <strong className="text-white">documents professionnels</strong> (obligatoire)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-400">3</span>
                    </div>
                    <span>Notre équipe <strong className="text-white">valide votre compte</strong> (24-48h)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                    <span>Votre <strong className="text-amber-400">essai de 14 jours</strong> démarre à la validation</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Info essai après validation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <Card className="p-5 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <p className="text-white/80 text-sm">
                <strong className="text-amber-400">Pas de temps perdu !</strong> Votre période d'essai de 14 jours 
                ne démarre qu'après la validation de votre compte par notre équipe. Prenez le temps de tout configurer.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-center mb-8">
            <Rocket className="inline-block w-6 h-6 mr-2 text-amber-400" />
            Fonctionnalités disponibles après validation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
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

        {/* CTA Button - Un seul bouton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <Button
            onClick={handleContinueOnboarding}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-amber-500/25"
          >
            Continuer la configuration
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-center mt-8"
        >
          <p className="text-white/50 text-sm flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Documents obligatoires : Carte VTC, Permis, Pièce d'identité, Carte grise, Assurance, Kbis
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default DriverWelcome;
