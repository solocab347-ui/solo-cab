import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  MapPin, 
  Filter, 
  X, 
  Building2, 
  Star,
  ChevronDown,
  Loader2,
  Navigation
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createPortal } from "react-dom";

// Départements français principaux
const FRENCH_DEPARTMENTS = [
  { code: '75', name: 'Paris' },
  { code: '77', name: 'Seine-et-Marne' },
  { code: '78', name: 'Yvelines' },
  { code: '91', name: 'Essonne' },
  { code: '92', name: 'Hauts-de-Seine' },
  { code: '93', name: 'Seine-Saint-Denis' },
  { code: '94', name: 'Val-de-Marne' },
  { code: '95', name: "Val-d'Oise" },
  { code: '13', name: 'Bouches-du-Rhône' },
  { code: '69', name: 'Rhône' },
  { code: '31', name: 'Haute-Garonne' },
  { code: '33', name: 'Gironde' },
  { code: '59', name: 'Nord' },
  { code: '06', name: 'Alpes-Maritimes' },
  { code: '44', name: 'Loire-Atlantique' },
  { code: '67', name: 'Bas-Rhin' },
  { code: '34', name: 'Hérault' },
  { code: '35', name: 'Ille-et-Vilaine' },
  { code: '76', name: 'Seine-Maritime' },
  { code: '29', name: 'Finistère' },
];

// Régions françaises
const FRENCH_REGIONS = [
  'Île-de-France',
  'Provence-Alpes-Côte d\'Azur',
  'Auvergne-Rhône-Alpes',
  'Occitanie',
  'Nouvelle-Aquitaine',
  'Hauts-de-France',
  'Grand Est',
  'Pays de la Loire',
  'Bretagne',
  'Normandie',
  'Bourgogne-Franche-Comté',
  'Centre-Val de Loire',
  'Corse',
];

interface LocationSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
}

export interface LocationFilterValues {
  searchText: string;
  city: string;
  department: string;
  region: string;
  locationAddress: string;
  locationCoords: { lat: number; lng: number } | null;
  radiusKm: number;
  minRating: number;
}

interface AdvancedLocationFilterProps {
  values: LocationFilterValues;
  onChange: (values: LocationFilterValues) => void;
  onSearch: () => void;
  onReset: () => void;
  searching?: boolean;
  showRatingFilter?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export const getDefaultFilterValues = (): LocationFilterValues => ({
  searchText: "",
  city: "",
  department: "",
  region: "",
  locationAddress: "",
  locationCoords: null,
  radiusKm: 25,
  minRating: 0,
});

export function AdvancedLocationFilter({
  values,
  onChange,
  onSearch,
  onReset,
  searching = false,
  showRatingFilter = true,
  searchPlaceholder = "Rechercher...",
  className = "",
}: AdvancedLocationFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // City autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<LocationSuggestion[]>([]);
  const [loadingCitySuggestions, setLoadingCitySuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityDropdownPosition, setCityDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const cityDebounceRef = useRef<NodeJS.Timeout>();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (!error && data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Update dropdown position for address - use fixed positioning relative to viewport
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current && showSuggestions) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    updatePosition();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showSuggestions, values.locationAddress, suggestions]);

