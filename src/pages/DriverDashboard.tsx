import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut, Settings, Building2, FileText, MapPin, CreditCard, AlertCircle, LayoutGrid, MessageSquare, Globe, Calculator, Wrench, ChevronDown, BarChart3, PieChart, Megaphone, Shield, Lightbulb, Sparkles, Home, Handshake, FolderOpen, Save, Loader2, Target, Clock, Wallet, Lock as LockIcon } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import CoursesList from "@/components/CoursesList";
import DriverClientsList from "@/components/driver/clients/DriverClientsList";
import DriverDevisList from "@/components/driver/payments/DriverDevisList";
import DriverFacturesList from "@/components/driver/payments/DriverFacturesList";
import QRCodeDisplay from "@/components/driver/QRCodeDisplay";
import SubscriptionManager from "@/components/driver/payments/SubscriptionManager";
import { DriverHome } from "@/components/driver/DriverHomeMemoized";
import { PriceCalculator } from "@/components/driver/courses/PriceCalculator";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { ProfilePhotoUpload } from "@/components/driver/ProfilePhotoUpload";
import { DualProfilePhotoUpload } from "@/components/driver/DualProfilePhotoUpload";
import { SectorSelector } from "@/components/driver/SectorSelector";
import { EquipmentSelector } from "@/components/driver/vehicles/EquipmentSelector";
import { ServicesSelector } from "@/components/driver/ServicesSelector";
import { DriverStatisticsComplete } from "@/components/driver/stats/DriverStatisticsComplete";
import { DriverCampaigns } from "@/components/driver/promo/DriverCampaigns";
import { ProfitabilityCalculator } from "@/components/driver/profitability/ProfitabilityCalculator";
import { DriverAssistant } from "@/components/driver/DriverAssistant";
import DriverFeedback from "@/components/driver/DriverFeedback";
import { VehiclePhotosManager } from "@/components/driver/vehicles/VehiclePhotosManager";
import { DriverPublicProfileSimplified } from "@/components/driver/profile/DriverPublicProfileSimplified";
import DriverProspectionFlyer from "@/components/driver/DriverProspectionFlyer";
import DriverPlanning from "@/components/driver/planning/DriverPlanning";
import { OutOfScheduleAlerts } from "@/components/driver/planning/OutOfScheduleAlerts";
import { UnifiedPartnershipHub } from "@/components/driver/UnifiedPartnershipHub";
import { DriverCourseSharing } from "@/components/driver/sharing/DriverCourseSharing";
import { PremiumGate } from "@/components/premium/PremiumGate";
import { GuestBookingsList } from "@/components/driver/clients/GuestBookingsList";
import { DriverDocuments } from "@/components/driver/DriverDocuments";
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { HorizontalOnboardingTunnel } from "@/components/driver/onboarding";
import { useDriverProfileCompletion } from "@/hooks/useDriverProfileCompletion";
import { UnifiedDocumentsHub } from "@/components/driver/documents/UnifiedDocumentsHub";
import { DocumentWarningBanner } from "@/components/driver/ui/DocumentWarningBanner";
import { DocumentsBlockedOverlay } from "@/components/driver/ui/DocumentsBlockedOverlay";
import { PioneerBanner } from "@/components/driver/ui/PioneerBanner";
import { CourseQueueAlert } from "@/components/driver/courses/CourseQueueAlert";
import { PremiumUpgradeBanner } from "@/components/premium/PremiumUpgradeBanner";
import { DriverTutorial } from "@/components/driver/tutorial/DriverTutorial";
import { CourseQueueManager } from "@/components/driver/courses/CourseQueueManager";
import { CityPricingManager } from "@/components/shared/CityPricingManager";
import { ObjectivesDashboard } from "@/components/driver/objectives/ObjectivesDashboard";
import { DriverPaymentSettings } from "@/components/driver/settings/DriverPaymentSettings";
import { DriverFinancePage } from "@/components/driver/finance/DriverFinancePage";
import { SpontaneousPayment } from "@/components/driver/finance/SpontaneousPayment";
import { DriverSettingsSimplified } from "@/components/driver/settings/DriverSettingsSimplified";
import { TvaToggle } from "@/components/pricing/TvaToggle";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { MobileDriverNav } from "@/components/driver/ui/MobileDriverNav";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDriverPremium } from "@/hooks/useDriverPremium";
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
import { useUpdateLastSeen } from "@/hooks/useUpdateLastSeen";
import { geocodeAddress } from "@/lib/geocoding";
import { DriverAvailabilityToggle } from "@/components/driver/planning/DriverAvailabilityToggle";
import { DriverAvailabilityProvider } from "@/contexts/DriverAvailabilityContext";
import { DriverMapMode } from "@/components/driver/map/DriverMapMode";
import { Map as MapIcon } from "lucide-react";
import { FloatingMapButton } from "@/components/driver/ui/FloatingMapButton";

