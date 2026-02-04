import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Shield,
  Heart,
  Rocket,
  HandHeart,
  Star,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingObjectivesStepProps {
  driverId: string;
  onComplete: () => void;
}

// Étapes simplifiées et recentrées sur l'identité SoloCab
const VISION_STEPS = [
  { id: 'why', title: 'Pourquoi' },
  { id: 'values', title: 'Valeurs' },
  { id: 'motivation', title: 'Motivation' },
  { id: 'commitment', title: 'Engagement' },
];

const WHY_SOLOCAB = [
  {
    id: 'freedom',
    icon: Rocket,
    title: 'La liberté',
    description: 'Gérer mon activité comme je le souhaite'
  },
  {
    id: 'clients',
    icon: Users,
    title: 'Mes clients',
    description: 'Construire ma propre clientèle fidèle'
  },
  {
    id: 'revenue',
    icon: TrendingUp,
    title: 'Mes revenus',
    description: 'Garder 100% de ce que je gagne'
  },
  {
    id: 'balance',
    icon: Heart,
    title: 'Mon équilibre',
    description: 'Concilier travail et vie personnelle'
  }
];

const CORE_VALUES = [
  { id: 'independence', icon: Shield, label: 'Indépendance' },
  { id: 'quality', icon: Star, label: 'Qualité de service' },
  { id: 'trust', icon: HandHeart, label: 'Confiance client' },
  { id: 'growth', icon: TrendingUp, label: 'Croissance' },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingObjectivesStep({ driverId, onComplete }: OnboardingObjectivesStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedWhy, setSelectedWhy] = useState<string>('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [motivation, setMotivation] = useState<'high' | 'medium' | 'low' | ''>('');
  const [saving, setSaving] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!selectedWhy;
      case 1: return selectedValues.length >= 2;
      case 2: return !!motivation;
      case 3: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < VISION_STEPS.length - 1 && canProceed()) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;

    if (swipe > SWIPE_THRESHOLD || velocity > 500) {
      prevStep();
    } else if ((swipe < -SWIPE_THRESHOLD || velocity < -500) && canProceed()) {
      nextStep();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await supabase
        .from('drivers')
        .update({
          objectives_completed: true,
          onboarding_objectives_completed: true,
          objectives_data: {
            why_solocab: selectedWhy,
            core_values: selectedValues,
            motivation_level: motivation,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', driverId);

      toast.success('Ta vision est enregistrée !');
      onComplete();
    } catch (error) {
      console.error('Error saving vision:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleValue = (valueId: string) => {
    setSelectedValues(prev => 
      prev.includes(valueId) 
        ? prev.filter(v => v !== valueId)
        : [...prev, valueId]
    );
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col h-full justify-center">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-4"
              >
                <Compass className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Pourquoi SoloCab ?
              </h2>
              <p className="text-sm text-white/60">
                Qu'est-ce qui t'amène ici aujourd'hui ?
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {WHY_SOLOCAB.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedWhy === option.id;
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedWhy(option.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      isSelected 
                        ? "border-primary bg-primary/20" 
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                      isSelected ? "bg-primary" : "bg-white/10"
                    )}>
                      <Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-white/60")} />
                    </div>
                    <h3 className="font-semibold text-white text-sm">{option.title}</h3>
                    <p className="text-xs text-white/50 mt-1">{option.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-4"
              >
                <Star className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Tes valeurs
              </h2>
              <p className="text-sm text-white/60">
                Choisis ce qui compte le plus pour toi
              </p>
              <Badge className="mt-2 bg-primary/20 text-primary border-primary/30">
                Sélectionne au moins 2 valeurs
              </Badge>
            </div>

            <div className="flex flex-wrap justify-center gap-3 max-w-sm mx-auto">
              {CORE_VALUES.map((value) => {
                const Icon = value.icon;
                const isSelected = selectedValues.includes(value.id);
                return (
                  <motion.button
                    key={value.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => toggleValue(value.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-full border-2 transition-all",
                      isSelected 
                        ? "border-primary bg-primary/20" 
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-white/60")} />
                    <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-white/80")}>
                      {value.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-4"
              >
                <Lightbulb className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Ton niveau d'engagement
              </h2>
              <p className="text-sm text-white/60">
                Combien es-tu prêt à investir dans ton indépendance ?
              </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
              {[
                { id: 'high', label: 'Tout donner', desc: 'Je suis prêt à m\'investir à 100%', emoji: '🔥' },
                { id: 'medium', label: 'Progresser', desc: 'J\'avance à mon rythme', emoji: '📈' },
                { id: 'low', label: 'Découvrir', desc: 'Je veux d\'abord tester', emoji: '🔍' },
              ].map((option) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setMotivation(option.id as any)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                    motivation === option.id 
                      ? "border-primary bg-primary/20" 
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{option.label}</h3>
                    <p className="text-xs text-white/50">{option.desc}</p>
                  </div>
                  {motivation === option.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-4"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Bienvenue dans la communauté !
              </h2>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Tu rejoins des chauffeurs qui ont fait le choix de l'indépendance. 
                SoloCab est là pour t'accompagner.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary/10 to-emerald-500/10 border border-primary/20 rounded-xl p-4 max-w-sm mx-auto mb-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <HandHeart className="w-5 h-5 text-primary" />
                <span className="font-semibold text-white text-sm">Notre engagement</span>
              </div>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Pas de commission sur tes courses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Tes clients t'appartiennent</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Support et coaching personnalisé</span>
                </li>
              </ul>
            </motion.div>

            <Button
              onClick={handleComplete}
              disabled={saving}
              size="lg"
              className="mx-auto bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-white font-semibold px-8"
            >
              {saving ? 'Enregistrement...' : 'Commencer l\'aventure'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Progress dots */}
      <div className="flex-shrink-0 flex justify-center gap-2 py-4">
        {VISION_STEPS.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-emerald-500" : "w-2 bg-white/20"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-hidden relative px-4"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-0 flex flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Swipe hints */}
        {currentStep > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < VISION_STEPS.length - 1 && canProceed() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation - sauf dernière étape */}
      {currentStep < VISION_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-3 px-4 py-4">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 h-12 text-white/60 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-12 bg-primary hover:bg-primary/90"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
