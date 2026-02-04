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
import { StepWelcome } from './steps/StepWelcome';
import { StepExperience } from './steps/StepExperience';
import { StepCurrentSituation } from './steps/StepCurrentSituation';
import { StepGoals } from './steps/StepGoals';
import { StepWorkRhythm } from './steps/StepWorkRhythm';
import { StepPlatforms } from './steps/StepPlatforms';
import { StepChallenges } from './steps/StepChallenges';
import { StepAIAnalysis } from './steps/StepAIAnalysis';
import { toast } from 'sonner';

export interface DaySchedule {
  dayIndex: number;
  label: string;
  shortLabel: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export interface OnboardingData {
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

interface OnboardingWizardProps {
  driverId: string;
  onComplete: (data: OnboardingData, aiRecommendations: string) => void;
  onSkip?: () => void;
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

export function OnboardingWizard({ driverId, onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
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

  const updateData = (updates: Partial<OnboardingData>) => {
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

  const handleComplete = (aiRecommendations: string) => {
    onComplete(data, aiRecommendations);
    toast.success('Configuration terminée ! Votre coach IA est prêt.');
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome onSkip={onSkip} />;
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
    <div className="min-h-[80vh] flex flex-col">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Étape {currentStep + 1} sur {STEPS.length}
          </span>
          <span className="text-sm font-medium">{STEPS[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between mt-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div 
                key={step.id}
                className={`flex flex-col items-center ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted 
                    ? 'bg-primary text-primary-foreground' 
                    : isCurrent 
                      ? 'bg-primary/20 border-2 border-primary' 
                      : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] mt-1 hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="flex-1">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      {currentStep < STEPS.length - 1 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
