import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StepWelcome } from '@/components/driver/objectives/onboarding/steps/StepWelcome';
import { StepExperience } from '@/components/driver/objectives/onboarding/steps/StepExperience';
import { StepCurrentSituation } from '@/components/driver/objectives/onboarding/steps/StepCurrentSituation';
import { StepGoals } from '@/components/driver/objectives/onboarding/steps/StepGoals';
import { StepWorkRhythm } from '@/components/driver/objectives/onboarding/steps/StepWorkRhythm';
import { StepPlatforms } from '@/components/driver/objectives/onboarding/steps/StepPlatforms';
import { StepChallenges } from '@/components/driver/objectives/onboarding/steps/StepChallenges';
import { StepAIAnalysis } from '@/components/driver/objectives/onboarding/steps/StepAIAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface DaySchedule {
  dayIndex: number;
  label: string;
  shortLabel: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export interface OnboardingObjectivesData {
  experience: string;
  currentMonthlyRevenue: number;
  currentDirectClients: number;
  targetMonthlyRevenue: number;
  targetDirectClients: number;
  workHoursPerDay: number;
  workDaysPerWeek: number;
  preferredSchedule: string;
  weekSchedule?: DaySchedule[];
  platformsUsed: string[];
  soloCabPercentage: number;
  mainGoal: string;
  challenges: string[];
}

interface OnboardingObjectivesStepProps {
  driverId: string;
  onComplete: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Bienvenue', icon: Sparkles },
  { id: 'experience', title: 'Expérience', icon: Clock },
  { id: 'situation', title: 'Situation', icon: TrendingUp },
  { id: 'goals', title: 'Objectifs', icon: Target },
  { id: 'rhythm', title: 'Rythme', icon: Clock },
  { id: 'platforms', title: 'Plateformes', icon: Users },
  { id: 'challenges', title: 'Défis', icon: Target },
  { id: 'analysis', title: 'Analyse', icon: Sparkles },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingObjectivesStep({ driverId, onComplete }: OnboardingObjectivesStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<OnboardingObjectivesData>({
    experience: '',
    currentMonthlyRevenue: 0,
    currentDirectClients: 0,
    targetMonthlyRevenue: 5000,
    targetDirectClients: 20,
    workHoursPerDay: 8,
    workDaysPerWeek: 5,
    preferredSchedule: 'standard',
    platformsUsed: [],
    soloCabPercentage: 0,
    mainGoal: '',
    challenges: [],
  });

  const updateData = (updates: Partial<OnboardingObjectivesData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return !!data.experience;
      case 2: return true;
      case 3: return data.targetMonthlyRevenue > 0 && !!data.mainGoal;
      case 4: return data.workHoursPerDay > 0 && data.workDaysPerWeek > 0;
      case 5: return data.platformsUsed.length > 0;
      case 6: return data.challenges.length > 0;
      case 7: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
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

  const handleComplete = async (aiRecommendations: string) => {
    try {
      const updatePayload: Record<string, any> = {
        objectives_completed: true,
        objectives_data: data,
        ai_coaching_recommendations: aiRecommendations,
        onboarding_objectives_completed: true,
      };
      
      await supabase
        .from('drivers')
        .update(updatePayload)
        .eq('id', driverId);

      toast.success('Vos objectifs sont configurés !');
      onComplete();
    } catch (error) {
      console.error('Error saving objectives:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <StepWelcome onSkip={undefined} />;
      case 1: return <StepExperience data={data} onUpdate={updateData} />;
      case 2: return <StepCurrentSituation data={data} onUpdate={updateData} />;
      case 3: return <StepGoals data={data} onUpdate={updateData} />;
      case 4: return <StepWorkRhythm data={data} onUpdate={updateData} />;
      case 5: return <StepPlatforms data={data} onUpdate={updateData} />;
      case 6: return <StepChallenges data={data} onUpdate={updateData} />;
      case 7: return <StepAIAnalysis data={data} driverId={driverId} onComplete={handleComplete} />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header compact */}
      <div className="flex-shrink-0 text-center py-3">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center mb-2">
          <Target className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white">Ta Vision</h2>
        <p className="text-sm text-white/60">Configure ton coach IA</p>
      </div>

      {/* Progress dots */}
      <div className="flex-shrink-0 flex justify-center gap-1.5 py-2">
        {STEPS.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-emerald-500" : "bg-white/20"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-hidden relative"
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
            className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Swipe hints */}
        {currentStep > 0 && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < STEPS.length - 1 && canProceed() && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      {currentStep < STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-3 px-4 py-3">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 h-11 text-white/60 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-11 bg-primary"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
