import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { searchFamousPlaces, famousPlaceToSuggestion } from "@/lib/famousPlaces";

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  isFamous?: boolean; // Flag to identify famous places
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Cache local pour éviter les appels répétés
const localCache = new Map<string, { data: AddressSuggestion[], timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const AddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Tapez une adresse...",
  className,
  disabled = false,
}: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search famous places first (works with 2+ characters)
      const famousPlaces = searchFamousPlaces(query);
      const famousSuggestions = famousPlaces.map(place => ({
        ...famousPlaceToSuggestion(place),
        isFamous: true
      }));

      // Si on a des lieux célèbres, les afficher immédiatement
      if (famousSuggestions.length > 0) {
        setSuggestions(famousSuggestions);
        setShowSuggestions(true);
      }

      // Pour les requêtes >= 3 caractères, chercher aussi via l'API
      if (query.length >= 3) {
        // Vérifier le cache local d'abord
        const cacheKey = `address:${query.toLowerCase().trim()}`;
        const cached = localCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log("📍 Cache local HIT pour:", query);
          const combined = [...famousSuggestions, ...cached.data.filter(s => !s.isFamous)];
          setSuggestions(combined);
          setShowSuggestions(combined.length > 0);
          return;
        }

        // Utiliser l'edge function avec cache en DB
        const { data, error } = await supabase.functions.invoke("geocode-cached", {
          body: { query, type: 'address' }
        });

        if (!error && data?.features) {
          const apiSuggestions = data.features || [];
          console.log(`📍 Address suggestions: ${apiSuggestions.length} (cached: ${data?.cached || false})`);
          
          // Sauvegarder dans le cache local
          localCache.set(cacheKey, { data: apiSuggestions, timestamp: Date.now() });
          
          // Combiner: lieux célèbres d'abord, puis résultats API
          const combined = [...famousSuggestions, ...apiSuggestions];
          setSuggestions(combined);
          setShowSuggestions(combined.length > 0);
        } else if (famousSuggestions.length === 0) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else if (famousSuggestions.length === 0) {
        // Query trop courte et pas de lieux célèbres
        setSuggestions([]);
        setShowSuggestions(false);
      }

      if (famousSuggestions.length > 0 || query.length >= 3) {
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 350); // Augmenté pour réduire les appels
  };

  const handleSelectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    const coordinates = {
      latitude: suggestion.center[1],
      longitude: suggestion.center[0],
    };

    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, coordinates);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [onChange]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-5 w-5 text-primary pointer-events-none z-10" />
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "pl-11 pr-11 h-12 text-base border-2 focus:border-primary",
            className
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-primary" />
        )}
      </div>

      {/* Dropdown rendered directly below input, not in a portal */}
      {showSuggestions && (suggestions.length > 0 || isLoading || inputValue.length >= 2) && (
        <div
          className="absolute left-0 right-0 mt-1 bg-card border-2 border-border rounded-lg shadow-2xl z-[99999]"
        >
          <div className="max-h-80 overflow-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Recherche en cours...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectSuggestion(suggestion);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3 group",
                    suggestion.isFamous && "bg-primary/5 border border-primary/20"
                  )}
                >
                  {suggestion.isFamous ? (
                    <Star className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500 fill-amber-500 group-hover:text-amber-600" />
                  ) : (
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary group-hover:text-accent-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground group-hover:text-accent-foreground">
                      {suggestion.text}
                    </p>
                    <p className="text-xs text-muted-foreground truncate group-hover:text-accent-foreground/80">
                      {suggestion.place_name}
                    </p>
                  </div>
                </button>
              ))
            ) : inputValue.length >= 2 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">Aucune adresse trouvée</p>
                <p className="text-xs text-muted-foreground mt-1">Essayez de modifier votre recherche</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
