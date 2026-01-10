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

// Options de pourcentage claires
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

  const currentPercentage = Math.round((period.multiplier - 1) * 100);

  return (
    <div className="p-4 rounded-xl border-2 bg-white border-orange-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">{label}</span>
        </div>
        {canRemove && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Heure de début */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-800">Début</Label>
          <Select
            value={period.start || ""}
            onValueChange={(value) => onChange({ ...period, start: value })}
          >
            <SelectTrigger className="h-12 bg-white border-2 border-gray-300 font-bold text-gray-900 text-lg">
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
        
        {/* Heure de fin */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-800">Fin</Label>
          <Select
            value={period.end || ""}
            onValueChange={(value) => onChange({ ...period, end: value })}
          >
            <SelectTrigger className="h-12 bg-white border-2 border-gray-300 font-bold text-gray-900 text-lg">
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
        
        {/* Majoration en pourcentage - SIMPLIFIÉ */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-gray-800">Majoration</Label>
          <Select
            value={period.multiplier.toString()}
            onValueChange={(value) => onChange({ ...period, multiplier: parseFloat(value) })}
          >
            <SelectTrigger className="h-12 bg-orange-50 border-2 border-orange-400 font-bold text-orange-700 text-lg">
              <SelectValue>
                <Badge className="bg-orange-500 text-white font-bold text-base px-3 py-1">
                  +{currentPercentage}%
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERCENTAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <span className="flex items-center gap-2">
                    <Badge className="bg-orange-500 text-white font-bold">
                      {option.label}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Résumé clair */}
      <div className="mt-4 p-3 bg-orange-100 rounded-lg border border-orange-300">
        <p className="text-base text-center text-gray-900 font-medium">
          De <span className="font-bold text-gray-900">{period.start || "--:--"}</span>
          {" "}à{" "}
          <span className="font-bold text-gray-900">{period.end || "--:--"}</span>
          {" "}: {" "}
          <Badge className="bg-orange-500 text-white font-bold">
            +{currentPercentage}% sur le tarif
          </Badge>
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
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-orange-400">
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
          />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <Label className="font-bold text-gray-900">Activer les heures de pointe</Label>
          </div>
        </div>
        {activePeriods > 0 && (
          <Badge className="bg-orange-500 text-white font-bold text-sm px-3">
            {activePeriods} période{activePeriods > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Périodes configurées */}
      {period1.enabled && (
        <div className="space-y-4">
          <PeakPeriodEditor
            period={period1}
            onChange={onPeriod1Change}
            label="🌅 Période 1 (matin)"
            canRemove={false}
          />

          {period2.enabled && (
            <PeakPeriodEditor
              period={period2}
              onChange={onPeriod2Change}
              label="☀️ Période 2 (midi)"
              onRemove={handleRemovePeriod2}
              canRemove={true}
            />
          )}

          {period3.enabled && (
            <PeakPeriodEditor
              period={period3}
              onChange={onPeriod3Change}
              label="🌙 Période 3 (soir)"
              onRemove={handleRemovePeriod3}
              canRemove={true}
            />
          )}

          {/* Bouton ajouter période */}
          {canAddMore && (
            <Button
              variant="outline"
              onClick={handleAddPeriod}
              className="w-full gap-2 h-12 text-orange-600 border-2 border-dashed border-orange-400 hover:border-orange-500 hover:bg-orange-50 font-bold bg-white"
            >
              <Plus className="w-5 h-5" />
              Ajouter une période ({3 - activePeriods} restante{3 - activePeriods > 1 ? 's' : ''})
            </Button>
          )}

          <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg border border-gray-300">
            <Clock className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-700 font-medium">
              Configurez jusqu'à 3 périodes avec des majorations différentes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
