import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Calculator, MapPin, Navigation, Plus, UserPlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { calculateRoute } from "@/lib/geocoding";
import { logger } from "@/lib/productionLogger";
import { CourseInvitationLink } from "./CourseInvitationLink";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PriceCalculatorProps {
  driverProfile: any;
}

export const PriceCalculator = ({ driverProfile }: PriceCalculatorProps) => {
  const navigate = useNavigate();
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const isSubmittingRef = React.useRef(false);
  
  // État pour l'invitation nouveau client
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    token: string;
    estimatedPrice: number;
    pickupAddress: string;
    destinationAddress: string;
  } | null>(null);

  const handleCalculate = async () => {
    // Validation stricte des entrées
    if (!pickupAddress || !destinationAddress) {
      toast.error("Veuillez renseigner les deux adresses");
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      toast.error("Veuillez sélectionner les adresses dans la liste de suggestions");
      return;
    }

    // Validation de la structure du profil chauffeur
    if (!driverProfile?.driver?.id) {
      logger.error("Structure driverProfile invalide", { driverProfile });
      toast.error("Erreur: Profil chauffeur non disponible");
      return;
    }

    // Validation des paramètres tarifaires OBLIGATOIRES
    const driver = driverProfile.driver;
    const missingParams: string[] = [];
    
    // Le forfait de base PEUT être 0€ (tarification uniquement au km)
    if (driver.base_fare === null || driver.base_fare === undefined) {
      missingParams.push("Forfait de base");
    }
    
    // Le tarif au km est OBLIGATOIRE et doit être > 0
    if (!driver.per_km_rate || driver.per_km_rate <= 0) {
      missingParams.push("Tarif au kilomètre");
    }

    if (missingParams.length > 0) {
      logger.error("Paramètres tarifaires manquants", { 
        driverId: driver.id, 
        missing: missingParams,
        current: { base_fare: driver.base_fare, per_km_rate: driver.per_km_rate }
      });
      
      toast.error(
        `Paramètres tarifaires non configurés: ${missingParams.join(", ")}`,
        {
          description: "Veuillez configurer vos tarifs dans la section Paramètres",
          duration: 8000,
          action: {
            label: "Aller aux Paramètres",
            onClick: () => navigate("/driver-dashboard?tab=settings")
          }
        }
      );
      return;
    }

    setCalculating(true);
    logger.info("Début du calcul de prix", {
      driverId: driverProfile.driver.id,
      pickup: pickupAddress,
      destination: destinationAddress
    });

    try {
      // Étape 1: Calcul de l'itinéraire
      const routeResult = await logger.measure(
        () => calculateRoute(pickupCoordinates, destinationCoordinates),
        "Calcul itinéraire Mapbox"
      );

      if (!routeResult.success || !routeResult.distance_km || !routeResult.duration_minutes) {
        logger.error("Échec calcul itinéraire", { result: routeResult });
        toast.error(routeResult.error || "Impossible de calculer l'itinéraire");
        setCalculating(false);
        return;
      }

      const distanceKm = routeResult.distance_km;
      const durationMinutes = routeResult.duration_minutes;

      logger.info("Itinéraire calculé", { distanceKm, durationMinutes });

      // Étape 2: Vérifier si une tarification par ville s'applique
      const startPrice = performance.now();
      
      console.log("🔍 Vérification tarification par ville...");
      
      let priceData = null;
      let priceError = null;
      let pricingType = "classic";
      
      // Vérifier si une tarification par ville existe pour ce trajet
      // Utilisation de "as any" car les types ne sont pas encore régénérés
      const { data: applicablePricing } = await (supabase.rpc as any)("get_applicable_pricing", {
        p_driver_id: driverProfile.driver.id,
        p_pickup_address: pickupAddress,
        p_destination_address: destinationAddress
      });
      
      console.log("📊 Tarification applicable:", applicablePricing);
      
      if (applicablePricing && Array.isArray(applicablePricing) && applicablePricing.length > 0 && applicablePricing[0]?.pricing_type === "city") {
        // Utiliser la tarification par ville
        pricingType = "city";
        const cityPricingId = applicablePricing[0].city_pricing_id;
        
        console.log("🏙️ Utilisation tarification ville:", cityPricingId);
        
        const { data, error } = await supabase.rpc("calculate_city_course_price", {
          p_city_pricing_id: cityPricingId,
          p_distance_km: distanceKm,
          p_duration_minutes: durationMinutes,
          p_use_hourly_rate: false,
          p_scheduled_date: null
        });
        
        priceData = data;
        priceError = error;
      } else {
        // Utiliser la tarification classique
        console.log("🔢 Utilisation tarification classique");
        
        const { data, error } = await supabase.rpc("calculate_course_price", {
          _driver_id: driverProfile.driver.id,
          _distance_km: distanceKm,
          _duration_minutes: durationMinutes,
          _use_hourly_rate: false,
          _scheduled_date: null,
        });
        
        priceData = data;
        priceError = error;
      }
      
      console.log("📊 Réponse RPC:", { priceData, priceError });
      
      logger.performance("Calcul prix RPC", performance.now() - startPrice);

      if (priceError) {
        console.error("❌ Erreur RPC:", priceError);
        logger.error("Erreur RPC calculate_course_price", { error: priceError });
        toast.error("Erreur lors du calcul du prix. Vérifiez vos paramètres tarifaires.");
        setCalculating(false);
        return;
      }

      if (!priceData || priceData.length === 0) {
        console.error("❌ Pas de données de prix");
        logger.error("Aucune donnée de prix retournée");
        toast.error("Erreur: Calcul de prix échoué");
        setCalculating(false);
        return;
      }

      const calculatedPrice = priceData[0];
      console.log("💰 Prix calculé:", calculatedPrice);

      // Validation du résultat
      if (!calculatedPrice.total_price || calculatedPrice.total_price <= 0) {
        console.error("❌ Prix invalide:", calculatedPrice);
        logger.error("Prix invalide", { price: calculatedPrice });
        toast.error("Erreur: Prix calculé invalide. Vérifiez vos paramètres tarifaires.");
        setCalculating(false);
        return;
      }

      setResult({
        distance: distanceKm.toFixed(2),
        duration: durationMinutes,
        price: calculatedPrice,
      });

      // Étape 3: Charger les clients (limité pour la scalabilité)
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
          id,
          user_id,
          profiles!clients_user_id_fkey (
            full_name,
            email
          )
        `)
        .or(`driver_id.eq.${driverProfile.driver.id},driver_ids.cs.{${driverProfile.driver.id}}`)
        .limit(200);

      if (clientsError) {
        logger.warn("Erreur chargement clients", { error: clientsError });
        setClients([]);
      } else {
        setClients(clientsData || []);
      }

      toast.success("✅ Prix calculé avec succès !", {
        description: `Distance: ${distanceKm.toFixed(2)} km • Durée: ${durationMinutes} min • Prix TTC: ${calculatedPrice.total_price.toFixed(2)}€`,
        duration: 6000
      });

      logger.info("Calcul terminé avec succès");
    } catch (error: any) {
      logger.exception(error, { context: "PriceCalculator.handleCalculate" });
      toast.error("Erreur lors du calcul du prix. Veuillez réessayer.");
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!selectedClientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    // Protection anti-double-submit
    if (isSubmittingRef.current) {
      toast.warning("Veuillez patienter, votre demande est en cours...");
      return;
    }
    isSubmittingRef.current = true;

    setCreatingCourse(true);
    logger.info("Création de course depuis calculatrice", {
      clientId: selectedClientId,
      driverId: driverProfile.driver.id
    });

    try {
      // Récupérer le user_id du driver pour created_by_user_id
      const { data: { user } } = await supabase.auth.getUser();

      // Créer la course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: selectedClientId,
          driver_id: driverProfile.driver.id,
          driver_ids: [driverProfile.driver.id],
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates?.latitude,
          pickup_longitude: pickupCoordinates?.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates?.latitude,
          destination_longitude: destinationCoordinates?.longitude,
          distance_km: parseFloat(result.distance),
          duration_minutes: result.duration,
          scheduled_date: new Date().toISOString(),
          passengers_count: 1,
          status: "pending",
          created_by_user_id: user?.id || null,
        })
        .select()
        .single();

      if (courseError) {
        logger.error("Erreur création course", { error: courseError });
        throw courseError;
      }

      // Créer le devis automatique
      await supabase.functions.invoke("create-devis-auto", {
        body: {
          course_id: courseData.id,
          driver_id: driverProfile.driver.id,
          client_id: selectedClientId,
        },
      });

      toast.success("Course créée avec succès !");
      logger.info("Course créée avec succès", { courseId: courseData.id });
      
      // Réinitialiser le formulaire
      setPickupAddress("");
      setPickupCoordinates(null);
      setDestinationAddress("");
      setDestinationCoordinates(null);
      setResult(null);
      setSelectedClientId("");
      
      // Rediriger vers Mes Courses
      navigate("/driver-dashboard");
    } catch (error: any) {
      logger.exception(error, { context: "PriceCalculator.handleCreateCourse" });
      toast.error("Erreur lors de la création de la course");
    } finally {
      setCreatingCourse(false);
    }
  };

  // Créer une course pour un nouveau client (invitation)
  const handleCreateCourseInvitation = async () => {
    if (!result) {
      toast.error("Veuillez d'abord calculer le prix");
      return;
    }

    setCreatingInvitation(true);
    logger.info("Création d'invitation course pour nouveau client", {
      driverId: driverProfile.driver.id
    });

    try {
      // 1. Créer la course sans client_id (en attente d'inscription)
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          driver_id: driverProfile.driver.id,
          client_id: null, // Sera rempli après inscription
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates?.latitude,
          pickup_longitude: pickupCoordinates?.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates?.latitude,
          destination_longitude: destinationCoordinates?.longitude,
          distance_km: parseFloat(result.distance),
          duration_minutes: result.duration,
          scheduled_date: new Date().toISOString(),
          passengers_count: 1,
          status: "pending",
          notes: "En attente d'inscription client via lien d'invitation"
        })
        .select()
        .single();

      if (courseError) {
        logger.error("Erreur création course invitation", { error: courseError });
        throw courseError;
      }

      // 2. Créer l'invitation avec token unique
      const { data: invitationData, error: invitationError } = await supabase
        .from("course_invitations")
        .insert({
          driver_id: driverProfile.driver.id,
          course_id: courseData.id,
          pickup_address: pickupAddress,
          destination_address: destinationAddress,
          distance_km: parseFloat(result.distance),
          duration_minutes: result.duration,
          estimated_price: result.price.total_price,
          price_details: result.price,
          status: "pending"
        })
        .select()
        .single();

      if (invitationError) {
        logger.error("Erreur création invitation", { error: invitationError });
        throw invitationError;
      }

      // 3. Afficher le dialog de partage
      setInvitationData({
        token: invitationData.token,
        estimatedPrice: result.price.total_price,
        pickupAddress: pickupAddress,
        destinationAddress: destinationAddress
      });

      toast.success("Invitation créée ! Partagez le lien avec votre client.");
      logger.info("Invitation créée avec succès", { 
        invitationId: invitationData.id,
        courseId: courseData.id 
      });

    } catch (error: any) {
      logger.exception(error, { context: "PriceCalculator.handleCreateCourseInvitation" });
      toast.error("Erreur lors de la création de l'invitation");
    } finally {
      setCreatingInvitation(false);
    }
  };

  const handleCloseInvitationDialog = () => {
    setInvitationData(null);
    // Réinitialiser le formulaire
    setPickupAddress("");
    setPickupCoordinates(null);
    setDestinationAddress("");
    setDestinationCoordinates(null);
    setResult(null);
    setSelectedClientId("");
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-gradient-to-br from-card to-card/50 border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brown/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-6 h-6 text-brown-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Calculatrice Rapide</h3>
            <p className="text-sm text-muted-foreground">Calculez un trajet et créez une course</p>
          </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">
                <MapPin className="w-5 h-5 text-success" />
                📍 Adresse de départ
              </Label>
              <AddressAutocomplete
                value={pickupAddress}
                onChange={(address, coords) => {
                  setPickupAddress(address);
                  if (coords) setPickupCoordinates(coords);
                }}
                placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
              />
              <p className="text-xs text-muted-foreground">
                Tapez l'adresse complète puis sélectionnez dans la liste
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Navigation className="w-5 h-5 text-destructive" />
                🏁 Adresse de destination
              </Label>
              <AddressAutocomplete
                value={destinationAddress}
                onChange={(address, coords) => {
                  setDestinationAddress(address);
                  if (coords) setDestinationCoordinates(coords);
                }}
                placeholder="Ex: Aéroport Charles de Gaulle, 95700 Roissy"
              />
              <p className="text-xs text-muted-foreground">
                Attendez les suggestions puis cliquez pour sélectionner
              </p>
            </div>

          <Button
            onClick={handleCalculate}
            disabled={calculating || !pickupAddress || !destinationAddress}
            className="w-full bg-gradient-to-r from-success to-trust text-white"
            size="lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            {calculating ? "Calcul en cours..." : "Calculer"}
          </Button>
        </div>
      </Card>

      {/* Résultat du calcul */}
      {result && (
        <Card className="p-6 bg-gradient-premium border-0">
          <h4 className="text-lg font-bold mb-4 text-premium-foreground">Résultat du calcul</h4>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Distance</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.distance} km</p>
            </div>
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Durée estimée</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.duration} min</p>
            </div>
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Prix TTC</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.price.total_price.toFixed(2)} €</p>
            </div>
          </div>

          <div className="bg-premium-foreground/10 rounded-lg p-4 mb-6">
            <h5 className="font-semibold mb-2 text-premium-foreground">Détails du prix</h5>
            <div className="space-y-1 text-sm text-premium-foreground/80">
              <div className="flex justify-between">
                <span>Forfait de base</span>
                <span>{result.price.base_price.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>Distance ({result.distance} km)</span>
                <span>{result.price.distance_price.toFixed(2)} €</span>
              </div>
              {driverProfile?.driver?.tva_included ? (
                <>
                  <div className="flex justify-between font-bold text-premium-foreground pt-2 border-t border-premium-foreground/20">
                    <span>Total TTC</span>
                    <span>{result.price.total_price.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Dont TVA (10%)</span>
                    <span>{result.price.tva_amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Montant HT</span>
                    <span>{(result.price.total_price - result.price.tva_amount).toFixed(2)} €</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Sous-total HT</span>
                    <span>{result.price.subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA (10%)</span>
                    <span>{result.price.tva_amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-bold text-premium-foreground pt-2 border-t border-premium-foreground/20">
                    <span>Total TTC</span>
                    <span>{result.price.total_price.toFixed(2)} €</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Créer une course avec ce calcul */}
          <div className="space-y-4 pt-6 border-t border-premium-foreground/20">
            <h5 className="font-semibold text-premium-foreground">Créer une course avec ce calcul</h5>
            
            <Tabs defaultValue="existing" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-premium-foreground/10">
                <TabsTrigger value="existing" className="data-[state=active]:bg-premium-foreground data-[state=active]:text-premium">
                  <Plus className="w-4 h-4 mr-2" />
                  Client existant
                </TabsTrigger>
                <TabsTrigger value="new" className="data-[state=active]:bg-premium-foreground data-[state=active]:text-premium">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nouveau client
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-premium-foreground">Sélectionner un client</Label>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientSearchOpen}
                        className="w-full justify-between bg-premium-foreground/10 border-premium-foreground/20 text-premium-foreground hover:bg-premium-foreground/20"
                      >
                        {selectedClientId
                          ? clients.find((client) => client.id === selectedClientId)?.profiles?.full_name || "Client sélectionné"
                          : "Rechercher un client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-card border-border z-[100000]" align="start">
                      <Command className="bg-card">
                        <CommandInput placeholder="Taper le nom du client..." className="h-9" />
                        <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                        <CommandGroup className="max-h-80 overflow-auto">
                          {clients.filter(client => client.profiles).map((client) => (
                            <CommandItem
                              key={client.id}
                              value={`${client.profiles?.full_name || ""} ${client.profiles?.email || ""}`}
                              onSelect={() => {
                                setSelectedClientId(client.id);
                                setClientSearchOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{client.profiles?.full_name || "Client sans nom"}</span>
                                <span className="text-xs text-muted-foreground">{client.profiles?.email || ""}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleCreateCourse}
                  disabled={creatingCourse || !selectedClientId}
                  className="w-full bg-premium-foreground text-premium hover:bg-premium-foreground/90"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {creatingCourse ? "Création en cours..." : "Créer la course"}
                </Button>
              </TabsContent>
              
              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="bg-premium-foreground/5 rounded-lg p-4 text-sm text-premium-foreground/80">
                  <p className="mb-2">
                    <strong>Comment ça marche ?</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Cliquez sur "Envoyer un lien d'inscription"</li>
                    <li>Partagez le lien avec votre client (SMS, WhatsApp, Email...)</li>
                    <li>Le client s'inscrit via le lien</li>
                    <li>La course et le devis apparaissent dans son espace automatiquement</li>
                  </ol>
                </div>

                <Button
                  onClick={handleCreateCourseInvitation}
                  disabled={creatingInvitation}
                  className="w-full bg-gradient-to-r from-success to-trust text-white hover:opacity-90"
                  size="lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  {creatingInvitation ? "Création en cours..." : "Envoyer un lien d'inscription"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      )}

      {/* Dialog de partage du lien */}
      {invitationData && (
        <CourseInvitationLink
          token={invitationData.token}
          estimatedPrice={invitationData.estimatedPrice}
          pickupAddress={invitationData.pickupAddress}
          destinationAddress={invitationData.destinationAddress}
          onClose={handleCloseInvitationDialog}
        />
      )}
    </div>
  );
};
