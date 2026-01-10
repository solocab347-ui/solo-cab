import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Plus, Trash2, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PeakPeriod {
  enabled: boolean;
  start: string | null;
  end: string | null;
  multiplier: number;
}

interface MultiplePeakHoursProps {
  period1: PeakPeriod;
  period2: PeakPeriod;
  period3: PeakPeriod;
  onPeriod1Change: (period: PeakPeriod) => void;
  onPeriod2Change: (period: PeakPeriod) => void;
  onPeriod3Change: (period: PeakPeriod) => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

const PeakPeriodEditor = ({
  period,
  onChange,
  label,
  onRemove,
  canRemove,
}: {
  period: PeakPeriod;
  onChange: (period: PeakPeriod) => void;
  label: string;
  onRemove?: () => void;
  canRemove: boolean;
}) => {
  if (!period.enabled) return null;

  return (
    <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-destructive" />
          <Label className="font-medium">{label}</Label>
        </div>
        {canRemove && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Début</Label>
          <Select
            value={period.start || ""}
            onValueChange={(value) => onChange({ ...period, start: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fin</Label>
          <Select
            value={period.end || ""}
            onValueChange={(value) => onChange({ ...period, end: value })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Multiplicateur</Label>
          <NumericInput
            value={period.multiplier}
            onChange={(value) => onChange({ ...period, multiplier: parseFloat(value) || 1 })}
            placeholder="1.5"
            min={1}
            max={3}
            step={0.1}
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">
            {period.multiplier ? `+${Math.round((period.multiplier - 1) * 100)}%` : "1.5 = +50%"}
          </p>
        </div>
      </div>
    </div>
  );
};

export const MultiplePeakHours = ({
  period1,
  period2,
  period3,
  onPeriod1Change,
  onPeriod2Change,
  onPeriod3Change,
}: MultiplePeakHoursProps) => {
  const activePeriods = [period1.enabled, period2.enabled, period3.enabled].filter(Boolean).length;
  const canAddMore = activePeriods < 3;

  const handleAddPeriod = () => {
    if (!period2.enabled) {
      onPeriod2Change({ enabled: true, start: "12:00", end: "14:00", multiplier: 1.3 });
    } else if (!period3.enabled) {
      onPeriod3Change({ enabled: true, start: "20:00", end: "23:00", multiplier: 1.2 });
    }
  };

  const handleRemovePeriod2 = () => {
    onPeriod2Change({ enabled: false, start: null, end: null, multiplier: 1 });
  };

  const handleRemovePeriod3 = () => {
    onPeriod3Change({ enabled: false, start: null, end: null, multiplier: 1 });
  };

  return (
    <div className="space-y-4">
      {/* Activation principale */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={period1.enabled}
            onCheckedChange={(checked) => {
              onPeriod1Change({ 
                ...period1, 
                enabled: checked,
                start: checked ? (period1.start || "07:00") : null,
                end: checked ? (period1.end || "09:30") : null,
                multiplier: checked ? (period1.multiplier || 1.5) : 1
              });
              // Désactiver les autres périodes si on désactive la première
              if (!checked) {
                onPeriod2Change({ enabled: false, start: null, end: null, multiplier: 1 });
                onPeriod3Change({ enabled: false, start: null, end: null, multiplier: 1 });
              }
            }}
          />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-destructive" />
            <Label>Activer les heures de pointe</Label>
          </div>
          {activePeriods > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activePeriods} période{activePeriods > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Périodes configurées */}
      {period1.enabled && (
        <div className="space-y-3 pl-0 md:pl-8">
          <PeakPeriodEditor
            period={period1}
            onChange={onPeriod1Change}
            label="Période 1 (ex: matin)"
            canRemove={false}
          />

          {period2.enabled && (
            <PeakPeriodEditor
              period={period2}
              onChange={onPeriod2Change}
              label="Période 2 (ex: midi)"
              onRemove={handleRemovePeriod2}
              canRemove={true}
            />
          )}

          {period3.enabled && (
            <PeakPeriodEditor
              period={period3}
              onChange={onPeriod3Change}
              label="Période 3 (ex: soir)"
              onRemove={handleRemovePeriod3}
              canRemove={true}
            />
          )}

          {/* Bouton ajouter période */}
          {canAddMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPeriod}
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Plus className="w-4 h-4" />
              Ajouter une période ({3 - activePeriods} restante{3 - activePeriods > 1 ? 's' : ''})
            </Button>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Jusqu'à 3 périodes d'heures de pointe avec tarifs différents
          </p>
        </div>
      )}
    </div>
  );
};
