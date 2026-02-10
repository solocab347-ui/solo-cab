import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { DriverCard } from "@/components/DriverCard";
import { Car, Search, MapPin, AlertTriangle, Navigation, Lock, Users, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePaginatedData } from "@/hooks/usePaginatedQuery";
import Pagination from "@/components/Pagination";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
import SocialLinks from "@/components/SocialLinks";


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
  // SÉCURITÉ: tarifs et adresse domicile retirés de l'interface publique
  profile_photo_url: string;
  distance_km: number | null;
  company_name?: string;
  display_driver_name?: boolean;
  display_company_name?: boolean;
  show_rating_public?: boolean;
  is_pioneer?: boolean;
}

const Chauffeurs = () => {
  const { user, userRole } = useAuth();
  const { t } = useLocale();
  const [drivers, setDrivers] = useState<PublicDriver[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Scroll en haut au chargement de la page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  
  // Pagination avec 20 chauffeurs par page
  const {
    paginatedData: paginatedDrivers,
    currentPage,
    totalPages,
    goToPage,
    resetPage
  } = usePaginatedData(drivers, 20);
  
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [registeredDriverIds, setRegisteredDriverIds] = useState<string[]>([]); // IDs des chauffeurs associés
  const navigate = useNavigate();

  // Restaurer les résultats UNIQUEMENT (pas de recherche auto)
  useEffect(() => {
    const storedDrivers = getStoredData("searchResults", 10);
    if (storedDrivers && searchPerformed) {
      try {
        setDrivers(storedDrivers);
        console.log("✅ Résultats restaurés depuis le cache");
      } catch (error) {
        sessionStorage.removeItem("searchResults");
      }
    }
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

  // Subscriptions Realtime DÉSACTIVÉES pour performance
  // La page publique n'a pas besoin de mises à jour temps réel

  // Sauvegarder UNIQUEMENT au moment de la recherche (pas à chaque changement)

  const checkClientAccess = async () => {
    if (!user) {
      setCheckingAccess(false);
      return;
    }

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("is_exclusive, driver_id, driver_ids")
        .eq("user_id", user.id)
        .maybeSingle();

      if (client?.is_exclusive) {
        setIsExclusiveClient(true);
      }
      
      // Collecter tous les IDs de chauffeurs associés
      const driverIds: string[] = [];
      if (client?.driver_id) {
        driverIds.push(client.driver_id);
      }
      if (client?.driver_ids && Array.isArray(client.driver_ids)) {
        client.driver_ids.forEach((id: string) => {
          if (!driverIds.includes(id)) {
            driverIds.push(id);
          }
        });
      }
      setRegisteredDriverIds(driverIds);
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
    
    // Sauvegarder les paramètres de recherche
    setStoredData("searchMode", searchMode);
    setStoredData("citySearch", citySearch);
    cityCoordinates && setStoredData("cityCoordinates", cityCoordinates);
    setStoredData("addressSearch", addressSearch);
    addressCoordinates && setStoredData("addressCoordinates", addressCoordinates);
    setStoredData("radiusCity", radiusCity[0]);
    setStoredData("radiusAddress", radiusAddress[0]);
    setStoredData("searchPerformed", true);

    try {
      if (searchMode === "city" && citySearch.trim()) {
        // Validate city coordinates
        if (!cityCoordinates || !cityCoordinates.latitude || !cityCoordinates.longitude) {
          toast.error("⚠️ Coordonnées manquantes", {
            description: "Veuillez sélectionner une ville dans la liste des suggestions qui apparaît quand vous tapez",
            duration: 6000
          });
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
          console.log(`🚗 ${driver.full_name}: ${driver.distance_km?.toFixed(2) || 'N/A'} km`);
        });
        
        const sortedDrivers = sortDrivers(data || []);
        setDrivers(sortedDrivers);
        resetPage(); // Reset à la page 1
        
        // Sauvegarder les résultats dans sessionStorage
        setStoredData("searchResults", sortedDrivers);
        
        if (sortedDrivers.length > 0) {
          toast.success(`✅ Recherche terminée !`, {
            description: `${sortedDrivers.length} chauffeur(s) trouvé(s) dans un rayon de ${radiusCity[0]} km autour de ${citySearch}`,
            duration: 6000
          });
        } else {
          toast.info(`Aucun résultat`, {
            description: `Aucun chauffeur trouvé dans un rayon de ${radiusCity[0]} km. Essayez d'augmenter le rayon de recherche.`,
            duration: 6000
          });
        }
      } else if (searchMode === "address" && addressSearch.trim()) {
        // Validate address coordinates
        if (!addressCoordinates || !addressCoordinates.latitude || !addressCoordinates.longitude) {
          toast.error("⚠️ Coordonnées manquantes", {
            description: "Veuillez sélectionner une adresse dans la liste des suggestions qui apparaît quand vous tapez",
            duration: 6000
          });
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
          console.log(`🚗 ${driver.full_name}: ${driver.distance_km?.toFixed(2) || 'N/A'} km`);
        });
        
        const sortedDrivers = sortDrivers(data || []);
        setDrivers(sortedDrivers);
        resetPage(); // Reset à la page 1
        
        // Sauvegarder les résultats dans sessionStorage
        setStoredData("searchResults", sortedDrivers);
        
        if (sortedDrivers.length > 0) {
          toast.success(`✅ Recherche terminée !`, {
            description: `${sortedDrivers.length} chauffeur(s) trouvé(s) dans un rayon de ${radiusAddress[0]} km`,
            duration: 6000
          });
        } else {
          toast.info(`Aucun résultat`, {
            description: `Aucun chauffeur trouvé dans un rayon de ${radiusAddress[0]} km. Essayez d'augmenter le rayon de recherche.`,
            duration: 6000
          });
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
        <p className="text-muted-foreground">{t('chauffeurs.loading')}</p>
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
          <h1 className="text-2xl font-bold mb-4">{t('chauffeurs.restrictedAccess')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('chauffeurs.exclusiveClientMessage')}
          </p>
          <Button onClick={() => navigate("/client-dashboard")}>
            {t('chauffeurs.backToDashboard')}
          </Button>
        </Card>
      </div>
    );
  }

  // La vitrine est maintenant ouverte au public

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Navigation for logged-in clients */}
      {user && userRole === 'client' && (
        <div className="bg-storefront-dark/50 backdrop-blur-lg sticky top-0 z-50 border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/client-dashboard')}
              className="text-foreground/80 hover:text-foreground hover:bg-muted/30 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/client-dashboard')}
              className="text-foreground/80 hover:text-foreground hover:bg-muted/30 gap-2"
            >
              <Home className="w-4 h-4" />
              Mon espace
            </Button>
          </div>
        </div>
      )}
      
      {/* Hero Section - Couleurs SoloCab */}
      <div className="relative overflow-hidden bg-gradient-to-b from-storefront-dark to-storefront">
        {/* Effet radial subtil */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]" />
        
        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <div className="flex justify-center mb-8">
            <SocialLinks variant="compact" className="text-muted-foreground" />
          </div>
          
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-muted/30 text-foreground/90 border-border backdrop-blur-sm px-4 py-1.5">
              <Car className="w-4 h-4 mr-2" />
              Service VTC Premium
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight">
              Trouvez votre{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                chauffeur privé
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Des professionnels d'exception à votre service. 
              Réservez votre trajet en toute simplicité.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 bg-muted/30 backdrop-blur-sm border border-border rounded-full px-5 py-2.5">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-foreground/80 text-sm">Chauffeurs disponibles 24/7</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 backdrop-blur-sm border border-border rounded-full px-5 py-2.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-foreground/80 text-sm">{t('chauffeurs.allFrance')}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dégradé de transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-storefront to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-12 bg-gradient-to-b from-storefront to-storefront-light">
        {/* Search Box - Design épuré */}
        <Card className="mb-10 shadow-xl border border-border bg-muted/30 backdrop-blur-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/25">
                <Search className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{t('chauffeurs.findYourDriver')}</h2>
                <p className="text-sm text-muted-foreground">Recherchez par ville ou adresse</p>
              </div>
            </div>


            {/* Search Mode Tabs */}
            <div className="flex gap-3 mb-8">
              <Button
                variant={searchMode === "city" ? "default" : "outline"}
                onClick={() => setSearchMode("city")}
                className={searchMode === "city" ? "bg-primary border-0 shadow-lg" : ""}
              >
                <MapPin className="w-4 h-4 mr-2" />
                {t('chauffeurs.byCity')}
              </Button>
              <Button
                variant={searchMode === "address" ? "default" : "outline"}
                onClick={() => setSearchMode("address")}
                className={searchMode === "address" ? "bg-primary border-0 shadow-lg" : ""}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {t('chauffeurs.byAddress')}
              </Button>
            </div>

            {/* City Search */}
            {searchMode === "city" && (
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    {t('chauffeurs.searchByCity')}
                  </label>
                  <CityAutocomplete
                    value={citySearch}
                    onChange={(city, coords) => {
                      setCitySearch(city);
                      setCityCoordinates(coords || null);
                    }}
                    placeholder={t('chauffeurs.typeAndSelectCity')}
                  />
                  {citySearch && !cityCoordinates && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t('chauffeurs.selectCityHint')}
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{t('chauffeurs.searchRadius')}</label>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full shadow-lg">
                      <span className="text-2xl font-bold text-primary-foreground">{radiusCity[0]}</span>
                      <span className="text-sm text-primary-foreground/80">km</span>
                    </div>
                  </div>
                  <Slider
                    value={radiusCity}
                    onValueChange={setRadiusCity}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 km</span>
                    <span>25 km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>
            )}

            {/* Address Search */}
            {searchMode === "address" && (
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Navigation className="w-4 h-4 text-primary" />
                    Recherche par adresse
                  </label>
                  <AddressAutocomplete
                    value={addressSearch}
                    onChange={(address, coords) => {
                      setAddressSearch(address);
                      setAddressCoordinates(coords || null);
                    }}
                    placeholder="Tapez et sélectionnez une adresse"
                  />
                  {addressSearch && !addressCoordinates && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Sélectionnez une adresse dans la liste
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Rayon de recherche</label>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full shadow-lg">
                      <span className="text-2xl font-bold text-primary-foreground">{radiusAddress[0]}</span>
                      <span className="text-sm text-primary-foreground/80">km</span>
                    </div>
                  </div>
                  <Slider
                    value={radiusAddress}
                    onValueChange={setRadiusAddress}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 km</span>
                    <span>25 km</span>
                    <span>50 km</span>
                  </div>
                </div>
              </div>
            )}

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full mt-8 h-14 text-lg font-semibold bg-gradient-to-r from-primary via-primary to-amber-500 hover:opacity-90 shadow-lg shadow-primary/25 transition-all"
            >
              <Search className="w-5 h-5 mr-2" />
              {loading ? "Recherche en cours..." : "Rechercher un chauffeur"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {searchPerformed && (
          <>
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground">Recherche des chauffeurs disponibles...</p>
              </div>
            ) : drivers.length === 0 ? (
              <Card className="p-16 text-center border-0 bg-muted/30">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <Car className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Aucun chauffeur trouvé</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Essayez d'élargir votre zone de recherche ou de modifier vos critères
                </p>
              </Card>
            ) : (
              <>
                {/* Section résultats */}
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">
                          Chauffeurs disponibles
                        </h3>
                        <p className="text-muted-foreground">
                          {drivers.length} professionnel{drivers.length > 1 ? "s" : ""} près de chez vous
                        </p>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <Badge variant="outline" className="text-sm">
                        Page {currentPage}/{totalPages}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedDrivers.map((driver, index) => (
                      <DriverCard
                        key={driver.id}
                        driver={driver}
                        cardIndex={index}
                        isRegistered={registeredDriverIds.includes(driver.id)}
                        onViewProfile={(driverId) => {
                          setSelectedDriverId(driverId);
                          setDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="mt-10">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={20}
                        totalItems={drivers.length}
                        onPageChange={goToPage}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Default View */}
        {!searchPerformed && (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-8">
              <Search className="w-12 h-12 text-amber-400/60" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Trouvez votre chauffeur idéal</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Utilisez la recherche ci-dessus pour découvrir les chauffeurs VTC professionnels disponibles dans votre région.
            </p>
          </div>
        )}
      </div>

      {/* Footer élégant */}
      <footer className="border-t border-border bg-storefront-dark">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col items-center gap-6">
            <SocialLinks variant="compact" />
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-foreground transition-colors">
                Espace Chauffeur
              </Link>
              <span className="w-1 h-1 rounded-full bg-border" />
              <Link to="/register-driver" className="hover:text-foreground transition-colors">
                Devenir Chauffeur
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} SoloCab - Service VTC Premium
            </p>
          </div>
        </div>
      </footer>

      {/* Profile Dialog */}
      <DriverProfileDialog
        driverId={selectedDriverId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isRegistered={selectedDriverId ? registeredDriverIds.includes(selectedDriverId) : false}
      />
    </div>
  );
};

export default Chauffeurs;
