import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut, Settings, Building2, FileText, MapPin, CreditCard, AlertCircle, LayoutGrid, MessageSquare, Globe, Calculator, Wrench, ChevronDown, BarChart3, PieChart, Megaphone, Shield, Lightbulb, Sparkles, Home, Handshake, FolderOpen } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import CoursesList from "@/components/CoursesList";
import DriverClientsList from "@/components/driver/DriverClientsList";
import DriverDevisList from "@/components/driver/DriverDevisList";
import DriverFacturesList from "@/components/driver/DriverFacturesList";
import QRCodeDisplay from "@/components/driver/QRCodeDisplay";
import SubscriptionManager from "@/components/driver/SubscriptionManager";
import { DriverHome } from "@/components/driver/DriverHomeMemoized";
import { PriceCalculator } from "@/components/driver/PriceCalculator";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { ProfilePhotoUpload } from "@/components/driver/ProfilePhotoUpload";
import { DualProfilePhotoUpload } from "@/components/driver/DualProfilePhotoUpload";
import { SectorSelector } from "@/components/driver/SectorSelector";
import { EquipmentSelector } from "@/components/driver/EquipmentSelector";
import { ServicesSelector } from "@/components/driver/ServicesSelector";
import { DriverStatisticsComplete } from "@/components/driver/stats/DriverStatisticsComplete";
import { DriverCampaigns } from "@/components/driver/promo/DriverCampaigns";
import { ProfitabilityCalculator } from "@/components/driver/profitability/ProfitabilityCalculator";
import { DriverAssistant } from "@/components/driver/DriverAssistant";
import DriverFeedback from "@/components/driver/DriverFeedback";
import { VehiclePhotosManager } from "@/components/driver/VehiclePhotosManager";
import { DriverPublicProfile } from "@/components/driver/DriverPublicProfile";
import DriverProspectionFlyer from "@/components/driver/DriverProspectionFlyer";
import DriverPlanning from "@/components/driver/DriverPlanning";
import { UnifiedPartnershipHub } from "@/components/driver/UnifiedPartnershipHub";
import { GuestBookingsList } from "@/components/driver/GuestBookingsList";
import { DriverDocuments } from "@/components/driver/DriverDocuments";
import { UnifiedDocumentsHub } from "@/components/driver/documents/UnifiedDocumentsHub";
import { DocumentWarningBanner } from "@/components/driver/DocumentWarningBanner";
import { DriverFleetPartnerships } from "@/components/driver/DriverFleetPartnerships";
import { DriverCompanyAgreements } from "@/components/driver/DriverCompanyAgreements";
import { DriverCompanyPayments } from "@/components/driver/DriverCompanyPayments";
import { DriverFleetCommissions } from "@/components/driver/DriverFleetCommissions";
import { FleetRemovalNotice } from "@/components/driver/FleetRemovalNotice";
// DriverCompanyCourseRequests removed - company quotes now integrated in DriverDevisList
import { CityPricingManager } from "@/components/shared/CityPricingManager";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOptimizedDriverProfile } from "@/hooks/useOptimizedDriverProfile";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/productionLogger";
import { usePartnershipNotificationCount } from "@/hooks/usePartnershipNotificationCount";

