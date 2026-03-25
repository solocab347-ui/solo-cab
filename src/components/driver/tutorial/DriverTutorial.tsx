import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  QrCode, Users, Car, FileText, Calculator, Settings,
  ChevronRight, ChevronLeft, X, Sparkles, Target,
  CreditCard, BarChart3, Calendar, Handshake, Crown,
  CheckCircle2, ArrowRight, Lightbulb, Star
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
  highlight?: string;
  importance: "critical" | "important" | "useful";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    icon: <Sparkles className="w-6 h-6" />,
    title: "Bienvenue sur SoloCab !",
    subtitle: "Votre outil de gestion VTC professionnel",
    description: "Ce guide rapide vous montre comment utiliser SoloCab pour gérer vos clients, courses et factures. En 5 minutes, vous serez opérationnel.",
    tips: [
      "Suivez les étapes dans l'ordre pour tout comprendre",
      "Chaque étape vous redirige vers la fonctionnalité concernée",
      "Vous pouvez relancer ce tutoriel depuis les paramètres"
    ],
    targetTab: "home",
    importance: "critical"
  },
  {
    id: "qrcode",
    icon: <QrCode className="w-6 h-6" />,
    title: "Votre QR Code — Le nerf de la guerre",
    subtitle: "🔥 C'est LA fonctionnalité clé de SoloCab",
    description: "Votre QR Code est votre outil d'acquisition n°1. Quand un passager le scanne, il est automatiquement lié à VOTRE compte. Ce client vous appartient pour toujours — pas à SoloCab, à VOUS. Chaque scan = un client fidélisé.",
    tips: [
      "Affichez-le dans votre véhicule (plaque NFC ou impression)",
      "Le passager scanne → il crée son compte → il est lié à vous",
      "Objectif : 25 clients liés = un flux de réservations régulier",
      "C'est VOTRE base de données, pas celle de SoloCab"
    ],
    targetTab: "qrcode",
    importance: "critical",
    highlight: "qrcode"
  },
  {
    id: "clients",
    icon: <Users className="w-6 h-6" />,
    title: "Vos Clients",
    subtitle: "Votre base de données personnelle",
    description: "Tous les clients qui scannent votre QR Code apparaissent ici. Vous voyez leur historique de courses, leurs préférences, et vous pouvez les recontacter directement. Plus vous avez de clients, plus vous recevez de réservations.",
    tips: [
      "Les clients exclusifs (QR) ne voient QUE vous sur la plateforme",
      "Les clients libres peuvent choisir d'autres chauffeurs",
      "Consultez l'historique de chaque client pour personnaliser votre service",
      "Plus de clients = plus de courses = plus de revenus"
    ],
    targetTab: "clients",
    importance: "critical"
  },
  {
    id: "courses",
    icon: <Car className="w-6 h-6" />,
    title: "Gestion des Courses",
    subtitle: "Créez, gérez et suivez toutes vos courses",
    description: "Créez des courses pour vos clients, gérez les réservations entrantes, et suivez leur statut en temps réel. Le prix est calculé automatiquement selon vos tarifs configurés.",
    tips: [
      "Le prix se calcule automatiquement avec vos tarifs",
      "Validez la course à la fin pour générer la facture",
      "Les courses partagées par d'autres chauffeurs apparaissent aussi ici",
      "Utilisez le statut pour suivre : en attente → en cours → terminée"
    ],
    targetTab: "courses",
    importance: "critical"
  },
  {
    id: "pricing",
    icon: <Calculator className="w-6 h-6" />,
    title: "Vos Tarifs",
    subtitle: "Configurez vos prix au km ou à l'heure",
    description: "Définissez votre prise en charge, tarif au km, tarif horaire et minimum de course. Vous pouvez aussi configurer des majorations de soirée et week-end. Ces tarifs servent au calcul automatique du prix de chaque course.",
    tips: [
      "Tarif au km : idéal pour les trajets classiques",
      "Tarif horaire : idéal pour les mises à disposition",
      "Majorations soirée/week-end pour refléter la réalité du marché",
      "Le simulateur de prix vous permet de tester vos tarifs"
    ],
    targetTab: "calculator",
    importance: "important"
  },
  {
    id: "devis",
    icon: <FileText className="w-6 h-6" />,
    title: "Devis",
    subtitle: "Proposez des devis professionnels",
    description: "Créez des devis détaillés pour vos clients. Le devis inclut automatiquement vos tarifs, la distance estimée et le prix calculé. Une fois accepté, le devis se transforme en course.",
    tips: [
      "Envoyez un devis avant chaque course pour plus de transparence",
      "Le client reçoit un document professionnel avec votre marque",
      "Un devis accepté se convertit automatiquement en course"
    ],
    targetTab: "devis",
    importance: "important"
  },
  {
    id: "invoices",
    icon: <CreditCard className="w-6 h-6" />,
    title: "Facturation",
    subtitle: "Factures automatiques et suivi financier",
    description: "Chaque course terminée génère automatiquement une facture. Suivez vos revenus, exportez vos factures pour votre comptabilité, et gardez une trace de tous vos paiements.",
    tips: [
      "Les factures sont générées automatiquement à la fin de chaque course",
      "Exportez en PDF pour votre comptable",
      "La TVA est calculée selon vos paramètres",
      "Suivez vos encaissements dans l'onglet Finances"
    ],
    targetTab: "factures",
    importance: "important"
  },
  {
    id: "finances",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Finances & Statistiques",
    subtitle: "Vue d'ensemble de votre activité",
    description: "Consultez vos revenus, le nombre de courses, et vos performances globales. Les statistiques vous aident à prendre les bonnes décisions pour développer votre activité.",
    tips: [
      "Suivez votre chiffre d'affaires en temps réel",
      "Analysez vos meilleures périodes pour optimiser votre planning",
      "Comparez vos performances mois par mois"
    ],
    targetTab: "finance",
    importance: "useful"
  },
  {
    id: "settings",
    icon: <Settings className="w-6 h-6" />,
    title: "Paramètres & Profil",
    subtitle: "Personnalisez votre vitrine et vos infos",
    description: "Complétez votre profil public : photo, véhicule, équipements, zones de service. C'est votre vitrine — les clients voient ces informations quand ils scannent votre QR Code.",
    tips: [
      "Une photo professionnelle augmente la confiance",
      "Listez vos équipements (siège bébé, WiFi, etc.)",
      "Votre profil public est ce que vos clients voient en premier"
    ],
    targetTab: "settings",
    importance: "useful"
  },
  {
    id: "premium",
    icon: <Crown className="w-6 h-6" />,
    title: "Fonctionnalités Premium",
    subtitle: "Pour aller encore plus loin — 9,99€/mois",
    description: "Avec Premium, débloquez les campagnes marketing automatisées, la prospection client, le réseau de partage de courses entre chauffeurs et bien plus. Quand vous êtes prêt à accélérer, Premium est là.",
    tips: [
      "Campagnes marketing : envoyez des promos à vos clients",
      "Réseau de partage : échangez des courses avec d'autres chauffeurs",
      "Prospection : trouvez de nouvelles opportunités",
      "Prix de lancement : 9,99€/mois sans engagement"
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

export function DriverTutorial({ onNavigateToTab, onComplete, isVisible }: DriverTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, step.id]));
    if (isLastStep) {
      onComplete();
    } else {
      const nextStep = TUTORIAL_STEPS[currentStep + 1];
      onNavigateToTab(nextStep.targetTab);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      const prevStep = TUTORIAL_STEPS[currentStep - 1];
      onNavigateToTab(prevStep.targetTab);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGoToTab = () => {
    onNavigateToTab(step.targetTab);
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isVisible) return null;

  const importanceColor = {
    critical: "border-red-500/30 bg-red-500/5",
    important: "border-amber-500/30 bg-amber-500/5",
    useful: "border-blue-500/30 bg-blue-500/5"
  };

  const importanceBadge = {
    critical: { label: "Essentiel", className: "bg-red-500/10 text-red-600 border-red-500/30" },
    important: { label: "Important", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    useful: { label: "Utile", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full sm:max-w-lg"
        >
          <Card className={`border-2 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden ${importanceColor[step.importance]}`}>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 p-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {currentStep + 1}/{TUTORIAL_STEPS.length}
                  </Badge>
                  <Badge variant="outline" className={importanceBadge[step.importance].className + " text-[10px]"}>
                    {importanceBadge[step.importance].label}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={handleSkip} className="h-7 w-7 rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Progress value={progress} className="h-1.5 mb-3" />

              {/* Step dots */}
              <div className="flex gap-1 justify-center">
                {TUTORIAL_STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStep
                        ? "w-6 bg-primary"
                        : completedSteps.has(s.id)
                        ? "w-1.5 bg-primary/60"
                        : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  step.importance === "critical"
                    ? "bg-gradient-to-br from-red-500 to-orange-500 text-white"
                    : step.importance === "important"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                    : "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                }`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/80 leading-relaxed">
                {step.description}
              </p>

              {/* Tips */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Lightbulb className="w-3.5 h-3.5" />
                  À retenir
                </div>
                <ul className="space-y-1.5">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground/70">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* See this section button */}
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToTab}
                  className="w-full text-xs gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Voir cette section maintenant
                </Button>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground text-xs"
                >
                  Passer
                </Button>
                <Button
                  onClick={handleNext}
                  size="sm"
                  className={`gap-1 font-semibold ${
                    isLastStep
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      : ""
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <Star className="w-4 h-4" />
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
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
