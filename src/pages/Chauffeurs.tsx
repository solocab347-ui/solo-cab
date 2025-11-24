import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { DriverCard } from "@/components/DriverCard";
import { Car, Search, MapPin, AlertTriangle, Navigation, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PublicDriver {
  id: string;
  user_id?: string;
  full_name: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_brand?: string;
  vehicle_year?: number;
  vehicle_photos?: string[];
  gallery_photos?: string[];
  bio: string;
  rating: number;
  total_rides: number;
  working_sectors: string[];
  service_description: string;
  base_rate: number;
  per_km_rate: number;
  profile_photo_url: string;
  home_address: string;
  distance_km: number | null;
  company_name?: string;
  display_driver_name?: boolean;
  display_company_name?: boolean;
}

const Chauffeurs = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<PublicDriver[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Fonction pour vérifier et récupérer les données du sessionStorage avec expiration
  const getStoredData = (key: string, expirationMinutes: number = 10) => {
    const item = sessionStorage.getItem(key);
    if (!item) return null;
    
    try {
      const parsed = JSON.parse(item);
      const now = new Date().getTime();
      
      // Si les données ont un timestamp et qu'elles sont expirées
      if (parsed.timestamp && (now - parsed.timestamp) > expirationMinutes * 60 * 1000) {
        console.log(`🕐 Données expirées pour ${key}, suppression...`);
        sessionStorage.removeItem(key);
        return null;
      }
      
      return parsed.value !== undefined ? parsed.value : parsed;
    } catch (error) {
      return item;
    }
  };
  
  // Fonction pour sauvegarder avec timestamp
  const setStoredData = (key: string, value: any) => {
    const data = {
      value,
      timestamp: new Date().getTime()
    };
    sessionStorage.setItem(key, JSON.stringify(data));
  };
  
  const [searchMode, setSearchMode] = useState<"city" | "address">(() => {
    return (getStoredData("searchMode") as "city" | "address") || "city";
  });
  const [citySearch, setCitySearch] = useState(() => {
    return getStoredData("citySearch") || "";
  });
  const [cityCoordinates, setCityCoordinates] = useState<{ latitude: number; longitude: number } | null>(() => {
    return getStoredData("cityCoordinates");
  });
  const [addressSearch, setAddressSearch] = useState(() => {
    return getStoredData("addressSearch") || "";
  });
  const [addressCoordinates, setAddressCoordinates] = useState<{ latitude: number; longitude: number } | null>(() => {
    return getStoredData("addressCoordinates");
  });
  const [radiusCity, setRadiusCity] = useState<number[]>(() => {
    const stored = getStoredData("radiusCity");
    return stored ? [stored] : [10];
  });
  const [radiusAddress, setRadiusAddress] = useState<number[]>(() => {
    const stored = getStoredData("radiusAddress");
    return stored ? [stored] : [10];
  });
  const [searchPerformed, setSearchPerformed] = useState(() => {
    return getStoredData("searchPerformed") === true;
  });
  const [isExclusiveClient, setIsExclusiveClient] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const navigate = useNavigate();

  // Restaurer les résultats de recherche au chargement si disponibles
  useEffect(() => {
    const storedDrivers = getStoredData("searchResults", 10);
    if (storedDrivers && searchPerformed) {
      try {
        setDrivers(storedDrivers);
        console.log("✅ Résultats de recherche restaurés depuis le cache");
      } catch (error) {
        console.error("Error parsing stored drivers:", error);
        sessionStorage.removeItem("searchResults");
      }
    } else if (!storedDrivers && searchPerformed) {
      // Les données ont expiré, réinitialiser l'état
      console.log("🔄 Données de recherche expirées, réinitialisation...");
      setSearchPerformed(false);
      setDrivers([]);
    }
  }, []);

  // Relancer automatiquement la recherche (OPTIMISÉ)
  useEffect(() => {
    let isMounted = true;
    
    const autoRefreshSearch = async () => {
      if (!isMounted) return;
      
      const hasValidCitySearch = searchMode === "city" && citySearch && cityCoordinates;
      const hasValidAddressSearch = searchMode === "address" && addressSearch && addressCoordinates;
      
      if (hasValidCitySearch || hasValidAddressSearch) {
        console.log("🔄 Relance automatique de la recherche");
        await handleSearch();
      }
    };

    const timer = setTimeout(autoRefreshSearch, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      await checkClientAccess();
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Écouter les mises à jour en temps réel OPTIMISÉ avec subscriptionManager
  useEffect(() => {
    if (!searchPerformed || drivers.length === 0) return;

    let isMounted = true;
    let updateTimeout: NodeJS.Timeout;
    
    // Utiliser subscriptionManager pour éviter fuites
    const cleanupDriver = subscriptionManager.subscribe(
      'chauffeurs-drivers-updates',
      {
        table: 'drivers',
        event: 'UPDATE',
        debounceMs: 1000 // Debounce long pour stabilité
      },
      (payload) => {
        if (!isMounted) return;
        
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          setDrivers(prevDrivers => {
            const updated = prevDrivers.map(driver => {
              if (driver.id === payload.new.id) {
                return {
                  ...driver,
                  ...payload.new,
                  full_name: driver.full_name,
                  profile_photo_url: driver.profile_photo_url,
                };
              }
              return driver;
            });
            
            requestIdleCallback(() => {
              if (isMounted) {
                setStoredData("searchResults", updated);
              }
            });
            
            return updated;
          });
        }, 300);
      }
    );

    const cleanupProfile = subscriptionManager.subscribe(
      'chauffeurs-profiles-updates',
      {
        table: 'profiles',
        event: 'UPDATE',
        debounceMs: 1000
      },
      (payload) => {
        if (!isMounted) return;
        
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          setDrivers(prevDrivers => {
            const updated = prevDrivers.map(driver => {
              if (driver.user_id === payload.new.id) {
                return {
                  ...driver,
                  full_name: payload.new.full_name,
                  profile_photo_url: payload.new.profile_photo_url,
                };
              }
              return driver;
            });
            
            requestIdleCallback(() => {
              if (isMounted) {
                setStoredData("searchResults", updated);
              }
            });
            
            return updated;
          });
        }, 300);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(updateTimeout);
      cleanupDriver();
      cleanupProfile();
    };
  }, [searchPerformed, drivers.length]);

  // Sauvegarder l'état de recherche dans sessionStorage avec timestamp (OPTIMISÉ)
  useEffect(() => {
    // Batch toutes les écritures sessionStorage avec requestIdleCallback
    const updates = [
      () => setStoredData("searchMode", searchMode),
      () => setStoredData("citySearch", citySearch),
      () => cityCoordinates && setStoredData("cityCoordinates", cityCoordinates),
      () => setStoredData("addressSearch", addressSearch),
      () => addressCoordinates && setStoredData("addressCoordinates", addressCoordinates),
      () => setStoredData("radiusCity", radiusCity[0]),
      () => setStoredData("radiusAddress", radiusAddress[0]),
      () => setStoredData("searchPerformed", searchPerformed)
    ];

    requestIdleCallback(() => {
      updates.forEach(update => update());
    });
  }, [
    searchMode,
    citySearch,
    cityCoordinates,
    addressSearch,
    addressCoordinates,
    radiusCity,
    radiusAddress,
    searchPerformed
  ]);

  const checkClientAccess = async () => {
    if (!user) {
      setCheckingAccess(false);
      return;
    }

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (client?.is_exclusive) {
        setIsExclusiveClient(true);
      }
    } catch (error) {
      console.error("Error checking client access:", error);
    } finally {
      setCheckingAccess(false);
    }
  };

  // Sort drivers by proximity, then rating, then total rides
  const sortDrivers = (driversToSort: PublicDriver[]) => {
    return driversToSort.sort((a, b) => {
      // First: sort by distance (ascending - closest first)
      if (a.distance_km !== null && b.distance_km !== null) {
        if (a.distance_km !== b.distance_km) {
          return a.distance_km - b.distance_km;
        }
      } else if (a.distance_km !== null) {
        return -1;
      } else if (b.distance_km !== null) {
        return 1;
      }

      // Second: if same distance, sort by rating (descending - highest first)
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }

      // Third: if same rating, sort by total_rides (descending - most experienced first)
      return b.total_rides - a.total_rides;
    });
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearchPerformed(true);

    try {
      if (searchMode === "city" && citySearch.trim()) {
        // Validate city coordinates
        if (!cityCoordinates) {
          toast.error("Veuillez sélectionner une ville dans les suggestions");
          setLoading(false);
          return;
        }

        console.log("🔍 Recherche par ville:", {
          city: citySearch,
          coordinates: cityCoordinates,
          radius: radiusCity[0]
        });

        // Search by city with coordinates and radius
        const { data, error } = await supabase.rpc("search_drivers_by_location", {
          _city: citySearch.trim(),
          _address: null,
          _latitude: cityCoordinates.latitude,
          _longitude: cityCoordinates.longitude,
          _max_radius_km: radiusCity[0],
        });

        if (error) throw error;

        console.log("📊 Résultats de recherche:", data);
        
        // Log des distances pour déboguer
        data?.forEach((driver: PublicDriver) => {
          console.log(`🚗 ${driver.full_name}: ${driver.distance_km?.toFixed(2) || 'N/A'} km - Adresse: ${driver.home_address}`);
        });
        
        const sortedDrivers = sortDrivers(data || []);
        setDrivers(sortedDrivers);
        
        // Sauvegarder les résultats dans sessionStorage avec timestamp
        setStoredData("searchResults", sortedDrivers);
        
        if (sortedDrivers.length > 0) {
          toast.success(`${sortedDrivers.length} chauffeur(s) trouvé(s) dans un rayon de ${radiusCity[0]} km`);
        } else {
          toast.info(`Aucun chauffeur trouvé dans un rayon de ${radiusCity[0]} km. Essayez d'augmenter le rayon.`);
        }
      } else if (searchMode === "address" && addressSearch.trim()) {
        // Validate address coordinates
        if (!addressCoordinates) {
          toast.error("Veuillez sélectionner une adresse dans les suggestions");
          setLoading(false);
          return;
        }

        console.log("🔍 Recherche par adresse:", {
          address: addressSearch,
          coordinates: addressCoordinates,
          radius: radiusAddress[0]
        });

        // Search by address with coordinates and radius
        const { data, error } = await supabase.rpc("search_drivers_by_location", {
          _city: null,
          _address: addressSearch.trim(),
          _latitude: addressCoordinates.latitude,
          _longitude: addressCoordinates.longitude,
          _max_radius_km: radiusAddress[0],
        });

        if (error) throw error;

        console.log("📊 Résultats de recherche:", data);
        
        // Log des distances pour déboguer
        data?.forEach((driver: PublicDriver) => {
          console.log(`🚗 ${driver.full_name}: ${driver.distance_km?.toFixed(2) || 'N/A'} km - Adresse: ${driver.home_address}`);
        });
        
        const sortedDrivers = sortDrivers(data || []);
        setDrivers(sortedDrivers);
        
        // Sauvegarder les résultats dans sessionStorage avec timestamp
        setStoredData("searchResults", sortedDrivers);
        
        if (sortedDrivers.length > 0) {
          toast.success(`${sortedDrivers.length} chauffeur(s) trouvé(s) dans un rayon de ${radiusAddress[0]} km`);
        } else {
          toast.info(`Aucun chauffeur trouvé dans un rayon de ${radiusAddress[0]} km. Essayez d'augmenter le rayon.`);
        }
      } else {
        toast.error("Veuillez saisir et sélectionner une ville ou une adresse");
      }
    } catch (error: any) {
      console.error("❌ Erreur de recherche:", error);
      toast.error("Erreur lors de la recherche des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (isExclusiveClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Accès Restreint</h1>
          <p className="text-muted-foreground mb-6">
            En tant que client exclusif, vous avez déjà un chauffeur attitré. 
            Vous ne pouvez pas accéder à la vitrine publique des chauffeurs.
          </p>
          <Button onClick={() => navigate("/client-dashboard")}>
            Retour au tableau de bord
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-blue-500 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Trouvez Votre Chauffeur VTC
          </h1>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 px-6 py-2 text-base">
              <Car className="w-5 h-5 mr-2" />
              Service Premium
            </Badge>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 px-6 py-2 text-base">
              <MapPin className="w-5 h-5 mr-2" />
              Toute la France
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 pb-12">
        {/* Important Alert */}
        <Card className="mb-8 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="p-6 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Réservation à l'avance obligatoire :
              </p>
              <p className="text-amber-800 dark:text-amber-200">
                Inscrivez-vous avec un chauffeur → Envoyez votre demande → Recevez votre devis automatique
              </p>
            </div>
          </div>
        </Card>

        {/* Search Box */}
        <Card className="mb-8 shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Trouvez votre chauffeur</h2>
            </div>

            {/* Search Mode Tabs */}
            <div className="flex gap-4 mb-6">
              <Button
                variant={searchMode === "city" ? "default" : "outline"}
                onClick={() => setSearchMode("city")}
                className={searchMode === "city" ? "bg-gradient-to-r from-purple-600 to-blue-500" : ""}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Par ville
              </Button>
              <Button
                variant={searchMode === "address" ? "default" : "outline"}
                onClick={() => setSearchMode("address")}
                className={searchMode === "address" ? "bg-gradient-to-r from-purple-600 to-blue-500" : ""}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Par adresse et rayon
              </Button>
            </div>

            {/* City Search */}
            {searchMode === "city" && (
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Recherche par ville
                  </label>
                  <CityAutocomplete
                    value={citySearch}
                    onChange={(city, coords) => {
                      setCitySearch(city);
                      setCityCoordinates(coords || null);
                    }}
                    placeholder="Commencez à taper : Paris, Lyon, Marseille..."
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Rayon de recherche</label>
                    <div className="relative">
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg">
                        <span className="text-3xl font-bold text-white">{radiusCity[0]}</span>
                        <span className="text-sm text-white/90 font-medium">km</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative pt-2 pb-4">
                    <Slider
                      value={radiusCity}
                      onValueChange={setRadiusCity}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                      <span>5 km</span>
                      <span>25 km</span>
                      <span>50 km</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <p>
                      Recherche jusqu'à <span className="font-semibold text-purple-700 dark:text-purple-400">{radiusCity[0]} km</span> autour de la ville sélectionnée
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Address + Radius Search */}
            {searchMode === "address" && (
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Navigation className="w-4 h-4 text-purple-600" />
                    Recherche par adresse
                  </label>
                  <AddressAutocomplete
                    value={addressSearch}
                    onChange={(address, coords) => {
                      setAddressSearch(address);
                      setAddressCoordinates(coords || null);
                    }}
                    placeholder="Tapez votre adresse : 12 Rue de la Paix, Paris..."
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Rayon de recherche</label>
                    <div className="relative">
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg">
                        <span className="text-3xl font-bold text-white">{radiusAddress[0]}</span>
                        <span className="text-sm text-white/90 font-medium">km</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative pt-2 pb-4">
                    <Slider
                      value={radiusAddress}
                      onValueChange={setRadiusAddress}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                      <span>5 km</span>
                      <span>25 km</span>
                      <span>50 km</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Navigation className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <p>
                      Recherche jusqu'à <span className="font-semibold text-purple-700 dark:text-purple-400">{radiusAddress[0]} km</span> autour de l'adresse saisie
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full mt-6 h-14 text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Search className="w-5 h-5 mr-2" />
              {loading ? "Recherche en cours..." : "Rechercher"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {searchPerformed && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground">Recherche des chauffeurs disponibles...</p>
              </div>
            ) : drivers.length === 0 ? (
              <Card className="p-12 text-center">
                <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Aucun chauffeur trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Essayez d'élargir votre zone de recherche ou de changer de ville
                </p>
              </Card>
            ) : (
              <>
                <h3 className="text-2xl font-bold mb-6">
                  {drivers.length} chauffeur{drivers.length > 1 ? "s" : ""} trouvé{drivers.length > 1 ? "s" : ""}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drivers.map((driver, index) => (
                    <DriverCard key={driver.id} driver={driver} cardIndex={index} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Default View - Before Search */}
        {!searchPerformed && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Commencez votre recherche</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Utilisez la recherche ci-dessus pour trouver des chauffeurs VTC près de chez vous.
              Recherche par ville ou par adresse avec rayon personnalisable.
            </p>
          </div>
        )}
      </div>

      {/* Footer with Links */}
      <div className="border-t border-border mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Connexion Chauffeur
            </Link>
            <span>•</span>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Devenir Chauffeur
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chauffeurs;
