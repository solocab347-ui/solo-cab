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
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Quelle est votre expérience ?</h2>
        <p className="text-muted-foreground">
          Cela nous aidera à personnaliser vos objectifs et conseils
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        {EXPERIENCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = data.experience === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => onUpdate({ experience: option.id })}
              className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              {isSelected && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px]">
                  Sélectionné
                </Badge>
              )}
              
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="font-semibold">{option.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
