import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Car, Search, MapPin, Star, ArrowRight, AlertTriangle, Navigation, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface PublicDriver {
  id: string;
  full_name: string;
  vehicle_model: string;
  vehicle_color: string;
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
}

const Chauffeurs = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<PublicDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<"city" | "address">("city");
  const [citySearch, setCitySearch] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [radius, setRadius] = useState([20]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [isExclusiveClient, setIsExclusiveClient] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkClientAccess();
  }, [user]);

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

  // Geocoding function using a public API
  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearchPerformed(true);

    try {
      if (searchMode === "city" && citySearch.trim()) {
        // Search by city
        const { data, error } = await supabase.rpc("search_drivers_by_location", {
          _city: citySearch.trim(),
          _address: null,
          _latitude: null,
          _longitude: null,
          _max_radius_km: 50,
        });

        if (error) throw error;
        setDrivers(data || []);
        
        if (!data || data.length === 0) {
          toast.info("Aucun chauffeur trouvé dans cette ville. Essayez d'élargir votre recherche.");
        }
      } else if (searchMode === "address" && addressSearch.trim()) {
        // Geocode the address first
        const coords = await geocodeAddress(addressSearch);
        
        if (!coords) {
          toast.error("Adresse non trouvée. Veuillez vérifier l'adresse saisie.");
          setDrivers([]);
          return;
        }

        // Search with progressive radius
        const { data, error } = await supabase.rpc("search_drivers_by_location", {
          _city: null,
          _address: addressSearch.trim(),
          _latitude: coords.latitude,
          _longitude: coords.longitude,
          _max_radius_km: radius[0],
        });

        if (error) throw error;
        setDrivers(data || []);
        
        if (data && data.length > 0) {
          toast.success(`${data.length} chauffeur(s) trouvé(s) dans un rayon de ${radius[0]} km`);
        } else {
          toast.info(`Aucun chauffeur trouvé dans un rayon de ${radius[0]} km. Essayez d'augmenter le rayon.`);
        }
      } else {
        toast.error("Veuillez saisir une ville ou une adresse");
      }
    } catch (error: any) {
      console.error("Error searching drivers:", error);
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
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    Par ville
                  </label>
                  <Input
                    placeholder="Commencez à taper : Paris, Lyon, Marseille..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="text-base"
                  />
                </div>
              </div>
            )}

            {/* Address + Radius Search */}
            {searchMode === "address" && (
              <div className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Navigation className="w-4 h-4 text-purple-600" />
                    Par adresse et rayon
                  </label>
                  <AddressAutocomplete
                    value={addressSearch}
                    onChange={(address) => setAddressSearch(address)}
                    placeholder="Tapez votre adresse : 12 Rue de la Paix, Paris..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Rayon: {radius[0]} km
                  </label>
                  <Slider
                    value={radius}
                    onValueChange={setRadius}
                    min={5}
                    max={100}
                    step={5}
                    className="w-full"
                  />
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
                  {drivers.map((driver) => (
                    <Card
                      key={driver.id}
                      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      onClick={() => navigate(`/chauffeur/${driver.id}`)}
                    >
                      <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-500 relative">
                        {driver.profile_photo_url ? (
                          <img
                            src={driver.profile_photo_url}
                            alt={driver.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                            {driver.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 border-0 text-white">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            {driver.rating.toFixed(1)}
                          </Badge>
                        </div>
                        {driver.distance_km && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-white/90 text-purple-900">
                              <MapPin className="w-3 h-3 mr-1" />
                              {driver.distance_km.toFixed(1)} km
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-xl font-bold mb-2 group-hover:text-purple-600 transition-colors">
                          {driver.full_name}
                        </h3>
                        <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <Car className="w-4 h-4" />
                          <span className="text-sm">
                            {driver.vehicle_model}
                            {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {driver.bio || driver.service_description || "Chauffeur professionnel"}
                        </p>
                        {driver.working_sectors && driver.working_sectors.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {driver.working_sectors.slice(0, 3).map((sector) => (
                              <Badge key={sector} variant="outline" className="text-xs">
                                {sector}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="text-sm">
                            <span className="text-muted-foreground">À partir de </span>
                            <span className="font-bold text-purple-600">
                              {driver.base_rate ? `${driver.base_rate}€` : "Sur devis"}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                          >
                            Voir profil
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </Card>
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
