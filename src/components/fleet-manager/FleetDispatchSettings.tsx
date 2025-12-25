import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, MapPin, Zap, Users, Navigation } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FleetDispatchSettingsProps {
  fleetManagerId: string;
}

interface DispatchSettings {
  auto_dispatch_enabled: boolean;
  dispatch_priority: "proximity" | "availability" | "rating";
  favorite_driver_priority: boolean;
  assignment_mode: string;
}

export const FleetDispatchSettings = ({ fleetManagerId }: FleetDispatchSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DispatchSettings>({
    auto_dispatch_enabled: false,
    dispatch_priority: "proximity",
    favorite_driver_priority: true,
    assignment_mode: "manual",
  });

  useEffect(() => {
    fetchSettings();
  }, [fleetManagerId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select("auto_dispatch_enabled, dispatch_priority, favorite_driver_priority, assignment_mode")
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          auto_dispatch_enabled: data.auto_dispatch_enabled || false,
          dispatch_priority: (data.dispatch_priority as DispatchSettings["dispatch_priority"]) || "proximity",
          favorite_driver_priority: data.favorite_driver_priority !== false,
          assignment_mode: data.assignment_mode || "manual",
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

      {/* Info chauffeurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Configuration des chauffeurs
          </CardTitle>
          <CardDescription>
            Chaque chauffeur peut choisir s'il accepte les courses automatiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-info/10 border border-info/20">
            <p className="text-sm">
              <strong>Note :</strong> Les chauffeurs indépendants peuvent activer/désactiver la réception 
              automatique des courses dans leur espace. Si un chauffeur refuse une course, 
              elle sera redirigée vers l'onglet "Courses à redistribuer".
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
