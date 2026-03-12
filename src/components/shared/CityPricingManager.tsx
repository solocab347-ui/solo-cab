import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Save, Plus, Trash2, MapPin, Euro, Clock, 
  Moon, Calendar, ChevronDown, ChevronUp, Info 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TvaToggle } from "@/components/pricing/TvaToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CityPricingManagerProps {
  driverId?: string;
  fleetManagerId?: string;
  onSave?: () => void;
}

interface CityPricing {
  id?: string;
  city_name: string;
  sectors: string[];
  pricing_type: string;
  base_fare: number;
  per_km_rate: number;
  hourly_rate: number;
  minimum_price: number;
  tva_rate: number;
  tva_included: boolean;
  evening_surcharge: number;
  weekend_surcharge: number;
  is_active: boolean;
  priority: number;
  // Keep fields for DB compatibility but don't expose in UI
  peak_hours_enabled: boolean;
  peak_hours_start: string | null;
  peak_hours_end: string | null;
  peak_hours_multiplier: number;
  peak_hours_2_enabled: boolean;
  peak_hours_2_start: string | null;
  peak_hours_2_end: string | null;
  peak_hours_2_multiplier: number;
  peak_hours_3_enabled: boolean;
  peak_hours_3_start: string | null;
  peak_hours_3_end: string | null;
  peak_hours_3_multiplier: number;
  off_peak_enabled: boolean;
  off_peak_start: string | null;
  off_peak_end: string | null;
  off_peak_discount: number;
}

const FRENCH_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice",
  "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille",
  "Rennes", "Reims", "Saint-Étienne", "Toulon", "Le Havre",
  "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne",
];

const defaultPricing: Omit<CityPricing, "id"> = {
  city_name: "",
  sectors: [],
  pricing_type: "per_km",
  base_fare: 5,
  per_km_rate: 2,
  hourly_rate: 50,
  minimum_price: 15,
  tva_rate: 10,
  tva_included: false,
  evening_surcharge: 0,
  weekend_surcharge: 0,
  is_active: true,
  priority: 0,
  peak_hours_enabled: false,
  peak_hours_start: null,
  peak_hours_end: null,
  peak_hours_multiplier: 1.0,
  peak_hours_2_enabled: false,
  peak_hours_2_start: null,
  peak_hours_2_end: null,
  peak_hours_2_multiplier: 1.0,
  peak_hours_3_enabled: false,
  peak_hours_3_start: null,
  peak_hours_3_end: null,
  peak_hours_3_multiplier: 1.0,
  off_peak_enabled: false,
  off_peak_start: null,
  off_peak_end: null,
  off_peak_discount: 0,
};