  // Update dropdown position for city - use fixed positioning relative to viewport
  useEffect(() => {
    const updatePosition = () => {
      if (cityInputRef.current && showCitySuggestions) {
        const rect = cityInputRef.current.getBoundingClientRect();
        setCityDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    updatePosition();
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showCitySuggestions, values.city, citySuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (cityContainerRef.current && !cityContainerRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!mapboxToken || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=fr&types=place,locality,address&language=fr&limit=8`
      );
      const data = await response.json();
      console.log('Mapbox address suggestions:', data.features?.length || 0);
      if (data.features && data.features.length > 0) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Fetch city suggestions (only places/localities)
  const fetchCitySuggestions = async (query: string) => {
    if (!mapboxToken || query.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    setLoadingCitySuggestions(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=fr&types=place,locality&language=fr&limit=8`
      );
      const data = await response.json();
      console.log('Mapbox city suggestions:', data.features?.length || 0);
      if (data.features && data.features.length > 0) {
        setCitySuggestions(data.features);
        setShowCitySuggestions(true);
      } else {
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    } finally {
      setLoadingCitySuggestions(false);
    }
  };

  const handleLocationInputChange = (value: string) => {
    onChange({ ...values, locationAddress: value, locationCoords: null });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleCityInputChange = (value: string) => {
    onChange({ ...values, city: value });
    
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }
    
    cityDebounceRef.current = setTimeout(() => {
      fetchCitySuggestions(value);
    }, 300);
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    onChange({
      ...values,
      locationAddress: suggestion.place_name,
      locationCoords: { lat: suggestion.center[1], lng: suggestion.center[0] },
    });
    setShowSuggestions(false);
  };

  const selectCitySuggestion = (suggestion: LocationSuggestion) => {
    // Use full place name for better display and matching
    onChange({
      ...values,
      city: suggestion.place_name,
    });
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  const clearLocation = () => {
    onChange({ ...values, locationAddress: "", locationCoords: null });
  };

  const clearCity = () => {
    onChange({ ...values, city: "" });
  };

  const hasActiveFilters = 
    values.searchText || 
    values.city || 
    values.department || 
    values.region || 
    values.locationAddress ||
    values.locationCoords || 
    values.minRating > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={values.searchText}
            onChange={(e) => onChange({ ...values, searchText: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={onSearch} disabled={searching} className="shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {/* Filter toggle button */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <Filter className="h-4 w-4" />
            <span>{showFilters ? 'Masquer les filtres' : 'Filtres avancés'}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Actifs
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Combinez les filtres pour affiner votre recherche.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* City input with autocomplete */}
            <div className="space-y-2" ref={cityContainerRef}>
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Ville
              </Label>
              <div className="relative">
                <Input
                  ref={cityInputRef}
                  placeholder="Tapez pour rechercher une ville..."
                  value={values.city}
                  onChange={(e) => handleCityInputChange(e.target.value)}
                  onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                  className="pr-10"
                />
                {loadingCitySuggestions && (
                  <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {values.city && (
                  <button
                    onClick={clearCity}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* City suggestions dropdown */}
              {showCitySuggestions && citySuggestions.length > 0 && createPortal(
                <div
                  className="fixed bg-popover border rounded-md shadow-lg z-[9999] max-h-60 overflow-auto"
                  style={{
                    top: cityDropdownPosition.top,
                    left: cityDropdownPosition.left,
                    width: cityDropdownPosition.width,
                  }}
                >
                  {citySuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center gap-2"
                      onClick={() => selectCitySuggestion(suggestion)}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{suggestion.place_name}</span>
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>

            {/* Department select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                Département
              </Label>
              <Select 
                value={values.department || "all"} 
                onValueChange={(val) => onChange({ ...values, department: val === "all" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les départements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {FRENCH_DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.code} value={dept.name}>
                      {dept.code} - {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                Région
              </Label>
              <Select 
                value={values.region || "all"} 
                onValueChange={(val) => onChange({ ...values, region: val === "all" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les régions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les régions</SelectItem>
                  {FRENCH_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location autocomplete with radius */}
            <div className="space-y-2 sm:col-span-2" ref={containerRef}>
              <Label className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4" />
                Recherche par adresse + rayon
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Entrez une adresse pour localiser..."
                  value={values.locationAddress}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="pl-10 pr-10"
                />
                {loadingSuggestions && (
                  <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {values.locationAddress && (
                  <button
                    onClick={clearLocation}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && createPortal(
                <div
                  className="fixed bg-popover border rounded-md shadow-lg z-[9999] max-h-60 overflow-auto"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                  }}
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center gap-2"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{suggestion.place_name}</span>
                    </button>
                  ))}
                </div>,
                document.body
              )}

              {/* Radius slider - always visible */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rayon de recherche:</span>
                  <Badge variant="secondary">{values.radiusKm} km</Badge>
                </div>
                <Slider
                  value={[values.radiusKm]}
                  onValueChange={(v) => onChange({ ...values, radiusKm: v[0] })}
                  min={5}
                  max={50}
                  step={5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating filter */}
          {showRatingFilter && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4" />
                Note minimum: {values.minRating > 0 ? `${values.minRating}/5` : 'Aucune'}
              </Label>
              <Slider
                value={[values.minRating]}
                onValueChange={(v) => onChange({ ...values, minRating: v[0] })}
                max={5}
                step={0.5}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={onSearch} className="flex-1" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Rechercher
            </Button>
            <Button variant="outline" onClick={onReset}>
              Réinitialiser
            </Button>
          </div>

          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Filtres actifs:</span>
              {values.searchText && (
                <Badge variant="secondary" className="text-xs">
                  "{values.searchText}"
                </Badge>
              )}
              {values.city && (
                <Badge variant="secondary" className="text-xs">
                  Ville: {values.city.split(',')[0]}
                </Badge>
              )}
              {values.department && (
                <Badge variant="secondary" className="text-xs">
                  Dép: {values.department}
                </Badge>
              )}
              {values.region && (
                <Badge variant="secondary" className="text-xs">
                  Région: {values.region}
                </Badge>
              )}
              {values.locationAddress && (
                <Badge variant="secondary" className="text-xs">
                  📍 {values.locationAddress.split(',')[0]}{values.locationCoords ? ` (${values.radiusKm}km)` : ''}
                </Badge>
              )}
              {values.minRating > 0 && (
                <Badge variant="secondary" className="text-xs">
                  ≥ {values.minRating}/5 ⭐
                </Badge>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
