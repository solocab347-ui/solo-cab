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
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      {/* Header compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <h4 className="font-semibold text-slate-800 text-sm">{label}</h4>
        </div>
        {canRemove && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Form compact - inline */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={period.start || ""}
          onValueChange={(value) => onChange({ ...period, start: value })}
        >
          <SelectTrigger className="h-9 w-20 bg-white border border-slate-300 text-slate-900 font-medium text-sm rounded-md">
            <SelectValue placeholder="--:--" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={time} value={time} className="text-sm">
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-slate-500 text-sm">→</span>
        
        <Select
          value={period.end || ""}
          onValueChange={(value) => onChange({ ...period, end: value })}
        >
          <SelectTrigger className="h-9 w-20 bg-white border border-slate-300 text-slate-900 font-medium text-sm rounded-md">
            <SelectValue placeholder="--:--" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((time) => (
              <SelectItem key={time} value={time} className="text-sm">
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={period.multiplier.toString()}
          onValueChange={(value) => onChange({ ...period, multiplier: parseFloat(value) })}
        >
          <SelectTrigger className="h-9 w-24 bg-emerald-50 border border-emerald-400 rounded-md">
            <span className="text-emerald-700 font-bold text-sm">+{currentPercentage}%</span>
          </SelectTrigger>
          <SelectContent>
            {PERCENTAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                <span className="text-emerald-700 font-semibold">{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
    <div className="space-y-3">
      {/* Activation principale - compact */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-300">
        <div className="flex items-center gap-3">
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
            className="data-[state=checked]:bg-amber-500 scale-90"
          />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-800 text-sm">Heures de pointe</span>
          </div>
        </div>
        {activePeriods > 0 && (
          <Badge variant="secondary" className="bg-amber-500 text-white text-xs px-2 py-0.5">
            {activePeriods} période{activePeriods > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Périodes - compact */}
      {period1.enabled && (
        <div className="space-y-2">
          <PeakPeriodEditor
            period={period1}
            onChange={onPeriod1Change}
            label="Matin"
            emoji="🌅"
            canRemove={false}
          />

          {period2.enabled && (
            <PeakPeriodEditor
              period={period2}
              onChange={onPeriod2Change}
              label="Midi"
              emoji="☀️"
              onRemove={handleRemovePeriod2}
              canRemove={true}
            />
          )}

          {period3.enabled && (
            <PeakPeriodEditor
              period={period3}
              onChange={onPeriod3Change}
              label="Soir"
              emoji="🌙"
              onRemove={handleRemovePeriod3}
              canRemove={true}
            />
          )}

          {canAddMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPeriod}
              className="w-full h-8 gap-2 text-amber-700 border border-dashed border-amber-400 hover:bg-amber-50 text-xs font-medium bg-white rounded-lg"
            >
              <Plus className="w-3 h-3" />
              + Période ({3 - activePeriods} restante{3 - activePeriods > 1 ? 's' : ''})
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
