import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut, Settings, Building2, FileText, MapPin, CreditCard, AlertCircle, LayoutGrid, MessageSquare, Globe, Calculator, Wrench, ChevronDown, BarChart3, PieChart, Megaphone } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import CoursesList from "@/components/CoursesList";
import DriverClientsList from "@/components/driver/DriverClientsList";
import DriverDevisList from "@/components/driver/DriverDevisList";
import DriverFacturesList from "@/components/driver/DriverFacturesList";
import QRCodeDisplay from "@/components/driver/QRCodeDisplay";
import SubscriptionManager from "@/components/driver/SubscriptionManager";
import { DriverHome } from "@/components/driver/DriverHome";
import { PriceCalculator } from "@/components/driver/PriceCalculator";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { ProfilePhotoUpload } from "@/components/driver/ProfilePhotoUpload";
import { SectorSelector } from "@/components/driver/SectorSelector";
import { EquipmentSelector } from "@/components/driver/EquipmentSelector";
import { ServicesSelector } from "@/components/driver/ServicesSelector";
import { DriverStatistics } from "@/components/driver/stats/DriverStatistics";
import { DriverCampaigns } from "@/components/driver/promo/DriverCampaigns";
import { ProfitabilityCalculator } from "@/components/driver/profitability/ProfitabilityCalculator";
import { DriverAssistant } from "@/components/driver/DriverAssistant";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DriverDashboard = () => {
  const { signOut, user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // Form states
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false); // Désactivé par défaut
  const [workingSectors, setWorkingSectors] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeCoordinates, setHomeCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [baseFare, setBaseFare] = useState("");
  const [perKmRate, setPerKmRate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [siret, setSiret] = useState("");
  const [maxPassengers, setMaxPassengers] = useState("4");
  const [tvaIncluded, setTvaIncluded] = useState(false);
  const [displayDriverName, setDisplayDriverName] = useState(true);
  const [displayCompanyName, setDisplayCompanyName] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [vehicleEquipment, setVehicleEquipment] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");

  useEffect(() => {
    fetchDriverProfile();
  }, [user]);

  const fetchDriverProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const { data: driver } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driver) {
      setDriverProfile({ ...profile, driver });
      // Populate form
      setPublicProfileEnabled(driver.public_profile_enabled || false);
      setWorkingSectors(driver.working_sectors || []);
      setServiceDescription(driver.service_description || "");
      setHomeAddress(driver.home_address || "");
      if (driver.home_latitude && driver.home_longitude) {
        setHomeCoordinates({
          latitude: driver.home_latitude,
          longitude: driver.home_longitude,
        });
      }
      setBaseFare(driver.base_fare?.toString() || "");
      setPerKmRate(driver.per_km_rate?.toString() || "");
      setHourlyRate(driver.hourly_rate?.toString() || "");
      setVehicleColor(driver.vehicle_color || "");
      setVehiclePlate(driver.vehicle_plate || "");
      setCompanyName(driver.company_name || "");
      setCompanyAddress(driver.company_address || "");
      setSiret(driver.siret || "");
      setMaxPassengers(driver.max_passengers?.toString() || "4");
      setTvaIncluded(driver.tva_included || false);
      setDisplayDriverName(driver.display_driver_name !== false);
      setDisplayCompanyName(driver.display_company_name || false);
      setVehicleEquipment(driver.vehicle_equipment || []);
      setServicesOffered(driver.services_offered || []);
      setVehicleBrand(driver.vehicle_brand || "");
      setVehicleYear(driver.vehicle_year?.toString() || "");
      setProfilePhotoUrl(profile?.profile_photo_url || null);
    }
  };

  useEffect(() => {
    if (driverProfile?.driver?.id) {
      fetchQRCode();
    }
  }, [driverProfile?.driver?.id]);

  const fetchQRCode = async () => {
    if (!driverProfile?.driver?.id) return;

    setLoadingQR(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/qr-code-manager?action=get&driver_id=${driverProfile.driver.id}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setQrCode(data);
      }
    } catch (error) {
      console.error("QR fetch error:", error);
    } finally {
      setLoadingQR(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCode?.qr_code_image) return;

    const link = document.createElement("a");
    link.href = qrCode.qr_code_image;
    link.download = `qr-code-${driverProfile?.full_name || "driver"}.png`;
    link.click();
    toast.success("QR Code téléchargé !");
  };

  const handleTogglePublicProfile = async (enabled: boolean) => {
    if (!driverProfile?.driver?.id) return;

    setPublicProfileEnabled(enabled);

    try {
      const { error } = await supabase
        .from("drivers")
        .update({ public_profile_enabled: enabled })
        .eq("id", driverProfile.driver.id);

      if (error) throw error;
      toast.success(enabled ? "Profil public activé" : "Profil public désactivé");
    } catch (error: any) {
      console.error("Error toggling public profile:", error);
      toast.error("Erreur lors de la mise à jour");
      // Revert on error
      setPublicProfileEnabled(!enabled);
    }
  };

  const handleUpdateProfile = async () => {
    if (!driverProfile?.driver?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          public_profile_enabled: publicProfileEnabled,
          working_sectors: workingSectors,
          service_description: serviceDescription,
          home_address: homeAddress,
          home_latitude: homeCoordinates?.latitude || null,
          home_longitude: homeCoordinates?.longitude || null,
          base_fare: baseFare ? parseFloat(baseFare) : null,
          per_km_rate: perKmRate ? parseFloat(perKmRate) : null,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          vehicle_color: vehicleColor,
          vehicle_plate: vehiclePlate,
          vehicle_brand: vehicleBrand,
          vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
          company_name: companyName,
          company_address: companyAddress,
          siret: siret,
          max_passengers: maxPassengers ? parseInt(maxPassengers) : 4,
          tva_included: tvaIncluded,
          display_driver_name: displayDriverName,
          display_company_name: displayCompanyName,
          vehicle_equipment: vehicleEquipment,
          services_offered: servicesOffered,
        })
        .eq("id", driverProfile.driver.id);

      if (error) throw error;
      toast.success("Profil mis à jour avec succès !");
      fetchDriverProfile();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-triple shadow-elegant sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 rounded-lg flex items-center justify-center shadow-lg">
              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
              SoloCab
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-white drop-shadow">{driverProfile?.full_name || "Chauffeur"}</span>
              <Badge variant="outline" className="border-white/30 text-white text-xs bg-white/10 backdrop-blur-sm">
                {driverProfile?.driver?.subscription_status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-10 sm:w-10 text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Bonjour, {driverProfile?.full_name?.split(" ")[0] || "Chauffeur"} ✨
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Voici un aperçu de votre activité</p>
        </div>

        {/* Subscription Alert */}
        {driverProfile?.driver?.subscription_status !== "active" && (
          <Alert className="mb-6 bg-destructive/10 border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">Abonnement Inactif</AlertTitle>
            <AlertDescription>
              Votre abonnement n'est pas actif. Activez-le dans l'onglet "Abonnement" pour accéder à toutes les fonctionnalités de la plateforme.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full bg-card/80 backdrop-blur-sm flex flex-col gap-2 h-auto p-2 shadow-lg border border-primary/10">
            {/* Première ligne */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 w-full">
              <TabsTrigger value="home" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-success data-[state=active]:text-white">
                <LayoutGrid className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Accueil</span>
                <span className="sm:hidden">Accueil</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-trust data-[state=active]:text-white">
                <Users className="w-4 h-4 text-secondary" />
                <span className="hidden sm:inline">Mes Clients</span>
                <span className="sm:hidden">Clients</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-premium data-[state=active]:text-white">
                <Car className="w-4 h-4 text-accent" />
                <span className="hidden sm:inline">Mes Courses</span>
                <span className="sm:hidden">Courses</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-independence data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4 text-info" />
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="devis" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-renewal data-[state=active]:text-white">
                <FileText className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">Devis</span>
                <span className="sm:hidden">Devis</span>
              </TabsTrigger>
              <TabsTrigger value="factures" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-freedom data-[state=active]:text-white">
                <CreditCard className="w-4 h-4 text-secondary" />
                <span className="hidden sm:inline">Factures</span>
                <span className="sm:hidden">Factures</span>
              </TabsTrigger>
            </div>
            
            {/* Deuxième ligne */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gradient-premium hover:text-white flex-col sm:flex-row">
                    <Wrench className="w-4 h-4 text-accent" />
                    <span className="hidden sm:inline">Outils</span>
                    <span className="sm:hidden">Outils</span>
                    <ChevronDown className="w-3 h-3 hidden sm:inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-card border border-border z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("calculator")} className="gap-2 cursor-pointer hover:bg-gradient-premium hover:text-white">
                    <Calculator className="w-4 h-4 text-primary" />
                    Calculatrice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("qrcode")} className="gap-2 cursor-pointer hover:bg-gradient-success hover:text-white">
                    <QrCode className="w-4 h-4 text-secondary" />
                    Mon QR Code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gradient-trust hover:text-white flex-col sm:flex-row">
                    <BarChart3 className="w-4 h-4 text-secondary" />
                    <span className="hidden sm:inline">Développement</span>
                    <span className="sm:hidden">Dev</span>
                    <ChevronDown className="w-3 h-3 hidden sm:inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card border border-border z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("statistics")} className="gap-2 cursor-pointer hover:bg-gradient-independence hover:text-white">
                    <TrendingUp className="w-4 h-4 text-info" />
                    Statistique
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("campaigns")} className="gap-2 cursor-pointer hover:bg-gradient-renewal hover:text-white">
                    <Megaphone className="w-4 h-4 text-accent" />
                    Campagne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("profitability")} className="gap-2 cursor-pointer hover:bg-gradient-freedom hover:text-white">
                    <PieChart className="w-4 h-4 text-primary" />
                    Calcul de rentabilité
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <TabsTrigger value="subscription" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-premium data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="hidden sm:inline">Abonnement</span>
                <span className="sm:hidden">Abo</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-trust data-[state=active]:text-white">
                <Globe className="w-4 h-4 text-secondary" />
                <span className="hidden sm:inline">Profil Public</span>
                <span className="sm:hidden">Profil</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 data-[state=active]:bg-gradient-independence data-[state=active]:text-white">
                <Settings className="w-4 h-4 text-info" />
                <span className="hidden sm:inline">Paramètres</span>
                <span className="sm:hidden">Params</span>
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home">
            <DriverHome driverProfile={driverProfile} onTabChange={setActiveTab} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingInterface />
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-magenta rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-magenta-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Mon QR Code Personnel</h2>
                  <p className="text-sm text-muted-foreground">Recrutez vos clients exclusifs en 30 secondes</p>
                </div>
              </div>
              <QRCodeDisplay qrCode={qrCode} loadingQR={loadingQR} driverProfile={driverProfile} />
            </Card>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            {driverProfile?.driver?.id && (
              <PriceCalculator driverProfile={driverProfile} />
            )}
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-premium-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Gestion de l'Abonnement</h2>
                  <p className="text-sm text-muted-foreground">Gérez votre abonnement professionnel</p>
                </div>
              </div>
              <SubscriptionManager 
                driverProfile={driverProfile} 
                onSubscriptionUpdate={fetchDriverProfile}
              />
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Important Warning */}
            <Alert className="border-warning bg-warning/10">
              <AlertCircle className="h-5 w-5 text-warning" />
              <AlertTitle className="text-warning font-semibold">Configuration obligatoire</AlertTitle>
              <AlertDescription className="text-sm">
                <p className="mb-2">
                  <strong>Tous les paramètres ci-dessous sont obligatoires</strong> pour le bon fonctionnement de votre activité sur SoloCab.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Les <strong>tarifs</strong> servent à calculer automatiquement vos devis</li>
                  <li>Les <strong>informations entreprise</strong> apparaissent sur toutes vos factures</li>
                  <li>Les <strong>détails véhicule</strong> sont visibles par vos clients</li>
                  <li>Les <strong>équipements et services</strong> améliorent votre visibilité</li>
                </ul>
                <p className="mt-2 text-warning font-medium">
                  ⚠️ Des informations manquantes peuvent bloquer la génération de vos devis et factures.
                </p>
              </AlertDescription>
            </Alert>

            {/* Pricing */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Tarification Professionnelle</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="baseFare">Forfait de base (€)</Label>
                  <Input
                    id="baseFare"
                    type="number"
                    step="0.01"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-muted-foreground">Prix de départ de la course</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perKm">Prix par kilomètre (€)</Label>
                  <Input
                    id="perKm"
                    type="number"
                    step="0.01"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(e.target.value)}
                    placeholder="1.50"
                  />
                  <p className="text-xs text-muted-foreground">Coût par km parcouru</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly">Tarif horaire (€)</Label>
                  <Input
                    id="hourly"
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="45.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Pour les mises à disposition (obligatoire)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="maxPassengers">Nombre maximum de passagers</Label>
                  <Input
                    id="maxPassengers"
                    type="number"
                    min="1"
                    max="20"
                    value={maxPassengers}
                    onChange={(e) => setMaxPassengers(e.target.value)}
                    placeholder="4"
                  />
                  <p className="text-xs text-muted-foreground">Places disponibles (4 par défaut, augmentez pour van)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                    <div>
                      <Label htmlFor="tvaIncluded" className="font-semibold">TVA comprise</Label>
                      <p className="text-xs text-muted-foreground">Vos tarifs incluent-ils déjà la TVA ?</p>
                    </div>
                    <Switch
                      id="tvaIncluded"
                      checked={tvaIncluded}
                      onCheckedChange={setTvaIncluded}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  TVA Automatique
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• <span className="font-medium">10% TVA</span> pour les courses au kilomètre</p>
                  <p>• <span className="font-medium">20% TVA</span> pour les mises à disposition (horaire)</p>
                  <p className="text-xs mt-2 italic">La TVA est calculée automatiquement selon le type de course</p>
                </div>
              </div>
            </Card>

            {/* Company Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Informations Entreprise</h2>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Nom de l'entreprise</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="VTC Excellence"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="123 456 789 00012"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="123 Rue de la République, 75001 Paris"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Cette adresse apparaîtra sur vos devis et factures</p>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={loading} size="lg">
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </TabsContent>


          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverClientsList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-premium-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Demandes de Réservation</h2>
                  <p className="text-sm text-muted-foreground">Gérez vos courses et créez des devis</p>
                </div>
              </div>

              {driverProfile?.driver?.id && (
                <CoursesList driverId={driverProfile.driver.id} />
              )}
            </Card>
          </TabsContent>

          {/* Devis Tab */}
          <TabsContent value="devis" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverDevisList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Factures Tab */}
          <TabsContent value="factures" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverFacturesList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Profil Public</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Activer le profil public</Label>
                    <p className="text-sm text-muted-foreground">
                      Apparaître sur /chauffeurs pour les clients libres
                    </p>
                  </div>
                  <Switch
                    checked={publicProfileEnabled}
                    onCheckedChange={handleTogglePublicProfile}
                  />
                </div>

                <ProfilePhotoUpload
                  currentPhotoUrl={profilePhotoUrl}
                  userId={user?.id || ""}
                  driverName={driverProfile?.full_name || ""}
                  onPhotoUpdate={setProfilePhotoUrl}
                />

                <div className="border-t pt-6">
                  <Label className="text-base mb-4 block">Affichage dans le profil public</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="displayName"
                        checked={displayDriverName}
                        onCheckedChange={(checked) => setDisplayDriverName(checked as boolean)}
                      />
                      <Label htmlFor="displayName" className="font-normal cursor-pointer">
                        Afficher mon nom ({driverProfile?.full_name || "Non défini"})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="displayCompany"
                        checked={displayCompanyName}
                        onCheckedChange={(checked) => setDisplayCompanyName(checked as boolean)}
                      />
                      <Label htmlFor="displayCompany" className="font-normal cursor-pointer">
                        Afficher le nom de mon entreprise ({companyName || "Non défini"})
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Vous pouvez afficher votre nom, celui de votre entreprise, ou les deux
                  </p>
                </div>

                <SectorSelector
                  selectedSectors={workingSectors}
                  onChange={setWorkingSectors}
                />

                <div className="space-y-2">
                  <Label htmlFor="description">Description du service</Label>
                  <Textarea
                    id="description"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Décrivez votre service, vos spécialités..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homeAddress" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    📍 Adresse de Localisation
                  </Label>
                  <AddressAutocomplete
                    value={homeAddress}
                    onChange={(address, coords) => {
                      setHomeAddress(address);
                      if (coords) setHomeCoordinates(coords);
                    }}
                    placeholder="Tapez votre adresse de départ habituelle..."
                  />
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
                    <p className="font-medium text-foreground">Pourquoi cette adresse est importante ?</p>
                    <p>
                      Cette adresse servira à vous géolocaliser quand un client cherche des chauffeurs à proximité. 
                      C'est dans votre intérêt de renseigner l'adresse de départ d'où vous décollez tous les jours.
                    </p>
                    <p className="pt-1">
                      💡 <span className="font-medium">Conseil :</span> Cela peut être soit votre lieu d'habitation, 
                      soit le lieu où vous récupérez votre véhicule chaque jour. Plus votre localisation est précise, 
                      plus vous avez de chances de trouver des clients à proximité !
                    </p>
                    <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                      <p className="text-primary">
                        <span className="font-medium">Confidentialité :</span> Cette adresse n'est visible ni par les clients 
                        ni par les autres chauffeurs. Elle sert uniquement au système de géolocalisation pour vous proposer 
                        aux clients recherchant un chauffeur à proximité.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Input
                      id="brand"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      placeholder="Tesla, Mercedes, BMW..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Année</Label>
                    <Input
                      id="year"
                      type="number"
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      placeholder="2023"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Couleur du véhicule</Label>
                  <Input
                    id="color"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Noir, Gris, Blanc, Bleu..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plate">Plaque d'immatriculation</Label>
                  <Input
                    id="plate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="AB-123-CD"
                    maxLength={12}
                  />
                  <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      <span className="font-medium">Information confidentielle :</span> Cette plaque n'est visible 
                      que par vos clients inscrits dans leur espace client. Elle n'apparaît jamais sur votre profil 
                      public pour protéger votre vie privée.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <EquipmentSelector
                    selectedEquipment={vehicleEquipment}
                    onChange={setVehicleEquipment}
                  />
                </div>

                <div className="border-t pt-6">
                  <ServicesSelector
                    selectedServices={servicesOffered}
                    onChange={setServicesOffered}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateProfile} disabled={loading} size="lg">
                  {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <DriverStatistics driverProfile={driverProfile} />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <DriverCampaigns driverProfile={driverProfile} />
          </TabsContent>

          {/* Profitability Tab */}
          <TabsContent value="profitability" className="space-y-6">
            <ProfitabilityCalculator />
          </TabsContent>

        </Tabs>
      </div>
      
      {/* Assistant virtuel Max */}
      <DriverAssistant />
    </div>
  );
};

export default DriverDashboard;
