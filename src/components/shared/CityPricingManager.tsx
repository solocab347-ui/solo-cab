import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Save, Plus, Trash2, MapPin, Euro, Clock, 
  Moon, Calendar, TrendingUp, TrendingDown, ChevronDown, ChevronUp 
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
  peak_hours_enabled: boolean;
  peak_hours_start: string | null;
  peak_hours_end: string | null;
  peak_hours_multiplier: number;
  off_peak_enabled: boolean;
  off_peak_start: string | null;
  off_peak_end: string | null;
  off_peak_discount: number;
  is_active: boolean;
  priority: number;
}

interface CitySector {
  city_name: string;
  sector_name: string;
}

// Grandes villes françaises
const FRENCH_CITIES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Nice",
  "Nantes",
  "Strasbourg",
  "Montpellier",
  "Bordeaux",
  "Lille",
  "Rennes",
  "Reims",
  "Saint-Étienne",
  "Toulon",
  "Le Havre",
  "Grenoble",
  "Dijon",
  "Angers",
  "Nîmes",
  "Villeurbanne",
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
  peak_hours_enabled: false,
  peak_hours_start: null,
  peak_hours_end: null,
  peak_hours_multiplier: 1.0,
  off_peak_enabled: false,
  off_peak_start: null,
  off_peak_end: null,
  off_peak_discount: 0,
  is_active: true,
  priority: 0,
};

