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
import { FleetPricingSettings } from "@/components/fleet-manager/FleetPricingSettings";
import { CityPricingManager } from "@/components/shared/CityPricingManager";
import { FleetDriverCommissions } from "@/components/fleet-manager/FleetDriverCommissions";
import { FleetStatisticsDashboard } from "@/components/fleet-manager/FleetStatisticsDashboard";
import { FleetCommissionTracker } from "@/components/fleet-manager/FleetCommissionTracker";
import { FleetDriverPartnerships } from "@/components/fleet-manager/FleetDriverPartnerships";
import { FleetPartnerCommissions } from "@/components/fleet-manager/FleetPartnerCommissions";
import FleetPromotions from "@/components/fleet-manager/FleetPromotions";
import { FleetDriverDocumentsValidation } from "@/components/fleet-manager/FleetDriverDocumentsValidation";
import { FleetStorefrontManager } from "@/components/fleet-manager/FleetStorefrontManager";
import { FleetDeclinedCourses } from "@/components/fleet-manager/FleetDeclinedCourses";
import { FleetDispatchSettings } from "@/components/fleet-manager/FleetDispatchSettings";
import { FleetDriverRemoval } from "@/components/fleet-manager/FleetDriverRemoval";
import { FleetClientInvitations } from "@/components/fleet-manager/FleetClientInvitations";
import { FleetClientsList } from "@/components/fleet-manager/FleetClientsList";
import { FleetDriverSearch } from "@/components/fleet-manager/FleetDriverSearch";
import logoSolocab from "@/assets/logo-solocab.png";

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
    if (deadline && isPast(new Date(deadline))) {
      return true;
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

      // Fetch drivers with more details
      const { data: driversData } = await supabase
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
            services_offered
          )
        `)
        .eq("fleet_manager_id", fmData.id);

      if (driversData) {
        // Fetch profiles for drivers
        const driverUserIds = driversData
          .filter((d) => d.driver)
          .map((d) => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, profile_photo_url")
            .in("id", driverUserIds);

          const driversWithProfiles = driversData.map((d) => ({
            ...d,
            driver: d.driver
              ? {
                  ...d.driver,
                  profile: profiles?.find((p) => p.id === d.driver.user_id),
                }
              : undefined,
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(driversData);
        }
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

      // Fetch invitations
      const { data: invitationsData } = await supabase
        .from("fleet_manager_invitations")
        .select("*")
        .eq("fleet_manager_id", fmData.id)
        .order("created_at", { ascending: false });

      if (invitationsData) {
        setInvitations(invitationsData);
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
      setQrCodeUrl(qr);
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
        <p className="text-muted-foreground">Profil non trouvé</p>
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
                <span className="hidden sm:inline">Accueil</span>
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
                {fleetManager.subscription_status === "active" ? "Premium" : "Standard"}
              </Badge>
            </div>
            <Link to="/rgpd-data">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" title="Mes Données RGPD">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
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
            <AlertTitle className="text-lg font-bold">Compte temporairement restreint</AlertTitle>
            <AlertDescription className="mt-2">
              Le délai de 7 jours pour soumettre vos documents est dépassé. Veuillez envoyer vos documents ci-dessous pour débloquer l'accès complet à votre espace gestionnaire.
              <br /><br />
              <span className="text-sm opacity-80">
                Une fois vos documents soumis, vous retrouverez l'accès à toutes les fonctionnalités en attendant la validation par notre équipe.
              </span>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(tab) => {
          // Si compte restreint, seul l'onglet documents est accessible
          if (isAccountRestricted && tab !== "documents") {
            toast.error("Veuillez d'abord soumettre vos documents pour accéder à cette fonctionnalité");
            return;
          }
          setActiveTab(tab);
        }} className="space-y-6">
          {/* Navigation Tabs - Design moderne et fluide */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent rounded-2xl blur-xl" />
            <TabsList className="relative w-full bg-card/80 backdrop-blur-xl flex flex-wrap justify-start gap-1 h-auto p-2 shadow-xl border border-white/10 rounded-2xl overflow-x-auto">
              <TabsTrigger 
                value="home" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </TabsTrigger>
              <TabsTrigger 
                value="drivers" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Car className="w-4 h-4" />
                <span className="hidden sm:inline">Chauffeurs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="driver-search" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Recherche</span>
              </TabsTrigger>
              <TabsTrigger 
                value="clients" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Clients</span>
              </TabsTrigger>
              <TabsTrigger 
                value="courses" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-info data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Route className="w-4 h-4" />
                <span className="hidden sm:inline">Courses</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Statistiques</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tools" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Outils</span>
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-premium data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Abonnement</span>
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse' : 'hover:bg-muted/50'}`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                disabled={isAccountRestricted}
                className={`relative gap-2 text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 ${isAccountRestricted ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50'}`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Paramètres</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Home Tab */}
          <TabsContent value="home">
            <FleetHome 
              fleetManager={fleetManager}
              userProfile={userProfile}
              drivers={drivers}
              clientsCount={clients.length}
              pendingInvitationsCount={invitations.filter(i => !i.used).length}
              onTabChange={setActiveTab}
              onViewDriverProfile={handleViewDriverProfile}
            />
          </TabsContent>

          {/* Drivers Tab */}
          <TabsContent value="drivers">
            <div className="space-y-6">
              {/* Documents Validation Section */}
              <FleetDriverDocumentsValidation fleetManagerId={fleetManager.id} />

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
            </div>
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
            <div className="space-y-6">
              {/* Section Invitations Clients */}
              <FleetClientInvitations fleetManagerId={fleetManager.id} />

              {/* Liste des clients avec filtres avancés */}
              <FleetClientsList clients={clients} />
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <div className="space-y-6">
              <FleetDeclinedCourses fleetManagerId={fleetManager.id} />
              <FleetCoursesManager
                fleetManagerId={fleetManager.id}
                autoValidate={fleetManager.auto_validate_courses || false}
                onAutoValidateChange={(value) => setFleetManager({ ...fleetManager, auto_validate_courses: value })}
              />
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Statistiques */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("stats")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-success" />
                    Statistiques
                  </CardTitle>
                  <CardDescription>Analysez les performances de votre flotte</CardDescription>
                </CardHeader>
              </Card>

              {/* Partenariats */}
              <Card className="bg-card/50 backdrop-blur border-white/10 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setActiveTab("partnerships")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-primary" />
                    Partenariats
                  </CardTitle>
                  <CardDescription>Collaborez avec des chauffeurs indépendants</CardDescription>
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
            <FleetDriverInvitations 
              fleetManagerId={fleetManager.id}
              currentDriversCount={drivers.length}
              maxFreeDrivers={fleetManager.max_free_drivers || 10}
              onInvitationCreated={fetchData}
            />
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning">
            <FleetDriverPlanning fleetManagerId={fleetManager.id} />
          </TabsContent>


          {/* QR Code Tab */}
          <TabsContent value="qrcode">
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
          </TabsContent>

          {/* Settings Tab - Combined with Pricing and Public Profile */}
          <TabsContent value="settings">
            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="general">Général & Profil</TabsTrigger>
                <TabsTrigger value="pricing">Tarification</TabsTrigger>
                <TabsTrigger value="city-pricing">Tarifs par ville</TabsTrigger>
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
                <TabsTrigger value="dispatch">Dispatch auto</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <div className="space-y-6">
                  {/* Public Profile Settings - now merged with general */}
                  <FleetPublicProfileSettings
                    fleetManagerId={fleetManager.id}
                    companyName={fleetManager.company_name}
                    showDriversInPublic={fleetManager.show_drivers_in_public_storefront}
                    onUpdate={fetchData}
                  />
                </div>
              </TabsContent>
              <TabsContent value="pricing">
                <FleetPricingSettings fleetManagerId={fleetManager.id} />
              </TabsContent>
              <TabsContent value="city-pricing">
                <CityPricingManager fleetManagerId={fleetManager.id} />
              </TabsContent>
              <TabsContent value="commissions">
                <div className="space-y-6">
                  <FleetDriverCommissions fleetManagerId={fleetManager.id} />
                  <FleetCommissionTracker fleetManagerId={fleetManager.id} />
                </div>
              </TabsContent>
              <TabsContent value="dispatch">
                <FleetDispatchSettings fleetManagerId={fleetManager.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <FleetStatisticsDashboard fleetManagerId={fleetManager.id} />
          </TabsContent>

          {/* Partnerships Tab - Now includes driver search */}
          <TabsContent value="partnerships">
            <Tabs defaultValue="search" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="search">Rechercher</TabsTrigger>
                <TabsTrigger value="partnerships">Partenariats</TabsTrigger>
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
              </TabsList>
              <TabsContent value="search">
                <FleetDriverSearch fleetManagerId={fleetManager.id} />
              </TabsContent>
              <TabsContent value="partnerships">
                <FleetDriverPartnerships 
                  fleetManagerId={fleetManager.id}
                  defaultCommission={10}
                />
              </TabsContent>
              <TabsContent value="commissions">
                <FleetPartnerCommissions fleetManagerId={fleetManager.id} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="subscription">
            <FleetSubscriptionManager 
              fleetManagerId={fleetManager.id}
              onSubscriptionChange={fetchData}
            />
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
            <FleetPromotions fleetManagerId={fleetManager.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FleetManagerDashboard;
