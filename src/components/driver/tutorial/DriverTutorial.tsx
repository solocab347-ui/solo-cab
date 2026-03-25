import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode, Users, Car, FileText, Calculator, Settings,
  ChevronRight, ChevronLeft, X, Sparkles,
  CreditCard, BarChart3, Crown,
  CheckCircle2, ArrowRight, Lightbulb, Star, Rocket
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TutorialStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tips: string[];
  targetTab: string;
  importance: "critical" | "important" | "useful";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="w-5 h-5" />,
    title: "Bienvenue sur SoloCab !",
    subtitle: "Votre outil de gestion VTC",
    description: "Ce guide rapide vous montre comment utiliser SoloCab. En 5 minutes, vous serez opérationnel.",
    tips: [
      "Suivez les étapes dans l'ordre",
      "Chaque étape vous redirige vers la section concernée",
      "Relancez ce tutoriel depuis les paramètres"
    ],
    targetTab: "home",
    importance: "critical"
  },
  {
    id: "qrcode",
    icon: <QrCode className="w-5 h-5" />,
    title: "Votre QR Code",
    subtitle: "🔥 Le nerf de la guerre",
    description: "Quand un passager le scanne, il est lié à VOTRE compte pour toujours. Chaque scan = un client fidélisé.",
    tips: [
      "Affichez-le dans votre véhicule",
      "Le passager scanne → compte créé → lié à vous",
      "Objectif : 25 clients = réservations régulières",
      "C'est VOTRE base de données"
    ],
    targetTab: "qrcode",
    importance: "critical"
  },
  {
    id: "clients",
    icon: <Users className="w-5 h-5" />,
    title: "Vos Clients",
    subtitle: "Votre base de données",
    description: "Tous les clients qui scannent votre QR Code apparaissent ici avec leur historique et préférences.",
    tips: [
      "Clients exclusifs = ne voient QUE vous",
      "Consultez l'historique de chaque client",
      "Plus de clients = plus de courses"
    ],
    targetTab: "clients",
    importance: "critical"
  },
  {
    id: "courses",
    icon: <Car className="w-5 h-5" />,
    title: "Gestion des Courses",
    subtitle: "Créez et suivez vos courses",
    description: "Gérez les réservations, suivez le statut en temps réel. Le prix se calcule automatiquement.",
    tips: [
      "Prix automatique selon vos tarifs",
      "Validez pour générer la facture",
      "Statut : en attente → en cours → terminée"
    ],
    targetTab: "courses",
    importance: "critical"
  },
  {
    id: "pricing",
    icon: <Calculator className="w-5 h-5" />,
    title: "Vos Tarifs",
    subtitle: "Prix au km ou à l'heure",
    description: "Définissez prise en charge, tarif km, horaire et minimum. Configurez majorations soirée/week-end.",
    tips: [
      "Tarif au km pour trajets classiques",
      "Tarif horaire pour mises à disposition",
      "Testez avec le simulateur de prix"
    ],
    targetTab: "calculator",
    importance: "important"
  },
  {
    id: "devis",
    icon: <FileText className="w-5 h-5" />,
    title: "Devis",
    subtitle: "Proposez des devis pro",
    description: "Créez des devis détaillés. Une fois accepté, le devis se transforme en course automatiquement.",
    tips: [
      "Document professionnel avec votre marque",
      "Devis accepté → converti en course"
    ],
    targetTab: "devis",
    importance: "important"
  },
  {
    id: "invoices",
    icon: <CreditCard className="w-5 h-5" />,
    title: "Facturation",
    subtitle: "Factures automatiques",
    description: "Chaque course terminée génère une facture. Exportez en PDF pour votre comptabilité.",
    tips: [
      "Factures générées automatiquement",
      "Export PDF pour votre comptable",
      "Suivi des encaissements"
    ],
    targetTab: "factures",
    importance: "important"
  },
  {
    id: "finances",
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Finances",
    subtitle: "Vue d'ensemble",
    description: "Suivez vos revenus et performances pour prendre les bonnes décisions.",
    tips: [
      "Chiffre d'affaires en temps réel",
      "Comparez mois par mois"
    ],
    targetTab: "finance",
    importance: "useful"
  },
  {
    id: "settings",
    icon: <Settings className="w-5 h-5" />,
    title: "Paramètres",
    subtitle: "Votre profil & vitrine",
    description: "Photo, véhicule, équipements, zones — c'est ce que vos clients voient en premier.",
    tips: [
      "Photo pro = plus de confiance",
      "Listez vos équipements",
      "Profil visible via votre QR Code"
    ],
    targetTab: "settings",
    importance: "useful"
  },
  {
    id: "premium",
    icon: <Crown className="w-5 h-5" />,
    title: "Premium",
    subtitle: "9,99€/mois — prix de lancement",
    description: "Campagnes marketing, réseau de partage de courses, prospection client et bien plus.",
    tips: [
      "Campagnes marketing automatisées",
      "Partage de courses entre chauffeurs",
      "Sans engagement"
    ],
    targetTab: "subscription",
    importance: "useful"
  }
];