const DriverDashboard = () => {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useUserLanguage(); // Sync language with user profile
  const { signOut, user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { isPremium } = useDriverPremium();

  // SÉCURITÉ: Double vérification du rôle pour éviter les mélanges de dashboard
  useEffect(() => {
    if (userRole && userRole !== "driver") {
      logger.warn("DriverDashboard: wrong role detected, redirecting", { userRole });
      const redirectMap: Record<string, string> = {
        admin: "/admin-dashboard",
        client: "/client-dashboard",
      };
      navigate(redirectMap[userRole] || "/login", { replace: true });
    }
  }, [userRole, navigate]);

  const { driverProfile, isLoading: profileLoading, updateProfile, isUpdating, accessStatus } = useOptimizedDriverProfile(user?.id);
  
  // Mettre à jour last_seen_at à chaque visite du dashboard
  useUpdateLastSeen(driverProfile?.driver?.id);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<any>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [partnershipInitialTab, setPartnershipInitialTab] = useState<'list' | 'search' | 'received' | 'sent' | 'payments' | 'invoices' | undefined>(undefined);
  const [showOnboardingTunnel, setShowOnboardingTunnel] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "map">(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "dashboard") return "dashboard";
    return "map";
  });

  // React to ?view=map changes (e.g. after accepting a course from overlay)
  useEffect(() => {
    if (searchParams.get("view") === "map") {
      setViewMode("map");
    }
  }, [searchParams]);

  // Incoming course overlay is now handled globally in GlobalRideOverlay

  // Show tutorial for new drivers who completed onboarding but haven't seen the tutorial
  useEffect(() => {
    if (driverProfile?.driver?.onboarding_completed) {
      const tutorialKey = `solocab_tutorial_done_${driverProfile.driver.id}`;
      if (!localStorage.getItem(tutorialKey)) {
        setShowTutorial(true);
      }
    }
  }, [driverProfile?.driver?.onboarding_completed, driverProfile?.driver?.id]);
  
  // REDIRECTION AUTOMATIQUE vers le tunnel d'onboarding si non complété
  useEffect(() => {
    if (driverProfile?.driver && !driverProfile.driver.onboarding_completed) {
      // Chauffeur n'a pas complété l'onboarding - rediriger vers le tunnel
      navigate("/driver-welcome", { replace: true });
    }
  }, [driverProfile?.driver?.onboarding_completed, navigate]);
  
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

  // Form states - profil public toujours actif (plus de toggle)
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [workingSectors, setWorkingSectors] = useState<string[]>([]);
  const [serviceDescription, setServiceDescription] = useState("");
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
  // Note: visibleToFleetManagers et visibleToCompanies sont conservés pour compatibilité DB mais non affichés
  const [visibleToFleetManagers, setVisibleToFleetManagers] = useState(false);
  const [visibleToCompanies, setVisibleToCompanies] = useState(false);
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [showRatingPublic, setShowRatingPublic] = useState(false);
  const [showRatingPartners, setShowRatingPartners] = useState(false);
  const [showPricingPartners, setShowPricingPartners] = useState(false);
  const [vehicleCategories, setVehicleCategories] = useState<string[]>([]);
  // Note: autoAcceptFromPartners supprimé - fonctionnalité gestionnaires de flotte obsolète

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
    // Batch TOUS les états en une seule fois - profil public toujours actif
    setShowPhone(driver.show_phone || false);
    setShowEmail(driver.show_email || false);
    setContactPhone((driver as any).contact_phone || driverProfile.phone || "");
    setContactEmail((driver as any).contact_email || driverProfile.email || "");
    setWorkingSectors(driver.working_sectors || []);
    setServiceDescription(driver.service_description || "");
    
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
    setProfilePhotoUrl((driverProfile as any).profile_photo_url || driverProfile.avatar_url || null);
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
    // Note: auto_accept_from_partners n'est plus utilisé (fonctionnalité gestionnaires obsolète)
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

  // handleTogglePublicProfile supprimé - profil toujours public

  const handleUpdateProfile = async () => {
    if (!driverProfile?.driver?.id || !updateProfile) {
      toast.error("Impossible d'enregistrer : profil non chargé");
      return;
    }

    setLoading(true);
    
    try {
      logger.info("Début de la sauvegarde du profil");

      // GPS-only: no static address required
      
      // 1. Sauvegarder les données du driver - profil toujours public
      const driverUpdates = {
        public_profile_enabled: true, // Toujours true
        show_phone: showPhone,
        show_email: showEmail,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        working_sectors: workingSectors,
        service_description: serviceDescription,
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
        // Note: auto_accept_from_partners n'est plus utilisé (fonctionnalité gestionnaires obsolète)
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

  // Si l'accès est bloqué pour documents non soumis, afficher l'overlay restreint
  if (accessStatus.documentsAccessOnly && driverProfile?.driver?.id && user?.id) {
    return (
      <DocumentsBlockedOverlay
        driverId={driverProfile.driver.id}
        userId={user.id}
        driverProfile={driverProfile}
        onSubscriptionUpdate={() => queryClient.invalidateQueries({ queryKey: ['driver-profile-optimized'] })}
      />
    );
  }

  // TUNNEL D'ONBOARDING HORIZONTAL - Bloque l'accès au dashboard tant que non complété
  if (showOnboardingTunnel && driverProfile?.driver?.id && user?.id) {
    // Calculer l'étape initiale basée sur onboarding_step sauvegardé
    const onboardingStepMap: Record<string, number> = {
      'vision': 0,
      'objectives': 0,
      'goals': 1,
      'settings': 2,
      'profile': 3,
      'documents': 4,
      'nfc': 5,
      'billing': 6,
      'trial_start': 7,
      'encaissements': 6,
    };
    
    const savedStep = driverProfile?.driver?.onboarding_step;
    const hasNfcPlate = !!(driverProfile?.driver?.has_nfc_plate || driverProfile?.driver?.nfc_tag_number || driverProfile?.driver?.nfc_plate_order_id);
    
    let initialStep = savedStep ? (onboardingStepMap[savedStep] ?? 0) : 0;
    
    // Ajuster si le chauffeur a déjà une plaque NFC (on saute l'étape NFC)
    if (hasNfcPlate && initialStep >= 5) {
      initialStep = Math.max(0, initialStep - 1);
    }
    
    return (
      <HorizontalOnboardingTunnel
        driverId={driverProfile.driver.id}
        userId={user.id}
        driverProfile={driverProfile}
        initialStep={initialStep}
        onComplete={() => {
          setShowOnboardingTunnel(false);
          queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
        }}
      />
    );
  }

  // Wrap both map and dashboard modes in availability provider for stable state
  const driverIdForProvider = driverProfile?.driver?.id;

  // Map mode — fullscreen immersive
  if (viewMode === "map" && driverIdForProvider) {
    return (
      <DriverAvailabilityProvider driverId={driverIdForProvider}>
        <DriverMapMode
          driverId={driverIdForProvider}
          onSwitchToDashboard={() => setViewMode("dashboard")}
          onNavigateTo={(tab: string) => {
            setViewMode("dashboard");
            setActiveTab(tab);
          }}
        />
      </DriverAvailabilityProvider>
    );
  }

  return (
    <DriverAvailabilityProvider driverId={driverIdForProvider || ''}>
    <div className="min-h-screen bg-gradient-bg pb-20" data-main-content>
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-elegant" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        {/* Availability toggle moved to DriverHome */}
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <img src={logo} alt="SoloCab" className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            </div>
            {/* Navigation mobile - Sheet menu */}
            <MobileDriverNav
              activeTab={activeTab}
              onTabChange={handleTabChange}
              partnershipNotificationCount={partnershipNotificationCount}
              isFleetDriver={driverProfile?.driver?.is_fleet_driver}
            />
            {activeTab !== "home" && (
              <div className="hidden md:block">
                <NavigationHeader 
                  showBack={false}
                  showHome={true}
                  homeRoute="/driver-dashboard"
                  onBack={() => setActiveTab("home")}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageSelector variant="header" />
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{driverProfile?.full_name || t('driverDashboard.driver')}</span>
              {driverProfile?.driver?.is_pioneer ? (
                <PioneerBadge size="sm" />
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <Badge 
                    variant="outline" 
                    className={`text-xs border ${
                      driverProfile?.driver?.free_access_granted 
                        ? "border-success/50 text-success bg-success/10" 
                        : driverProfile?.driver?.subscription_status === "active" 
                          ? "border-primary/50 text-primary bg-primary/10"
                          : driverProfile?.driver?.subscription_status === "past_due"
                            ? "border-amber-500/50 text-amber-500 bg-amber-500/10"
                            : "border-destructive/50 text-destructive bg-destructive/10"
                    }`}
                  >
                    {driverProfile?.driver?.free_access_granted 
                      ? t('driverDashboard.freeAccess') 
                      : driverProfile?.driver?.subscription_status === "active" 
                        ? t('driverDashboard.active') 
                        : driverProfile?.driver?.subscription_status === "past_due"
                          ? "Paiement en retard"
                          : t('driverDashboard.inactive')}
                  </Badge>
                  {/* Explication du statut inactif */}
                  {!driverProfile?.driver?.free_access_granted && 
                   driverProfile?.driver?.subscription_status !== "active" && (
                    <span className="text-[10px] text-muted-foreground max-w-32 text-right">
                      {driverProfile?.driver?.subscription_status === "past_due" 
                        ? "Réglez votre abonnement" 
                        : "Compte en attente d'activation"}
                    </span>
                  )}
                </div>
              )}
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

        {/* Pioneer Banner - Affichage pour les pionniers */}
        {driverProfile?.driver?.is_pioneer && (
          <PioneerBanner
            freeAccessEndDate={driverProfile.driver.free_access_end_date}
            subscriptionStatus={driverProfile.driver.subscription_status}
            freeAccessType={driverProfile.driver.free_access_type}
          />
        )}

        {/* Subscription Alert - UNIQUEMENT si pas d'accès complet ET profil chargé (évite le flickering) */}
        {!profileLoading && driverProfile?.driver && !accessStatus.hasFullAccess && (
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

        {/* Premium Upgrade Banner - Pour les chauffeurs gratuits */}
        {driverProfile?.driver?.id && !isPremium && (
          <div className="mb-4">
            <PremiumUpgradeBanner message="Passez Premium pour débloquer toutes les fonctionnalités" />
          </div>
        )}

        {/* Course Queue Alert - Alerte file d'attente intelligente */}
        {driverProfile?.driver?.id && (
          <div className="mb-4">
            <CourseQueueAlert driverId={driverProfile.driver.id} />
          </div>
        )}

        {/* Tutorial interactif pour les nouveaux chauffeurs */}
        <DriverTutorial
          isVisible={showTutorial}
          onNavigateToTab={(tab) => handleTabChange(tab)}
          onComplete={() => {
            setShowTutorial(false);
            if (driverProfile?.driver?.id) {
              localStorage.setItem(`solocab_tutorial_done_${driverProfile.driver.id}`, "true");
            }
          }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Desktop TabsList - hidden on mobile, using MobileDriverNav instead */}
          <TabsList className="hidden md:flex w-full bg-muted/30 backdrop-blur-sm flex-col gap-2 h-auto p-2 shadow-lg border border-border">
            {/* Première ligne */}
            <div className="grid grid-cols-6 gap-1 w-full">
              <TabsTrigger value="home" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-success data-[state=active]:to-success/80 data-[state=active]:text-white">
                <Home className="w-4 h-4" />
                <span>{t('driverDashboard.menu.home')}</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
                <Users className="w-4 h-4" />
                <span>{t('driverDashboard.menu.myClients')}</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-accent data-[state=active]:text-white">
                <Car className="w-4 h-4" />
                <span>{t('driverDashboard.menu.myRides')}</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-primary data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4" />
                <span>{t('driverDashboard.menu.messages')}</span>
              </TabsTrigger>
              <TabsTrigger value="devis" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-primary data-[state=active]:text-white">
                <FileText className="w-4 h-4" />
                <span>{t('driverDashboard.menu.quotes')}</span>
              </TabsTrigger>
              <TabsTrigger value="factures" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-success data-[state=active]:to-success/80 data-[state=active]:text-white">
                <CreditCard className="w-4 h-4" />
                <span>{t('driverDashboard.menu.invoices')}</span>
              </TabsTrigger>
              <TabsTrigger value="finances" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-warning/80 data-[state=active]:text-white">
                <Wallet className="w-4 h-4" />
                <span>Finances</span>
              </TabsTrigger>
            </div>
            
            {/* Deuxième ligne */}
            <div className="grid grid-cols-7 gap-1 w-full">
              {/* Documents - Onglet dédié */}
              {!driverProfile?.driver?.is_fleet_driver && (
                <TabsTrigger value="documents" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-warning/80 data-[state=active]:text-white">
                  <FolderOpen className="w-4 h-4" />
                  <span>{t('driverDashboard.menu.documents')}</span>
                </TabsTrigger>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground flex-row touch-manipulation">
                    <Wrench className="w-4 h-4" />
                    <span>{t('driverDashboard.menu.tools')}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-card border border-border z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("planning")} className="gap-2 cursor-pointer hover:bg-muted">
                    <Calendar className="w-4 h-4" />
                    {t('driverDashboard.menu.planning')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("calculator")} className="gap-2 cursor-pointer hover:bg-muted">
                    <Calculator className="w-4 h-4" />
                    {t('driverDashboard.menu.calculator')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("qrcode")} className="gap-2 cursor-pointer hover:bg-muted">
                    <QrCode className="w-4 h-4" />
                    {t('driverDashboard.menu.myQRCode')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:bg-secondary/50 hover:text-foreground flex-row touch-manipulation">
                    <Wrench className="w-4 h-4" />
                    <span>{t('driverDashboard.menu.development')}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-card border border-border z-50">
                  <DropdownMenuItem onClick={() => setActiveTab("objectives")} className="gap-2 cursor-pointer hover:bg-muted">
                    <Target className="w-4 h-4" />
                    {t('driverDashboard.menu.objectives')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { if (!isPremium) { setActiveTab("subscription"); toast.info("Fonctionnalité Premium", { description: "Passez à Premium pour accéder aux campagnes — 9,99€/mois" }); } else { setActiveTab("campaigns"); } }} className="gap-2 cursor-pointer hover:bg-muted">
                    <Megaphone className="w-4 h-4" />
                    {t('driverDashboard.menu.campaign')}
                    {!isPremium && <LockIcon className="w-3 h-3 ml-auto text-amber-500" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("profitability")} className="gap-2 cursor-pointer hover:bg-muted">
                    <PieChart className="w-4 h-4" />
                    {t('driverDashboard.menu.profitability')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { if (!isPremium) { setActiveTab("subscription"); toast.info("Fonctionnalité Premium", { description: "Passez à Premium pour accéder à la prospection — 9,99€/mois" }); } else { setActiveTab("prospection"); } }} className="gap-2 cursor-pointer hover:bg-muted">
                    <Sparkles className="w-4 h-4" />
                    {t('driverDashboard.menu.prospection')}
                    {!isPremium && <LockIcon className="w-3 h-3 ml-auto text-amber-500" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <TabsTrigger value="feedback" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-warning/80 data-[state=active]:text-white">
                <Lightbulb className="w-4 h-4" />
                <span>{t('driverDashboard.menu.feedback')}</span>
              </TabsTrigger>
              
              <TabsTrigger value="subscription" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary data-[state=active]:to-accent data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4" />
                <span>{t('driverDashboard.menu.subscription')}</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
                <Globe className="w-4 h-4" />
                <span>Profil SoloCab</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-primary data-[state=active]:text-white">
                <BarChart3 className="w-4 h-4" />
                <span>{t('driverDashboard.menu.statistics')}</span>
              </TabsTrigger>
              <TabsTrigger value="sharing" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
                <Handshake className="w-4 h-4" />
                <span>{t('driverDashboard.menu.partnerships')}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 text-sm flex-row py-1.5 text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-muted data-[state=active]:to-muted/80 data-[state=active]:text-white">
                <Settings className="w-4 h-4" />
                <span>{t('driverDashboard.menu.settings')}</span>
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home">
            <DriverHome driverProfile={driverProfile} onTabChange={handleTabChange} onSwitchToMap={() => setViewMode("map")} />
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
                <OutOfScheduleAlerts driverId={driverProfile.driver.id} />
                <DriverPlanning driverId={driverProfile.driver.id} />
              </Card>
            )}
          </TabsContent>

          {/* Note: Queue feature moved to Planning integration */}


          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingInterface />
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <Card className="p-6 bg-card/80 backdrop-blur border border-border shadow-elegant">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Mon QR Code Personnel</h2>
                    <p className="text-sm text-muted-foreground">Recrutez vos clients exclusifs en 30 secondes</p>
                  </div>
                </div>
              </div>
              <FloatingMapButton onClick={() => setViewMode("map")} />
              <QRCodeDisplay qrCode={qrCode} loadingQR={loadingQR} driverProfile={driverProfile} />
            </Card>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator">
            {driverProfile?.driver?.id && (
              <PriceCalculator driverProfile={driverProfile} />
            )}
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances">
            {driverProfile?.driver?.id && (
              <DriverFinancePage driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Encaisser Tab */}
          <TabsContent value="encaisser">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Encaisser un client</h2>
              <FloatingMapButton onClick={() => setViewMode("map")} />
            </div>
            {driverProfile?.driver?.id && (
              <SpontaneousPayment 
                driverId={driverProfile.driver.id} 
                stripeEnabled={!!driverProfile?.driver?.stripe_connect_charges_enabled} 
              />
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

          {/* Settings Tab - Version simplifiée */}
          <TabsContent value="settings" className="space-y-4">
            {driverProfile?.driver?.id && (
              <DriverSettingsSimplified
                driverId={driverProfile.driver.id}
                baseFare={baseFare}
                perKmRate={perKmRate}
                hourlyRate={hourlyRate}
                minimumPrice={minimumPrice}
                maxPassengers={maxPassengers}
                tvaIncluded={tvaIncluded}
                eveningSurcharge={eveningSurcharge}
                weekendSurcharge={weekendSurcharge}
                airportSurcharge={airportSurcharge}
                companyName={companyName}
                companyAddress={companyAddress}
                siret={siret}
                siren={siren}
                tvaNumber={tvaNumber}
                onBaseFareChange={setBaseFare}
                onPerKmRateChange={setPerKmRate}
                onHourlyRateChange={setHourlyRate}
                onMinimumPriceChange={setMinimumPrice}
                onMaxPassengersChange={setMaxPassengers}
                onTvaIncludedChange={setTvaIncluded}
                onEveningSurchargeChange={setEveningSurcharge}
                onWeekendSurchargeChange={setWeekendSurcharge}
                onAirportSurchargeChange={setAirportSurcharge}
                onCompanyNameChange={setCompanyName}
                onCompanyAddressChange={setCompanyAddress}
                onSiretChange={setSiret}
                onSirenChange={setSiren}
                onTvaNumberChange={setTvaNumber}
                onSave={handleUpdateProfile}
                loading={loading || isUpdating}
                onPaymentUpdate={() => queryClient.invalidateQueries({ queryKey: ['driver-profile'] })}
              />
            )}
          </TabsContent>


          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            {driverProfile?.driver?.id && (
              <DriverClientsList driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <Card className="p-6 bg-card/80 backdrop-blur border border-border shadow-elegant">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Demandes de Réservation</h2>
                    <p className="text-sm text-muted-foreground">Gérez vos courses et créez des devis</p>
                  </div>
                </div>
              </div>
              <FloatingMapButton onClick={() => setViewMode("map")} />

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

          {/* Profile Tab - Version simplifiée */}
          <TabsContent value="profile" className="space-y-6">
            {driverProfile && user ? (
              <DriverPublicProfileSimplified
                driverProfile={driverProfile}
                userId={user.id}
                visibleToDrivers={visibleToDrivers}
                displayDriverName={displayDriverName}
                displayCompanyName={displayCompanyName}
                companyName={companyName}
                profilePhotoUrl={profilePhotoUrl}
                cardPhotoUrl={cardPhotoUrl}
                serviceDescription={serviceDescription}
                workingSectors={workingSectors}
                vehicleEquipment={vehicleEquipment}
                servicesOffered={servicesOffered}
                vehicleCategories={vehicleCategories}
                homeAddress={homeAddress}
                showPhone={showPhone}
                showEmail={showEmail}
                contactPhone={contactPhone}
                contactEmail={contactEmail}
                showRatingPublic={showRatingPublic}
                onVisibleToDriversChange={setVisibleToDrivers}
                onDisplayDriverNameChange={setDisplayDriverName}
                onDisplayCompanyNameChange={setDisplayCompanyName}
                onPhotoUpdate={setProfilePhotoUrl}
                onCardPhotoUpdate={setCardPhotoUrl}
                onServiceDescriptionChange={setServiceDescription}
                onWorkingSectorsChange={setWorkingSectors}
                onVehicleEquipmentChange={setVehicleEquipment}
                onServicesOfferedChange={setServicesOffered}
                onVehicleCategoriesChange={setVehicleCategories}
                onHomeAddressChange={(address, coords) => {
                  setHomeAddress(address);
                  if (coords) setHomeCoordinates(coords);
                }}
                onShowPhoneChange={setShowPhone}
                onShowEmailChange={setShowEmail}
                onContactPhoneChange={setContactPhone}
                onContactEmailChange={setContactEmail}
                onShowRatingPublicChange={setShowRatingPublic}
                onSave={handleUpdateProfile}
                loading={loading || isUpdating}
              />
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

          {/* Campaigns Tab - PREMIUM */}
          <TabsContent value="campaigns" className="space-y-6">
            {isPremium ? (
              <DriverCampaigns driverProfile={driverProfile} />
            ) : (
              <PremiumGate isPremium={false} featureName="Campagnes & Promotions" featureDescription="Créez des codes promo et des campagnes marketing pour fidéliser vos clients." />
            )}
          </TabsContent>

          {/* Profitability Tab */}
          <TabsContent value="profitability" className="space-y-6">
            <ProfitabilityCalculator />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <DriverFeedback />
          </TabsContent>

          {/* Prospection Tab - PREMIUM */}
          <TabsContent value="prospection" className="space-y-6">
            {isPremium ? (
              <DriverProspectionFlyer 
                qrCode={qrCode} 
                driverProfile={driverProfile} 
              />
            ) : (
              <PremiumGate isPremium={false} featureName="Prospection avancée" featureDescription="Générez des flyers personnalisés et des outils de prospection pour développer votre clientèle." />
            )}
          </TabsContent>

          {/* Partage & Partenariats Tab - Premium can send, all can receive */}
          <TabsContent value="sharing" className="space-y-6">
            {isPremium ? (
              <UnifiedPartnershipHub initialDriverSubTab={partnershipInitialTab} />
            ) : (
              <DriverCourseSharing />
            )}
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

          {/* Objectives Tab */}
          <TabsContent value="objectives">
            {driverProfile?.driver?.id && (
              <ObjectivesDashboard driverId={driverProfile.driver.id} />
            )}
          </TabsContent>

          {/* Fleet Partnerships Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Fleet Commissions Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Company Agreements Tab - supprimé, intégré dans UnifiedPartnershipHub */}
          {/* Company Payments Tab - supprimé, intégré dans UnifiedPartnershipHub */}

        </Tabs>
      </div>
      
      {/* Floating Map button - only when disconnected, as connected drivers have it in the toggle */}

      {/* Assistant virtuel Max */}
      <DriverAssistant />

      {/* Incoming Course Overlay + Permission Prompt are now global (GlobalRideOverlay in App.tsx) */}

    </div>
    </DriverAvailabilityProvider>
  );
};

export default DriverDashboard;
