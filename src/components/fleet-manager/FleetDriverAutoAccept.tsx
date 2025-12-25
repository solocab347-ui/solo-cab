import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetDriverAutoAcceptProps {
  driverId: string;
  fleetManagerId: string;
}

export const FleetDriverAutoAccept = ({ driverId, fleetManagerId }: FleetDriverAutoAcceptProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptAutoCourses, setAcceptAutoCourses] = useState(true);
  const [fleetManagerSettings, setFleetManagerSettings] = useState<{
    auto_dispatch_enabled: boolean;
    company_name: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [driverId, fleetManagerId]);

  const fetchSettings = async () => {
    try {
      // Fetch driver's auto accept setting
      const { data: driverData, error: driverError } = await supabase
        .from("fleet_manager_drivers")
        .select("accept_auto_courses")
        .eq("driver_id", driverId)
        .eq("fleet_manager_id", fleetManagerId)
        .maybeSingle();

      if (driverError) throw driverError;

      // Fetch fleet manager's dispatch settings
      const { data: fleetData, error: fleetError } = await supabase
        .from("fleet_managers")
        .select("auto_dispatch_enabled, company_name")
        .eq("id", fleetManagerId)
        .single();

      if (fleetError) throw fleetError;

      setAcceptAutoCourses(driverData?.accept_auto_courses !== false);
      setFleetManagerSettings({
        auto_dispatch_enabled: fleetData?.auto_dispatch_enabled || false,
        company_name: fleetData?.company_name || "Gestionnaire de flotte",
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({ accept_auto_courses: acceptAutoCourses })
        .eq("driver_id", driverId)
        .eq("fleet_manager_id", fleetManagerId);

      if (error) throw error;
      toast.success("Préférences mises à jour");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de la sauvegarde");
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Réception automatique des courses
        </CardTitle>
        <CardDescription>
          Configurez comment vous recevez les courses de {fleetManagerSettings?.company_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!fleetManagerSettings?.auto_dispatch_enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Le dispatch automatique n'est pas activé par votre gestionnaire de flotte. 
              Les courses vous seront assignées manuellement.
            </AlertDescription>
          </Alert>
        )}

        {fleetManagerSettings?.auto_dispatch_enabled && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label htmlFor="accept_auto" className="text-base font-medium">
                  Accepter les courses automatiquement
                </Label>
                <p className="text-sm text-muted-foreground">
                  {acceptAutoCourses 
                    ? "Les courses vous seront attribuées automatiquement dans votre planning"
                    : "Chaque course devra être validée par vous avant d'être confirmée"
                  }
                </p>
              </div>
              <Switch
                id="accept_auto"
                checked={acceptAutoCourses}
                onCheckedChange={setAcceptAutoCourses}
              />
            </div>

            <div className="p-4 rounded-lg bg-info/10 border border-info/20">
              <p className="text-sm">
                <strong>Note :</strong> Même avec l'acceptation automatique activée, vous pouvez 
                toujours refuser une course si vous n'êtes pas disponible. Elle sera alors 
                renvoyée au gestionnaire pour réassignation.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