interface DriverTutorialProps {
  onNavigateToTab: (tab: string) => void;
  onComplete: () => void;
  isVisible: boolean;
}

const importanceConfig = {
  critical: {
    gradient: "from-red-500 to-orange-500",
    badge: "bg-red-500 text-white",
    label: "Essentiel",
    ring: "ring-red-500/30",
  },
  important: {
    gradient: "from-amber-400 to-orange-500",
    badge: "bg-amber-500 text-white",
    label: "Important",
    ring: "ring-amber-500/30",
  },
  useful: {
    gradient: "from-blue-500 to-indigo-500",
    badge: "bg-blue-500 text-white",
    label: "Utile",
    ring: "ring-blue-500/30",
  },
};

export function DriverTutorial({ onNavigateToTab, onComplete, isVisible }: DriverTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const config = importanceConfig[step.importance];

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) setCurrentStep(prev => prev - 1);
  }, [isFirstStep]);

  const handleGoToTab = useCallback(() => {
    onNavigateToTab(step.targetTab);
    onComplete();
  }, [onNavigateToTab, step.targetTab, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) onComplete(); }}
      >
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-lg"
        >
          <div className="bg-card rounded-t-3xl shadow-2xl overflow-hidden border-t border-border/50">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className={`h-full bg-gradient-to-r ${config.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Header compact */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {currentStep + 1}/{TUTORIAL_STEPS.length}
                </span>
                <Badge className={`${config.badge} text-[10px] px-2 py-0 h-5 border-0 font-semibold`}>
                  {config.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onComplete}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Step dots */}
            <div className="flex gap-1 justify-center px-4 pb-3">
              {TUTORIAL_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-8 bg-primary"
                      : i < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="px-5 pb-3 max-h-[55vh] overflow-y-auto">
              {/* Icon + Title row */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.gradient} text-white shadow-md`}>
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-foreground leading-tight truncate">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                {step.description}
              </p>

              {/* Tips */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Lightbulb className="w-3 h-3" />
                  À retenir
                </div>
                {step.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-foreground/70 leading-snug">{tip}</span>
                  </div>
                ))}
              </div>

              {/* Navigate to section CTA */}
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToTab}
                  className="w-full mt-3 gap-2 text-xs h-9 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Aller voir cette section
                </Button>
              )}
            </div>

            {/* Footer navigation — fixed */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-border/50 bg-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirstStep}
                className="gap-1 text-xs h-9"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onComplete}
                className="text-muted-foreground text-xs h-9"
              >
                Passer
              </Button>
              <Button
                onClick={handleNext}
                size="sm"
                className={`gap-1.5 font-semibold h-9 px-4 ${
                  isLastStep
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isLastStep ? (
                  <>
                    <Rocket className="w-4 h-4" />
                    C'est parti !
                  </>
                ) : (
                  <>
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
