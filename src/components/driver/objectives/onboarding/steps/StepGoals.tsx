import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
 import { TrendingUp, Users, Target, Rocket, Shield, Heart, Coins, Quote } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';

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
   const lang = 'fr'; // TODO: get from context
   const objectives = motivationTranslations.objectives;
   
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
       <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Vos objectifs</h2>
         <p className="text-sm text-muted-foreground whitespace-pre-line">
           {objectives.intro[lang]}
        </p>
      </div>
 
       {/* Key Phrase - Motivation */}
       <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 text-center max-w-md mx-auto">
         <div className="flex items-center justify-center gap-2 mb-2">
           <Quote className="w-4 h-4 text-primary" />
         </div>
         <p className="text-sm font-semibold text-foreground whitespace-pre-line italic">
           {objectives.keyPhrase[lang]}
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

        {/* Target Direct Clients - MENSUEL */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <Label className="font-semibold">Objectif clients / mois</Label>
                <p className="text-xs text-muted-foreground">Nouveaux clients fidèles chaque mois</p>
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">
                MENSUEL
              </Badge>
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
              <span className="text-lg font-semibold text-muted-foreground">clients/mois</span>
            </div>
            <Slider
              value={[data.targetDirectClients]}
              onValueChange={([v]) => onUpdate({ targetDirectClients: v })}
              max={200}
              step={5}
              className="mt-3"
            />
            
            {/* Projection annuelle et indépendance */}
            <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-600">Projection annuelle</span>
              </div>
              <p className="text-lg font-bold text-foreground">
                {data.targetDirectClients * 12} clients fidèles en 1 an
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.targetDirectClients} clients/mois × 12 mois
              </p>
            </div>
            
            {/* Indicateur d'indépendance */}
            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Vers l'indépendance</span>
              </div>
              {data.targetDirectClients * 12 >= 70 ? (
                <p className="text-xs text-muted-foreground">
                  ✅ Avec <strong>{data.targetDirectClients * 12} clients</strong> sur l'année, tu seras en bonne voie pour te libérer des plateformes !
                  <span className="block mt-1 text-green-600 font-medium">
                    70+ clients fidèles = indépendance réelle
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  💡 Objectif indépendance : <strong>70 clients fidèles minimum</strong>.
                  <span className="block mt-1">
                    Avec {data.targetDirectClients}/mois, tu auras {data.targetDirectClients * 12} clients en fin d'année.
                    {data.targetDirectClients > 0 && (
                      <span className="text-amber-600 font-medium block">
                        Vise au moins {Math.ceil(70 / 12)} clients/mois pour l'indépendance !
                      </span>
                    )}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
