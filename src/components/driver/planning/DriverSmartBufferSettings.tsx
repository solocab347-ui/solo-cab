import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Clock, 
  Bell, 
  X, 
  Share2,
  Save,
  Loader2,
  Sparkles,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDriverPremium } from '@/hooks/useDriverPremium';

interface DriverSmartBufferSettingsProps {
  driverId: string;
}

interface SmartBufferSettings {
  smart_buffer_enabled: boolean;
  smart_buffer_min_minutes: number;
  smart_buffer_fallback_action: 'notify' | 'auto_decline' | 'share_with_partner';
  auto_accept_from_partners: boolean;
  max_daily_courses: number | null;
}

export function DriverSmartBufferSettings({ driverId }: DriverSmartBufferSettingsProps) {
  const { isPremium } = useDriverPremium();
  const [settings, setSettings] = useState<SmartBufferSettings>({
    smart_buffer_enabled: false,
    smart_buffer_min_minutes: 15,
    smart_buffer_fallback_action: 'notify',
    auto_accept_from_partners: false,
    max_daily_courses: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [driverId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('smart_buffer_enabled, smart_buffer_min_minutes, smart_buffer_fallback_action, auto_accept_from_partners, max_daily_courses')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          smart_buffer_enabled: data.smart_buffer_enabled || false,
          smart_buffer_min_minutes: data.smart_buffer_min_minutes || 15,
          smart_buffer_fallback_action: (data.smart_buffer_fallback_action as SmartBufferSettings['smart_buffer_fallback_action']) || 'notify',
          auto_accept_from_partners: data.auto_accept_from_partners || false,
          max_daily_courses: data.max_daily_courses
        });
      }
    } catch (error) {
      console.error('Error fetching smart buffer settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          smart_buffer_enabled: settings.smart_buffer_enabled,
          smart_buffer_min_minutes: settings.smart_buffer_min_minutes,
          smart_buffer_fallback_action: settings.smart_buffer_fallback_action,
          auto_accept_from_partners: settings.auto_accept_from_partners,
          max_daily_courses: settings.max_daily_courses
        })
        .eq('id', driverId);

      if (error) throw error;
      toast.success('Paramètres mis à jour');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Agenda Intelligent
          </CardTitle>
          <CardDescription>
            Gérez automatiquement vos disponibilités et le temps entre les courses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle principal */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-medium">Activer l'agenda intelligent</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Calcule automatiquement si vous avez le temps d'accepter une course
                </p>
              </div>
            </div>
            <Switch
              checked={settings.smart_buffer_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, smart_buffer_enabled: checked })}
            />
          </div>

          {settings.smart_buffer_enabled && (
            <div className="space-y-6 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <Alert className="bg-blue-50 border-blue-200">
                <Brain className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  L'agenda intelligent analyse vos courses et calcule le temps de trajet entre elles pour vous éviter les retards.
                </AlertDescription>
              </Alert>

              {/* Buffer minimum */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Buffer minimum entre courses</Label>
                  <p className="text-xs text-muted-foreground">
                    Temps minimum de repos entre deux courses
                  </p>
                </div>
                <Select
                  value={settings.smart_buffer_min_minutes.toString()}
                  onValueChange={(value) => setSettings({ ...settings, smart_buffer_min_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action si conflit */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Action si le timing est trop serré</Label>
                <RadioGroup
                  value={settings.smart_buffer_fallback_action}
                  onValueChange={(value) => setSettings({ ...settings, smart_buffer_fallback_action: value as SmartBufferSettings['smart_buffer_fallback_action'] })}
                  className="space-y-2"
                >
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.smart_buffer_fallback_action === 'notify' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="notify" id="notify" />
                    <Bell className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                      <Label htmlFor="notify" className="cursor-pointer font-medium">
                        Me notifier
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Je décide moi-même d'accepter ou non
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.smart_buffer_fallback_action === 'auto_decline' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="auto_decline" id="auto_decline" />
                    <X className="w-4 h-4 text-destructive" />
                    <div className="flex-1">
                      <Label htmlFor="auto_decline" className="cursor-pointer font-medium">
                        Refuser automatiquement
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        La course sera automatiquement déclinée
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    !isPremium 
                      ? 'border-muted bg-muted/30 opacity-60 cursor-not-allowed'
                      : settings.smart_buffer_fallback_action === 'share_with_partner' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="share_with_partner" id="share_with_partner" disabled={!isPremium} />
                    {isPremium ? (
                      <Share2 className="w-4 h-4 text-success" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <Label htmlFor="share_with_partner" className={`cursor-pointer font-medium ${!isPremium ? 'text-muted-foreground' : ''}`}>
                        Proposer à un partenaire
                        {!isPremium && <Badge variant="outline" className="ml-2 text-[10px] px-1.5">Premium</Badge>}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isPremium 
                          ? 'La course sera partagée avec mes partenaires'
                          : 'Passez au Premium (19,99€/mois) pour partager automatiquement'
                        }
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Max courses par jour */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Limite de courses par jour</Label>
                  <p className="text-xs text-muted-foreground">
                    Nombre maximum de courses acceptées par jour
                  </p>
                </div>
                <Select
                  value={settings.max_daily_courses?.toString() || 'unlimited'}
                  onValueChange={(value) => setSettings({ 
                    ...settings, 
                    max_daily_courses: value === 'unlimited' ? null : parseInt(value) 
                  })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Illimité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">Illimité</SelectItem>
                    <SelectItem value="5">5 courses</SelectItem>
                    <SelectItem value="8">8 courses</SelectItem>
                    <SelectItem value="10">10 courses</SelectItem>
                    <SelectItem value="12">12 courses</SelectItem>
                    <SelectItem value="15">15 courses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Auto-accept from partners */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${isPremium ? 'bg-muted/50' : 'bg-muted/30 opacity-60'}`}>
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                Acceptation auto des partenaires
                {!isPremium && <Badge variant="outline" className="text-[10px] px-1.5">Premium</Badge>}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isPremium 
                  ? 'Accepter automatiquement les courses de mes partenaires de confiance'
                  : 'Disponible avec le Premium à 19,99€/mois'
                }
              </p>
            </div>
            <Switch
              checked={settings.auto_accept_from_partners}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_accept_from_partners: checked })}
              disabled={!isPremium}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder les paramètres
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
