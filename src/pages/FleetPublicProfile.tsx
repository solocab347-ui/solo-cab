import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Car, 
  Star, 
  Users,
  ArrowLeft,
  Loader2,
  Calendar,
  Shield,
  CheckCircle,
  Route,
  QrCode,
  Copy,
  ExternalLink,
  Clock,
  Zap,
  UserPlus,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoSolocab from "@/assets/logo-solocab.png";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { useFleetProfileRealtime } from "@/hooks/usePublicFleetProfile";

interface FleetDriver {
  id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  vehicle_photos: string[] | null;
  rating: number | null;
  total_rides: number | null;
  bio: string | null;
  services_offered: string[] | null;
  status: string;
  storefront_display_order: number;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface FleetManagerPublic {
  id: string;
  company_name: string;
  contact_name: string;
  address: string;
  contact_phone: string | null;
  contact_email: string;
  show_drivers_in_public_storefront: boolean;
  logo_url: string | null;
  description: string | null;
  show_contact_name: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  auto_dispatch_enabled: boolean;
  services_offered: string[] | null;
  default_partnership_commission: number | null;
  partnership_terms: string | null;
}

const FleetPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Activer l'écoute temps réel pour les changements de profil flotte
  useFleetProfileRealtime();
  
  const [loading, setLoading] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManagerPublic | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  
  // Réservation
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<FleetDriver | null>(null);
  const [bookingType, setBookingType] = useState<"specific" | "available">("specific");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    pickupAddress: "",
    pickupLatitude: null as number | null,
    pickupLongitude: null as number | null,
    destinationAddress: "",
    destinationLatitude: null as number | null,
    destinationLongitude: null as number | null,
    scheduledDate: "",
    scheduledTime: "",
    passengersCount: 1,
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      fetchFleetData();
    }
  }, [id]);

  const fetchFleetData = async () => {
    try {
      // Fetch fleet manager
      const { data: fmData, error: fmError } = await supabase
        .from("fleet_managers")
        .select(`
          id, 
          company_name, 
          contact_name, 
          address, 
          contact_phone, 
          contact_email, 
          show_drivers_in_public_storefront,
          logo_url,
          description,
          show_contact_name,
          show_address,
          show_phone,
          show_email,
          auto_dispatch_enabled,
          services_offered,
          default_partnership_commission,
          partnership_terms
        `)
        .eq("id", id)
        .single();

      if (fmError) throw fmError;
      setFleetManager(fmData);

      // Fetch fleet drivers if enabled
      if (fmData.show_drivers_in_public_storefront) {
        const { data: fmDrivers, error: driversError } = await supabase
          .from("fleet_manager_drivers")
          .select(`
            driver_id,
            visible_in_storefront,
            storefront_display_order,
            driver:drivers(
              id,
              vehicle_model,
              vehicle_brand,
              vehicle_color,
              vehicle_photos,
              rating,
              total_rides,
              bio,
              services_offered,
              status,
              user_id
            )
          `)
          .eq("fleet_manager_id", id)
          .eq("status", "active")
          .eq("visible_in_storefront", true)
          .order("storefront_display_order", { ascending: true });

        if (driversError) throw driversError;

        // Get driver profiles
        if (fmDrivers && fmDrivers.length > 0) {
          const driverUserIds = fmDrivers
            .filter((d: any) => d.driver && d.driver.status === "validated")
            .map((d: any) => d.driver.user_id);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", driverUserIds);

          const driversWithProfiles: FleetDriver[] = fmDrivers
            .filter((d: any) => d.driver && d.driver.status === "validated")
            .map((d: any) => ({
              ...d.driver,
              storefront_display_order: d.storefront_display_order,
              profile: profiles?.find((p) => p.id === d.driver.user_id),
            }));

          setDrivers(driversWithProfiles);
        }
      }
    } catch (error) {
      console.error("Error fetching fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookWithDriver = (driver: FleetDriver) => {
    setSelectedDriver(driver);
    setBookingType("specific");
    setShowBookingDialog(true);
  };

  const handleBookAvailable = () => {
    setSelectedDriver(null);
    setBookingType("available");
    setShowBookingDialog(true);
  };

  const handleSubmitBooking = async () => {
    if (!bookingData.pickupAddress || !bookingData.destinationAddress || !bookingData.scheduledDate || !bookingData.scheduledTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!bookingData.guestName || !bookingData.guestPhone) {
      toast.error("Veuillez renseigner votre nom et téléphone");
      return;
    }

    setBookingLoading(true);
    try {
      const scheduledDateTime = new Date(`${bookingData.scheduledDate}T${bookingData.scheduledTime}`);
      let driverIdToUse = selectedDriver?.id;

      // Si dispatch automatique, trouver le chauffeur le plus proche
      if (bookingType === "available" && fleetManager?.auto_dispatch_enabled && bookingData.pickupLatitude) {
        const { data: availableDriverId } = await supabase.rpc(
          "find_nearest_available_fleet_driver",
          {
            p_fleet_manager_id: id,
            p_scheduled_date: scheduledDateTime.toISOString(),
            p_pickup_latitude: bookingData.pickupLatitude,
            p_pickup_longitude: bookingData.pickupLongitude,
            p_duration_minutes: 60,
          }
        );

        if (availableDriverId) {
          driverIdToUse = availableDriverId;
        } else {
          // Prendre le premier chauffeur si pas de disponible
          driverIdToUse = drivers[0]?.id;
        }
      } else if (bookingType === "available") {
        // Prendre le premier chauffeur si pas de dispatch auto
        driverIdToUse = drivers[0]?.id;
      }

      if (!driverIdToUse) {
        toast.error("Aucun chauffeur disponible");
        return;
      }

      // Créer la course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          driver_id: driverIdToUse,
          pickup_address: bookingData.pickupAddress,
          pickup_latitude: bookingData.pickupLatitude,
          pickup_longitude: bookingData.pickupLongitude,
          destination_address: bookingData.destinationAddress,
          destination_latitude: bookingData.destinationLatitude,
          destination_longitude: bookingData.destinationLongitude,
          scheduled_date: scheduledDateTime.toISOString(),
          passengers_count: bookingData.passengersCount,
          guest_name: bookingData.guestName,
          guest_phone: bookingData.guestPhone,
          guest_email: bookingData.guestEmail || null,
          notes: bookingData.notes || null,
          is_guest_booking: true,
          guest_tracking_token: crypto.randomUUID(),
          status: "pending",
        })
        .select()
        .single();

      if (courseError) throw courseError;

      toast.success("Demande de réservation envoyée !");
      setShowBookingDialog(false);
      setBookingData({
        pickupAddress: "",
        pickupLatitude: null,
        pickupLongitude: null,
        destinationAddress: "",
        destinationLatitude: null,
        destinationLongitude: null,
        scheduledDate: "",
        scheduledTime: "",
        passengersCount: 1,
        guestName: "",
        guestPhone: "",
        guestEmail: "",
        notes: "",
      });

      // Rediriger vers la page de suivi si token existe
      if (course.guest_tracking_token) {
        navigate(`/reservation-suivi/${course.guest_tracking_token}`);
      }
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Erreur lors de la réservation");
    } finally {
      setBookingLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié !");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fleetManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Flotte non trouvée</p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 py-12 md:py-20">
          {/* Back button + Share */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate(-1)} 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
              <Copy className="w-4 h-4" />
              Partager
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-xl opacity-30" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-card/80 backdrop-blur-xl rounded-3xl p-4 border border-border/50 shadow-2xl overflow-hidden">
                {fleetManager.logo_url ? (
                  <img src={fleetManager.logo_url} alt={fleetManager.company_name} className="w-full h-full object-contain" />
                ) : (
                  <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{fleetManager.company_name}</h1>
                <Badge className="bg-success/20 text-success border-success/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Vérifié
                </Badge>
              </div>
              
              {fleetManager.show_contact_name && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Building2 className="w-4 h-4" />
                  <span>{fleetManager.contact_name}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                {fleetManager.show_address && fleetManager.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{fleetManager.address}</span>
                  </div>
                )}
                {fleetManager.show_phone && fleetManager.contact_phone && (
                  <a href={`tel:${fleetManager.contact_phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>{fleetManager.contact_phone}</span>
                  </a>
                )}
                {fleetManager.show_email && (
                  <a href={`mailto:${fleetManager.contact_email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>{fleetManager.contact_email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Stats + Quick book */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="text-center bg-card/50 backdrop-blur-xl rounded-2xl px-6 py-4 border border-border/30">
                  <div className="text-3xl font-bold text-primary">{drivers.length}</div>
                  <div className="text-sm text-muted-foreground">Chauffeurs</div>
                </div>
              </div>
              {drivers.length > 0 && (
                <Button onClick={handleBookAvailable} size="lg" className="gap-2">
                  <Zap className="w-5 h-5" />
                  Réserver
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          {fleetManager.description && (
            <div className="mt-8 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30">
              <p className="text-muted-foreground leading-relaxed">{fleetManager.description}</p>
            </div>
          )}

          {/* Services proposés */}
          {fleetManager.services_offered && fleetManager.services_offered.length > 0 && (
            <div className="mt-6 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Services proposés
              </h3>
              <div className="flex flex-wrap gap-2">
                {fleetManager.services_offered.map((service, index) => (
                  <Badge key={index} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Conditions partenariat */}
          {(fleetManager.default_partnership_commission || fleetManager.partnership_terms) && (
            <div className="mt-6 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Conditions de partenariat
              </h3>
              <div className="space-y-3">
                {fleetManager.default_partnership_commission && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">Commission : {fleetManager.default_partnership_commission}%</Badge>
                  </div>
                )}
                {fleetManager.partnership_terms && (
                  <p className="text-muted-foreground text-sm">{fleetManager.partnership_terms}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drivers Section */}
      {fleetManager.show_drivers_in_public_storefront && (
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Car className="w-6 h-6 text-primary" />
              Nos Chauffeurs
            </h2>
            {drivers.length > 0 && (
              <Button variant="outline" onClick={handleBookAvailable} className="gap-2">
                <Clock className="w-4 h-4" />
                Premier disponible
              </Button>
            )}
          </div>

          {drivers.length === 0 ? (
            <Card className="p-12 text-center">
              <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun chauffeur disponible pour le moment</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.map((driver) => (
                <Card 
                  key={driver.id} 
                  className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 h-full group"
                >
                  {/* Driver Photo or Vehicle Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
                    {driver.vehicle_photos && driver.vehicle_photos[0] ? (
                      <img 
                        src={driver.vehicle_photos[0]} 
                        alt="Véhicule" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Driver Avatar Overlay */}
                    <div className="absolute bottom-4 left-4">
                      <Avatar className="w-16 h-16 border-4 border-background shadow-xl">
                        <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                          {(driver.profile?.full_name || "C")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Rating Badge */}
                    {driver.rating && (
                      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-1">
                      {driver.profile?.full_name || "Chauffeur"}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Car className="w-4 h-4" />
                      <span>
                        {driver.vehicle_brand || ""} {driver.vehicle_model}
                        {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                      </span>
                    </div>

                    {driver.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {driver.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{driver.total_rides || 0} courses</span>
                      </div>
                      <Button size="sm" onClick={() => handleBookWithDriver(driver)} className="gap-1">
                        <Calendar className="w-4 h-4" />
                        Réserver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Section - Inscription invité */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <Card className="inline-block p-8 md:p-12 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20 max-w-2xl">
            <Route className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">Planifier un trajet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Réservez directement ou créez un compte pour gérer vos réservations
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleBookAvailable} size="lg" variant="outline" className="gap-2">
                <Calendar className="w-5 h-5" />
                Réserver sans compte
              </Button>
              <Link to={`/register-client-fleet?fm=${id}`}>
                <Button size="lg" className="gap-2 w-full">
                  <UserPlus className="w-5 h-5" />
                  Créer un compte
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              En réservant sans compte, vos informations seront enregistrées et vous pourrez créer un compte ultérieurement
            </p>
          </Card>
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {bookingType === "specific" 
                ? `Réserver avec ${selectedDriver?.profile?.full_name || "ce chauffeur"}`
                : "Réserver avec un chauffeur disponible"
              }
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations de votre trajet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Adresses */}
            <div className="space-y-3">
              <div>
                <Label>Adresse de départ *</Label>
                <AddressAutocomplete
                  value={bookingData.pickupAddress}
                  onChange={(address, coordinates) => setBookingData(prev => ({
                    ...prev,
                    pickupAddress: address,
                    pickupLatitude: coordinates?.latitude || null,
                    pickupLongitude: coordinates?.longitude || null,
                  }))}
                  placeholder="Où souhaitez-vous être pris en charge ?"
                />
              </div>
              <div>
                <Label>Adresse d'arrivée *</Label>
                <AddressAutocomplete
                  value={bookingData.destinationAddress}
                  onChange={(address, coordinates) => setBookingData(prev => ({
                    ...prev,
                    destinationAddress: address,
                    destinationLatitude: coordinates?.latitude || null,
                    destinationLongitude: coordinates?.longitude || null,
                  }))}
                  placeholder="Où souhaitez-vous aller ?"
                />
              </div>
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={bookingData.scheduledDate}
                  onChange={(e) => setBookingData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label>Heure *</Label>
                <Input
                  type="time"
                  value={bookingData.scheduledTime}
                  onChange={(e) => setBookingData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Passagers */}
            <div>
              <Label>Nombre de passagers</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={bookingData.passengersCount}
                onChange={(e) => setBookingData(prev => ({ ...prev, passengersCount: parseInt(e.target.value) || 1 }))}
              />
            </div>

            {/* Infos contact */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Vos coordonnées</p>
                <Badge variant="secondary" className="text-xs">Réservation invité</Badge>
              </div>
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vos informations seront enregistrées. Vous pourrez créer un compte ultérieurement pour accéder à l'historique de vos réservations.
                </AlertDescription>
              </Alert>
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={bookingData.guestName}
                  onChange={(e) => setBookingData(prev => ({ ...prev, guestName: e.target.value }))}
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input
                  type="tel"
                  value={bookingData.guestPhone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, guestPhone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div>
                <Label>Email (recommandé pour le suivi)</Label>
                <Input
                  type="email"
                  value={bookingData.guestEmail}
                  onChange={(e) => setBookingData(prev => ({ ...prev, guestEmail: e.target.value }))}
                  placeholder="email@exemple.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Permet de recevoir les confirmations et de créer un compte facilement
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitBooking} disabled={bookingLoading}>
              {bookingLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetPublicProfile;
