import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavigationHeader } from "@/components/NavigationHeader";
import { NotificationBell } from "@/components/NotificationBell";
import { isPast } from "date-fns";
import {
  Users,
  Car,
  QrCode,
  Send,
  Copy,
  Loader2,
  Settings,
  Globe,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  Star,
  LogOut,
  Shield,
  Home,
  ChevronDown,
  Eye,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Menu,
  Lock,
  Wrench,
  Calendar,
  Route,
  BarChart3,
  Euro,
  Handshake,
  Tag,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { FleetDocumentsHub } from "@/components/fleet-manager/FleetDocumentsHub";
import { DocumentWarningBanner } from "@/components/fleet-manager/DocumentWarningBanner";
import { FleetSubscriptionManager } from "@/components/fleet-manager/FleetSubscriptionManager";
import { FleetDriverInvitations } from "@/components/fleet-manager/FleetDriverInvitations";
import { FleetDriverPlanning } from "@/components/fleet-manager/FleetDriverPlanning";
import { FleetPublicProfileSettings } from "@/components/fleet-manager/FleetPublicProfileSettings";
import { FleetHome } from "@/components/fleet-manager/FleetHome";
import { FleetCoursesManager } from "@/components/fleet-manager/FleetCoursesManager";
import { FleetStatisticsComplete } from "@/components/fleet-manager/FleetStatisticsComplete";
import { FleetDriverPartnerships } from "@/components/fleet-manager/FleetDriverPartnerships";
import { FleetPartnerCommissions } from "@/components/fleet-manager/FleetPartnerCommissions";
import { FleetPartnershipsHub } from "@/components/fleet-manager/FleetPartnershipsHub";
import FleetPromotions from "@/components/fleet-manager/FleetPromotions";
import { FleetDriverDocumentsValidation } from "@/components/fleet-manager/FleetDriverDocumentsValidation";
import { FleetStorefrontManager } from "@/components/fleet-manager/FleetStorefrontManager";
import { FleetDeclinedCourses } from "@/components/fleet-manager/FleetDeclinedCourses";
import { FleetDriverRemoval } from "@/components/fleet-manager/FleetDriverRemoval";
import { FleetClientInvitations } from "@/components/fleet-manager/FleetClientInvitations";
import { FleetClientsList } from "@/components/fleet-manager/FleetClientsList";
import { FleetDriverSearch } from "@/components/fleet-manager/FleetDriverSearch";
import { FleetClientsTab } from "@/components/fleet-manager/FleetClientsTab";
import { FleetOperationsSettings } from "@/components/fleet-manager/FleetOperationsSettings";
import { FleetPricingHub } from "@/components/fleet-manager/FleetPricingHub";
import { FleetDispatchSettings } from "@/components/fleet-manager/FleetDispatchSettings";
import FleetDevisList from "@/components/fleet-manager/FleetDevisList";
import FleetFacturesList from "@/components/fleet-manager/FleetFacturesList";
import logoSolocab from "@/assets/logo-solocab.png";
import { LanguageSelector } from "@/components/LanguageSelector";

interface FleetManager {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  status: string;
  show_drivers_in_public_storefront: boolean;
  total_drivers: number;
  total_clients: number;
  documents_status: string | null;
  documents_deadline: string | null;
  subscription_status: string | null;
  subscription_paid: boolean | null;
  max_free_drivers: number | null;
  auto_validate_courses: boolean | null;
  services_offered: string[] | null;
}

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  profile_photo_url: string | null;
}

interface FleetDriver {
  id: string;
  driver_id: string;
  status: string;
  joined_at: string;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand?: string | null;
    status: string;
    user_id: string;
    rating?: number | null;
    vehicle_photos?: string[] | null;
    bio?: string | null;
    services_offered?: string[] | null;
    profile?: {
      full_name: string;
      email: string;
      phone: string;
      profile_photo_url?: string | null;
    };
  };
}

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface Invitation {
  id: string;
  token: string;
  email: string | null;
  used: boolean;
  created_at: string;
  expires_at: string | null;
}

