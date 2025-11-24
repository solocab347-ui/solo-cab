import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  text: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

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
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch Mapbox token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error("Error fetching Mapbox token:", error);
      }
    };
    fetchToken();
  }, []);

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
    if (!query || query.length < 3 || !mapboxToken) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxToken}&country=FR&language=fr&limit=5&types=address,place,locality`
      );

      if (!response.ok) throw new Error("Geocoding failed");

      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
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
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const coordinates = {
      latitude: suggestion.center[1],
      longitude: suggestion.center[0],
    };

    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, coordinates);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10 pr-10", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="max-h-60 overflow-auto p-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{suggestion.text}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.place_name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && inputValue.length >= 3 && suggestions.length === 0 && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md border border-border bg-popover shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            Aucune adresse trouvée
          </p>
        </div>
      )}
    </div>
  );
};