export const CityPricingManager = ({ driverId, fleetManagerId, onSave }: CityPricingManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricings, setPricings] = useState<CityPricing[]>([]);
  const [expandedPricings, setExpandedPricings] = useState<Set<string>>(new Set());
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    fetchData();
  }, [driverId, fleetManagerId]);

  const fetchData = async () => {
    try {
      let query = supabase
        .from("city_pricing")
        .select("*")
        .order("city_name");

      if (driverId) {
        query = query.eq("driver_id", driverId);
      } else if (fleetManagerId) {
        query = query.eq("fleet_manager_id", fleetManagerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setPricings(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des tarifications");
    } finally {
      setLoading(false);
    }
  };

  const addNewPricing = () => {
    const newPricing: CityPricing = {
      ...defaultPricing,
      id: `new-${Date.now()}`,
    };
    setPricings([newPricing, ...pricings]);
    setExpandedPricings(new Set([...expandedPricings, newPricing.id!]));
  };

  const updatePricing = (id: string, updates: Partial<CityPricing>) => {
    setPricings(pricings.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePricing = async (id: string) => {
    if (id.startsWith("new-")) {
      setPricings(pricings.filter(p => p.id !== id));
      return;
    }
    try {
      const { error } = await supabase.from("city_pricing").delete().eq("id", id);
      if (error) throw error;
      setPricings(pricings.filter(p => p.id !== id));
      toast.success("Tarification supprimée");
    } catch (error) {
      console.error("Error deleting pricing:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const savePricing = async (pricing: CityPricing) => {
    if (!pricing.city_name) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    setSaving(true);
    try {
      const { id, ...rest } = pricing;
      const dataToSave = {
        ...rest,
        ...(driverId ? { driver_id: driverId } : {}),
        ...(fleetManagerId ? { fleet_manager_id: fleetManagerId } : {}),
      };

      if (id?.startsWith("new-")) {
        const { data, error } = await supabase
          .from("city_pricing")
          .insert(dataToSave)
          .select()
          .single();
        if (error) throw error;
        setPricings(pricings.map(p => p.id === id ? data : p));
      } else {
        const { error } = await supabase
          .from("city_pricing")
          .update(dataToSave)
          .eq("id", id);
        if (error) throw error;
      }

      toast.success("Tarification enregistrée ✅");
      onSave?.();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedPricings);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedPricings(newExpanded);
  };

  // Cities already used by this driver
  const usedCities = pricings.map(p => p.city_name).filter(Boolean);

  const filteredCities = FRENCH_CITIES.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Optionnel :</strong> Définissez des tarifs spécifiques 
          pour les courses intra-ville. Sans configuration, vos tarifs classiques s'appliquent.
        </div>
      </div>

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Tarifs par ville
        </h3>
        <Button onClick={addNewPricing} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {pricings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune tarification ville configurée</p>
            <p className="text-xs mt-1">Vos tarifs classiques s'appliquent partout</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pricings.map((pricing) => (
            <Card key={pricing.id} className={!pricing.is_active ? "opacity-50" : ""}>
              <Collapsible
                open={expandedPricings.has(pricing.id!)}
                onOpenChange={() => toggleExpanded(pricing.id!)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">
                          {pricing.city_name || "Nouvelle ville"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {pricing.pricing_type === "hourly" ? "Horaire" : "Au km"}
                        </Badge>
                        {!pricing.is_active && <Badge variant="secondary" className="text-xs">Off</Badge>}
                      </div>
                      {expandedPricings.has(pricing.id!) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0 px-4 pb-4">
                    {/* City + Type */}
                    <div className="grid gap-3 grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ville</Label>
                        <Select
                          value={pricing.city_name}
                          onValueChange={(v) => updatePricing(pricing.id!, { city_name: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2">
                              <Input
                                placeholder="Rechercher..."
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                className="h-8 text-sm mb-2"
                              />
                            </div>
                            {filteredCities.map((city) => (
                              <SelectItem 
                                key={city} 
                                value={city}
                                disabled={usedCities.includes(city) && pricing.city_name !== city}
                              >
                                {city} {usedCities.includes(city) && pricing.city_name !== city ? "(déjà configuré)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={pricing.pricing_type}
                          onValueChange={(v) => updatePricing(pricing.id!, { pricing_type: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_km">Au kilomètre</SelectItem>
                            <SelectItem value="hourly">Horaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Pricing fields */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Euro className="w-3.5 h-3.5" />
                        Tarifs
                      </h4>
                      
                      {pricing.pricing_type === "per_km" ? (
                        <div className="grid gap-3 grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Prise en charge (€)</Label>
                            <NumericInput
                              value={pricing.base_fare}
                              onChange={(v) => updatePricing(pricing.id!, { base_fare: parseFloat(v) || 0 })}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Prix / km (€)</Label>
                            <NumericInput
                              value={pricing.per_km_rate}
                              onChange={(v) => updatePricing(pricing.id!, { per_km_rate: parseFloat(v) || 0 })}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Tarif horaire (€/h)
                          </Label>
                          <NumericInput
                            value={pricing.hourly_rate}
                            onChange={(v) => updatePricing(pricing.id!, { hourly_rate: parseFloat(v) || 0 })}
                            placeholder="0"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs">Prix minimum (€)</Label>
                        <NumericInput
                          value={pricing.minimum_price}
                          onChange={(v) => updatePricing(pricing.id!, { minimum_price: parseFloat(v) || 0 })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* TVA */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        TVA : 10% (au km) • 20% (horaire)
                      </p>
                      <TvaToggle
                        checked={pricing.tva_included}
                        onCheckedChange={(checked) => updatePricing(pricing.id!, { tva_included: checked })}
                        variant="compact"
                      />
                    </div>

                    <Separator />

                    {/* Surcharges */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                        Majorations
                      </h4>
                      <div className="grid gap-3 grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Moon className="w-3.5 h-3.5" />
                            Soirée (%) 20h-6h
                          </Label>
                          <NumericInput
                            value={pricing.evening_surcharge}
                            onChange={(v) => updatePricing(pricing.id!, { evening_surcharge: parseFloat(v) || 0 })}
                            placeholder="0"
                            min={0}
                            max={100}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Week-end (%)
                          </Label>
                          <NumericInput
                            value={pricing.weekend_surcharge}
                            onChange={(v) => updatePricing(pricing.id!, { weekend_surcharge: parseFloat(v) || 0 })}
                            placeholder="0"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={pricing.is_active}
                          onCheckedChange={(checked) => updatePricing(pricing.id!, { is_active: checked })}
                        />
                        <Label className="text-xs">Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive gap-1 h-8 text-xs">
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette tarification ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                La tarification pour {pricing.city_name || "cette ville"} sera définitivement supprimée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePricing(pricing.id!)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          onClick={() => savePricing(pricing)} 
                          disabled={saving}
                          size="sm"
                          className="gap-1 h-8 text-xs"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
