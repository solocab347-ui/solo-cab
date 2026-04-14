import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from 'lucide-react';
import { cn } from '@/lib/utils';

export const VEHICLE_COLORS = [
  { value: 'noir', label: 'Noir', hex: '#1a1a1a' },
  { value: 'blanc', label: 'Blanc', hex: '#f5f5f5' },
  { value: 'gris', label: 'Gris', hex: '#9ca3af' },
  { value: 'bleu', label: 'Bleu', hex: '#3b82f6' },
  { value: 'rouge', label: 'Rouge', hex: '#ef4444' },
  { value: 'vert', label: 'Vert', hex: '#22c55e' },
  { value: 'beige', label: 'Beige', hex: '#d4a76a' },
  { value: 'marron', label: 'Marron', hex: '#78350f' },
  { value: 'argent', label: 'Argent', hex: '#c0c0c0' },
  { value: 'or', label: 'Or', hex: '#d4af37' },
  { value: 'orange', label: 'Orange', hex: '#f97316' },
  { value: 'violet', label: 'Violet', hex: '#8b5cf6' },
];

interface VehicleStepProps {
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehicleSeats: string;
  onBrandChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSeatsChange: (v: string) => void;
}

export function VehicleStep({
  vehicleBrand, vehicleModel, vehicleYear, vehicleColor, vehicleSeats,
  onBrandChange, onModelChange, onYearChange, onColorChange, onSeatsChange,
}: VehicleStepProps) {
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Car className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Votre véhicule</h2>
        <p className="text-sm text-muted-foreground mt-1">Décrivez votre véhicule pour vos futurs clients</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Marque *</Label>
            <Input placeholder="Mercedes, BMW..." value={vehicleBrand} onChange={(e) => onBrandChange(e.target.value)} className="h-12 bg-input" autoFocus />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Modèle *</Label>
            <Input placeholder="Classe E, Série 5..." value={vehicleModel} onChange={(e) => onModelChange(e.target.value)} className="h-12 bg-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1.5 block">Année</Label>
            <Select value={vehicleYear} onValueChange={onYearChange}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Places passagers</Label>
            <Select value={vehicleSeats} onValueChange={onSeatsChange}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} place{n > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Couleur *</Label>
          <div className="grid grid-cols-6 gap-2">
            {VEHICLE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg transition-all border-2',
                  vehicleColor === c.value ? 'border-primary bg-primary/5 scale-105' : 'border-transparent hover:bg-muted/50'
                )}
              >
                <div className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: c.hex }} />
                <span className="text-[9px] text-muted-foreground">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
