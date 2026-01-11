import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  User, 
  CreditCard, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  X,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Camera,
  Car,
  MapPin,
  Euro,
  Clock,
  Shield,
  Star,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LibertyGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  currentSection?: "profile" | "billing" | "documents";
}

interface GuideStep {
  id: string;
  section: "profile" | "billing" | "documents";
  title: string;
  description: string;
  tips: string[];
  icon: React.ReactNode;
  action?: {
    label: string;
    path: string;
  };
}

const GUIDE_STEPS: GuideStep[] = [
  // Section Profil Public
  {
    id: "profile-intro",
    section: "profile",
    title: "Bienvenue dans votre espace profil !",
    description: "Votre vitrine publique est la première impression que vos clients auront de vous. Un profil complet et attractif peut augmenter vos réservations de 70% !",
    tips: [
      "Un profil complet inspire confiance",
      "Les photos professionnelles attirent plus de clients",
      "Une description personnalisée vous démarque"
    ],
    icon: <User className="w-6 h-6" />
  },
  {
    id: "profile-photo",
    section: "profile",
    title: "Votre photo de profil",
    description: "Choisissez une photo professionnelle où vous êtes souriant et bien présenté. Évitez les selfies et privilégiez un fond neutre.",
    tips: [
      "Portez une tenue professionnelle",
      "Bonne luminosité, visage bien visible",
      "Format carré recommandé (minimum 400x400px)"
    ],
    icon: <Camera className="w-6 h-6" />,
    action: { label: "Modifier ma photo", path: "/driver-dashboard?tab=profile" }
  },
  {
    id: "profile-company",
    section: "profile",
    title: "Nom de votre entreprise",
    description: "Votre nom commercial apparaîtra sur votre vitrine. Choisissez un nom professionnel et mémorable qui reflète votre activité.",
    tips: [
      "Court et facile à retenir",
      "Évitez les caractères spéciaux",
      "Vous pouvez afficher votre nom personnel aussi"
    ],
    icon: <Star className="w-6 h-6" />,
    action: { label: "Modifier mon entreprise", path: "/driver-dashboard?tab=profile" }
  },
  {
    id: "profile-vehicle",
    section: "profile",
    title: "Informations véhicule",
    description: "Décrivez votre véhicule en détail : marque, modèle, année, couleur. Les clients aiment savoir dans quel véhicule ils vont voyager !",
    tips: [
      "Ajoutez des photos de votre véhicule (intérieur/extérieur)",
      "Mentionnez les équipements spéciaux (WiFi, eau, etc.)",
      "Indiquez le nombre de places disponibles"
    ],
    icon: <Car className="w-6 h-6" />,
    action: { label: "Configurer mon véhicule", path: "/driver-dashboard?tab=profile" }
  },
  {
    id: "profile-sectors",
    section: "profile",
    title: "Secteurs d'activité",
    description: "Définissez les zones géographiques où vous intervenez. Plus vous êtes précis, mieux les clients vous trouveront dans leur secteur.",
    tips: [
      "Sélectionnez les villes et quartiers que vous desservez",
      "Vous pouvez modifier vos secteurs à tout moment",
      "Les clients recherchent par zone géographique"
    ],
    icon: <MapPin className="w-6 h-6" />,
    action: { label: "Définir mes secteurs", path: "/driver-dashboard?tab=profile" }
  },
  {
    id: "profile-description",
    section: "profile",
    title: "Description de vos services",
    description: "Rédigez une description engageante de vos services. Parlez de votre expérience, votre style de conduite, vos spécialités.",
    tips: [
      "Soyez authentique et professionnel",
      "Mentionnez vos années d'expérience",
      "Parlez des langues que vous parlez"
    ],
    icon: <Lightbulb className="w-6 h-6" />,
    action: { label: "Rédiger ma description", path: "/driver-dashboard?tab=profile" }
  },
  
  // Section Facturation
  {
    id: "billing-intro",
    section: "billing",
    title: "Configuration de vos tarifs",
    description: "Définissez vos tarifs de manière compétitive. Un bon équilibre entre qualité et prix vous garantira des clients fidèles.",
    tips: [
      "Analysez les tarifs du marché local",
      "Proposez des forfaits attractifs",
      "Soyez transparent sur vos prix"
    ],
    icon: <CreditCard className="w-6 h-6" />
  },
  {
    id: "billing-base",
    section: "billing",
    title: "Tarif de base",
    description: "Le tarif de base est le prix minimum de chaque course. Il couvre la prise en charge et les premiers kilomètres.",
    tips: [
      "Généralement entre 5€ et 15€ selon votre zone",
      "Incluez la prise en charge dans ce tarif",
      "Ajustez selon la demande de votre secteur"
    ],
    icon: <Euro className="w-6 h-6" />,
    action: { label: "Définir mes tarifs", path: "/driver-dashboard?tab=tarification" }
  },
  {
    id: "billing-km",
    section: "billing",
    title: "Prix au kilomètre",
    description: "Le tarif au kilomètre détermine le coût de chaque km parcouru après le tarif de base.",
    tips: [
      "En moyenne entre 1.50€ et 3€ selon les zones",
      "Tenez compte du coût du carburant",
      "Restez compétitif par rapport aux autres chauffeurs"
    ],
    icon: <MapPin className="w-6 h-6" />,
    action: { label: "Configurer le prix/km", path: "/driver-dashboard?tab=tarification" }
  },
  {
    id: "billing-peak",
    section: "billing",
    title: "Majorations heures de pointe",
    description: "Activez les majorations automatiques pour les heures de forte demande (matin, soir, week-end).",
    tips: [
      "Majorations typiques : +20% à +50%",
      "Définissez des plages horaires précises",
      "Informez vos clients de ces majorations"
    ],
    icon: <Clock className="w-6 h-6" />,
    action: { label: "Gérer les majorations", path: "/driver-dashboard?tab=tarification" }
  },
  {
    id: "billing-payment",
    section: "billing",
    title: "Moyens de paiement acceptés",
    description: "Plus vous acceptez de moyens de paiement, plus vous aurez de clients. CB, espèces, virements... à vous de choisir !",
    tips: [
      "Accepter la CB augmente la confiance",
      "Les virements sont pratiques pour les entreprises",
      "Précisez clairement vos modes de paiement"
    ],
    icon: <CreditCard className="w-6 h-6" />,
    action: { label: "Configurer les paiements", path: "/driver-dashboard?tab=tarification" }
  },
  
  // Section Documents
  {
    id: "docs-intro",
    section: "documents",
    title: "Vos documents professionnels",
    description: "Pour exercer légalement, vous devez fournir certains documents obligatoires. Pas de panique, je vais vous guider !",
    tips: [
      "Tous les documents doivent être à jour",
      "Préparez des scans de bonne qualité",
      "Vous avez 30 jours pour tout compléter"
    ],
    icon: <FileText className="w-6 h-6" />
  },
  {
    id: "docs-license",
    section: "documents",
    title: "Permis de conduire",
    description: "Votre permis de conduire doit être valide et correspondre à la catégorie de véhicule que vous utilisez.",
    tips: [
      "Recto et verso obligatoires",
      "Document lisible et non expiré",
      "Format PDF ou image accepté"
    ],
    icon: <Shield className="w-6 h-6" />,
    action: { label: "Téléverser mon permis", path: "/driver-dashboard?tab=documents" }
  },
  {
    id: "docs-vtc",
    section: "documents",
    title: "Carte VTC / Capacité de transport",
    description: "La carte professionnelle VTC ou la capacité de transport est obligatoire pour exercer le métier de chauffeur.",
    tips: [
      "Document délivré par la préfecture",
      "Valable 5 ans, renouvelable",
      "Numéro à conserver précieusement"
    ],
    icon: <Shield className="w-6 h-6" />,
    action: { label: "Ajouter ma carte VTC", path: "/driver-dashboard?tab=documents" }
  },
  {
    id: "docs-insurance",
    section: "documents",
    title: "Assurance professionnelle",
    description: "L'attestation d'assurance RC Pro couvre votre activité et protège vos passagers.",
    tips: [
      "Assurance spécifique VTC obligatoire",
      "Vérifiez la couverture passagers",
      "Renouvelez avant expiration"
    ],
    icon: <Shield className="w-6 h-6" />,
    action: { label: "Ajouter mon assurance", path: "/driver-dashboard?tab=documents" }
  },
  {
    id: "docs-kbis",
    section: "documents",
    title: "Extrait Kbis / Inscription registre",
    description: "Justificatif de votre inscription au registre du commerce ou comme auto-entrepreneur.",
    tips: [
      "Moins de 3 mois pour le Kbis",
      "Certificat INSEE pour auto-entrepreneurs",
      "Document officiel uniquement"
    ],
    icon: <FileText className="w-6 h-6" />,
    action: { label: "Ajouter mon Kbis", path: "/driver-dashboard?tab=documents" }
  },
  {
    id: "docs-registration",
    section: "documents",
    title: "Carte grise du véhicule",
    description: "La carte grise doit correspondre au véhicule déclaré et être à votre nom ou au nom de votre société.",
    tips: [
      "Véhicule en règle et contrôle technique valide",
      "Correspondance avec le véhicule déclaré",
      "Un document par véhicule"
    ],
    icon: <Car className="w-6 h-6" />,
    action: { label: "Ajouter ma carte grise", path: "/driver-dashboard?tab=documents" }
  }
];

