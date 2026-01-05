import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Euro, Percent, Clock, Moon, Calendar, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FleetPricingSettingsProps {
  fleetManagerId: string;
}

interface PricingData {
  base_fare: number;
  per_km_rate: number;
  hourly_rate: number;
  minimum_price: number;
  tva_rate: number;
  tva_included: boolean;
  evening_surcharge: number;
  weekend_surcharge: number;
  airport_surcharge: number;
  default_commission_percentage: number;
  assignment_mode: string;
  favorite_driver_priority: boolean;
}

export const FleetPricingSettings = ({ fleetManagerId }: FleetPricingSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingData>({
    base_fare: 0,
    per_km_rate: 0,
    hourly_rate: 0,
    minimum_price: 0,
    tva_rate: 20,
    tva_included: false,
    evening_surcharge: 0,
    weekend_surcharge: 0,
    airport_surcharge: 0,
    default_commission_percentage: 0,
    assignment_mode: "manual",
    favorite_driver_priority: true,
  });

  useEffect(() => {
    fetchPricing();
  }, [fleetManagerId]);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select(`
          base_fare,
          per_km_rate,
          hourly_rate,
          minimum_price,
          tva_rate,
          tva_included,
          evening_surcharge,
          weekend_surcharge,
          airport_surcharge,
          default_commission_percentage,
          assignment_mode,
          favorite_driver_priority
        `)
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;
      if (data) {
        const d = data as any;
        setPricing({
          base_fare: d.base_fare || 0,
          per_km_rate: d.per_km_rate || 0,
          hourly_rate: d.hourly_rate || 0,
          minimum_price: d.minimum_price || 0,
          tva_rate: d.tva_rate || 20,
          tva_included: d.tva_included || false,
          evening_surcharge: d.evening_surcharge || 0,
          weekend_surcharge: d.weekend_surcharge || 0,
          airport_surcharge: d.airport_surcharge || 0,
          default_commission_percentage: d.default_commission_percentage || 0,
          assignment_mode: d.assignment_mode || "manual",
          favorite_driver_priority: d.favorite_driver_priority !== false,
        });
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
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
          base_fare: pricing.base_fare,
          per_km_rate: pricing.per_km_rate,
          hourly_rate: pricing.hourly_rate,
          minimum_price: pricing.minimum_price,
          tva_rate: pricing.tva_rate,
          tva_included: pricing.tva_included,
          evening_surcharge: pricing.evening_surcharge,
          weekend_surcharge: pricing.weekend_surcharge,
          airport_surcharge: pricing.airport_surcharge,
          default_commission_percentage: pricing.default_commission_percentage,
          assignment_mode: pricing.assignment_mode,
          favorite_driver_priority: pricing.favorite_driver_priority,
        } as any)
        .eq("id", fleetManagerId);

      if (error) throw error;
      toast.success("Tarification mise à jour avec succès");
    } catch (error) {
      console.error("Error saving pricing:", error);
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
      {/* Tarifs de base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Tarification des courses
          </CardTitle>
          <CardDescription>
            Définissez vos tarifs pour le calcul automatique des devis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_fare">Prise en charge (€)</Label>
              <Input
                id="base_fare"
                type="text"
                inputMode="decimal"
                value={pricing.base_fare || ""}
                onChange={(e) => setPricing({ ...pricing, base_fare: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="per_km_rate">Prix au kilomètre (€/km)</Label>
              <Input
                id="per_km_rate"
                type="text"
                inputMode="decimal"
                value={pricing.per_km_rate || ""}
                onChange={(e) => setPricing({ ...pricing, per_km_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tarif horaire (€/h) - Mise à disposition
              </Label>
              <Input
                id="hourly_rate"
                type="text"
                inputMode="decimal"
                value={pricing.hourly_rate || ""}
                onChange={(e) => setPricing({ ...pricing, hourly_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum_price">Prix minimum (€)</Label>
              <Input
                id="minimum_price"
                type="text"
                inputMode="decimal"
                value={pricing.minimum_price || ""}
                onChange={(e) => setPricing({ ...pricing, minimum_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <Separator />

          {/* TVA */}
          <div className="space-y-4">
            <h4 className="font-medium">TVA</h4>
            <Alert className="bg-info/5 border-info/20">
              <Info className="h-4 w-4 text-info" />
              <AlertDescription className="text-sm">
                La TVA est appliquée automatiquement selon le type de course :
                <br />• <strong>10%</strong> pour les courses classiques (au kilomètre)
                <br />• <strong>20%</strong> pour les mises à disposition (tarif horaire)
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-3">
              <Switch
                id="tva_included"
                checked={pricing.tva_included}
                onCheckedChange={(checked) => setPricing({ ...pricing, tva_included: checked })}
              />
              <Label htmlFor="tva_included">TVA incluse dans les prix affichés</Label>
            </div>
          </div>

          <Separator />

          {/* Majorations */}
          <div className="space-y-4">
            <h4 className="font-medium">Majorations</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evening_surcharge" className="flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Majoration soirée (%) - 20h à 6h
                </Label>
                <Input
                  id="evening_surcharge"
                  type="text"
                  inputMode="decimal"
                  value={pricing.evening_surcharge || ""}
                  onChange={(e) => setPricing({ ...pricing, evening_surcharge: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekend_surcharge" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Majoration week-end (%)
                </Label>
                <Input
                  id="weekend_surcharge"
                  type="text"
                  inputMode="decimal"
                  value={pricing.weekend_surcharge || ""}
                  onChange={(e) => setPricing({ ...pricing, weekend_surcharge: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Forfait Aéroport */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="airport_surcharge" className="flex items-center gap-2">
                ✈️ Forfait Aéroport (€)
              </Label>
              <Input
                id="airport_surcharge"
                type="text"
                inputMode="decimal"
                value={pricing.airport_surcharge}
                onChange={(e) => setPricing({ ...pricing, airport_surcharge: parseFloat(e.target.value) || 0 })}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Forfait ajouté automatiquement pour les courses depuis/vers un aéroport français
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Commission par défaut
          </CardTitle>
          <CardDescription>
            Pourcentage que vous récupérez sur chaque course (peut être personnalisé par chauffeur)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="default_commission">Commission par défaut (%)</Label>
            <Input
              id="default_commission"
              type="number"
              min="0"
              max="100"
              step="1"
              value={pricing.default_commission_percentage}
              onChange={(e) => setPricing({ ...pricing, default_commission_percentage: parseFloat(e.target.value) || 0 })}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              0% = pas de commission (chauffeurs salariés)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mode d'assignation */}
      <Card>
        <CardHeader>
          <CardTitle>Mode d'assignation des courses</CardTitle>
          <CardDescription>
            Choisissez comment les courses sont assignées aux chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                pricing.assignment_mode === "manual" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setPricing({ ...pricing, assignment_mode: "manual" })}
            >
              <div className="font-medium">Manuel</div>
              <p className="text-sm text-muted-foreground">
                Vous validez et assignez manuellement chaque course
              </p>
            </div>
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                pricing.assignment_mode === "automatic" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setPricing({ ...pricing, assignment_mode: "automatic" })}
            >
              <div className="font-medium">Automatique</div>
              <p className="text-sm text-muted-foreground">
                Les courses sont automatiquement assignées aux chauffeurs disponibles
              </p>
            </div>
          </div>

          {pricing.assignment_mode === "automatic" && (
            <div className="flex items-center gap-3 pt-4">
              <Switch
                id="favorite_priority"
                checked={pricing.favorite_driver_priority}
                onCheckedChange={(checked) => setPricing({ ...pricing, favorite_driver_priority: checked })}
              />
              <Label htmlFor="favorite_priority">
                Priorité au chauffeur favori du client
              </Label>
            </div>
          )}
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
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
};
