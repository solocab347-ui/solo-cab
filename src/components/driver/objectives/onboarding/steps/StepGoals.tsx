import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Target, Rocket, Shield, Heart, Coins } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepGoalsProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const MAIN_GOALS = [
  {
    id: 'independence',
    title: 'Indépendance',
    description: 'Réduire ma dépendance aux plateformes',
    icon: Rocket
  },
  {
    id: 'revenue',
    title: 'Augmenter mes revenus',
    description: 'Maximiser mon chiffre d\'affaires',
    icon: Coins
  },
  {
    id: 'balance',
    title: 'Équilibre vie pro/perso',
    description: 'Travailler moins, gagner autant',
    icon: Heart
  },
  {
    id: 'security',
    title: 'Sécurité financière',
    description: 'Revenus stables et prévisibles',
    icon: Shield
  }
];

export function StepGoals({ data, onUpdate }: StepGoalsProps) {
  // Local state for numeric inputs to allow clearing
  const [revenueValue, setRevenueValue] = useState(data.targetMonthlyRevenue.toString());
  const [clientsValue, setClientsValue] = useState(data.targetDirectClients.toString());

  const handleRevenueChange = (value: string) => {
    setRevenueValue(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ targetMonthlyRevenue: numValue });
  };

  const handleClientsChange = (value: string) => {
    setClientsValue(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ targetDirectClients: numValue });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Vos objectifs</h2>
        <p className="text-muted-foreground">
          Où voulez-vous aller ? Définissons des objectifs ambitieux mais réalistes
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Main Goal Selection */}
        <div className="space-y-3">
          <Label className="font-semibold">Votre objectif principal</Label>
          <div className="grid grid-cols-2 gap-3">
            {MAIN_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = data.mainGoal === goal.id;
              
              return (
                <button
                  key={goal.id}
                  onClick={() => onUpdate({ mainGoal: goal.id })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h4 className="text-sm font-semibold">{goal.title}</h4>
                  <p className="text-[10px] text-muted-foreground">{goal.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Revenue */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <Label className="font-semibold">Objectif CA mensuel</Label>
                <p className="text-xs text-muted-foreground">Votre cible de revenus</p>
              </div>
              {data.targetMonthlyRevenue > data.currentMonthlyRevenue && (
                <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                  +{Math.round(((data.targetMonthlyRevenue - data.currentMonthlyRevenue) / Math.max(data.currentMonthlyRevenue, 1)) * 100)}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <NumericInput
                value={revenueValue}
                onChange={handleRevenueChange}
                allowEmpty={true}
                min={1000}
                max={20000}
                className="text-lg font-semibold"
              />
              <span className="text-lg font-semibold text-muted-foreground">€/mois</span>
            </div>
            <Slider
              value={[data.targetMonthlyRevenue]}
              onValueChange={([v]) => onUpdate({ targetMonthlyRevenue: v })}
              min={1000}
              max={20000}
              step={250}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 000€</span>
              <span>20 000€</span>
            </div>
          </CardContent>
        </Card>

        {/* Target Direct Clients */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <Label className="font-semibold">Objectif clients directs</Label>
                <p className="text-xs text-muted-foreground">Base de clients fidèles à construire</p>
              </div>
              {data.targetDirectClients > data.currentDirectClients && (
                <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">
                  +{data.targetDirectClients - data.currentDirectClients} clients
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <NumericInput
                value={clientsValue}
                onChange={handleClientsChange}
                allowEmpty={true}
                min={0}
                max={200}
                className="text-lg font-semibold"
              />
              <span className="text-lg font-semibold text-muted-foreground">clients</span>
            </div>
            <Slider
              value={[data.targetDirectClients]}
              onValueChange={([v]) => onUpdate({ targetDirectClients: v })}
              max={200}
              step={5}
              className="mt-3"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