const FleetManagerDashboard = () => {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
  useUserLanguage(); // Sync language with user profile
  const [loading, setLoading] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManager | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [activeTab, setActiveTab] = useState("home");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [pendingPartnershipsCount, setPendingPartnershipsCount] = useState(0);
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0);
  const [pendingCompanyPartnershipsCount, setPendingCompanyPartnershipsCount] = useState(0);

  // Calculer si le compte est restreint (deadline dépassée et documents non soumis)
  const isAccountRestricted = useMemo(() => {
    if (!fleetManager) return false;
    
    const documentsStatus = fleetManager.documents_status || "pending";
    const deadline = fleetManager.documents_deadline;
    
    // Si documents validés ou soumis, pas de restriction
    if (documentsStatus === "validated" || documentsStatus === "submitted") {
      return false;
    }
    
    // Si deadline dépassée et documents non soumis, restriction
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      // Comparer les dates sans tenir compte des heures
      const isDeadlinePassed = deadlineDate.getTime() < now.getTime();
      console.log('[FleetManager] Restriction check:', { 
        documentsStatus, 
        deadline, 
        deadlineDate: deadlineDate.toISOString(), 
        now: now.toISOString(), 
        isDeadlinePassed 
      });
      if (isDeadlinePassed) {
        return true;
      }
    }
    
    return false;
  }, [fleetManager]);

  // Rediriger vers l'onglet documents si le compte est restreint
  useEffect(() => {
    if (isAccountRestricted && activeTab !== "documents") {
      setActiveTab("documents");
    }
  }, [isAccountRestricted, activeTab]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Realtime subscriptions pour synchronisation instantanée des statistiques
  useEffect(() => {
    if (!fleetManager?.id) return;

    const channel = supabase
      .channel(`fleet-stats-${fleetManager.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_driver_invitations', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_manager_drivers', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_manager_clients', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fleet_driver_partnerships', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_fleet_agreements', filter: `fleet_manager_id=eq.${fleetManager.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManager?.id]);

  const fetchData = async () => {
    try {
      // Fetch fleet manager profile
      const { data: fmData, error: fmError } = await supabase
        .from("fleet_managers")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (fmError) throw fmError;
      setFleetManager(fmData);

      // Fetch user profile for header
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, profile_photo_url")
        .eq("id", user?.id)
        .single();
      
      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch drivers from fleet_manager_drivers (direct drivers)
      const { data: directDriversData } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          *,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            status,
            user_id,
            rating,
            vehicle_photos,
            bio,
            services_offered,
            show_rating_for_sharing
          )
        `)
        .eq("fleet_manager_id", fmData.id);

      // Fetch drivers from fleet_driver_partnerships (partner drivers with accepted contracts)
      const { data: partnerDriversData } = await supabase
        .from("fleet_driver_partnerships")
        .select(`
          id,
          driver_id,
          status,
          accepted_at,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            status,
            user_id,
            rating,
            vehicle_photos,
            bio,
            services_offered,
            show_rating_for_sharing
          )
        `)
        .eq("fleet_manager_id", fmData.id)
        .eq("status", "accepted");

      // Combine both sources, avoiding duplicates
      const allDriversMap = new Map<string, FleetDriver>();
      
      // Add direct drivers
      if (directDriversData) {
        directDriversData.forEach((d: any) => {
          if (d.driver_id) {
            allDriversMap.set(d.driver_id, {
              id: d.id,
              driver_id: d.driver_id,
              status: d.status || 'active',
              joined_at: d.joined_at || d.created_at,
              driver: d.driver
            });
          }
        });
      }

      // Add partner drivers (overwrite if already exists)
      if (partnerDriversData) {
        partnerDriversData.forEach((d: any) => {
          if (d.driver_id && !allDriversMap.has(d.driver_id)) {
            allDriversMap.set(d.driver_id, {
              id: d.id,
              driver_id: d.driver_id,
              status: 'partner',
              joined_at: d.accepted_at || new Date().toISOString(),
              driver: d.driver
            });
          }
        });
      }

      const combinedDrivers = Array.from(allDriversMap.values());

      if (combinedDrivers.length > 0) {
        // Fetch profiles for all drivers
        const driverUserIds = combinedDrivers
          .filter((d) => d.driver)
          .map((d) => d.driver!.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, profile_photo_url")
            .in("id", driverUserIds);

          const driversWithProfiles = combinedDrivers.map((d) => ({
            ...d,
            driver: d.driver
              ? {
                  ...d.driver,
                  profile: profiles?.find((p) => p.id === d.driver!.user_id),
                }
              : undefined,
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(combinedDrivers);
        }
      } else {
        setDrivers([]);
      }

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("fleet_manager_clients")
        .select(`
          *,
          client:clients(
            id,
            user_id,
            total_rides
          )
        `)
        .eq("fleet_manager_id", fmData.id);

      if (clientsData) {
        const clientUserIds = clientsData
          .filter((c) => c.client)
          .map((c) => c.client.user_id);

        if (clientUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", clientUserIds);

          const clientsWithProfiles = clientsData.map((c) => ({
            ...c,
            client: c.client
              ? {
                  ...c.client,
                  profile: profiles?.find((p) => p.id === c.client.user_id),
                }
              : undefined,
          }));

          setClients(clientsWithProfiles);
        } else {
          setClients(clientsData);
        }
      }

      // Fetch invitations from fleet_driver_invitations (la vraie table utilisée)
      const { data: invitationsData } = await supabase
        .from("fleet_driver_invitations")
        .select("*")
        .eq("fleet_manager_id", fmData.id)
        .order("created_at", { ascending: false });

      if (invitationsData) {
        // Filtrer les invitations expirées non utilisées
        const now = new Date();
        const validInvitations = invitationsData.filter(inv => {
          // Garder les invitations utilisées
          if (inv.used) return true;
          // Garder les invitations sans date d'expiration
          if (!inv.expires_at) return true;
          // Garder les invitations non expirées
          return new Date(inv.expires_at) > now;
        });
        setInvitations(validInvitations);
      }

      // Fetch pending driver partnerships (demandes reçues)
      const { count: driverPartnershipsCount } = await supabase
        .from("fleet_driver_partnerships")
        .select("*", { count: 'exact', head: true })
        .eq("fleet_manager_id", fmData.id)
        .eq("status", "pending")
        .eq("initiated_by", "driver");
      
      setPendingPartnershipsCount(driverPartnershipsCount || 0);

      // Fetch pending company partnerships (demandes reçues)
      const { count: companyPartnershipsCount } = await supabase
        .from("company_fleet_agreements")
        .select("*", { count: 'exact', head: true })
        .eq("fleet_manager_id", fmData.id)
        .eq("status", "pending")
        .eq("proposed_by", "company");
      
      setPendingCompanyPartnershipsCount(companyPartnershipsCount || 0);

      // Fetch pending courses (courses assignées en attente de validation)
      // Use the driverIds we just gathered from combined sources
      const allDriverIds = Array.from(allDriversMap.keys());
      if (allDriverIds.length > 0) {
        const { count: coursesCount } = await supabase
          .from("courses")
          .select("*", { count: 'exact', head: true })
          .in("driver_id", allDriverIds)
          .eq("status", "pending");
        
        setPendingCoursesCount(coursesCount || 0);
      } else {
        setPendingCoursesCount(0);
      }

      // Fetch or generate QR code
      const { data: qrData } = await supabase
        .from("fleet_manager_qr_codes")
        .select("*")
        .eq("fleet_manager_id", fmData.id)
        .single();

      // QR code pointe maintenant vers la vitrine publique
      const storefrontUrl = `${window.location.origin}/flotte/${fmData.id}`;
      setQrCodeData(storefrontUrl);
      const qr = await QRCode.toDataURL(storefrontUrl, { width: 256 });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/register-driver-fleet?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers");
  };

  const togglePublicStorefront = async (enabled: boolean) => {
    if (!fleetManager) return;

    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({ show_drivers_in_public_storefront: enabled })
        .eq("id", fleetManager.id);

      if (error) throw error;

      setFleetManager({ ...fleetManager, show_drivers_in_public_storefront: enabled });
      toast.success(
        enabled
          ? "Vos chauffeurs sont maintenant visibles publiquement"
          : "Vos chauffeurs ne sont plus visibles publiquement"
      );
    } catch (error: any) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const copyQrLink = () => {
    navigator.clipboard.writeText(qrCodeData);
    toast.success("Lien copié dans le presse-papiers");
  };

  const handleViewDriverProfile = (driverId: string) => {
    setSelectedDriverId(driverId);
    setActiveTab("driver-profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background auth-loading-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!fleetManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('fleetDashboard.profileNotFound')}</p>
      </div>
    );
  }

  const selectedDriver = drivers.find(d => d.driver?.id === selectedDriverId);

  return (
    <div className="min-h-screen bg-gradient-bg page-transition">
      {/* Document Warning Banner */}
      <DocumentWarningBanner 
        documentsStatus={fleetManager.documents_status || "pending"}
        documentsDeadline={fleetManager.documents_deadline}
        onNavigateToDocuments={() => setActiveTab("documents")}
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSolocab} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            {activeTab !== "home" && (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("home")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t('fleetDashboard.tabs.home')}</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{userProfile?.full_name || fleetManager.contact_name}</span>
              <Badge 
                variant="outline" 
                className={`text-xs border ${
                  fleetManager.subscription_status === "active" 
                    ? "border-success/50 text-success bg-success/10"
                    : "border-muted-foreground/50 text-muted-foreground bg-muted"
                }`}
              >
                {fleetManager.subscription_status === "active" ? t('fleetDashboard.premium') : t('fleetDashboard.standard')}
              </Badge>
            </div>
            <Link to="/rgpd-data">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" title="Mes Données RGPD">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <LanguageSelector variant="header" />
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Alerte si compte restreint */}
        {isAccountRestricted && (
          <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">{t('fleetDashboard.accountRestricted')}</AlertTitle>
            <AlertDescription className="mt-2">
              {t('fleetDashboard.submitDocuments')}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(tab) => {
          // Si compte restreint, seul l'onglet documents est accessible
          if (isAccountRestricted && tab !== "documents") {
            toast.error(t('fleetDashboard.accessFeatureError'));
            return;
          }
          setActiveTab(tab);
        }} className="space-y-6">
          {/* Navigation - Menu clair et harmonieux */}
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => {
                const tab = e.target.value;
                if (isAccountRestricted && tab !== "documents") {
                  toast.error(t('fleetDashboard.accessFeatureError'));
                  return;
                }
                setActiveTab(tab);
              }}
              className="w-full h-12 px-4 pr-12 rounded-xl bg-card border border-border text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer shadow-sm"
            >
              <option value="home" disabled={isAccountRestricted}>🏠 Accueil</option>
              <option value="drivers" disabled={isAccountRestricted}>🚗 Chauffeurs</option>
              <option value="clients" disabled={isAccountRestricted}>👥 Clients</option>
              <option value="courses" disabled={isAccountRestricted}>📍 Courses</option>
              <option value="stats" disabled={isAccountRestricted}>📊 Statistiques</option>
              <option value="tools" disabled={isAccountRestricted}>🔧 Outils</option>
              <option value="documents">📄 Documents</option>
              <option value="settings" disabled={isAccountRestricted}>⚙️ Paramètres</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
              <span className="text-xs text-muted-foreground hidden sm:inline">Naviguer</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Home Tab */}
          <TabsContent value="home">
            <FleetHome 
              fleetManager={fleetManager}
              userProfile={userProfile}
              drivers={drivers}
              clientsCount={clients.length}
              pendingInvitationsCount={invitations.filter(i => !i.used).length}
              pendingPartnershipsCount={pendingPartnershipsCount}
              pendingCoursesCount={pendingCoursesCount}
              pendingCompanyPartnershipsCount={pendingCompanyPartnershipsCount}
              onTabChange={setActiveTab}
              onViewDriverProfile={handleViewDriverProfile}
            />
          </TabsContent>

          {/* Drivers Tab - Now includes search */}
          <TabsContent value="drivers">
            <Tabs defaultValue="my-drivers" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="my-drivers">Mes Chauffeurs</TabsTrigger>
                <TabsTrigger value="search">Rechercher</TabsTrigger>
              </TabsList>
              
              <TabsContent value="my-drivers" className="space-y-6">
                {/* Note: Documents validation moved to Documents tab */}

                <Card className="bg-card/50 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-primary" />
                      Mes Chauffeurs
                    </CardTitle>
                    <CardDescription>
                      Cliquez sur un chauffeur pour voir son profil complet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {drivers.length === 0 ? (
                      <div className="text-center py-12">
                        <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">Aucun chauffeur pour le moment</p>
                        <Button onClick={() => setActiveTab("invitations")} className="gap-2">
                          <Send className="w-4 h-4" />
                          Inviter un chauffeur
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drivers.map((driver) => (
                          <Card 
                            key={driver.id}
                            className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer group bg-card/50"
                            onClick={() => driver.driver?.id && handleViewDriverProfile(driver.driver.id)}
                          >
                            {/* Photo */}
                            <div className="relative h-32 bg-gradient-to-br from-muted to-muted/50">
                              {driver.driver?.vehicle_photos?.[0] ? (
                                <img 
                                  src={driver.driver.vehicle_photos[0]} 
                                  alt="Véhicule" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Car className="w-12 h-12 text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute bottom-3 left-3">
                                <Avatar className="w-14 h-14 border-4 border-background shadow-xl">
                                  <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                                    {(driver.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              {driver.driver?.rating && (
                                <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                                  <Star className="w-3 h-3 text-warning fill-warning" />
                                  <span className="text-sm font-semibold">{driver.driver.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                            <CardContent className="pt-3">
                              <h3 className="font-semibold text-lg">{driver.driver?.profile?.full_name || "Chauffeur"}</h3>
                              <p className="text-sm text-muted-foreground">
                                {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <Badge variant={driver.driver?.status === "validated" ? "default" : "secondary"}>
                                  {driver.driver?.status === "validated" ? "Validé" : "En attente"}
                                </Badge>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Eye className="w-4 h-4" />
                                  Voir
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="search">
                <FleetDriverSearch fleetManagerId={fleetManager.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Driver Profile Tab */}
          <TabsContent value="driver-profile">
            {selectedDriver?.driver && (
              <Card className="bg-card/50 backdrop-blur border-white/10">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("drivers")}>
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-16 h-16 border-2 border-primary/30">
                      <AvatarImage src={selectedDriver.driver.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                        {(selectedDriver.driver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedDriver.driver.profile?.full_name || "Chauffeur"}</CardTitle>
                      <CardDescription>{selectedDriver.driver.vehicle_brand} {selectedDriver.driver.vehicle_model}</CardDescription>
                    </div>
                    {selectedDriver.driver.rating && (
                      <Badge className="ml-auto bg-warning/20 text-warning border-warning/30 gap-1">
                        <Star className="w-3 h-3 fill-warning" />
                        {selectedDriver.driver.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contact */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="font-medium">{selectedDriver.driver.profile?.email || "Non renseigné"}</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Téléphone</p>
                      <p className="font-medium">{selectedDriver.driver.profile?.phone || "Non renseigné"}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {selectedDriver.driver.bio && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Bio</p>
                      <p>{selectedDriver.driver.bio}</p>
                    </div>
                  )}

                  {/* Services */}
                  {selectedDriver.driver.services_offered && selectedDriver.driver.services_offered.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Services proposés</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDriver.driver.services_offered.map((service, i) => (
                          <Badge key={i} variant="outline">{service}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos véhicule */}
                  {selectedDriver.driver.vehicle_photos && selectedDriver.driver.vehicle_photos.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Photos du véhicule</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedDriver.driver.vehicle_photos.map((photo, i) => (
                          <img 
                            key={i}
                            src={photo}
                            alt={`Véhicule ${i+1}`}
                            className="rounded-lg aspect-video object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open(`/chauffeur/${selectedDriver.driver?.id}`, '_blank')}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Voir profil public
                    </Button>
                    {selectedDriver.driver?.id && (
                      <FleetDriverRemoval
                        driverId={selectedDriver.driver.id}
                        driverName={selectedDriver.driver.profile?.full_name || "Ce chauffeur"}
                        fleetManagerId={fleetManager.id}
                        onRemoved={() => {
                          fetchData();
                          setActiveTab("drivers");
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <FleetClientsTab 
              fleetManagerId={fleetManager.id}
              clients={clients}
            />
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Tabs defaultValue="courses" className="space-y-6">
              <div className="glass-strong p-3 rounded-2xl">
                <TabsList className="grid w-full grid-cols-3 gap-2 h-auto bg-transparent p-0">
                  <TabsTrigger value="courses" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-info data-[state=active]:to-cyan-600 data-[state=active]:text-white">
                    <Route className="w-4 h-4 mr-2" />
                    Courses
                  </TabsTrigger>
                  <TabsTrigger value="devis" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Devis
                  </TabsTrigger>
                  <TabsTrigger value="factures" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Factures
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="courses" className="space-y-6">
                <FleetDeclinedCourses fleetManagerId={fleetManager.id} />
                <FleetCoursesManager
                  fleetManagerId={fleetManager.id}
                  autoValidate={fleetManager.auto_validate_courses || false}
                  onAutoValidateChange={(value) => setFleetManager({ ...fleetManager, auto_validate_courses: value })}
                />
              </TabsContent>
              
              <TabsContent value="devis">
                <FleetDevisList fleetManagerId={fleetManager.id} />
              </TabsContent>
              
              <TabsContent value="factures">
                <FleetFacturesList fleetManagerId={fleetManager.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Partenariats */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("partnerships")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-primary" />
                    Partenariats
                  </CardTitle>
                  <CardDescription>Chauffeurs indépendants et entreprises partenaires</CardDescription>
                </CardHeader>
              </Card>

              {/* Invitations */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("invitations")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-warning" />
                    Invitations
                  </CardTitle>
                  <CardDescription>Invitez des chauffeurs à rejoindre votre flotte</CardDescription>
                </CardHeader>
              </Card>

              {/* Planning */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("planning")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-info" />
                    Planning
                  </CardTitle>
                  <CardDescription>Gérez les plannings de vos chauffeurs</CardDescription>
                </CardHeader>
              </Card>

              {/* QR Code */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("qrcode")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-accent" />
                    QR Code
                  </CardTitle>
                  <CardDescription>Partagez votre QR code pour les inscriptions clients</CardDescription>
                </CardHeader>
              </Card>


              {/* Promotions */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("promotions")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-success" />
                    Promotions
                  </CardTitle>
                  <CardDescription>Créez des codes promo et offres spéciales</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("tools")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils
              </Button>
              <FleetDriverInvitations 
                fleetManagerId={fleetManager.id}
                currentDriversCount={drivers.length}
                maxFreeDrivers={fleetManager.max_free_drivers || 10}
                onInvitationCreated={fetchData}
              />
            </div>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("tools")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils
              </Button>
              <FleetDriverPlanning fleetManagerId={fleetManager.id} />
            </div>
          </TabsContent>


          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("tools")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils
              </Button>
              <Card className="bg-card/50 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-accent" />
                    QR Code Vitrine Publique
                  </CardTitle>
                  <CardDescription>
                    Partagez ce QR code ou lien pour promouvoir votre vitrine et acquérir de nouveaux clients
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                  {qrCodeUrl && (
                    <div className="p-4 bg-white rounded-2xl shadow-xl">
                      <img src={qrCodeUrl} alt="QR Code Vitrine" className="w-64 h-64" />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={copyQrLink} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Copier le lien
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.download = "qr-code-vitrine.png";
                        link.href = qrCodeUrl;
                        link.click();
                      }}
                    >
                      Télécharger
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Ce QR code mène directement à votre vitrine publique. Utilisez-le pour votre publicité, 
                    vos cartes de visite ou pour recruter de nouveaux clients. Les clients pourront y réserver 
                    directement une course avec ou sans inscription.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab - Combined with Pricing, Public Profile and Subscription */}
          <TabsContent value="settings">
            <Tabs defaultValue="general" className="space-y-6">
              <div className="glass-strong p-3 rounded-2xl">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 h-auto bg-transparent p-0">
                  <TabsTrigger value="general" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white">
                    Général
                  </TabsTrigger>
                  <TabsTrigger value="subscription" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white">
                    Abonnement
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white">
                    Tarification
                  </TabsTrigger>
                  <TabsTrigger value="operations" className="py-3 px-2 rounded-xl text-xs sm:text-sm data-[state=active]:bg-gradient-to-br data-[state=active]:from-info data-[state=active]:to-cyan-600 data-[state=active]:text-white">
                    Gestion Dispatch
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="general">
                <div className="space-y-6">
                  {/* Public Profile Settings - now merged with general */}
                  <FleetPublicProfileSettings
                    fleetManagerId={fleetManager.id}
                    companyName={fleetManager.company_name}
                    showDriversInPublic={fleetManager.show_drivers_in_public_storefront}
                    servicesOffered={fleetManager.services_offered}
                    onUpdate={fetchData}
                  />
                </div>
              </TabsContent>
              <TabsContent value="subscription">
                <FleetSubscriptionManager 
                  fleetManagerId={fleetManager.id}
                  onSubscriptionChange={fetchData}
                />
              </TabsContent>
              <TabsContent value="pricing">
                <FleetPricingHub fleetManagerId={fleetManager.id} />
              </TabsContent>
              <TabsContent value="operations">
                <FleetDispatchSettings fleetManagerId={fleetManager.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <FleetStatisticsComplete fleetManagerId={fleetManager.id} />
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("tools")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils
              </Button>
              <FleetPartnershipsHub 
                fleetManagerId={fleetManager.id}
                fleetManagerProfile={{
                  company_name: fleetManager.company_name,
                  contact_name: fleetManager.contact_name,
                  services_offered: fleetManager.services_offered || [],
                  total_drivers: drivers.length
                }}
                defaultCommission={10}
              />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <FleetDocumentsHub 
              fleetManagerId={fleetManager.id}
              userId={user?.id || ""}
              onDocumentsSubmitted={fetchData}
            />
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions">
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("tools")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour aux outils
              </Button>
              <FleetPromotions fleetManagerId={fleetManager.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FleetManagerDashboard;
