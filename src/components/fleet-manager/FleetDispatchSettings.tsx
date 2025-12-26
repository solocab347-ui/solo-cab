import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, MapPin, Zap, Users, Navigation, Clock, Brain, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetDispatchSettingsProps {
  fleetManagerId: string;
}

interface DispatchSettings {
  auto_validate_courses: boolean;
  auto_dispatch_enabled: boolean;
  dispatch_priority: "proximity" | "availability" | "rating";
  favorite_driver_priority: boolean;
  assignment_mode: string;
  course_buffer_minutes: number;
  smart_buffer_enabled: boolean;
  smart_buffer_min_minutes: number;
  smart_buffer_fallback_action: "notify_manager" | "assign_available" | "auto_reject";
}

export const FleetDispatchSettings = ({ fleetManagerId }: FleetDispatchSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DispatchSettings>({
    auto_validate_courses: true,
    auto_dispatch_enabled: false,
    dispatch_priority: "proximity",
    favorite_driver_priority: true,
    assignment_mode: "manual",
    course_buffer_minutes: 60,
    smart_buffer_enabled: false,
    smart_buffer_min_minutes: 15,
    smart_buffer_fallback_action: "notify_manager",
  });

  useEffect(() => {
    fetchSettings();
  }, [fleetManagerId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("auto_validate_courses, auto_dispatch_enabled, dispatch_priority, favorite_driver_priority, assignment_mode, course_buffer_minutes, smart_buffer_enabled, smart_buffer_min_minutes, smart_buffer_fallback_action")
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          auto_validate_courses: data.auto_validate_courses !== false,
          auto_dispatch_enabled: data.auto_dispatch_enabled || false,
          dispatch_priority: (data.dispatch_priority as DispatchSettings["dispatch_priority"]) || "proximity",
          favorite_driver_priority: data.favorite_driver_priority !== false,
          assignment_mode: data.assignment_mode || "manual",
          course_buffer_minutes: data.course_buffer_minutes || 60,
          smart_buffer_enabled: data.smart_buffer_enabled || false,
          smart_buffer_min_minutes: data.smart_buffer_min_minutes || 15,
          smart_buffer_fallback_action: (data.smart_buffer_fallback_action as DispatchSettings["smart_buffer_fallback_action"]) || "notify_manager",
        });
      }
    } catch (error) {
      console.error("Error fetching dispatch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          auto_dispatch_enabled: settings.auto_dispatch_enabled,
          dispatch_priority: settings.dispatch_priority,
          favorite_driver_priority: settings.favorite_driver_priority,
          assignment_mode: settings.auto_dispatch_enabled ? "automatic" : settings.assignment_mode,
          course_buffer_minutes: settings.course_buffer_minutes,
          smart_buffer_enabled: settings.smart_buffer_enabled,
          smart_buffer_min_minutes: settings.smart_buffer_min_minutes,
          smart_buffer_fallback_action: settings.smart_buffer_fallback_action,
        })
        .eq("id", fleetManagerId);

      if (error) throw error;
      toast.success("Paramètres de dispatch mis à jour");
    } catch (error) {
      console.error("Error saving dispatch settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode de validation des courses */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Mode de Validation des Courses
          </CardTitle>
          <CardDescription>
            Choisissez comment les nouvelles courses sont validées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-medium">
                  Validation automatique
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings.auto_validate_courses 
                    ? "Les courses sont automatiquement confirmées dès leur création"
                    : "Vous devez approuver chaque course manuellement avant confirmation"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${!settings.auto_validate_courses ? "text-foreground" : "text-muted-foreground"}`}>Manuel</span>
              <Switch
                checked={settings.auto_validate_courses}
                onCheckedChange={async (checked) => {
                  try {
                    const { error } = await supabase
                      .from("fleet_managers")
                      .update({ auto_validate_courses: checked })
                      .eq("id", fleetManagerId);
                    
                    if (error) throw error;
                    setSettings({ ...settings, auto_validate_courses: checked });
                    toast.success(checked ? "Validation automatique activée" : "Validation manuelle activée");
                  } catch (error) {
                    console.error("Error updating validation mode:", error);
                    toast.error("Erreur lors de la mise à jour");
                  }
                }}
              />
              <span className={`text-sm font-medium ${settings.auto_validate_courses ? "text-foreground" : "text-muted-foreground"}`}>Auto</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch automatique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Dispatch Automatique
          </CardTitle>
          <CardDescription>
            Activez le dispatch automatique pour assigner les courses intelligemment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="auto_dispatch" className="text-base font-medium">
                Activer le dispatch automatique
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Les courses seront automatiquement attribuées aux chauffeurs selon vos critères
              </p>
            </div>
            <Switch
              id="auto_dispatch"
              checked={settings.auto_dispatch_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_dispatch_enabled: checked })}
            />
          </div>

          {settings.auto_dispatch_enabled && (
            <>
              {/* Critère de priorité */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Critère de priorité</Label>
                <RadioGroup
                  value={settings.dispatch_priority}
                  onValueChange={(value) => setSettings({ ...settings, dispatch_priority: value as DispatchSettings["dispatch_priority"] })}
                  className="grid gap-3"
                >
                  <div 
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.dispatch_priority === "proximity" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="proximity" id="proximity" />
                    <div className="flex-1">
                      <Label htmlFor="proximity" className="flex items-center gap-2 cursor-pointer">
                        <MapPin className="w-4 h-4 text-primary" />
                        Proximité
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Privilégie le chauffeur le plus proche du lieu de prise en charge
                      </p>
                    </div>
                  </div>

                  <div 
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.dispatch_priority === "availability" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="availability" id="availability" />
                    <div className="flex-1">
                      <Label htmlFor="availability" className="flex items-center gap-2 cursor-pointer">
                        <Users className="w-4 h-4 text-primary" />
                        Disponibilité
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Privilégie le chauffeur avec le moins de courses dans son planning
                      </p>
                    </div>
                  </div>

                  <div 
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.dispatch_priority === "rating" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="rating" id="rating" />
                    <div className="flex-1">
                      <Label htmlFor="rating" className="flex items-center gap-2 cursor-pointer">
                        <Navigation className="w-4 h-4 text-primary" />
                        Note
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Privilégie le chauffeur avec la meilleure note client
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Priorité au chauffeur favori */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="favorite_priority" className="text-base font-medium">
                    Priorité au chauffeur favori
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Si le client a un chauffeur favori disponible, il sera privilégié
                  </p>
                </div>
                <Switch
                  id="favorite_priority"
                  checked={settings.favorite_driver_priority}
                  onCheckedChange={(checked) => setSettings({ ...settings, favorite_driver_priority: checked })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Buffer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Temps de buffer entre les courses
          </CardTitle>
          <CardDescription>
            Définissez le temps entre deux courses pour vos chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Buffer Intelligent */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="smart_buffer" className="text-base font-medium">
                  Buffer Intelligent
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Calcule automatiquement le temps nécessaire entre les courses en fonction des trajets
                </p>
              </div>
            </div>
            <Switch
              id="smart_buffer"
              checked={settings.smart_buffer_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, smart_buffer_enabled: checked })}
            />
          </div>

          {settings.smart_buffer_enabled ? (
            <div className="space-y-4 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <Alert className="bg-blue-50 border-blue-200">
                <Brain className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Mode Intelligent activé :</strong> Le système analyse la position de dépose de la course précédente 
                  et calcule le temps de trajet vers le nouveau lieu de prise en charge pour déterminer si le chauffeur peut accepter.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="min_buffer" className="min-w-fit">Buffer minimum :</Label>
                  <Select
                    value={settings.smart_buffer_min_minutes.toString()}
                    onValueChange={(value) => setSettings({ ...settings, smart_buffer_min_minutes: parseInt(value) })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes (recommandé)</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Temps minimum ajouté au temps de trajet calculé pour tenir compte des imprévus.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Action si timing trop serré :</Label>
                <RadioGroup
                  value={settings.smart_buffer_fallback_action}
                  onValueChange={(value) => setSettings({ ...settings, smart_buffer_fallback_action: value as DispatchSettings["smart_buffer_fallback_action"] })}
                  className="space-y-2"
                >
                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.smart_buffer_fallback_action === "notify_manager" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}>
                    <RadioGroupItem value="notify_manager" id="notify_manager" />
                    <div className="flex-1">
                      <Label htmlFor="notify_manager" className="cursor-pointer font-medium">Notifier le gestionnaire</Label>
                      <p className="text-xs text-muted-foreground">La course vous est envoyée pour attribution manuelle</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.smart_buffer_fallback_action === "assign_available" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}>
                    <RadioGroupItem value="assign_available" id="assign_available" />
                    <div className="flex-1">
                      <Label htmlFor="assign_available" className="cursor-pointer font-medium">Attribuer à un autre chauffeur</Label>
                      <p className="text-xs text-muted-foreground">Recherche automatique d'un autre chauffeur disponible</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    settings.smart_buffer_fallback_action === "auto_reject" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}>
                    <RadioGroupItem value="auto_reject" id="auto_reject" />
                    <div className="flex-1">
                      <Label htmlFor="auto_reject" className="cursor-pointer font-medium">Mettre en attente</Label>
                      <p className="text-xs text-muted-foreground">La course reste en attente d'attribution</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="buffer" className="min-w-fit">Temps de buffer fixe :</Label>
                <Select
                  value={settings.course_buffer_minutes.toString()}
                  onValueChange={(value) => setSettings({ ...settings, course_buffer_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 heure (recommandé)</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Ce buffer fixe sera appliqué avant et après chaque course lors de la recherche de disponibilité.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info fonctionnement global */}
      <Card className="border-info/20 bg-info/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-info">
            <AlertTriangle className="w-5 h-5" />
            Résumé du fonctionnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-background/50 border border-border/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Validation des courses
              </h4>
              <p className="text-sm text-muted-foreground">
                {settings.auto_validate_courses 
                  ? "✓ Les courses clients sont automatiquement confirmées"
                  : "⚠ Vous devez approuver chaque course manuellement"
                }
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-border/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Attribution des chauffeurs
              </h4>
              <p className="text-sm text-muted-foreground">
                {settings.auto_dispatch_enabled 
                  ? `✓ Attribution automatique (priorité: ${
                      settings.dispatch_priority === "proximity" ? "proximité" :
                      settings.dispatch_priority === "availability" ? "disponibilité" : "note"
                    })`
                  : "⚠ Attribution manuelle des chauffeurs"
                }
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-border/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Buffer entre courses
              </h4>
              <p className="text-sm text-muted-foreground">
                {settings.smart_buffer_enabled 
                  ? `✓ Buffer intelligent (min: ${settings.smart_buffer_min_minutes} min)`
                  : `✓ Buffer fixe de ${settings.course_buffer_minutes} minutes`
                }
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border border-border/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Chauffeur favori
              </h4>
              <p className="text-sm text-muted-foreground">
                {settings.favorite_driver_priority 
                  ? "✓ Le chauffeur favori du client est prioritaire"
                  : "⚠ Pas de priorité au chauffeur favori"
                }
              </p>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <p className="text-sm">
              <strong>Note :</strong> Les chauffeurs indépendants peuvent configurer la réception automatique 
              dans leur espace. Si un chauffeur refuse une course, elle sera redirigée vers "Courses à redistribuer".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer les paramètres
        </Button>
      </div>
    </div>
  );
};
