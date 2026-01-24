import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DriverObjective } from './types';
import { toast } from 'sonner';
import { 
  Save, 
  TrendingUp, 
  Car, 
  Users, 
  Clock, 
  MapPin, 
  Star,
  Loader2,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarCheck
} from 'lucide-react';

interface ObjectivesSetupProps {
  objectives: DriverObjective[];
  onSave: (data: Partial<DriverObjective> & { period_type: string }) => Promise<any>;
}

const PERIOD_CONFIG = {
  daily: { label: 'Quotidien', icon: Calendar, color: 'text-blue-500' },
  weekly: { label: 'Hebdomadaire', icon: CalendarDays, color: 'text-purple-500' },
  monthly: { label: 'Mensuel', icon: CalendarRange, color: 'text-orange-500' },
  yearly: { label: 'Annuel', icon: CalendarCheck, color: 'text-green-500' },
};

export function ObjectivesSetup({ objectives, onSave }: ObjectivesSetupProps) {
  const [activePeriod, setActivePeriod] = useState<string>('daily');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const data: Record<string, any> = {};
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(period => {
      const existing = objectives.find(o => o.period_type === period);
      data[period] = {
        revenue_target: existing?.revenue_target || getDefaultValue(period, 'revenue'),
        courses_target: existing?.courses_target || getDefaultValue(period, 'courses'),
        new_clients_target: existing?.new_clients_target || getDefaultValue(period, 'clients'),
        hours_target: existing?.hours_target || getDefaultValue(period, 'hours'),
        km_target: existing?.km_target || getDefaultValue(period, 'km'),
        rating_target: existing?.rating_target || 4.5,
      };
    });
    return data;
  });

  function getDefaultValue(period: string, type: string): number {
    const multipliers: Record<string, number> = { daily: 1, weekly: 6, monthly: 25, yearly: 300 };
    const baseValues: Record<string, number> = { revenue: 200, courses: 8, clients: 1, hours: 10, km: 150 };
    return (baseValues[type] || 0) * (multipliers[period] || 1);
  }

  const handleSave = async (period: string) => {
    setSaving(true);
    try {
      await onSave({
        period_type: period,
        ...formData[period],
      });
      toast.success(`Objectifs ${PERIOD_CONFIG[period as keyof typeof PERIOD_CONFIG].label.toLowerCase()}s enregistrés`);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (period: string, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [period]: { ...prev[period], [field]: value }
    }));
  };

  const renderPeriodForm = (period: string) => {
    const data = formData[period];
    const config = PERIOD_CONFIG[period as keyof typeof PERIOD_CONFIG];
    const Icon = config.icon;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={`w-5 h-5 ${config.color}`} />
            Objectifs {config.label.toLowerCase()}s
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Chiffre d'affaires (€)
              </Label>
              <Input
                type="number"
                value={data.revenue_target}
                onChange={(e) => updateField(period, 'revenue_target', parseFloat(e.target.value) || 0)}
                placeholder="Ex: 200"
              />
            </div>

            {/* Courses */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-blue-500" />
                Nombre de courses
              </Label>
              <Input
                type="number"
                value={data.courses_target}
                onChange={(e) => updateField(period, 'courses_target', parseInt(e.target.value) || 0)}
                placeholder="Ex: 8"
              />
            </div>

            {/* New Clients */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                Nouveaux clients
              </Label>
              <Input
                type="number"
                value={data.new_clients_target}
                onChange={(e) => updateField(period, 'new_clients_target', parseInt(e.target.value) || 0)}
                placeholder="Ex: 1"
              />
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-orange-500" />
                Heures de travail
              </Label>
              <Input
                type="number"
                step="0.5"
                value={data.hours_target}
                onChange={(e) => updateField(period, 'hours_target', parseFloat(e.target.value) || 0)}
                placeholder="Ex: 10"
              />
            </div>

            {/* KM */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500" />
                Kilomètres
              </Label>
              <Input
                type="number"
                value={data.km_target}
                onChange={(e) => updateField(period, 'km_target', parseFloat(e.target.value) || 0)}
                placeholder="Ex: 150"
              />
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-amber-500" />
                Note moyenne cible
              </Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={data.rating_target}
                onChange={(e) => updateField(period, 'rating_target', parseFloat(e.target.value) || 4.5)}
                placeholder="Ex: 4.5"
              />
            </div>
          </div>

          <Button 
            onClick={() => handleSave(period)} 
            className="w-full"
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer les objectifs
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activePeriod} onValueChange={setActivePeriod}>
        <TabsList className="grid grid-cols-4 w-full">
          {Object.entries(PERIOD_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="flex flex-col gap-1 py-2">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className="text-[10px]">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(PERIOD_CONFIG).map(period => (
          <TabsContent key={period} value={period} className="mt-4">
            {renderPeriodForm(period)}
          </TabsContent>
        ))}
      </Tabs>

      {/* Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <h4 className="font-semibold text-sm mb-2">💡 Conseils pour définir vos objectifs</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Commencez par des objectifs réalistes basés sur votre historique</li>
            <li>• Les objectifs hebdomadaires sont souvent les plus motivants</li>
            <li>• Ajustez régulièrement selon votre progression</li>
            <li>• L'acquisition de nouveaux clients est clé pour la croissance</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
