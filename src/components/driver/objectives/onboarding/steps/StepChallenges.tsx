import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Check, 
  Users,
  Clock,
  TrendingUp,
  Target,
  Map,
  Wallet,
  Brain,
  Smartphone
} from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepChallengesProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const CHALLENGES = [
  {
    id: 'finding_clients',
    title: 'Trouver de nouveaux clients',
    description: 'Difficultés à acquérir des clients directs',
    icon: Users
  },
  {
    id: 'time_management',
    title: 'Gestion du temps',
    description: 'Optimiser mes horaires de travail',
    icon: Clock
  },
  {
    id: 'platform_dependency',
    title: 'Dépendance aux plateformes',
    description: 'Trop de commissions, peu de liberté',
    icon: Smartphone
  },
  {
    id: 'revenue_stability',
    title: 'Revenus irréguliers',
    description: 'CA variable d\'un mois à l\'autre',
    icon: TrendingUp
  },
  {
    id: 'client_retention',
    title: 'Fidélisation clients',
    description: 'Faire revenir les clients',
    icon: Target
  },
  {
    id: 'know_good_spots',
    title: 'Connaître les bons spots',
    description: 'Où et quand trouver des courses',
    icon: Map
  },
  {
    id: 'pricing',
    title: 'Fixer mes tarifs',
    description: 'Tarification juste et compétitive',
    icon: Wallet
  },
  {
    id: 'motivation',
    title: 'Rester motivé',
    description: 'Garder l\'énergie au quotidien',
    icon: Brain
  }
];

export function StepChallenges({ data, onUpdate }: StepChallengesProps) {
  const toggleChallenge = (challengeId: string) => {
    const current = data.challenges;
    if (current.includes(challengeId)) {
      onUpdate({ challenges: current.filter(c => c !== challengeId) });
    } else {
      onUpdate({ challenges: [...current, challengeId] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Vos défis actuels</h2>
        <p className="text-muted-foreground">
          Sur quoi avez-vous besoin d'aide ? (Sélectionnez 1 à 4 défis)
        </p>
      </div>

      <div className="space-y-4 max-w-lg mx-auto">
        {/* Challenges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHALLENGES.map((challenge) => {
            const Icon = challenge.icon;
            const isSelected = data.challenges.includes(challenge.id);
            const isDisabled = !isSelected && data.challenges.length >= 4;
            
            return (
              <button
                key={challenge.id}
                onClick={() => !isDisabled && toggleChallenge(challenge.id)}
                disabled={isDisabled}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isDisabled
                      ? 'border-border opacity-50 cursor-not-allowed'
                      : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4 className={`font-semibold text-sm ${isSelected ? 'text-primary' : ''}`}>
                    {challenge.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">{challenge.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selection Counter */}
        <div className="text-center">
          <Badge variant={data.challenges.length > 0 ? 'default' : 'secondary'}>
            {data.challenges.length}/4 défis sélectionnés
          </Badge>
        </div>

        {/* Selected Challenges Preview */}
        {data.challenges.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <p className="text-sm font-medium mb-2">L'IA vous aidera sur :</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {data.challenges.map(cId => {
                  const challenge = CHALLENGES.find(c => c.id === cId);
                  return (
                    <li key={cId} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      {challenge?.title}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
