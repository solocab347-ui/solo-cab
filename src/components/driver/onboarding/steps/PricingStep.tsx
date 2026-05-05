import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Euro, Info, Navigation } from 'lucide-react';
import { APPROACH_DISTANCE_THRESHOLD_KM, APPROACH_MAX_RATE_PER_KM } from '@/lib/approachFee';

interface PricingStepProps {
  baseFare: string;
  perKmRate: string;
  minimumPrice: string;
  hourlyRate: string;
  approachEnabled?: boolean;
  approachPerKmRate?: string;
  onBaseFareChange: (v: string) => void;
  onPerKmRateChange: (v: string) => void;
  onMinimumPriceChange: (v: string) => void;
  onHourlyRateChange: (v: string) => void;
  onApproachEnabledChange?: (v: boolean) => void;
  onApproachPerKmRateChange?: (v: string) => void;
}

export function PricingStep({
  baseFare, perKmRate, minimumPrice, hourlyRate,
  approachEnabled = false, approachPerKmRate = '0',
  onBaseFareChange, onPerKmRateChange, onMinimumPriceChange, onHourlyRateChange,
  onApproachEnabledChange, onApproachPerKmRateChange,
}: PricingStepProps) {
  const approachRateNum = Math.min(
    Math.max(parseFloat(approachPerKmRate || '0') || 0, 0),
    APPROACH_MAX_RATE_PER_KM
  );

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

      {/* Prix d'approche — optionnel */}
      {onApproachEnabledChange && onApproachPerKmRateChange && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Prix d'approche</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Facturé au client si vous êtes à plus de {APPROACH_DISTANCE_THRESHOLD_KM} km
                </p>
              </div>
            </div>
            <Switch
              checked={!!approachEnabled}
              onCheckedChange={onApproachEnabledChange}
            />
          </div>

          {approachEnabled && (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Tarif par km d'approche</Label>
                  <span className="text-sm font-semibold text-primary">
                    {approachRateNum.toFixed(2)} €/km
                  </span>
                </div>
                <Slider
                  value={[approachRateNum]}
                  min={0}
                  max={APPROACH_MAX_RATE_PER_KM}
                  step={0.05}
                  onValueChange={(v) => onApproachPerKmRateChange(String(v[0]))}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0 €</span>
                  <span>{APPROACH_MAX_RATE_PER_KM.toFixed(2)} € max</span>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-semibold text-foreground">Exemple :</span> vous êtes à 5 km du client →
                  approche facturée <span className="font-semibold text-primary">{(5 * approachRateNum).toFixed(2)} €</span>
                  {' '}(5 km × {approachRateNum.toFixed(2)} €/km).
                  En dessous de {APPROACH_DISTANCE_THRESHOLD_KM} km : 0 €.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
