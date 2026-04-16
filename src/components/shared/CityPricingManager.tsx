import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Moon, Calendar, ChevronDown, ChevronUp, Info, Edit2, X, Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  globalEveningSurcharge?: number;
  globalWeekendSurcharge?: number;
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
  evening_start: string | null;
  evening_end: string | null;
  is_active: boolean;
  priority: number;
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
  evening_start: "20:00",
  evening_end: "06:00",
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

// Summary card for an existing city pricing (always visible)
const CityPricingSummaryCard = ({
  pricing,
  onEdit,
  onDelete,
  saving,
  globalEveningSurcharge = 0,
  globalWeekendSurcharge = 0,
}: {
  pricing: CityPricing;
  onEdit: () => void;
  onDelete: () => void;
  saving: boolean;
  globalEveningSurcharge?: number;
  globalWeekendSurcharge?: number;
}) => {
  const hasMajorations = (pricing.evening_surcharge > 0 || pricing.weekend_surcharge > 0);
  
  // Detect conflicts between city and global surcharges
  const eveningConflict = pricing.evening_surcharge > 0 && globalEveningSurcharge > 0;
  const weekendConflict = pricing.weekend_surcharge > 0 && globalWeekendSurcharge > 0;
  const hasConflict = eveningConflict || weekendConflict;

  return (
    <Card className={`border-primary/30 ${!pricing.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-3 space-y-2">
        {/* Header: City + Type + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">{pricing.city_name}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {pricing.pricing_type === "hourly" ? "Horaire" : "Au km"}
            </Badge>
            {pricing.tva_included && (
              <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 border-0">
                TTC
              </Badge>
            )}
            {!pricing.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 w-7 p-0">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la tarification {pricing.city_name} ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Key metrics - always visible */}
        <div className="grid grid-cols-3 gap-2">
          {pricing.pricing_type === "per_km" ? (
            <>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Prise en charge</p>
                <p className="font-bold text-sm">{pricing.base_fare}€</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Prix/km</p>
                <p className="font-bold text-sm">{pricing.per_km_rate}€</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Minimum</p>
                <p className="font-bold text-sm">{pricing.minimum_price}€</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Tarif/heure</p>
                <p className="font-bold text-sm">{pricing.hourly_rate}€</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Minimum</p>
                <p className="font-bold text-sm">{pricing.minimum_price}€</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">TVA</p>
                <p className="font-bold text-sm">{pricing.tva_included ? "TTC" : "HT"}</p>
              </div>
            </>
          )}
        </div>

        {/* Majorations summary */}
        {hasMajorations && (
          <div className="flex flex-wrap gap-1.5">
            {pricing.evening_surcharge > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Moon className="w-3 h-3" />
                Soir +{pricing.evening_surcharge}%
              </Badge>
            )}
            {pricing.weekend_surcharge > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Calendar className="w-3 h-3" />
                WE +{pricing.weekend_surcharge}%
              </Badge>
            )}
          </div>
        )}

        {/* Conflict warning */}
        {hasConflict && (
          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] text-amber-500 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {eveningConflict && (
                  <>Soir : global {globalEveningSurcharge}% vs {pricing.city_name} {pricing.evening_surcharge}% → <strong>+{Math.max(globalEveningSurcharge, pricing.evening_surcharge)}% appliqué</strong>. </>
                )}
                {weekendConflict && (
                  <>WE : global {globalWeekendSurcharge}% vs {pricing.city_name} {pricing.weekend_surcharge}% → <strong>+{Math.max(globalWeekendSurcharge, pricing.weekend_surcharge)}% appliqué</strong>. </>
                )}
                Pas de cumul.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Full edit form for a city pricing
const CityPricingEditForm = ({
  pricing,
  onChange,
  onSave,
  onCancel,
  saving,
  usedCities,
}: {
  pricing: CityPricing;
  onChange: (updates: Partial<CityPricing>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  usedCities: string[];
}) => {
  const [citySearch, setCitySearch] = useState("");
  const filteredCities = FRENCH_CITIES.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );
  const isNew = pricing.id?.startsWith("new-");

  return (
    <Card className="border-primary/50 ring-1 ring-primary/20">
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            {isNew ? "Nouvelle tarification" : `Modifier ${pricing.city_name}`}
          </h4>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* City + Type */}
        <div className="grid gap-3 grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Ville</Label>
            <Select
              value={pricing.city_name}
              onValueChange={(v) => onChange({ city_name: v })}
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
              onValueChange={(v) => onChange({ pricing_type: v })}
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
                  onChange={(v) => onChange({ base_fare: parseFloat(v) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prix / km (€)</Label>
                <NumericInput
                  value={pricing.per_km_rate}
                  onChange={(v) => onChange({ per_km_rate: parseFloat(v) || 0 })}
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
                onChange={(v) => onChange({ hourly_rate: parseFloat(v) || 0 })}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Prix minimum (€)</Label>
            <NumericInput
              value={pricing.minimum_price}
              onChange={(v) => onChange({ minimum_price: parseFloat(v) || 0 })}
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
            onCheckedChange={(checked) => onChange({ tva_included: checked })}
            variant="compact"
          />
        </div>

        <Separator />

        {/* Surcharges */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Majorations
          </h4>
          <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              Le système applique automatiquement la <strong>plus grande majoration</strong> entre 
              vos tarifs classiques et ceux de cette ville. Pas de doublon.
            </span>
          </div>
          
          {/* Evening time slot */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Moon className="w-3.5 h-3.5" />
              Créneau soirée
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Début</Label>
                <Input
                  type="time"
                  value={pricing.evening_start || "20:00"}
                  onChange={(e) => onChange({ evening_start: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Fin</Label>
                <Input
                  type="time"
                  value={pricing.evening_end || "06:00"}
                  onChange={(e) => onChange({ evening_end: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Majoration %</Label>
                <NumericInput
                  value={pricing.evening_surcharge}
                  onChange={(v) => onChange({ evening_surcharge: parseFloat(v) || 0 })}
                  placeholder="0"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
          
          {/* Weekend surcharge */}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Majoration week-end (%)
            </Label>
            <NumericInput
              value={pricing.weekend_surcharge}
              onChange={(v) => onChange({ weekend_surcharge: parseFloat(v) || 0 })}
              placeholder="0"
              min={0}
              max={100}
            />
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={pricing.is_active}
              onCheckedChange={(checked) => onChange({ is_active: checked })}
            />
            <Label className="text-xs">Active</Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">
              Annuler
            </Button>
            <Button 
              onClick={onSave} 
              disabled={saving}
              size="sm"
              className="gap-1 h-8 text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isNew ? "Créer" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CityPricingManager = ({ driverId, fleetManagerId, onSave, globalEveningSurcharge = 0, globalWeekendSurcharge = 0 }: CityPricingManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricings, setPricings] = useState<CityPricing[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setEditingId(newPricing.id!);
  };

  const updatePricing = (id: string, updates: Partial<CityPricing>) => {
    setPricings(pricings.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePricing = async (id: string) => {
    if (id.startsWith("new-")) {
      setPricings(pricings.filter(p => p.id !== id));
      setEditingId(null);
      return;
    }
    try {
      const { error } = await supabase.from("city_pricing").delete().eq("id", id);
      if (error) throw error;
      setPricings(pricings.filter(p => p.id !== id));
      setEditingId(null);
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
        setEditingId(data.id);
      } else {
        const { error } = await supabase
          .from("city_pricing")
          .update(dataToSave)
          .eq("id", id);
        if (error) throw error;
      }

      setEditingId(null);
      toast.success("Tarification enregistrée ✅");
      onSave?.();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = (id: string) => {
    if (id.startsWith("new-")) {
      setPricings(pricings.filter(p => p.id !== id));
    }
    setEditingId(null);
    // Re-fetch to discard unsaved changes
    if (!id.startsWith("new-")) {
      fetchData();
    }
  };

  const usedCities = pricings.map(p => p.city_name).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing pricings - always visible as summary cards */}
      {pricings.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              {pricings.filter(p => !p.id?.startsWith("new-")).length} tarification{pricings.filter(p => !p.id?.startsWith("new-")).length > 1 ? "s" : ""} configurée{pricings.filter(p => !p.id?.startsWith("new-")).length > 1 ? "s" : ""}
            </h3>
            <Button onClick={addNewPricing} size="sm" className="gap-1.5 h-8 text-xs" disabled={editingId !== null}>
              <Plus className="w-3.5 h-3.5" />
              Ajouter une ville
            </Button>
          </div>

          {pricings.map((pricing) => (
            editingId === pricing.id ? (
              <CityPricingEditForm
                key={pricing.id}
                pricing={pricing}
                onChange={(updates) => updatePricing(pricing.id!, updates)}
                onSave={() => savePricing(pricing)}
                onCancel={() => cancelEdit(pricing.id!)}
                saving={saving}
                usedCities={usedCities}
              />
            ) : (
              <CityPricingSummaryCard
                key={pricing.id}
                pricing={pricing}
                onEdit={() => setEditingId(pricing.id!)}
                onDelete={() => deletePricing(pricing.id!)}
                saving={saving}
              />
            )
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune tarification ville configurée</p>
              <p className="text-xs mt-1">Vos tarifs classiques s'appliquent partout</p>
            </CardContent>
          </Card>
          <Button onClick={addNewPricing} className="w-full gap-1.5" variant="outline">
            <Plus className="w-4 h-4" />
            Ajouter une tarification ville
          </Button>
        </div>
      )}
    </div>
  );
};