export const CityPricingManager = ({ driverId, fleetManagerId }: CityPricingManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricings, setPricings] = useState<CityPricing[]>([]);
  const [citySectors, setCitySectors] = useState<CitySector[]>([]);
  const [expandedPricings, setExpandedPricings] = useState<Set<string>>(new Set());
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    fetchData();
  }, [driverId, fleetManagerId]);

  const fetchData = async () => {
    try {
      // Fetch city sectors
      const { data: sectorsData } = await supabase
        .from("city_sectors")
        .select("city_name, sector_name")
        .order("city_name, display_order");

      if (sectorsData) {
        setCitySectors(sectorsData);
      }

      // Fetch existing pricings
      let query = supabase
        .from("city_pricing")
        .select("*")
        .order("priority", { ascending: false });

      if (driverId) {
        query = query.eq("driver_id", driverId);
      } else if (fleetManagerId) {
        query = query.eq("fleet_manager_id", fleetManagerId);
      }

      const { data: pricingData, error } = await query;

      if (error) throw error;
      if (pricingData) {
        setPricings(pricingData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des tarifications");
    } finally {
      setLoading(false);
    }
  };

  const getSectorsForCity = (cityName: string) => {
    return citySectors.filter(s => s.city_name === cityName);
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
    setPricings(pricings.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };

  const toggleSector = (pricingId: string, sector: string) => {
    const pricing = pricings.find(p => p.id === pricingId);
    if (!pricing) return;

    const newSectors = pricing.sectors.includes(sector)
      ? pricing.sectors.filter(s => s !== sector)
      : [...pricing.sectors, sector];

    updatePricing(pricingId, { sectors: newSectors });
  };

  const deletePricing = async (id: string) => {
    if (id.startsWith("new-")) {
      setPricings(pricings.filter(p => p.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from("city_pricing")
        .delete()
        .eq("id", id);

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
      const dataToSave = {
        city_name: pricing.city_name,
        sectors: pricing.sectors,
        pricing_type: pricing.pricing_type,
        base_fare: pricing.base_fare,
        per_km_rate: pricing.per_km_rate,
        hourly_rate: pricing.hourly_rate,
        minimum_price: pricing.minimum_price,
        tva_rate: pricing.tva_rate,
        tva_included: pricing.tva_included,
        evening_surcharge: pricing.evening_surcharge,
        weekend_surcharge: pricing.weekend_surcharge,
        peak_hours_enabled: pricing.peak_hours_enabled,
        peak_hours_start: pricing.peak_hours_start,
        peak_hours_end: pricing.peak_hours_end,
        peak_hours_multiplier: pricing.peak_hours_multiplier,
        off_peak_enabled: pricing.off_peak_enabled,
        off_peak_start: pricing.off_peak_start,
        off_peak_end: pricing.off_peak_end,
        off_peak_discount: pricing.off_peak_discount,
        is_active: pricing.is_active,
        priority: pricing.priority,
        ...(driverId ? { driver_id: driverId } : {}),
        ...(fleetManagerId ? { fleet_manager_id: fleetManagerId } : {}),
      };

      if (pricing.id?.startsWith("new-")) {
        const { data, error } = await supabase
          .from("city_pricing")
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setPricings(pricings.map(p => 
          p.id === pricing.id ? data : p
        ));
      } else {
        const { error } = await supabase
          .from("city_pricing")
          .update(dataToSave)
          .eq("id", pricing.id);

        if (error) throw error;
      }

      toast.success("Tarification enregistrée");
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedPricings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPricings(newExpanded);
  };

  const filteredCities = FRENCH_CITIES.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bannière informative - Option facultative */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-primary">Option facultative : Tarification par ville</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Cette fonctionnalité est <strong>optionnelle</strong> et complémentaire à vos tarifs classiques (au kilomètre ou mise à disposition).
                Elle vous permet de définir des tarifs spécifiques pour les courses <strong>intra-ville</strong> (départ et arrivée dans la même ville),
                particulièrement utile pour les grandes villes où la tarification au kilomètre peut ne pas être rentable.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Note :</strong> Si vous ne configurez pas de tarification par ville, vos tarifs classiques seront automatiquement appliqués.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Définir un prix par ville
          </h3>
          <p className="text-sm text-muted-foreground">
            Configurez des tarifs spécifiques pour les courses dans les grandes villes
          </p>
        </div>
        <Button onClick={addNewPricing} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter une ville
        </Button>
      </div>

      {pricings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Aucune tarification par ville configurée</p>
            <p className="text-sm mt-1">Vos tarifs classiques (au kilomètre / mise à disposition) s'appliquent</p>
            <Button onClick={addNewPricing} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une tarification ville (optionnel)
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pricings.map((pricing) => (
            <Card key={pricing.id} className={!pricing.is_active ? "opacity-60" : ""}>
              <Collapsible
                open={expandedPricings.has(pricing.id!)}
                onOpenChange={() => toggleExpanded(pricing.id!)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">
                            {pricing.city_name || "Nouvelle tarification"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            {pricing.sectors.length > 0 ? (
                              <span>{pricing.sectors.length} secteur(s)</span>
                            ) : (
                              <span>Toute la ville</span>
                            )}
                            <span>•</span>
                            <span>
                              {pricing.pricing_type === "hourly" ? "Tarif horaire" : "Au kilomètre"}
                            </span>
                            {!pricing.is_active && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary">Désactivé</Badge>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedPricings.has(pricing.id!) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    {/* Ville et secteurs */}
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Ville</Label>
                          <Select
                            value={pricing.city_name}
                            onValueChange={(value) => updatePricing(pricing.id!, { city_name: value, sectors: [] })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une ville" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Rechercher..."
                                  value={citySearch}
                                  onChange={(e) => setCitySearch(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {filteredCities.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Type de tarification</Label>
                          <Select
                            value={pricing.pricing_type}
                            onValueChange={(value) => updatePricing(pricing.id!, { pricing_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_km">Au kilomètre</SelectItem>
                              <SelectItem value="hourly">Tarif horaire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Secteurs */}
                      {pricing.city_name && getSectorsForCity(pricing.city_name).length > 0 && (
                        <div className="space-y-2">
                          <Label>Secteurs (optionnel - laisser vide pour toute la ville)</Label>
                          <div className="flex flex-wrap gap-2">
                            {getSectorsForCity(pricing.city_name).map((sector) => (
                              <Badge
                                key={sector.sector_name}
                                variant={pricing.sectors.includes(sector.sector_name) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleSector(pricing.id!, sector.sector_name)}
                              >
                                {sector.sector_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Tarifs de base */}
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Euro className="w-4 h-4" />
                        Tarifs de base
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {pricing.pricing_type === "per_km" ? (
                          <>
                            <div className="space-y-2">
                              <Label>Prise en charge (€)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing.base_fare}
                                onChange={(e) => updatePricing(pricing.id!, { base_fare: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Prix au km (€)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={pricing.per_km_rate}
                                onChange={(e) => updatePricing(pricing.id!, { per_km_rate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Tarif horaire (€/h)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={pricing.hourly_rate}
                              onChange={(e) => updatePricing(pricing.id!, { hourly_rate: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Prix minimum (€)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricing.minimum_price}
                            onChange={(e) => updatePricing(pricing.id!, { minimum_price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>TVA (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            step="0.1"
                            value={pricing.tva_rate}
                            onChange={(e) => updatePricing(pricing.id!, { tva_rate: parseFloat(e.target.value) || 10 })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={pricing.tva_included}
                          onCheckedChange={(checked) => updatePricing(pricing.id!, { tva_included: checked })}
                        />
                        <Label>TVA incluse dans les prix affichés</Label>
                      </div>
                    </div>

                    <Separator />

                    {/* Majorations soirée/weekend */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Majorations</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            Majoration soirée (%) - 20h à 6h
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={pricing.evening_surcharge}
                            onChange={(e) => updatePricing(pricing.id!, { evening_surcharge: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Majoration week-end (%)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={pricing.weekend_surcharge}
                            onChange={(e) => updatePricing(pricing.id!, { weekend_surcharge: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Heures de pointe */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={pricing.peak_hours_enabled}
                          onCheckedChange={(checked) => updatePricing(pricing.id!, { peak_hours_enabled: checked })}
                        />
                        <Label className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-destructive" />
                          Activer les heures de pointe
                        </Label>
                      </div>
                      {pricing.peak_hours_enabled && (
                        <div className="grid gap-4 md:grid-cols-3 pl-8">
                          <div className="space-y-2">
                            <Label>Début</Label>
                            <Input
                              type="time"
                              value={pricing.peak_hours_start || ""}
                              onChange={(e) => updatePricing(pricing.id!, { peak_hours_start: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fin</Label>
                            <Input
                              type="time"
                              value={pricing.peak_hours_end || ""}
                              onChange={(e) => updatePricing(pricing.id!, { peak_hours_end: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Multiplicateur</Label>
                            <Input
                              type="number"
                              min="1"
                              max="3"
                              step="0.1"
                              value={pricing.peak_hours_multiplier}
                              onChange={(e) => updatePricing(pricing.id!, { peak_hours_multiplier: parseFloat(e.target.value) || 1 })}
                            />
                            <p className="text-xs text-muted-foreground">
                              1.5 = +50%, 2.0 = +100%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Heures creuses */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={pricing.off_peak_enabled}
                          onCheckedChange={(checked) => updatePricing(pricing.id!, { off_peak_enabled: checked })}
                        />
                        <Label className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          Activer les heures creuses (réduction)
                        </Label>
                      </div>
                      {pricing.off_peak_enabled && (
                        <div className="grid gap-4 md:grid-cols-3 pl-8">
                          <div className="space-y-2">
                            <Label>Début</Label>
                            <Input
                              type="time"
                              value={pricing.off_peak_start || ""}
                              onChange={(e) => updatePricing(pricing.id!, { off_peak_start: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fin</Label>
                            <Input
                              type="time"
                              value={pricing.off_peak_end || ""}
                              onChange={(e) => updatePricing(pricing.id!, { off_peak_end: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Réduction (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              value={pricing.off_peak_discount}
                              onChange={(e) => updatePricing(pricing.id!, { off_peak_discount: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={pricing.is_active}
                          onCheckedChange={(checked) => updatePricing(pricing.id!, { is_active: checked })}
                        />
                        <Label>Tarification active</Label>
                      </div>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive gap-2">
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette tarification ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La tarification pour {pricing.city_name || "cette ville"} sera définitivement supprimée.
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
                          className="gap-2"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
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
