import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  ChevronDown, 
  X,
  Navigation,
  Building2
} from "lucide-react";

// Liste des régions françaises
const REGIONS = [
  "Île-de-France",
  "Auvergne-Rhône-Alpes",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Hauts-de-France",
  "Provence-Alpes-Côte d'Azur",
  "Grand Est",
  "Pays de la Loire",
  "Bretagne",
  "Normandie",
  "Bourgogne-Franche-Comté",
  "Centre-Val de Loire",
  "Corse",
];

// Liste des départements par région (simplifié)
const DEPARTMENTS: { [key: string]: string[] } = {
  "Île-de-France": ["Paris (75)", "Seine-et-Marne (77)", "Yvelines (78)", "Essonne (91)", "Hauts-de-Seine (92)", "Seine-Saint-Denis (93)", "Val-de-Marne (94)", "Val-d'Oise (95)"],
  "Auvergne-Rhône-Alpes": ["Ain (01)", "Allier (03)", "Ardèche (07)", "Cantal (15)", "Drôme (26)", "Isère (38)", "Loire (42)", "Haute-Loire (43)", "Puy-de-Dôme (63)", "Rhône (69)", "Savoie (73)", "Haute-Savoie (74)"],
  "Nouvelle-Aquitaine": ["Charente (16)", "Charente-Maritime (17)", "Corrèze (19)", "Creuse (23)", "Dordogne (24)", "Gironde (33)", "Landes (40)", "Lot-et-Garonne (47)", "Pyrénées-Atlantiques (64)", "Deux-Sèvres (79)", "Vienne (86)", "Haute-Vienne (87)"],
  "Occitanie": ["Ariège (09)", "Aude (11)", "Aveyron (12)", "Gard (30)", "Haute-Garonne (31)", "Gers (32)", "Hérault (34)", "Lot (46)", "Lozère (48)", "Hautes-Pyrénées (65)", "Pyrénées-Orientales (66)", "Tarn (81)", "Tarn-et-Garonne (82)"],
  "Hauts-de-France": ["Aisne (02)", "Nord (59)", "Oise (60)", "Pas-de-Calais (62)", "Somme (80)"],
  "Provence-Alpes-Côte d'Azur": ["Alpes-de-Haute-Provence (04)", "Hautes-Alpes (05)", "Alpes-Maritimes (06)", "Bouches-du-Rhône (13)", "Var (83)", "Vaucluse (84)"],
  "Grand Est": ["Ardennes (08)", "Aube (10)", "Marne (51)", "Haute-Marne (52)", "Meurthe-et-Moselle (54)", "Meuse (55)", "Moselle (57)", "Bas-Rhin (67)", "Haut-Rhin (68)", "Vosges (88)"],
  "Pays de la Loire": ["Loire-Atlantique (44)", "Maine-et-Loire (49)", "Mayenne (53)", "Sarthe (72)", "Vendée (85)"],
  "Bretagne": ["Côtes-d'Armor (22)", "Finistère (29)", "Ille-et-Vilaine (35)", "Morbihan (56)"],
  "Normandie": ["Calvados (14)", "Eure (27)", "Manche (50)", "Orne (61)", "Seine-Maritime (76)"],
  "Bourgogne-Franche-Comté": ["Côte-d'Or (21)", "Doubs (25)", "Jura (39)", "Nièvre (58)", "Haute-Saône (70)", "Saône-et-Loire (71)", "Yonne (89)", "Territoire de Belfort (90)"],
  "Centre-Val de Loire": ["Cher (18)", "Eure-et-Loir (28)", "Indre (36)", "Indre-et-Loire (37)", "Loir-et-Cher (41)", "Loiret (45)"],
  "Corse": ["Corse-du-Sud (2A)", "Haute-Corse (2B)"],
};

export interface DriverSearchFiltersState {
  searchQuery: string;
  region: string;
  department: string;
  city: string;
  radiusKm: number;
  vehicleType: string;
}

interface DriverSearchFiltersProps {
  filters: DriverSearchFiltersState;
  onFiltersChange: (filters: DriverSearchFiltersState) => void;
  onSearch: () => void;
  searching: boolean;
}

