import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Globe, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  Save,
  Loader2,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FleetPublicProfileSettingsProps {
  fleetManagerId: string;
  companyName: string;
  showDriversInPublic: boolean;
  onUpdate: () => void;
}

export const FleetPublicProfileSettings = ({
  fleetManagerId,
  companyName,
  showDriversInPublic,
  onUpdate
}: FleetPublicProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [showDrivers, setShowDrivers] = useState(showDriversInPublic);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          show_drivers_in_public_storefront: showDrivers,
        })
        .eq("id", fleetManagerId);

      if (error) throw error;

      toast.success("Paramètres mis à jour");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Profil Public</h2>
                <p className="text-sm text-muted-foreground">
                  Gérez votre visibilité sur SoloCab
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`/flotte/${fleetManagerId}`, '_blank')}
            >
              <Eye className="w-4 h-4" />
              Aperçu
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Visibilité de la flotte
          </CardTitle>
          <CardDescription>
            Décidez ce qui est visible sur votre profil public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show Drivers Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex-1">
              <Label className="text-base font-medium">Afficher les chauffeurs</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Vos chauffeurs seront visibles sur la vitrine publique SoloCab et sur votre profil
              </p>
            </div>
            <Switch
              checked={showDrivers}
              onCheckedChange={setShowDrivers}
            />
          </div>

          {showDrivers && (
            <div className="p-4 bg-success/10 rounded-xl border border-success/20">
              <p className="text-sm text-success flex items-center gap-2">
                <span className="text-lg">✓</span>
                Vos chauffeurs apparaissent dans la recherche publique et sur votre profil
              </p>
            </div>
          )}

          {/* Info about what's displayed */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Informations affichées sur votre profil :
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm">{companyName}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">Téléphone de contact</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">Email de contact</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">Adresse de l'entreprise</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