const SECTIONS = [
  { id: "profile", label: "Profil Public", icon: <User className="w-4 h-4" /> },
  { id: "billing", label: "Facturation", icon: <CreditCard className="w-4 h-4" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> }
];

export const LibertyGuide = ({ isOpen, onClose, onNavigate, currentSection }: LibertyGuideProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<"profile" | "billing" | "documents">(
    currentSection || "profile"
  );

  // Filter steps by section
  const sectionSteps = GUIDE_STEPS.filter(step => step.section === selectedSection);
  const currentStep = sectionSteps[currentStepIndex];
  
  // Calculate progress
  const totalSteps = sectionSteps.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem("liberty-guide-progress");
    if (saved) {
      const { completed, lastSection, lastStep } = JSON.parse(saved);
      setCompletedSteps(completed || []);
      if (lastSection && !currentSection) setSelectedSection(lastSection);
      if (lastStep !== undefined) {
        const stepIndex = GUIDE_STEPS.filter(s => s.section === (lastSection || selectedSection))
          .findIndex(s => s.id === lastStep);
        if (stepIndex >= 0) setCurrentStepIndex(stepIndex);
      }
    }
  }, []);

  // Save progress
  useEffect(() => {
    if (currentStep) {
      localStorage.setItem("liberty-guide-progress", JSON.stringify({
        completed: completedSteps,
        lastSection: selectedSection,
        lastStep: currentStep.id
      }));
    }
  }, [currentStepIndex, completedSteps, selectedSection, currentStep]);

  const handleNext = () => {
    if (currentStep && !completedSteps.includes(currentStep.id)) {
      setCompletedSteps(prev => [...prev, currentStep.id]);
    }
    if (currentStepIndex < sectionSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSectionChange = (section: "profile" | "billing" | "documents") => {
    setSelectedSection(section);
    setCurrentStepIndex(0);
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    localStorage.removeItem("liberty-guide-progress");
  };

  const handleAction = () => {
    if (currentStep?.action && onNavigate) {
      onNavigate(currentStep.action.path);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Liberty Avatar */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: isPaused ? 0 : [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    repeatType: "reverse" 
                  }}
                  className="relative"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/30">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-amber-400" />
                    </div>
                  </div>
                  {!isPaused && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"
                    />
                  )}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Liberty
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Guide Pro
                    </Badge>
                  </h2>
                  <p className="text-sm text-white/60">Votre assistant configuration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mt-4">
              {SECTIONS.map((section) => {
                const sectionCompleted = GUIDE_STEPS
                  .filter(s => s.section === section.id)
                  .every(s => completedSteps.includes(s.id));
                
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                      selectedSection === section.id
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {sectionCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      section.icon
                    )}
                    <span className="hidden sm:inline">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 bg-white/5">
            <div className="flex items-center justify-between text-sm text-white/60 mb-2">
              <span>Étape {currentStepIndex + 1} sur {totalSteps}</span>
              <span>{Math.round(progress)}% complété</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep && (
                  <div className="space-y-6">
                    {/* Step Header */}
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400">
                        {currentStep.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {currentStep.title}
                        </h3>
                        <p className="text-white/70 leading-relaxed">
                          {currentStep.description}
                        </p>
                      </div>
                    </div>

                    {/* Tips */}
                    <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <span className="font-semibold text-amber-400">Conseils de Liberty</span>
                      </div>
                      <ul className="space-y-2">
                        {currentStep.tips.map((tip, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-2 text-white/80"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </Card>

                    {/* Action Button */}
                    {currentStep.action && (
                      <Button
                        onClick={handleAction}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                      >
                        {currentStep.action.label}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 pt-4 border-t border-white/10 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              {/* Step Indicators */}
              <div className="flex gap-1.5">
                {sectionSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentStepIndex
                        ? "w-6 bg-amber-500"
                        : completedSteps.includes(step.id)
                          ? "bg-green-500"
                          : "bg-white/20 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                disabled={currentStepIndex === sectionSteps.length - 1}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-30"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Liberty Speech Bubble */}
          {!isPaused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-24 left-6 right-6"
            >
              <div className="relative bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-3 border border-amber-500/30">
                <motion.p
                  key={currentStep?.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-white/80 text-center italic"
                >
                  {currentStepIndex === 0 && selectedSection === "profile" && 
                    "✨ Je suis Liberty, votre guide personnel ! Suivez-moi pour configurer votre espace."}
                  {currentStepIndex > 0 && "💡 N'hésitez pas à revenir sur les étapes précédentes si besoin !"}
                </motion.p>
                <div className="absolute -top-2 left-8 w-4 h-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rotate-45 border-l border-t border-amber-500/30" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LibertyGuide;
