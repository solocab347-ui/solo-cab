import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Euro, Info } from 'lucide-react';

interface PricingStepProps {
  baseFare: string;
  perKmRate: string;
  minimumPrice: string;
  hourlyRate: string;
  onBaseFareChange: (v: string) => void;
  onPerKmRateChange: (v: string) => void;
  onMinimumPriceChange: (v: string) => void;
  onHourlyRateChange: (v: string) => void;
}

export function PricingStep({
  baseFare, perKmRate, minimumPrice, hourlyRate,
  onBaseFareChange, onPerKmRateChange, onMinimumPriceChange, onHourlyRateChange,
}: PricingStepProps) {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Euro className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Vos tarifs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Définissez votre grille tarifaire de base
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Vous pourrez ajuster ces tarifs à tout moment depuis votre tableau de bord, y compris les majorations heures de pointe, soirées et week-ends.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Prise en charge (€) *</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="5.00"
                value={baseFare}
                onChange={(e) => onBaseFareChange(e.target.value)}
                className="h-12 bg-input pr-8"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Prix / km (€) *</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="1.50"
                value={perKmRate}
                onChange={(e) => onPerKmRateChange(e.target.value)}
                className="h-12 bg-input pr-8"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Minimum de course (€)</Label>
            <div className="relative">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="15"
                value={minimumPrice}
                onChange={(e) => onMinimumPriceChange(e.target.value)}
                className="h-12 bg-input pr-8"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Taux horaire (€/h)</Label>
            <div className="relative">
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="35"
                value={hourlyRate}
                onChange={(e) => onHourlyRateChange(e.target.value)}
                className="h-12 bg-input pr-8"
                inputMode="decimal"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {baseFare && perKmRate && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-foreground mb-2">Aperçu pour une course de 15 km :</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimation</span>
            <span className="text-lg font-bold text-primary">
              {(parseFloat(baseFare || '0') + parseFloat(perKmRate || '0') * 15).toFixed(2)} €
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
