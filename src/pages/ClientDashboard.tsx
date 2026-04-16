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
  CreditCard,
  Settings,
  ChevronLeft,
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
import { RatingDisputeResponseCard } from "@/components/client/RatingDisputeResponseCard";
import ClientFacturesList from "@/components/client/ClientFacturesList";
import { FavoriteDriverSection } from "@/components/client/FavoriteDriverSection";
import { DriverSelectionDialog } from "@/components/client/DriverSelectionDialog";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { ClientHomeView } from "@/components/client/ClientHomeView";
import { ClientDriversGrid } from "@/components/client/ClientDriversGrid";
import { NoDriversBanner } from "@/components/client/NoDriversBanner";
import ClientQRScannerInApp from "@/components/client/ClientQRScannerInApp";
import { ClientCardManager } from "@/components/client/ClientCardManager";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { cn } from "@/lib/utils";

const ClientDashboard = () => {
  const { signOut, user, userRole } = useAuth();
  const { t } = useLocale();
  useUserLanguage();
  const navigate = useNavigate();

  // SÉCURITÉ: Double vérification du rôle
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

      const cardStatus = searchParams.get("card");
      if (cardStatus === "success") {
        toast.success("Carte enregistrée avec succès.");
        setSearchParams({});
      } else if (cardStatus === "cancelled") {
        toast.error("L'enregistrement de la carte a été annulé.");
        setSearchParams({});
      }
      
      const tabParam = searchParams.get("tab");
      const subtabParam = searchParams.get("subtab");
      
      if (tabParam) {
        const tabMapping: Record<string, string> = {
          "finances": "factures",
          "devis": "factures",
          "factures": "factures",
          "courses": "courses",
          "messages": "messages",
        };
        
        const mappedTab = tabMapping[tabParam] || tabParam;
        setActiveTab(mappedTab);
        
        if (subtabParam) {
          if (mappedTab === "factures") {
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
    if (tab === "factures") {
      setDevisFacturesSubTab(subTab || null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">{t('clientDashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const isExclusive = clientProfile?.client?.is_exclusive;

  // Bottom nav items for mobile
  const bottomNavItems = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "courses", label: "Courses", icon: Clock },
    { id: "chauffeurs", label: isExclusive ? "Chauffeur" : "Chauffeurs", icon: Users },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "more", label: "Plus", icon: Menu },
  ];

  // Side menu items (desktop + mobile "more" sheet)
  const sideMenuItems = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "courses", label: "Mes courses", icon: Clock },
    { id: "chauffeurs", label: isExclusive ? "Mon chauffeur" : "Mes chauffeurs", icon: Users },
    { id: "factures", label: "Factures", icon: FileText },
    { id: "paiement", label: "Paiement", icon: CreditCard },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "compte", label: "Mon compte", icon: User },
  ];

  const getPageTitle = (): string => {
    if (activeTab === "accueil") {
      const firstName = clientProfile?.full_name?.split(" ")[0] || "Client";
      return `Bonjour, ${firstName}`;
    }
    const item = sideMenuItems.find(m => m.id === activeTab);
    if (item) return item.label;
    if (activeTab === "scan-qr") return "Scanner QR";
    return "Dashboard";
  };

  const renderNavigation = () => (
    <nav className="space-y-0.5 flex-1">
      {sideMenuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left text-sm",
              activeTab === item.id
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
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
          <div className="space-y-4">
            <RatingDisputeResponseCard />
            <ClientHomeView
              clientProfile={clientProfile}
              stats={stats}
              onNewReservation={handleNewReservation}
              onNavigate={handleTabChange}
              onViewFavoriteDriver={() => handleTabChange("chauffeurs")}
            />
          </div>
        );
      case "courses":
        return clientProfile?.client?.id ? (
          <ClientCoursesList 
            clientId={clientProfile.client.id} 
            userId={user?.id}
            exclusiveDriverId={clientProfile?.client?.is_exclusive ? clientProfile?.client?.driver_id : null}
            userEmail={clientProfile?.email}
            userPhone={clientProfile?.phone}
            defaultTab={coursesSubTab} 
          />
        ) : null;
      case "factures":
        return clientProfile?.client?.id ? (
          <ClientFacturesList clientId={clientProfile.client.id} />
        ) : null;
      case "messages":
        return <MessagingInterface />;
      case "notes":
        return (
          <div className="space-y-4">
            <RatingDisputeResponseCard />
            <ClientNotes />
          </div>
        );
      case "chauffeurs":
        const hasNoDrivers = !isExclusive && 
          (!clientProfile?.client?.driver_ids || clientProfile.client.driver_ids.length === 0);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold">
                {isExclusive ? "Mon chauffeur" : "Mes chauffeurs"}
              </h2>
              {!isExclusive && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTabChange("scan-qr")}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Scanner
                  </Button>
                  <Button
                    onClick={() => navigate("/chauffeurs")}
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Search className="w-3.5 h-3.5" />
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
                  <TabsList className="grid w-full grid-cols-2 mb-3 h-9">
                    <TabsTrigger value="active" className="gap-1.5 text-xs">
                      <Users className="w-3.5 h-3.5" />
                      Actifs
                    </TabsTrigger>
                    <TabsTrigger value="blocked" className="gap-1.5 text-xs">
                      <ShieldOff className="w-3.5 h-3.5" />
                      Bloqués ({blockedDriversCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    <ClientDriversGrid
                      clientId={clientProfile.client.id}
                      driverIds={isExclusive ? 
                        (clientProfile.client.driver_id ? [clientProfile.client.driver_id] : []) : 
                        (clientProfile.client.driver_ids || [])}
                      favoriteDriverId={clientProfile.client.favorite_driver_id}
                      isExclusive={isExclusive}
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
      case "paiement":
        return <ClientCardManager />;
      case "compte":
        return <ClientProfile />;
      case "scan-qr":
        return (
          <ClientQRScannerInApp 
            onDriverAdded={() => {
              handleTabChange("chauffeurs");
              window.location.reload();
            }} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card/50 p-3 flex-col">
        <div className="mb-6 px-2">
          <div className="flex items-center gap-2.5 mb-1">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
            <span className="font-bold text-sm text-foreground">SoloCab</span>
          </div>
          <p className="text-[11px] text-muted-foreground ml-[50px]">Espace client</p>
        </div>
        {renderNavigation()}
        <div className="border-t border-border pt-3 mt-3 space-y-1">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile "More" Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <div className="pt-2 pb-4">
            <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-6" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "factures", label: "Factures", icon: FileText },
                { id: "paiement", label: "Paiement", icon: CreditCard },
                { id: "notes", label: "Notes", icon: StickyNote },
                { id: "compte", label: "Mon compte", icon: User },
                ...(!isExclusive ? [{ id: "scan-qr" as const, label: "Scanner QR", icon: QrCode }] : []),
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                      activeTab === item.id
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={signOut}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[11px] font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {activeTab !== "accueil" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTabChange("accueil")}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              {activeTab === "accueil" && (
                <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain md:hidden flex-shrink-0" />
              )}
              <h1 className="text-base font-bold truncate">
                {getPageTitle()}
              </h1>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <LanguageSelector variant="header" />
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 hidden md:flex">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === "more" 
              ? mobileMenuOpen 
              : activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "more") {
                    setMobileMenuOpen(true);
                  } else {
                    handleTabChange(item.id);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-all min-w-0 flex-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className={cn(
                  "text-[10px] font-medium truncate",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

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
    return <p className="text-center text-muted-foreground py-8 text-sm">Chargement...</p>;
  }

  if (blockedDrivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ShieldOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Aucun chauffeur bloqué</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {blockedDrivers.map((driver) => (
        <Card key={driver.id} className="p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {driver.profiles?.profile_photo_url ? (
              <img
                src={driver.profiles.profile_photo_url}
                alt={getDisplayName(driver)}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{getDisplayName(driver)}</p>
            {driver.block_reason && (
              <p className="text-[11px] text-muted-foreground truncate">{driver.block_reason}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => handleUnblock(driver.block_id)} className="h-8 text-xs flex-shrink-0">
            Débloquer
          </Button>
        </Card>
      ))}
    </div>
  );
}

export default ClientDashboard;
