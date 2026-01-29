import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, Percent } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepCurrentSituationProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepCurrentSituation({ data, onUpdate }: StepCurrentSituationProps) {
  // Local state for numeric inputs to allow clearing
  const [revenueValue, setRevenueValue] = useState(data.currentMonthlyRevenue.toString());
  const [clientsValue, setClientsValue] = useState(data.currentDirectClients.toString());

  const handleRevenueChange = (value: string) => {
    setRevenueValue(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ currentMonthlyRevenue: numValue });
  };

  const handleClientsChange = (value: string) => {
    setClientsValue(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ currentDirectClients: numValue });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Votre situation actuelle</h2>
        <p className="text-muted-foreground">
          Où en êtes-vous aujourd'hui ? (estimations mensuelles moyennes)
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Current Revenue */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <Label className="font-semibold">Chiffre d'affaires mensuel actuel</Label>
                <p className="text-xs text-muted-foreground">Revenus bruts moyens par mois</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NumericInput
                value={revenueValue}
                onChange={handleRevenueChange}
                allowEmpty={true}
                min={0}
                max={15000}
                className="text-lg font-semibold"
              />
              <span className="text-lg font-semibold text-muted-foreground">€/mois</span>
            </div>
            <Slider
              value={[data.currentMonthlyRevenue]}
              onValueChange={([v]) => onUpdate({ currentMonthlyRevenue: v })}
              max={15000}
              step={100}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0€</span>
              <span>15 000€</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Direct Clients */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <Label className="font-semibold">Clients directs actuels</Label>
                <p className="text-xs text-muted-foreground">Clients réguliers hors plateformes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NumericInput
                value={clientsValue}
                onChange={handleClientsChange}
                allowEmpty={true}
                min={0}
                max={100}
                className="text-lg font-semibold"
              />
              <span className="text-lg font-semibold text-muted-foreground">clients</span>
            </div>
            <Slider
              value={[data.currentDirectClients]}
              onValueChange={([v]) => onUpdate({ currentDirectClients: v })}
              max={100}
              step={1}
              className="mt-3"
            />
          </CardContent>
        </Card>

        {/* SoloCab Percentage */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="font-semibold">% CA via SoloCab</Label>
                <p className="text-xs text-muted-foreground">Part de votre CA en clients directs</p>
              </div>
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold text-primary">{data.soloCabPercentage}%</span>
            </div>
            <Slider
              value={[data.soloCabPercentage]}
              onValueChange={([v]) => onUpdate({ soloCabPercentage: v })}
              max={100}
              step={5}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0% (100% plateformes)</span>
              <span>100% (indépendant)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
