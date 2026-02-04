import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Clock,
  TrendingUp,
  CheckCircle
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
  { id: 'analysis', title: 'Analyse IA', icon: Sparkles },
];

export function OnboardingObjectivesStep({ driverId, onComplete }: OnboardingObjectivesStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
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
      case 0: return true; // Welcome
      case 1: return !!data.experience;
      case 2: return true; // Situation has defaults
      case 3: return data.targetMonthlyRevenue > 0 && !!data.mainGoal;
      case 4: return data.workHoursPerDay > 0 && data.workDaysPerWeek > 0;
      case 5: return data.platformsUsed.length > 0;
      case 6: return data.challenges.length > 0;
      case 7: return true; // AI Analysis
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async (aiRecommendations: string) => {
    try {
      // Save objectives data to driver record - use type assertion for new columns
      const updateData: Record<string, any> = {
        objectives_completed: true,
        objectives_data: data,
        ai_coaching_recommendations: aiRecommendations,
        onboarding_objectives_completed: true,
      };
      
      await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);

      toast.success('Vos objectifs sont configurés ! Votre coach IA est prêt.');
      onComplete();
    } catch (error) {
      console.error('Error saving objectives:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome onSkip={undefined} />;
      case 1:
        return <StepExperience data={data} onUpdate={updateData} />;
      case 2:
        return <StepCurrentSituation data={data} onUpdate={updateData} />;
      case 3:
        return <StepGoals data={data} onUpdate={updateData} />;
      case 4:
        return <StepWorkRhythm data={data} onUpdate={updateData} />;
      case 5:
        return <StepPlatforms data={data} onUpdate={updateData} />;
      case 6:
        return <StepChallenges data={data} onUpdate={updateData} />;
      case 7:
        return <StepAIAnalysis data={data} driverId={driverId} onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-3">
          <Target className="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-bold">Définissez vos objectifs</h2>
        <p className="text-sm text-muted-foreground">
          Configurez votre coach IA pour maximiser votre réussite
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Étape {currentStep + 1} sur {STEPS.length}
          </span>
          <span className="font-medium">{STEPS[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        
        {/* Mini step indicators */}
        <div className="flex justify-between px-1">
          {STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`w-2 h-2 rounded-full transition-all ${
                index < currentStep 
                  ? 'bg-primary' 
                  : index === currentStep 
                    ? 'bg-primary/60 ring-2 ring-primary/30' 
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < STEPS.length - 1 && (
        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            size="sm"
            className="flex-1"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
