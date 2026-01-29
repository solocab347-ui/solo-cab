import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface CitySuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
  place_type: string[];
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, coordinates?: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Cache local pour éviter les appels répétés
const localCache = new Map<string, { data: CitySuggestion[], timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const CityAutocomplete = ({
  value,
  onChange,
  placeholder = "Tapez une ville...",
  className,
  disabled = false,
}: CityAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Update dropdown position
  useEffect(() => {
    const updatePosition = () => {
      if (inputRef.current && showSuggestions) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (showSuggestions) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showSuggestions]);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Vérifier le cache local d'abord
    const cacheKey = `city:${query.toLowerCase().trim()}`;
    const cached = localCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("🏙️ Cache local HIT pour:", query);
      setSuggestions(cached.data);
      setShowSuggestions(cached.data.length > 0);
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser l'edge function avec cache en DB
      const { data, error } = await supabase.functions.invoke("geocode-cached", {
        body: { query, type: 'city' }
      });

      if (error) {
        console.error("Geocoding error:", error);
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const features = data?.features || [];
      console.log(`🏙️ City suggestions: ${features.length} (cached: ${data?.cached || false})`);
      
      // Sauvegarder dans le cache local
      localCache.set(cacheKey, { data: features, timestamp: Date.now() });
      
      setSuggestions(features);
      setShowSuggestions(features.length > 0);
    } catch (error) {
      console.error("Error fetching city suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);

    // Debounce API calls
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300); // Augmenté à 300ms pour réduire les appels
  };

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    const coordinates = {
      latitude: suggestion.center[1],
      longitude: suggestion.center[0],
    };

    console.log("✅ Ville sélectionnée:", {
      city: suggestion.text,
      coordinates,
      fullName: suggestion.place_name
    });

    setInputValue(suggestion.text);
    onChange(suggestion.text, coordinates);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const renderDropdown = () => {
    if (!showSuggestions || (suggestions.length === 0 && !isLoading)) {
      return null;
    }

    return (
      <div
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 999999,
        }}
        className="bg-card border-2 border-border rounded-lg shadow-2xl"
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
                  handleSelectSuggestion(suggestion);
                }}
                className="w-full text-left px-4 py-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3 group"
              >
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary group-hover:text-accent-foreground" />
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
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">Aucune ville trouvée</p>
              <p className="text-xs text-muted-foreground mt-1">Essayez de modifier votre recherche</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-5 w-5 text-primary pointer-events-none z-10" />
        <Input
          ref={inputRef}
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

      {typeof document !== 'undefined' && createPortal(
        renderDropdown(),
        document.body
      )}
    </div>
  );
};
