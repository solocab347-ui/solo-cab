import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

const PERCENTAGE_OPTIONS = [
  { value: 1.1, label: "+10%" },
  { value: 1.15, label: "+15%" },
  { value: 1.2, label: "+20%" },
  { value: 1.25, label: "+25%" },
  { value: 1.3, label: "+30%" },
  { value: 1.4, label: "+40%" },
  { value: 1.5, label: "+50%" },
];

const PeakPeriodEditor = ({
  period,
  onChange,
  label,
  emoji,
  onRemove,
  canRemove,
}: {
  period: PeakPeriod;
  onChange: (period: PeakPeriod) => void;
  label: string;
  emoji: string;
  onRemove?: () => void;
  canRemove: boolean;
}) => {
  if (!period.enabled) return null;

  const currentPercentage = Math.round((period.multiplier - 1) * 100);

  return (
    <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <h4 className="font-bold text-slate-900 text-lg">{label}</h4>
        </div>
        {canRemove && onRemove && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="text-red-600 border-red-300 hover:bg-red-50 h-9 px-3"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Supprimer
          </Button>
        )}
      </div>
      
      {/* Form Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Heure de début */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
            Début
          </label>
          <Select
            value={period.start || ""}
            onValueChange={(value) => onChange({ ...period, start: value })}
          >
            <SelectTrigger className="h-14 bg-white border-2 border-slate-300 text-slate-900 font-bold text-xl rounded-xl shadow-sm">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time} className="text-lg font-medium">
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Heure de fin */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
            Fin
          </label>
          <Select
            value={period.end || ""}
            onValueChange={(value) => onChange({ ...period, end: value })}
          >
            <SelectTrigger className="h-14 bg-white border-2 border-slate-300 text-slate-900 font-bold text-xl rounded-xl shadow-sm">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time} className="text-lg font-medium">
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Majoration */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
            Majoration
          </label>
          <Select
            value={period.multiplier.toString()}
            onValueChange={(value) => onChange({ ...period, multiplier: parseFloat(value) })}
          >
            <SelectTrigger className="h-14 bg-emerald-50 border-2 border-emerald-400 rounded-xl shadow-sm">
              <span className="inline-flex items-center justify-center bg-emerald-500 text-white font-bold text-lg px-4 py-1 rounded-lg">
                +{currentPercentage}%
              </span>
            </SelectTrigger>
            <SelectContent>
              {PERCENTAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <span className="inline-flex items-center gap-2">
                    <span className="bg-emerald-500 text-white font-bold px-3 py-1 rounded-md">
                      {option.label}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Résumé */}
      <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-center text-slate-800 font-medium">
          ⏰ De <strong className="text-blue-700">{period.start || "--:--"}</strong>
          {" "}à{" "}
          <strong className="text-blue-700">{period.end || "--:--"}</strong>
          {" "}→{" "}
          <span className="inline-flex items-center bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg">
            +{currentPercentage}%
          </span>
        </p>
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
      onPeriod2Change({ enabled: true, start: "12:00", end: "14:00", multiplier: 1.2 });
    } else if (!period3.enabled) {
      onPeriod3Change({ enabled: true, start: "18:00", end: "20:00", multiplier: 1.3 });
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
      <div className="flex items-center justify-between p-5 rounded-2xl bg-amber-50 border-2 border-amber-300">
        <div className="flex items-center gap-4">
          <Switch
            checked={period1.enabled}
            onCheckedChange={(checked) => {
              onPeriod1Change({ 
                ...period1, 
                enabled: checked,
                start: checked ? (period1.start || "07:00") : null,
                end: checked ? (period1.end || "09:30") : null,
                multiplier: checked ? (period1.multiplier || 1.2) : 1
              });
              if (!checked) {
                onPeriod2Change({ enabled: false, start: null, end: null, multiplier: 1 });
                onPeriod3Change({ enabled: false, start: null, end: null, multiplier: 1 });
              }
            }}
            className="data-[state=checked]:bg-amber-500"
          />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-600" />
            <span className="font-bold text-slate-900 text-lg">Heures de pointe</span>
          </div>
        </div>
        {activePeriods > 0 && (
          <span className="bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-full">
            {activePeriods} période{activePeriods > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Périodes */}
      {period1.enabled && (
        <div className="space-y-4">
          <PeakPeriodEditor
            period={period1}
            onChange={onPeriod1Change}
            label="Période 1 (matin)"
            emoji="🌅"
            canRemove={false}
          />

          {period2.enabled && (
            <PeakPeriodEditor
              period={period2}
              onChange={onPeriod2Change}
              label="Période 2 (midi)"
              emoji="☀️"
              onRemove={handleRemovePeriod2}
              canRemove={true}
            />
          )}

          {period3.enabled && (
            <PeakPeriodEditor
              period={period3}
              onChange={onPeriod3Change}
              label="Période 3 (soir)"
              emoji="🌙"
              onRemove={handleRemovePeriod3}
              canRemove={true}
            />
          )}

          {canAddMore && (
            <Button
              variant="outline"
              onClick={handleAddPeriod}
              className="w-full h-14 gap-3 text-amber-700 border-2 border-dashed border-amber-400 hover:border-amber-500 hover:bg-amber-50 font-bold text-lg bg-white rounded-xl"
            >
              <Plus className="w-6 h-6" />
              Ajouter une période ({3 - activePeriods} restante{3 - activePeriods > 1 ? 's' : ''})
            </Button>
          )}

          <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
            <Clock className="w-5 h-5 text-slate-500" />
            <p className="text-slate-700 font-medium">
              Jusqu'à 3 périodes de majoration différentes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
