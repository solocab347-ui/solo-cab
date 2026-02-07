import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, 
  TrendingUp, 
  Award,
  Star
} from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepExperienceProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const EXPERIENCE_OPTIONS = [
  {
    id: 'beginner',
    title: 'Débutant',
    description: 'Moins de 6 mois d\'expérience',
    icon: Sprout,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'intermediate',
    title: 'Intermédiaire',
    description: '6 mois à 2 ans d\'expérience',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'experienced',
    title: 'Expérimenté',
    description: '2 à 5 ans d\'expérience',
    icon: Award,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'expert',
    title: 'Expert',
    description: 'Plus de 5 ans d\'expérience',
    icon: Star,
    color: 'from-amber-500 to-orange-500'
  }
];

export function StepExperience({ data, onUpdate }: StepExperienceProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2">Quelle est votre expérience ?</h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Cela nous aidera à personnaliser vos objectifs et conseils
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-lg mx-auto px-1">
        {EXPERIENCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = data.experience === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onUpdate({ experience: option.id })}
              className={`relative p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {isSelected && (
                <Badge className="absolute -top-1.5 sm:-top-2 -right-1.5 sm:-right-2 bg-primary text-primary-foreground text-[8px] sm:text-[10px] px-1.5 sm:px-2">
                  Sélectionné
                </Badge>
              )}
              
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-2 sm:mb-3`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              
              <h3 className="font-semibold text-sm sm:text-base">{option.title}</h3>
              <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
