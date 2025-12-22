import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Car, MapPin, Calendar, Users, Star, Loader2, Check } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { validateCoordinates } from "@/lib/courseValidation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { sanitizeAddress, sanitizeString, sanitizeInteger } from "@/lib/inputSanitizer";

interface FleetDriver {
  id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  rating: number | null;
  vehicle_photos: string[] | null;
  max_passengers: number;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

const CreateFleetCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [fleetManagerId, setFleetManagerId] = useState<string | null>(null);
  const [favoriteDriverId, setFavoriteDriverId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("favorite");
  
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [useAddressPickup, setUseAddressPickup] = useState(false);
  const [useAddressDestination, setUseAddressDestination] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Récupérer le client et son fleet manager
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, fleet_manager_id, favorite_driver_id")
          .eq("user_id", user.id)
          .single();
        
        if (!clientData || !clientData.fleet_manager_id) {
          toast.error("Vous n'êtes pas associé à un gestionnaire de flotte");
          navigate("/");
          return;
        }
        
        setClientId(clientData.id);
        setFleetManagerId(clientData.fleet_manager_id);
        setFavoriteDriverId(clientData.favorite_driver_id);
        
        // Récupérer les chauffeurs de la flotte
        const { data: fleetDrivers } = await supabase
          .from("fleet_manager_drivers")
          .select(`
            driver_id,
            driver:drivers(
              id,
              vehicle_model,
              vehicle_brand,
              rating,
              vehicle_photos,
              max_passengers,
              user_id
            )
          `)
          .eq("fleet_manager_id", clientData.fleet_manager_id)
          .eq("status", "active");
        
        if (fleetDrivers) {
          const driverUserIds = fleetDrivers
            .filter(d => d.driver)
            .map(d => (d.driver as any).user_id);
          
          if (driverUserIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, profile_photo_url")
              .in("id", driverUserIds);
            
            const driversWithProfiles = fleetDrivers
              .filter(d => d.driver)
              .map(d => ({
                ...(d.driver as any),
                profile: profiles?.find(p => p.id === (d.driver as any).user_id)
              }));
            
            setDrivers(driversWithProfiles);
          }
        }
        
        // Récupérer l'adresse du client
        const { data: profileData } = await supabase
          .from("profiles")
          .select("address")
          .eq("id", user.id)
          .single();
        
        if (profileData?.address) {
          setClientAddress(profileData.address);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, navigate]);

  // Géolocalisation adresse pickup
  useEffect(() => {
    const applyPickupAddress = async () => {
      if (useAddressPickup && clientAddress) {
        setPickupAddress(clientAddress);
        try {
          const result = await geocodeAddress(clientAddress);
          if (result.success && result.coordinates) {
            setPickupCoordinates(result.coordinates);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        }
      } else if (!useAddressPickup) {
        setPickupAddress("");
        setPickupCoordinates(null);
      }
    };
    applyPickupAddress();
  }, [useAddressPickup, clientAddress]);

  useEffect(() => {
    const applyDestinationAddress = async () => {
      if (useAddressDestination && clientAddress) {
        setDestinationAddress(clientAddress);
        try {
          const result = await geocodeAddress(clientAddress);
          if (result.success && result.coordinates) {
            setDestinationCoordinates(result.coordinates);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        }
      } else if (!useAddressDestination) {
        setDestinationAddress("");
        setDestinationCoordinates(null);
      }
    };
    applyDestinationAddress();
  }, [useAddressDestination, clientAddress]);

  const getSelectedDriver = () => {
    if (selectedDriverId === "favorite" && favoriteDriverId) {
      return drivers.find(d => d.id === favoriteDriverId);
    }
    return drivers.find(d => d.id === selectedDriverId);
  };

  const getMaxPassengers = () => {
    const driver = getSelectedDriver();
    return driver?.max_passengers || 4;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !clientId) {
      toast.error("Informations manquantes");
      return;
    }

    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
      toast.error("Veuillez sélectionner des adresses valides");
      return;
    }

    if (!scheduledDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    setSubmitting(true);
    
    try {
      // Déterminer le chauffeur
      let assignedDriverId: string | null = null;
      
      if (selectedDriverId === "favorite" && favoriteDriverId) {
        assignedDriverId = favoriteDriverId;
      } else if (selectedDriverId !== "favorite") {
        assignedDriverId = selectedDriverId;
      }
      
      if (!assignedDriverId) {
        toast.error("Veuillez sélectionner un chauffeur");
        setSubmitting(false);
        return;
      }

      // Sanitize inputs
      const sanitizedPickup = sanitizeAddress(pickupAddress);
      const sanitizedDestination = sanitizeAddress(destinationAddress);
      const sanitizedNotes = sanitizeString(notes);
      const sanitizedPassengers = sanitizeInteger(passengersCount, 1, getMaxPassengers());

      // Créer la course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: clientId,
          driver_id: assignedDriverId,
          pickup_address: sanitizedPickup,
          pickup_latitude: pickupCoordinates?.latitude,
          pickup_longitude: pickupCoordinates?.longitude,
          destination_address: sanitizedDestination,
          destination_latitude: destinationCoordinates?.latitude,
          destination_longitude: destinationCoordinates?.longitude,
          scheduled_date: scheduledDate,
          passengers_count: sanitizedPassengers,
          notes: sanitizedNotes,
          status: "pending",
          created_by_user_id: user.id
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Créer automatiquement un devis via edge function
      try {
        await supabase.functions.invoke("create-devis-auto", {
          body: { courseId: course.id }
        });
      } catch (devisError) {
        console.error("Error creating devis:", devisError);
      }

      // Notifier le chauffeur
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", assignedDriverId)
        .single();

      if (driverData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driverData.user_id,
          title: "Nouvelle demande de course",
          message: `Course de ${sanitizedPickup} à ${sanitizedDestination}`,
          type: "course_request",
          link: "/fleet-driver-dashboard?tab=courses"
        });
      }

      toast.success("Demande de course envoyée !");
      navigate("/fleet-client-dashboard");
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast.error("Erreur lors de la création de la course");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const favoriteDriver = drivers.find(d => d.id === favoriteDriverId);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <NavigationHeader 
            showBack={true}
            showHome={true}
            homeRoute="/fleet-client-dashboard"
          />

          <Card className="p-8 bg-card border-primary/10 mt-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Nouvelle Réservation</h1>
                <p className="text-muted-foreground">Réservez votre trajet</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélection du chauffeur */}
              <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <Car className="w-5 h-5 text-primary" />
                  Choix du chauffeur
                </h3>
                
