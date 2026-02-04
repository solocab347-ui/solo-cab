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
  const [selectedWhys, setSelectedWhys] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [motivation, setMotivation] = useState<'high' | 'medium' | 'low' | ''>('');
  const [saving, setSaving] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedWhys.length > 0;
      case 1: return selectedValues.length >= 2;
      case 2: return !!motivation;
      case 3: return true;
      default: return false;
    }
  };

  const toggleWhy = (whyId: string) => {
    setSelectedWhys(prev => 
      prev.includes(whyId) 
        ? prev.filter(w => w !== whyId)
        : [...prev, whyId]
    );
  };

  const selectAllWhys = () => {
    if (selectedWhys.length === WHY_SOLOCAB.length) {
      setSelectedWhys([]);
    } else {
      setSelectedWhys(WHY_SOLOCAB.map(w => w.id));
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
            why_solocab: selectedWhys,
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
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-3"
              >
                <Compass className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Pourquoi SoloCab ?
              </h2>
              <p className="text-sm text-muted-foreground">
                Qu'est-ce qui t'amène ici ? (Plusieurs choix possibles)
              </p>
            </div>

            {/* Bouton Tout sélectionner */}
            <div className="flex justify-center mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllWhys}
                className={cn(
                  "text-xs",
                  selectedWhys.length === WHY_SOLOCAB.length && "bg-primary text-primary-foreground"
                )}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {selectedWhys.length === WHY_SOLOCAB.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {WHY_SOLOCAB.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedWhys.includes(option.id);
                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => toggleWhy(option.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all relative",
                      isSelected 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                    )}
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
                      isSelected ? "bg-primary" : "bg-muted"
                    )}>
                      <Icon className={cn("w-4 h-4", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{option.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{option.description}</p>
                  </motion.button>
                );
              })}
            </div>

            {selectedWhys.length > 0 && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-primary mt-3"
              >
                {selectedWhys.length} sélectionné{selectedWhys.length > 1 ? 's' : ''}
              </motion.p>
            )}
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-3"
              >
                <Star className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Tes valeurs
              </h2>
              <p className="text-sm text-muted-foreground">
                Ce qui compte le plus pour toi
              </p>
              <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
                Sélectionne au moins 2 valeurs
              </Badge>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
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
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
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
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-3"
              >
                <Lightbulb className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ton niveau d'engagement
              </h2>
              <p className="text-sm text-muted-foreground">
                Combien es-tu prêt à investir ?
              </p>
            </div>

            <div className="space-y-2 max-w-sm mx-auto">
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
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                    motivation === option.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">{option.label}</h3>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
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
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-3"
              >
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Bienvenue dans la communauté !
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Tu rejoins des chauffeurs qui ont fait le choix de l'indépendance.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 max-w-sm mx-auto mb-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <HandHeart className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Notre engagement</span>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Pas de commission sur tes courses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Tes clients t'appartiennent</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>Support et coaching personnalisé</span>
                </li>
              </ul>
            </motion.div>

            <Button
              onClick={handleComplete}
              disabled={saving}
              size="lg"
              className="mx-auto"
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
      <div className="flex-shrink-0 flex justify-center gap-2 py-3">
        {VISION_STEPS.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-emerald-500" : "w-2 bg-muted"
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

        {currentStep > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < VISION_STEPS.length - 1 && canProceed() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      {currentStep < VISION_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-3 px-4 py-3">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 h-11"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-11"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
