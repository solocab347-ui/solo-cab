import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/logo-solocab.png";
import { 
  LogOut, 
  Home,
  Clock,
  FileText,
  MessageSquare,
  StickyNote,
  Users,
  User,
  Menu,
  ArrowLeft,
  Car,
  ShieldOff,
  Search,
  QrCode,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ClientCoursesList from "@/components/client/ClientCoursesList";
import ClientProfile from "@/components/client/ClientProfile";
import ClientNotes from "@/components/client/ClientNotes";
import ClientDevisFactures from "@/components/client/ClientDevisFactures";
import { FavoriteDriverSection } from "@/components/client/FavoriteDriverSection";
import { DriverSelectionDialog } from "@/components/client/DriverSelectionDialog";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { ClientHomeView } from "@/components/client/ClientHomeView";
import { ClientDriversGrid } from "@/components/client/ClientDriversGrid";
import { NoDriversBanner } from "@/components/client/NoDriversBanner";
import ClientQRScannerInApp from "@/components/client/ClientQRScannerInApp";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { cn } from "@/lib/utils";

const ClientDashboard = () => {
  const { signOut, user, userRole } = useAuth();
  const { t } = useLocale();
  useUserLanguage();
  const navigate = useNavigate();

  // SÉCURITÉ: Double vérification du rôle pour éviter les mélanges de dashboard
  useEffect(() => {
    if (userRole && userRole !== "client") {
      console.warn("ClientDashboard: wrong role detected, redirecting", userRole);
      const redirectMap: Record<string, string> = {
        admin: "/admin-dashboard",
        driver: "/driver-dashboard",
      };
      navigate(redirectMap[userRole] || "/login", { replace: true });
    }
  }, [userRole, navigate]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accueil");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coursesSubTab, setCoursesSubTab] = useState<string | null>(null);
  const [devisFacturesSubTab, setDevisFacturesSubTab] = useState<string | null>(null);
  const [showDriverSelection, setShowDriverSelection] = useState(false);
  const [blockedDriversCount, setBlockedDriversCount] = useState(0);
  const [stats, setStats] = useState({
    upcomingCourses: 0,
    pendingDevis: 0,
    unpaidInvoices: 0,
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      await Promise.all([
        fetchClientProfile(),
        fetchStats()
      ]);
      
      const paymentStatus = searchParams.get("payment");
      if (paymentStatus === "success") {
        toast.success(t('clientDashboard.paymentConfirmed'));
        setSearchParams({});
      } else if (paymentStatus === "cancelled") {
        toast.error(t('clientDashboard.paymentCancelled'));
        setSearchParams({});
      }
      
      const tabParam = searchParams.get("tab");
      const subtabParam = searchParams.get("subtab");
      
      if (tabParam) {
        const tabMapping: Record<string, string> = {
          "finances": "devis-factures",
          "devis": "devis-factures",
          "factures": "devis-factures",
          "courses": "courses",
          "messages": "messages",
        };
        
        const mappedTab = tabMapping[tabParam] || tabParam;
        setActiveTab(mappedTab);
        
        if (subtabParam) {
          if (mappedTab === "devis-factures") {
            setDevisFacturesSubTab(subtabParam);
          } else if (mappedTab === "courses") {
            setCoursesSubTab(subtabParam);
          }
        }
        
        setSearchParams({});
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) return;

      const [upcomingResult, pendingDevisData, unpaidResult, blockedResult] = await Promise.all([
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("status", "accepted")
          .gte("scheduled_date", new Date().toISOString()),
        supabase
          .from("devis")
          .select(`id, valid_until, courses!inner(status)`)
          .eq("client_id", client.id)
          .eq("status", "pending")
          .gte("valid_until", new Date().toISOString())
          .neq("courses.status", "cancelled"),
        supabase
          .from("factures")
          .select("*", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("payment_status", "pending"),
        supabase
          .from("client_driver_blocks")
          .select("id", { count: "exact", head: true })
          .eq("client_id", client.id)
          .eq("blocked_by", "client"),
      ]);

      setStats({
        upcomingCourses: upcomingResult.count || 0,
        pendingDevis: pendingDevisData.data?.length || 0,
        unpaidInvoices: unpaidResult.count || 0,
      });
      setBlockedDriversCount(blockedResult.count || 0);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchClientProfile = async () => {
    if (!user) return;

    try {
      const [profileResult, clientResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("clients")
          .select(`
            *,
            drivers:favorite_driver_id(
              id,
              company_name,
              vehicle_model,
              vehicle_brand,
              vehicle_color,
              rating,
              display_driver_name,
              display_company_name,
              show_rating_public,
              show_phone,
              is_pioneer,
              profiles:user_id(full_name, profile_photo_url, phone)
            )
          `)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (clientResult.data) {
        setClientProfile({ ...profileResult.data, client: clientResult.data });
      }
    } catch (error: any) {
      console.error("Error fetching client profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleNewReservation = () => {
    if (clientProfile?.client?.is_exclusive && clientProfile?.client?.driver_id) {
      navigate(`/create-course?driver_id=${clientProfile.client.driver_id}`);
      return;
    }
    
    const driverIds = clientProfile?.client?.driver_ids || [];
    
    if (driverIds.length === 1) {
      navigate(`/create-course?driver_id=${driverIds[0]}`);
    } else if (driverIds.length > 1) {
      setShowDriverSelection(true);
    } else {
      navigate("/chauffeurs");
    }
  };

  const handleDriverSelected = (driverId: string) => {
    navigate(`/create-course?driver_id=${driverId}`);
  };

  const handleTabChange = (tab: string, subTab?: string | null) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    
    if (tab === "courses") {
      setCoursesSubTab(subTab || null);
    }
    if (tab === "devis-factures") {
      setDevisFacturesSubTab(subTab || null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t('clientDashboard.loading')}</p>
      </div>
    );
  }

  const menuItems = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "courses", label: "Mes courses", icon: Clock },
    { id: "chauffeurs", label: clientProfile?.client?.is_exclusive ? "Mon chauffeur" : "Mes chauffeurs", icon: Users },
    { id: "devis-factures", label: "Devis & Factures", icon: FileText },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "compte", label: "Mon compte", icon: User },
  ];

  const renderNavigation = () => (
    <nav className="space-y-1 flex-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
              activeTab === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "accueil":
        return (
          <ClientHomeView
            clientProfile={clientProfile}
            stats={stats}
            onNewReservation={handleNewReservation}
            onNavigate={handleTabChange}
            onViewFavoriteDriver={() => handleTabChange("chauffeurs")}
          />
        );
      case "courses":
        return clientProfile?.client?.id ? (
          <ClientCoursesList clientId={clientProfile.client.id} defaultTab={coursesSubTab} />
        ) : null;
      case "devis-factures":
        return clientProfile?.client?.id ? (
          <ClientDevisFactures clientId={clientProfile.client.id} defaultTab={devisFacturesSubTab} />
        ) : null;
      case "messages":
        return <MessagingInterface />;
      case "notes":
        return <ClientNotes />;
      case "chauffeurs":
        const hasNoDrivers = !clientProfile?.client?.is_exclusive && 
          (!clientProfile?.client?.driver_ids || clientProfile.client.driver_ids.length === 0);
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold">
                {clientProfile?.client?.is_exclusive ? "Mon chauffeur" : "Mes chauffeurs"}
              </h2>
              {!clientProfile?.client?.is_exclusive && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTabChange("scan-qr")}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Scanner QR
                  </Button>
                  <Button
                    onClick={() => navigate("/chauffeurs")}
                    size="sm"
                    className="gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Rechercher
                  </Button>
                </div>
              )}
            </div>

            {hasNoDrivers ? (
              <NoDriversBanner variant="full" />
            ) : (
              clientProfile?.client?.id && (
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="active" className="gap-2">
                      <Users className="w-4 h-4" />
                      Actifs
                    </TabsTrigger>
                    <TabsTrigger value="blocked" className="gap-2">
                      <ShieldOff className="w-4 h-4" />
                      Bloqués ({blockedDriversCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    <ClientDriversGrid
                      clientId={clientProfile.client.id}
                      driverIds={clientProfile?.client?.is_exclusive ? 
                        (clientProfile.client.driver_id ? [clientProfile.client.driver_id] : []) : 
                        (clientProfile.client.driver_ids || [])}
                      favoriteDriverId={clientProfile.client.favorite_driver_id}
                      isExclusive={clientProfile?.client?.is_exclusive}
                      onRefresh={fetchClientProfile}
                    />
                  </TabsContent>

                  <TabsContent value="blocked">
                    <BlockedDriversList 
                      clientId={clientProfile.client.id} 
                      onRefresh={() => {
                        fetchClientProfile();
                        fetchStats();
                      }}
                    />
                  </TabsContent>
                </Tabs>
              )
            )}
          </div>
        );
      case "compte":
        return <ClientProfile />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 p-4 flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">Espace client</p>
        </div>
        {renderNavigation()}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">Espace client</p>
          </div>
          {renderNavigation()}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {activeTab !== "accueil" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTabChange("accueil")}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour</span>
                </Button>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <h1 className="text-lg font-bold truncate">
                {activeTab === "accueil" 
                  ? `Bonjour, ${clientProfile?.full_name?.split(" ")[0] || "Client"}`
                  : menuItems.find(m => m.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSelector variant="header" />
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Driver Selection Dialog */}
      <DriverSelectionDialog
        open={showDriverSelection}
        onOpenChange={setShowDriverSelection}
        driverIds={clientProfile?.client?.driver_ids || []}
        favoriteDriverId={clientProfile?.client?.favorite_driver_id}
        onSelectDriver={handleDriverSelected}
      />

      {/* Feedback Widget */}
      <FeedbackWidget 
        userType="client"
        userName={clientProfile?.full_name}
        userEmail={clientProfile?.email}
      />
    </div>
  );
};

// Blocked Drivers List Component
function BlockedDriversList({ clientId, onRefresh }: { clientId: string; onRefresh: () => void }) {
  const [blockedDrivers, setBlockedDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedDrivers();
  }, [clientId]);

  const fetchBlockedDrivers = async () => {
    try {
      const { data: blocks } = await supabase
        .from("client_driver_blocks")
        .select("id, driver_id, block_reason, created_at")
        .eq("client_id", clientId)
        .eq("blocked_by", "client");

      if (blocks && blocks.length > 0) {
        const driverIds = blocks.map((b) => b.driver_id);
        const { data: drivers } = await supabase
          .from("drivers")
          .select(`
            id,
            company_name,
            display_driver_name,
            display_company_name,
            profiles:user_id(full_name, profile_photo_url)
          `)
          .in("id", driverIds);

        if (drivers) {
          const merged = drivers.map((driver) => {
            const block = blocks.find((b) => b.driver_id === driver.id);
            return { ...driver, block_id: block?.id, block_reason: block?.block_reason };
          });
          setBlockedDrivers(merged);
        }
      } else {
        setBlockedDrivers([]);
      }
    } catch (error) {
      console.error("Error fetching blocked drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    try {
      await supabase.from("client_driver_blocks").delete().eq("id", blockId);
      toast.success("Chauffeur débloqué");
      fetchBlockedDrivers();
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors du déblocage");
    }
  };

  const getDisplayName = (driver: any): string => {
    if (driver.display_driver_name && driver.profiles?.full_name) {
      return driver.profiles.full_name;
    }
    if (driver.display_company_name && driver.company_name) {
      return driver.company_name;
    }
    return driver.profiles?.full_name || "Chauffeur VTC";
  };

  if (loading) {
    return <p className="text-center text-muted-foreground py-8">Chargement...</p>;
  }

  if (blockedDrivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ShieldOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Aucun chauffeur bloqué</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {blockedDrivers.map((driver) => (
        <Card key={driver.id} className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {driver.profiles?.profile_photo_url ? (
              <img
                src={driver.profiles.profile_photo_url}
                alt={getDisplayName(driver)}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{getDisplayName(driver)}</p>
            {driver.block_reason && (
              <p className="text-xs text-muted-foreground">{driver.block_reason}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => handleUnblock(driver.block_id)}>
            Débloquer
          </Button>
        </Card>
      ))}
    </div>
  );
}

export default ClientDashboard;