                <div className="space-y-3">
                  {favoriteDriver && (
                    <div 
                      onClick={() => setSelectedDriverId("favorite")}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDriverId === "favorite"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={favoriteDriver.profile?.profile_photo_url || ""} />
                          <AvatarFallback>
                            {favoriteDriver.profile?.full_name?.charAt(0) || "C"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {favoriteDriver.profile?.full_name || "Chauffeur"}
                            </span>
                            <Badge variant="secondary" className="bg-warning/20 text-warning text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Favori
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {favoriteDriver.vehicle_brand} {favoriteDriver.vehicle_model}
                          </p>
                        </div>
                        {selectedDriverId === "favorite" && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ou choisissez un autre chauffeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {favoriteDriver && (
                        <SelectItem value="favorite">
                          ⭐ {favoriteDriver.profile?.full_name} (Favori)
                        </SelectItem>
                      )}
                      {drivers.filter(d => d.id !== favoriteDriverId).map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.profile?.full_name || "Chauffeur"} - {driver.vehicle_brand} {driver.vehicle_model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Itinéraire */}
              <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  Itinéraire
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Point de départ *
                    </Label>
                    {clientAddress && (
                      <div className="flex items-center gap-2 mb-2 p-3 bg-card rounded-lg border border-border">
                        <Checkbox
                          id="use-address-pickup"
                          checked={useAddressPickup}
                          onCheckedChange={(checked) => setUseAddressPickup(checked as boolean)}
                        />
                        <label htmlFor="use-address-pickup" className="text-sm cursor-pointer">
                          Partir de mon adresse
                        </label>
                      </div>
                    )}
                    <AddressAutocomplete
                      value={pickupAddress}
                      onChange={(address, coords) => {
                        setPickupAddress(address);
                        if (coords) setPickupCoordinates(coords);
                        setUseAddressPickup(false);
                      }}
                      placeholder="Ex: 15 Rue de la Paix, Paris"
                      disabled={useAddressPickup}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-destructive" />
                      Point d'arrivée *
                    </Label>
                    {clientAddress && (
                      <div className="flex items-center gap-2 mb-2 p-3 bg-card rounded-lg border border-border">
                        <Checkbox
                          id="use-address-destination"
                          checked={useAddressDestination}
                          onCheckedChange={(checked) => setUseAddressDestination(checked as boolean)}
                        />
                        <label htmlFor="use-address-destination" className="text-sm cursor-pointer">
                          Retourner à mon adresse
                        </label>
                      </div>
                    )}
                    <AddressAutocomplete
                      value={destinationAddress}
                      onChange={(address, coords) => {
                        setDestinationAddress(address);
                        if (coords) setDestinationCoordinates(coords);
                        setUseAddressDestination(false);
                      }}
                      placeholder="Ex: Aéroport CDG, Roissy"
                      disabled={useAddressDestination}
                    />
                  </div>
                </div>
              </div>

              {/* Date et passagers */}
              <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                  Détails
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Date et heure *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Passagers *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max={getMaxPassengers()}
                      value={passengersCount}
                      onChange={(e) => setPassengersCount(e.target.value)}
                      required
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {getMaxPassengers()} personnes
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instructions particulières, bagages..."
                    rows={3}
                    className="bg-background"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 text-lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Demander un devis"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default CreateFleetCourse;