export function DriverSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  searching,
}: DriverSearchFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateFilter = <K extends keyof DriverSearchFiltersState>(
    key: K,
    value: DriverSearchFiltersState[K]
  ) => {
    // Convert "all" back to empty string for the actual filter value
    const actualValue = value === "all" ? "" : value;
    const newFilters = { ...filters, [key]: actualValue as DriverSearchFiltersState[K] };
    // Reset department when region changes
    if (key === "region") {
      newFilters.department = "";
    }
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      region: "",
      department: "",
      city: "",
      radiusKm: 50,
      vehicleType: "",
    });
  };

  const hasActiveFilters = 
    filters.region || 
    filters.department || 
    filters.city || 
    filters.radiusKm !== 50 ||
    filters.vehicleType;

  const activeFiltersCount = [
    filters.region,
    filters.department,
    filters.city,
    filters.radiusKm !== 50,
    filters.vehicleType,
  ].filter(Boolean).length;

  const availableDepartments = filters.region ? DEPARTMENTS[filters.region] || [] : [];

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, entreprise..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="pl-9 h-10 sm:h-12 rounded-xl border-border/50 bg-muted/30 text-sm"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter("searchQuery", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          onClick={onSearch}
          disabled={searching}
          className="h-10 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-accent to-accent-light text-sm"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Rechercher"
          )}
        </Button>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-10 border-border/50 bg-muted/20 hover:bg-muted/40 text-sm"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtres avancés</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 animate-fade-in">
          <div className="p-3 sm:p-4 rounded-xl border border-border/50 bg-muted/10 space-y-4">
            {/* Région et département */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <Navigation className="w-3 h-3" />
                  Région
                </Label>
                <Select
                  value={filters.region || "all"}
                  onValueChange={(value) => updateFilter("region", value)}
                >
                  <SelectTrigger className="h-9 sm:h-10 border-border/50 bg-background text-sm">
                    <SelectValue placeholder="Toutes les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Département
                </Label>
                <Select
                  value={filters.department || "all"}
                  onValueChange={(value) => updateFilter("department", value)}
                  disabled={!filters.region}
                >
                  <SelectTrigger className="h-9 sm:h-10 border-border/50 bg-background text-sm">
                    <SelectValue placeholder={filters.region ? "Tous les départements" : "Sélectionnez une région"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ville */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Ville
              </Label>
              <Input
                placeholder="Ex: Paris, Lyon, Marseille..."
                value={filters.city}
                onChange={(e) => updateFilter("city", e.target.value)}
                className="h-9 sm:h-10 border-border/50 bg-background text-sm"
              />
            </div>

            {/* Rayon kilométrique */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Rayon de recherche
                </Label>
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  {filters.radiusKm} km
                </span>
              </div>
              <Slider
                value={[filters.radiusKm]}
                onValueChange={(value) => updateFilter("radiusKm", value[0])}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 km</span>
                <span>100 km</span>
                <span>200 km</span>
              </div>
            </div>

            {/* Type de véhicule */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-medium">Type de véhicule</Label>
              <Select
                value={filters.vehicleType || "all"}
                onValueChange={(value) => updateFilter("vehicleType", value)}
              >
                <SelectTrigger className="h-9 sm:h-10 border-border/50 bg-background text-sm">
                  <SelectValue placeholder="Tous les véhicules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  <SelectItem value="berline">Berline</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="luxe">Véhicule de luxe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Boutons actions filtres */}
            {hasActiveFilters && (
              <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Réinitialiser
                </Button>
                <Button
                  size="sm"
                  onClick={onSearch}
                  className="bg-primary"
                >
                  Appliquer les filtres
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tags des filtres actifs */}
      {hasActiveFilters && !filtersOpen && (
        <div className="flex flex-wrap gap-2">
          {filters.region && (
            <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
              <Navigation className="w-3 h-3" />
              {filters.region}
              <button onClick={() => updateFilter("region", "")} className="ml-1 hover:text-primary-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.department && (
            <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
              <MapPin className="w-3 h-3" />
              {filters.department}
              <button onClick={() => updateFilter("department", "")} className="ml-1 hover:text-primary-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
              <Building2 className="w-3 h-3" />
              {filters.city}
              <button onClick={() => updateFilter("city", "")} className="ml-1 hover:text-primary-foreground">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.radiusKm !== 50 && (
            <Badge variant="secondary" className="bg-accent/10 text-accent gap-1">
              {filters.radiusKm} km
              <button onClick={() => updateFilter("radiusKm", 50)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.vehicleType && (
            <Badge variant="secondary" className="bg-accent/10 text-accent gap-1">
              {filters.vehicleType}
              <button onClick={() => updateFilter("vehicleType", "")} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export const defaultFilters: DriverSearchFiltersState = {
  searchQuery: "",
  region: "",
  department: "",
  city: "",
  radiusKm: 50,
  vehicleType: "",
};