const DriverDashboard = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  useUserLanguage(); // Sync language with user profile
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const { driverProfile, isLoading: profileLoading, updateProfile, isUpdating } = useOptimizedDriverProfile(user?.id);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [partnershipInitialTab, setPartnershipInitialTab] = useState<'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices' | undefined>(undefined);
  
  // Use unified partnership notification count hook
  const { count: partnershipNotificationCount, markPartnershipNotificationsAsRead } = usePartnershipNotificationCount(driverProfile?.driver?.id || null);

  // Handle URL parameters for tab navigation (from notifications)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const subtabParam = searchParams.get("subtab");
    
    if (tabParam === "partnerships") {
      setActiveTab("sharing");
      // Mark notifications as read when entering partnerships via URL
      markPartnershipNotificationsAsRead();
      // Map subtab to partnership tab
      if (subtabParam === "received") {
        setPartnershipInitialTab('received');
      } else if (subtabParam === "sent") {
        setPartnershipInitialTab('sent');
      } else if (subtabParam === "balances" || subtabParam === "payments") {
        setPartnershipInitialTab('payments');
      } else if (subtabParam === "list") {
        setPartnershipInitialTab('list');
      } else if (subtabParam === "search") {
        setPartnershipInitialTab('search');
      }
    } else if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams, markPartnershipNotificationsAsRead]);

  // Mark notifications as read when entering the sharing/partnerships tab
  useEffect(() => {
    if (activeTab === "sharing") {
      markPartnershipNotificationsAsRead();
    }
  }, [activeTab, markPartnershipNotificationsAsRead]);

  // Handle special tab navigation (e.g., partnerships-received)
  const handleTabChange = (tab: string) => {
    if (tab === "partnerships-received") {
      setPartnershipInitialTab('received');
      setActiveTab("sharing");
    } else {
      // Reset initial tab when navigating normally
      if (tab !== "sharing") {
        setPartnershipInitialTab(undefined);
      }
      setActiveTab(tab);
    }
  };

  // Form states
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(false); // Désactivé par défaut
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
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
  const [siren, setSiren] = useState("");
  const [tvaNumber, setTvaNumber] = useState("");
  const [maxPassengers, setMaxPassengers] = useState("4");
  const [tvaIncluded, setTvaIncluded] = useState(false);
  const [displayDriverName, setDisplayDriverName] = useState(true);
  const [displayCompanyName, setDisplayCompanyName] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [cardPhotoUrl, setCardPhotoUrl] = useState<string | null>(null);
  const [vehicleEquipment, setVehicleEquipment] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [eveningSurcharge, setEveningSurcharge] = useState("0");
  const [weekendSurcharge, setWeekendSurcharge] = useState("0");
  const [minimumPrice, setMinimumPrice] = useState("0");
  const [airportSurcharge, setAirportSurcharge] = useState("0");
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [visibleToFleetManagers, setVisibleToFleetManagers] = useState(false);
  const [visibleToCompanies, setVisibleToCompanies] = useState(false);
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [showRatingPublic, setShowRatingPublic] = useState(false);
  const [showRatingPartners, setShowRatingPartners] = useState(false);
  const [showPricingPartners, setShowPricingPartners] = useState(false);
  const [vehicleCategories, setVehicleCategories] = useState<string[]>([]);

  // Callback stable pour les mises à jour de photos
  const handleVehiclePhotosUpdate = useCallback((newVehiclePhotos: string[], newGalleryPhotos: string[]) => {
    setVehiclePhotos(newVehiclePhotos);
    setGalleryPhotos(newGalleryPhotos);
  }, []);

  // Synchroniser l'état du formulaire avec les données du profil - ULTRA OPTIMISÉ
  useEffect(() => {
    if (!driverProfile?.driver?.id) return;
    
    const driver = driverProfile.driver;
    
    // Utiliser startTransition pour les mises à jour non urgentes
    // Batch TOUS les états en une seule fois
    setPublicProfileEnabled(driver.public_profile_enabled || false);
    setShowPhone(driver.show_phone || false);
    setShowEmail(driver.show_email || false);
    setContactPhone((driver as any).contact_phone || driverProfile.phone || "");
    setContactEmail((driver as any).contact_email || driverProfile.email || "");
    setWorkingSectors(driver.working_sectors || []);
    setServiceDescription(driver.service_description || "");
    setHomeAddress(driver.home_address || "");
    
    if (driver.home_latitude && driver.home_longitude) {
      setHomeCoordinates({
        latitude: driver.home_latitude,
        longitude: driver.home_longitude,
      });
    } else {
      setHomeCoordinates(null);
    }
    
    setBaseFare(driver.base_fare?.toString() || "");
    setPerKmRate(driver.per_km_rate?.toString() || "");
    setHourlyRate(driver.hourly_rate?.toString() || "");
    setVehicleColor(driver.vehicle_color || "");
    setVehiclePlate(driver.vehicle_plate || "");
    setCompanyName(driver.company_name || "");
    setCompanyAddress(driver.company_address || "");
    setSiret(driver.siret || "");
    setSiren(driver.siren || "");
    setTvaNumber((driver as any).tva_number || "");
    setMaxPassengers(driver.max_passengers?.toString() || "4");
    setTvaIncluded(driver.tva_included || false);
    setDisplayDriverName(driver.display_driver_name !== false);
    setDisplayCompanyName(driver.display_company_name || false);
    setVehicleEquipment(driver.vehicle_equipment || []);
    setServicesOffered(driver.services_offered || []);
    setVehicleBrand(driver.vehicle_brand || "");
    setVehicleYear(driver.vehicle_year?.toString() || "");
    setEveningSurcharge(driver.evening_surcharge?.toString() || "0");
    setWeekendSurcharge(driver.weekend_surcharge?.toString() || "0");
    setMinimumPrice((driver as any).minimum_price?.toString() || "0");
    setAirportSurcharge((driver as any).airport_surcharge?.toString() || "0");
    setProfilePhotoUrl(driverProfile.profile_photo_url || null);
    setCardPhotoUrl(driver.card_photo_url || null);
    setVehiclePhotos(driver.vehicle_photos || []);
    setGalleryPhotos(driver.gallery_photos || []);
    setVisibleToFleetManagers(driver.visible_to_fleet_managers || false);
    setVisibleToCompanies((driver as any).visible_to_companies || false);
    setVisibleToDrivers((driver as any).visible_to_drivers || false);
    setShowRatingPublic((driver as any).show_rating_public || false);
    setShowRatingPartners((driver as any).show_rating_partners || false);
    setShowPricingPartners((driver as any).show_pricing_partners || false);
    setVehicleCategories(driver.vehicle_category || []);
  }, [driverProfile?.driver?.id]); // UNIQUEMENT quand l'ID change

  useEffect(() => {
    let mounted = true;

    const loadQR = async () => {
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

        if (!mounted) return;

        const data = await response.json();
        if (response.ok && mounted) {
          setQrCode(data);
        }
      } catch (error) {
        if (mounted) {
          logger.error("QR fetch error", { error });
        }
      } finally {
        if (mounted) {
          setLoadingQR(false);
        }
      }
    };

    loadQR();

    return () => {
      mounted = false;
    };
  }, [driverProfile?.driver?.id]);

  // Partnership notification count is now handled by usePartnershipNotificationCount hook


  const downloadQRCode = () => {
    if (!qrCode?.qr_code_image) return;

    const link = document.createElement("a");
    link.href = qrCode.qr_code_image;
    link.download = `qr-code-${driverProfile?.full_name || "driver"}.png`;
    link.click();
    toast.success("QR Code téléchargé !");
  };

  const handleTogglePublicProfile = async (enabled: boolean) => {
    if (!driverProfile?.driver?.id || !updateProfile) return;
    setPublicProfileEnabled(enabled);
    updateProfile({ public_profile_enabled: enabled });
  };

  const handleUpdateProfile = async () => {
    if (!driverProfile?.driver?.id || !updateProfile) {
      toast.error("Impossible d'enregistrer : profil non chargé");
      return;
    }

    setLoading(true);
    
    try {
      logger.info("Début de la sauvegarde du profil");
      
      // 1. Sauvegarder les données du driver
      const driverUpdates = {
        public_profile_enabled: publicProfileEnabled,
        show_phone: showPhone,
        show_email: showEmail,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
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
        siren: siren,
        tva_number: tvaNumber,
        max_passengers: maxPassengers ? parseInt(maxPassengers) : 4,
        tva_included: tvaIncluded,
        display_driver_name: displayDriverName,
        display_company_name: displayCompanyName,
        vehicle_equipment: vehicleEquipment,
        services_offered: servicesOffered,
        evening_surcharge: eveningSurcharge ? parseFloat(eveningSurcharge) : 0,
        weekend_surcharge: weekendSurcharge ? parseFloat(weekendSurcharge) : 0,
        minimum_price: minimumPrice ? parseFloat(minimumPrice) : 0,
        airport_surcharge: airportSurcharge ? parseFloat(airportSurcharge) : 0,
        vehicle_photos: vehiclePhotos,
        gallery_photos: galleryPhotos,
        card_photo_url: cardPhotoUrl,
        visible_to_fleet_managers: visibleToFleetManagers,
        visible_to_companies: visibleToCompanies,
        visible_to_drivers: visibleToDrivers,
        show_rating_public: showRatingPublic,
        show_rating_partners: showRatingPartners,
        show_pricing_partners: showPricingPartners,
        vehicle_category: vehicleCategories,
      };

      logger.info("Mise à jour de la table drivers");
      await updateProfile(driverUpdates);

      // 2. Sauvegarder la photo de profil dans profiles (si elle existe)
      if (user?.id && profilePhotoUrl) {
        logger.info("Mise à jour de la photo de profil");
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ profile_photo_url: profilePhotoUrl })
          .eq('id', user.id);
        
        if (profileError) {
          logger.error("Erreur sauvegarde photo profil", { profileError });
          throw profileError;
        }
      }

      // 3. Invalider tous les caches pour forcer le rafraîchissement
      logger.info("Invalidation des caches");
      await queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['driver-profile', user?.id] });
      
      logger.info("Profil sauvegardé avec succès");
      
      // Toast géré automatiquement par le hook useOptimizedDriverProfile
      
    } catch (error: any) {
      logger.error("Erreur lors de la sauvegarde", { error });
      // Toast d'erreur géré automatiquement par le hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-elegant">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            </div>
            {activeTab !== "home" && (
              <NavigationHeader 
                showBack={false}
                showHome={true}
                homeRoute="/driver-dashboard"
                onBack={() => setActiveTab("home")}
              />
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSelector variant="header" />
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{driverProfile?.full_name || t('driverDashboard.driver')}</span>
              <Badge 
                variant="outline" 
                className={`text-xs border ${
                  driverProfile?.driver?.free_access_granted 
                    ? "border-success/50 text-success bg-success/10" 
                    : driverProfile?.driver?.subscription_status === "active" 
                      ? "border-primary/50 text-primary bg-primary/10"
                      : "border-muted-foreground/50 text-muted-foreground bg-muted"
                }`}
              >
                {driverProfile?.driver?.free_access_granted 
                  ? t('driverDashboard.freeAccess') 
                  : driverProfile?.driver?.subscription_status === "active" 
                    ? t('driverDashboard.active') 
                    : t('driverDashboard.inactive')}
              </Badge>
            </div>
            <Link to="/rgpd-data">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted" title={t('driverDashboard.rgpdData')}>
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hover:bg-muted">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">

        {/* Subscription Alert */}
        {driverProfile?.driver?.subscription_status !== "active" && !driverProfile?.driver?.free_access_granted && (
          <Alert className="mb-6 bg-destructive/10 border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">{t('driverDashboard.subscriptionInactive')}</AlertTitle>
            <AlertDescription>
              {t('driverDashboard.subscriptionAlert')}
            </AlertDescription>
          </Alert>
        )}

        {/* Documents Warning Banner - seulement pour chauffeurs indépendants */}
        {driverProfile?.driver && !driverProfile.driver.is_fleet_driver && (
          <DocumentWarningBanner
            documentsStatus={(driverProfile.driver as any).documents_status || "pending"}
            documentsDeadline={(driverProfile.driver as any).documents_deadline}
            onNavigateToDocuments={() => setActiveTab("documents")}
          />
        )}

        {/* Fleet Removal Notice - popup pour chauffeurs supprimés d'une flotte */}
        {user?.id && driverProfile?.driver?.id && (
          <FleetRemovalNotice userId={user.id} driverId={driverProfile.driver.id} />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full bg-white/5 backdrop-blur-sm flex flex-col gap-2 h-auto p-2 shadow-lg border border-white/10">
            {/* Première ligne */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 w-full">
              <TabsTrigger value="home" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.home')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.home')}</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.myClients')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.clients')}</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">
                <Car className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.myRides')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.rides')}</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.messages')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.messages')}</span>
              </TabsTrigger>
              <TabsTrigger value="devis" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.quotes')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.quotes')}</span>
              </TabsTrigger>
              <TabsTrigger value="factures" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.invoices')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.invoices')}</span>
              </TabsTrigger>
            </div>
            
            {/* Deuxième ligne */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1 w-full">
              {/* Documents - Onglet dédié */}
              {!driverProfile?.driver?.is_fleet_driver && (
                <TabsTrigger value="documents" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
                  <FolderOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('driverDashboard.menu.documents')}</span>
                  <span className="sm:hidden">{t('driverDashboard.menu.docs')}</span>
                </TabsTrigger>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-gray-400 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 hover:text-white flex-col sm:flex-row">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('driverDashboard.menu.tools')}</span>
                    <span className="sm:hidden">{t('driverDashboard.menu.tools')}</span>
                    <ChevronDown className="w-3 h-3 hidden sm:inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-[#1a2942] border border-white/10 z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("planning")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white">
                    <Calendar className="w-4 h-4" />
                    {t('driverDashboard.menu.planning')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("calculator")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-600 hover:text-white">
                    <Calculator className="w-4 h-4" />
                    {t('driverDashboard.menu.calculator')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("qrcode")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:text-white">
                    <QrCode className="w-4 h-4" />
                    {t('driverDashboard.menu.myQRCode')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 sm:px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-gray-400 hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-600 hover:text-white flex-col sm:flex-row">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('driverDashboard.menu.development')}</span>
                    <span className="sm:hidden">{t('driverDashboard.menu.dev')}</span>
                    <ChevronDown className="w-3 h-3 hidden sm:inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-[#1a2942] border border-white/10 z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("campaigns")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-purple-500 hover:to-blue-600 hover:text-white">
                    <Megaphone className="w-4 h-4" />
                    {t('driverDashboard.menu.campaign')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("profitability")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-green-500 hover:to-emerald-600 hover:text-white">
                    <PieChart className="w-4 h-4" />
                    {t('driverDashboard.menu.profitability')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("prospection")} className="gap-2 cursor-pointer text-gray-300 hover:bg-gradient-to-r hover:from-pink-500 hover:to-rose-600 hover:text-white">
                    <Sparkles className="w-4 h-4" />
                    {t('driverDashboard.menu.prospection')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <TabsTrigger value="feedback" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white">
                <Lightbulb className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.feedback')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.feedback')}</span>
              </TabsTrigger>
              
              <TabsTrigger value="subscription" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.subscription')}</span>
                <span className="sm:hidden">Abo</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.profile.publicProfile')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">{t('driverDashboard.menu.statistics')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.stats')}</span>
              </TabsTrigger>
              <TabsTrigger value="sharing" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white relative">
                <div className="relative">
                  <Handshake className="w-4 h-4" />
                  {partnershipNotificationCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {partnershipNotificationCount}
                    </Badge>
                  )}
                </div>
                <span className="hidden sm:inline">{t('driverDashboard.menu.partnerships')}</span>
                <span className="sm:hidden">{t('driverDashboard.menu.partnerships')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5 text-gray-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-slate-600 data-[state=active]:text-white">
                <Settings className="w-4 h-4" />
                <span>{t('driverDashboard.menu.settings')}</span>
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home">
            <DriverHome driverProfile={driverProfile} onTabChange={handleTabChange} />
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning">
            {driverProfile?.driver?.id && (
              <Card className="p-6 bg-card/50 backdrop-blur border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Planning des Courses</h2>
                    <p className="text-sm text-muted-foreground">Visualisez et gérez votre planning</p>
                  </div>
                </div>
                <DriverPlanning driverId={driverProfile.driver.id} />
              </Card>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingInterface />
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-white/10 shadow-elegant">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Mon QR Code Personnel</h2>
                  <p className="text-sm text-white/80">Recrutez vos clients exclusifs en 30 secondes</p>
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
            <Card className="p-6 bg-card/50 backdrop-blur border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Gestion de l'Abonnement</h2>
                  <p className="text-sm text-muted-foreground">Gérez votre abonnement professionnel</p>
                </div>
              </div>
              <SubscriptionManager 
                driverProfile={driverProfile} 
                onSubscriptionUpdate={() => {
                  // Force le rechargement du profil driver depuis la base de données
                  queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized', user?.id] });
                }}
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
            <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-white/10 shadow-elegant">
              <h2 className="text-xl font-bold mb-6 text-white">Tarification Professionnelle</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="baseFare" className="text-white">Forfait de base (€)</Label>
                  <Input
                    id="baseFare"
                    type="text"
                    inputMode="decimal"
                    value={baseFare}
                    onChange={(e) => setBaseFare(e.target.value)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-white">Prix de départ de la course</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perKm" className="text-white">Prix par kilomètre (€)</Label>
                  <Input
                    id="perKm"
                    type="text"
                    inputMode="decimal"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(e.target.value)}
                    placeholder="1.50"
                  />
                  <p className="text-xs text-white">Coût par km parcouru</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly" className="text-white">Tarif horaire (€)</Label>
                  <Input
                    id="hourly"
                    type="text"
                    inputMode="decimal"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="45.00"
                    required
                  />
                  <p className="text-xs text-white">Pour les mises à disposition (obligatoire)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumPrice" className="text-white">Prix minimum par course (€)</Label>
                  <Input
                    id="minimumPrice"
                    type="text"
                    inputMode="decimal"
                    value={minimumPrice}
                    onChange={(e) => setMinimumPrice(e.target.value)}
                    placeholder="15.00"
                  />
                  <p className="text-xs text-white">Prix minimum pour les courses au km (si le calcul est inférieur, ce prix s'applique)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="maxPassengers" className="text-white">Nombre maximum de passagers</Label>
                  <Input
                    id="maxPassengers"
                    type="number"
                    min="1"
                    max="20"
                    value={maxPassengers}
                    onChange={(e) => setMaxPassengers(e.target.value)}
                    placeholder="4"
                  />
                  <p className="text-xs text-white">Places disponibles (4 par défaut, augmentez pour van)</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <div>
                      <Label htmlFor="tvaIncluded" className="font-semibold text-white">TVA comprise</Label>
                      <p className="text-xs text-white">Vos tarifs incluent-ils déjà la TVA ?</p>
                    </div>
                    <Switch
                      id="tvaIncluded"
                      checked={tvaIncluded}
                      onCheckedChange={setTvaIncluded}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                  <FileText className="w-4 h-4 text-white" />
                  TVA Automatique
                </h4>
                <div className="space-y-1 text-sm text-white/80">
                  <p>• <span className="font-medium text-white">10% TVA</span> pour les courses au kilomètre</p>
                  <p>• <span className="font-medium text-white">20% TVA</span> pour les mises à disposition (horaire)</p>
                  <p className="text-xs mt-2 italic text-white">La TVA est calculée automatiquement selon le type de course</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="eveningSurcharge" className="text-white">Augmentation Soir (%)</Label>
                    <Input
                      id="eveningSurcharge"
                      type="text"
                      inputMode="decimal"
                      value={eveningSurcharge}
                      onChange={(e) => setEveningSurcharge(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-white/70">Augmentation pour les courses du soir (20h-6h). <span className="font-semibold">Exemples : 10%, 15%, 20%</span></p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekendSurcharge" className="text-white">Augmentation Weekend (%)</Label>
                    <Input
                      id="weekendSurcharge"
                      type="text"
                      inputMode="decimal"
                      value={weekendSurcharge}
                      onChange={(e) => setWeekendSurcharge(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-white/70">Augmentation pour les courses du weekend (samedi & dimanche). <span className="font-semibold">Exemples : 10%, 20%, 25%</span></p>
                  </div>
                </div>

                {/* Forfait Aéroport */}
                <div className="space-y-2 border-t border-white/10 pt-6">
                  <Label htmlFor="airportSurcharge" className="text-white flex items-center gap-2">
                    ✈️ Forfait Aéroport (€)
                  </Label>
                  <Input
                    id="airportSurcharge"
                    type="text"
                    inputMode="decimal"
                    value={airportSurcharge}
                    onChange={(e) => setAirportSurcharge(e.target.value)}
                    placeholder="0"
                    className="max-w-xs"
                  />
                  <p className="text-xs text-white/70">
                    Forfait fixe ajouté automatiquement pour toutes les courses depuis/vers un aéroport français (Roissy CDG, Orly, Lyon Saint-Exupéry, Nice, Marseille, etc.)
                  </p>
                  <p className="text-xs text-white/80 bg-white/5 p-3 rounded-lg border border-white/10 mt-2">
                    💡 <span className="font-medium">Détection automatique :</span> Le système détecte automatiquement si l'adresse de départ ou de destination contient un aéroport et applique ce forfait.
                  </p>
                </div>

                <p className="text-xs text-white/80 bg-white/5 p-3 rounded-lg border border-white/10">
                  💡 <span className="font-medium">Info :</span> Mettez 0 si vous ne souhaitez pas appliquer d'augmentation. Les pourcentages sont appliqués automatiquement lors du calcul des prix.
                </p>
              </div>
            </Card>

            {/* City Pricing */}
            <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-white/10 shadow-elegant">
              {driverProfile?.driver?.id && (
                <CityPricingManager driverId={driverProfile.driver.id} />
              )}
            </Card>

            {/* Company Info */}
            <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-white/10 shadow-elegant">
              <h2 className="text-xl font-bold mb-6 text-white">Informations Entreprise</h2>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white">Nom de l'entreprise</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="VTC Excellence"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret" className="text-white">SIRET (14 chiffres)</Label>
                    <Input
                      id="siret"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="123 456 789 00012"
                      maxLength={14}
                    />
                    <p className="text-xs text-white/70">Ou remplissez le SIREN ci-dessous</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siren" className="text-white">SIREN (9 chiffres)</Label>
                    <Input
                      id="siren"
                      value={siren}
                      onChange={(e) => setSiren(e.target.value)}
                      placeholder="123 456 789"
                      maxLength={9}
                    />
                    <p className="text-xs text-white/70">Alternative au SIRET (9 premiers chiffres)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tvaNumber" className="text-white">N° TVA Intracommunautaire</Label>
                    <Input
                      id="tvaNumber"
                      value={tvaNumber}
                      onChange={(e) => setTvaNumber(e.target.value)}
                      placeholder="FR12345678901"
                      maxLength={15}
                    />
                    <p className="text-xs text-white/70">Apparaîtra sur vos devis et factures</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress" className="text-white">Adresse de l'entreprise</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="123 Rue de la République, 75001 Paris"
                    rows={3}
                  />
                  <p className="text-xs text-white">Cette adresse apparaîtra sur vos devis et factures</p>
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
            <Card className="p-6 bg-gradient-to-br from-[#1e3a5f]/80 to-[#2a4a6f]/80 border-white/10 shadow-elegant">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Demandes de Réservation</h2>
                  <p className="text-sm text-white/80">Gérez vos courses et créez des devis</p>
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
            {driverProfile && user ? (
              <>
                <DriverPublicProfile
                  driverProfile={driverProfile}
                  userId={user.id}
                  publicProfileEnabled={publicProfileEnabled}
                  showPhone={showPhone}
                  showEmail={showEmail}
                  contactPhone={contactPhone}
                  contactEmail={contactEmail}
                  workingSectors={workingSectors}
                  serviceDescription={serviceDescription}
                  homeAddress={homeAddress}
                  displayDriverName={displayDriverName}
                  displayCompanyName={displayCompanyName}
                  companyName={companyName}
                  profilePhotoUrl={profilePhotoUrl}
                  cardPhotoUrl={cardPhotoUrl}
                  vehicleEquipment={vehicleEquipment}
                  servicesOffered={servicesOffered}
                  onTogglePublicProfile={handleTogglePublicProfile}
                  onPhotoUpdate={setProfilePhotoUrl}
                  onCardPhotoUpdate={setCardPhotoUrl}
                  onShowPhoneChange={setShowPhone}
                  onShowEmailChange={setShowEmail}
                  onContactPhoneChange={setContactPhone}
                  onContactEmailChange={setContactEmail}
                  onWorkingSectorsChange={setWorkingSectors}
                  onServiceDescriptionChange={setServiceDescription}
                  onHomeAddressChange={(address, coords) => {
                    setHomeAddress(address);
                    if (coords) setHomeCoordinates(coords);
                  }}
                  onDisplayDriverNameChange={setDisplayDriverName}
                  onDisplayCompanyNameChange={setDisplayCompanyName}
                  onVehicleEquipmentChange={setVehicleEquipment}
                  onServicesOfferedChange={setServicesOffered}
                  vehicleCategories={vehicleCategories}
                  onVehicleCategoriesChange={setVehicleCategories}
                  visibleToFleetManagers={visibleToFleetManagers}
                  onVisibleToFleetManagersChange={!driverProfile?.driver?.is_fleet_driver && !driverProfile?.driver?.fleet_manager_id ? setVisibleToFleetManagers : undefined}
                  visibleToCompanies={visibleToCompanies}
                  onVisibleToCompaniesChange={setVisibleToCompanies}
                  visibleToDrivers={visibleToDrivers}
                  onVisibleToDriversChange={setVisibleToDrivers}
                  showRatingPublic={showRatingPublic}
                  onShowRatingPublicChange={setShowRatingPublic}
                  showRatingPartners={showRatingPartners}
                  onShowRatingPartnersChange={setShowRatingPartners}
                  showPricingPartners={showPricingPartners}
                  onShowPricingPartnersChange={setShowPricingPartners}
                />

                <div className="flex justify-end">
                  <Button onClick={handleUpdateProfile} disabled={loading} size="lg">
                    {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement du profil...</p>
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <DriverStatisticsComplete driverProfile={driverProfile} />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <DriverCampaigns driverProfile={driverProfile} />
          </TabsContent>

          {/* Profitability Tab */}
          <TabsContent value="profitability" className="space-y-6">
            <ProfitabilityCalculator />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <DriverFeedback />
          </TabsContent>

          {/* Prospection Tab */}
          <TabsContent value="prospection" className="space-y-6">
            <DriverProspectionFlyer 
              qrCode={qrCode} 
              driverProfile={driverProfile} 
            />
          </TabsContent>

          {/* Partage & Partenariats Tab */}
          <TabsContent value="sharing" className="space-y-6">
            <UnifiedPartnershipHub initialDriverSubTab={partnershipInitialTab} />
          </TabsContent>

          {/* Documents Tab - Hub unifié */}
          <TabsContent value="documents" className="space-y-6">
            {driverProfile?.driver?.id && user?.id && (
              <UnifiedDocumentsHub 
                driverId={driverProfile.driver.id} 
                userId={user.id}
                isFleetDriver={driverProfile.driver.is_fleet_driver || false}
              />
            )}
          </TabsContent>

          {/* Fleet Partnerships Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Fleet Commissions Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Company Agreements Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Company Payments Tab - supprimé, intégré dans UnifiedPartnershipHub */}

        </Tabs>
      </div>
      
      {/* Assistant virtuel Max */}
      <DriverAssistant />
    </div>
  );
};

export default DriverDashboard;
