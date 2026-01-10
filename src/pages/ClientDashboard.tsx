import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "@/assets/logo-solocab.png";
import { 
  Car, 
  LogOut, 
  Plus, 
  FileText, 
  MessageSquare, 
  Home,
  Clock,
  StickyNote,
  Users,
  QrCode,
  User,
  Sparkles,
  Menu,
  Share2
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { NavigationHeader } from "@/components/NavigationHeader";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ClientCoursesList from "@/components/client/ClientCoursesList";
import ClientProfile from "@/components/client/ClientProfile";
import ClientNotes from "@/components/client/ClientNotes";
import ClientDriversWithProfile from "@/components/client/ClientDriversWithProfile";
import ClientQRScanner from "@/components/client/ClientQRScanner";
import ClientDevisFactures from "@/components/client/ClientDevisFactures";
import ClientDriverProfile from "@/components/client/ClientDriverProfile";
import { FavoriteDriverSection } from "@/components/client/FavoriteDriverSection";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import ShareButtons from "@/components/ShareButtons";
import { cn } from "@/lib/utils";

const ClientDashboard = () => {
  const { signOut, user } = useAuth();
  const { t } = useLocale();
  useUserLanguage(); // Sync language with user profile
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accueil");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [coursesSubTab, setCoursesSubTab] = useState<string | null>(null);
  const [devisFacturesSubTab, setDevisFacturesSubTab] = useState<string | null>(null);
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
      
      // Check for payment success
      const paymentStatus = searchParams.get("payment");
      if (paymentStatus === "success") {
        toast.success(t('clientDashboard.paymentConfirmed'));
        setSearchParams({});
      } else if (paymentStatus === "cancelled") {
        toast.error(t('clientDashboard.paymentCancelled'));
        setSearchParams({});
      }
      
      // Gérer la navigation par URL (depuis les notifications)
      const tabParam = searchParams.get("tab");
      const subtabParam = searchParams.get("subtab");
      
      if (tabParam) {
        // Mapper les noms d'onglets depuis les URLs
        const tabMapping: Record<string, string> = {
          "finances": "devis-factures",
          "devis": "devis-factures",
          "factures": "devis-factures",
          "courses": "courses",
          "messages": "messages",
        };
        
        const mappedTab = tabMapping[tabParam] || tabParam;
        setActiveTab(mappedTab);
        
        // Gérer le sous-onglet
        if (subtabParam) {
          if (mappedTab === "devis-factures") {
            setDevisFacturesSubTab(subtabParam);
          } else if (mappedTab === "courses") {
            setCoursesSubTab(subtabParam);
          }
        }
        
        // Nettoyer les paramètres URL
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

      // Courses confirmées à venir (status "accepted" uniquement, pas "pending")
      const { count: upcomingCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "accepted")
        .gte("scheduled_date", new Date().toISOString());

      // Devis en attente : status "pending", non expiré, et course non annulée
      const { data: pendingDevisData } = await supabase
        .from("devis")
        .select(`
          id,
          valid_until,
          courses!inner(status)
        `)
        .eq("client_id", client.id)
        .eq("status", "pending")
        .gte("valid_until", new Date().toISOString())
        .neq("courses.status", "cancelled");

      // Unpaid invoices
      const { count: unpaidCount } = await supabase
        .from("factures")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("payment_status", "pending");

      setStats({
        upcomingCourses: upcomingCount || 0,
        pendingDevis: pendingDevisData?.length || 0,
        unpaidInvoices: unpaidCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchClientProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: client } = await supabase
        .from("clients")
        .select(`
          *,
          drivers:driver_id(
            id,
            company_name,
            vehicle_model,
            profiles:user_id(full_name, profile_photo_url)
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (client) {
        setClientProfile({ ...profile, client });
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
    } else {
      navigate("/chauffeurs");
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
    { id: "accueil", label: t('clientDashboard.menu.home'), icon: Home },
    { id: "courses", label: t('clientDashboard.menu.rides'), icon: Clock },
    { id: "devis-factures", label: t('clientDashboard.menu.quotesInvoices'), icon: FileText },
    { id: "messages", label: t('clientDashboard.menu.messages'), icon: MessageSquare },
    { id: "notes", label: t('clientDashboard.menu.notes'), icon: StickyNote },
    { 
      id: "chauffeurs", 
      label: clientProfile?.client?.is_exclusive ? t('clientDashboard.menu.myDriver') : t('clientDashboard.menu.myDrivers'), 
      icon: Users, 
      hideForExclusive: false 
    },
    { id: "scanner", label: t('clientDashboard.menu.scanQR'), icon: QrCode, hideForExclusive: true },
    { id: "vitrine", label: t('clientDashboard.menu.publicShowcase'), icon: Car, isLink: true, path: "/chauffeurs", hideForExclusive: true },
    { id: "compte", label: t('clientDashboard.menu.myAccount'), icon: User },
    { id: "rgpd", label: t('clientDashboard.menu.myData'), icon: Sparkles, isLink: true, path: "/rgpd-data" },
  ];

  const renderNavigation = () => (
    <nav className="space-y-1 flex-1">
      {menuItems
        .filter((item) => {
          // Hide scanner and vitrine for exclusive clients
          if (item.hideForExclusive && clientProfile?.client?.is_exclusive) {
            return false;
          }
          return true;
        })
        .map((item) => {
          const Icon = item.icon;
          
          // If it's a link (RGPD), navigate directly
          if (item.isLink && item.path) {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                  "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                activeTab === item.id
                  ? "bg-orange-500/10 text-orange-500 font-medium"
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

  const handleTabChange = (tab: string, subTab?: string | null) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    
    if (tab === "courses" && subTab) {
      setCoursesSubTab(subTab);
    } else if (tab === "courses") {
      setCoursesSubTab(null);
    }
    
    if (tab === "devis-factures" && subTab) {
      setDevisFacturesSubTab(subTab);
    } else if (tab === "devis-factures") {
      setDevisFacturesSubTab(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "accueil":
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="p-4 md:p-6 bg-gradient-to-br from-blue-500 to-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTabChange("courses", "confirmed")}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
                  <h3 className="text-sm md:text-lg font-semibold text-white">{t('clientDashboard.stats.upcomingRides')}</h3>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white">{stats.upcomingCourses}</p>
              </Card>

              <Card 
                className="p-4 md:p-6 bg-gradient-to-br from-orange-500 to-orange-600 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTabChange("courses", "pending")}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
                  <h3 className="text-sm md:text-lg font-semibold text-white">{t('clientDashboard.stats.pendingQuotes')}</h3>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.pendingDevis}</p>
              </Card>

              <Card 
                className="p-4 md:p-6 bg-gradient-to-br from-green-500 to-green-600 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTabChange("devis-factures", "factures")}
              >
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
                  <h3 className="text-sm md:text-lg font-semibold text-white">{t('clientDashboard.stats.unpaidInvoices')}</h3>
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white">{stats.unpaidInvoices}</p>
              </Card>
            </div>

            {/* Section chauffeur favori pour les clients FREE */}
            {!clientProfile?.client?.is_exclusive && clientProfile?.client?.driver_ids?.length > 0 && (
              <FavoriteDriverSection
                clientId={clientProfile.client.id}
                favoriteDriverId={clientProfile.client.favorite_driver_id}
                driverIds={clientProfile.client.driver_ids}
                onFavoriteChange={fetchClientProfile}
              />
            )}

            {/* Section chauffeur exclusif */}
            {clientProfile?.client?.is_exclusive && clientProfile?.client?.drivers && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold">{t('clientDashboard.myDriver')}</h2>
                  <ShareButtons
                    title={`Découvrez ${clientProfile.client.drivers.profiles?.full_name || "mon chauffeur"} sur SoloCab`}
                    message={`Je vous recommande mon chauffeur VTC ${clientProfile.client.drivers.profiles?.full_name || ""} sur SoloCab ! Un service de qualité, ponctuel et professionnel. 🚗✨`}
                    url={`${window.location.origin}/chauffeur/${clientProfile.client.driver_id}`}
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {clientProfile.client.drivers.profiles?.profile_photo_url ? (
                    <img
                      src={clientProfile.client.drivers.profiles.profile_photo_url}
                      alt={clientProfile.client.drivers.profiles.full_name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Car className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{t('clientDashboard.privateDriver')}</p>
                    <h3 className="font-bold text-lg md:text-xl mb-2">
                      {clientProfile.client.drivers.profiles?.full_name || t('clientDashboard.myDriver')}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTabChange("chauffeurs")}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t('clientDashboard.viewProfile')}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );
      case "courses":
        return clientProfile?.client?.id ? (
          <ClientCoursesList 
            clientId={clientProfile.client.id} 
            defaultTab={coursesSubTab}
          />
        ) : null;
      case "devis-factures":
        return clientProfile?.client?.id ? (
          <ClientDevisFactures 
            clientId={clientProfile.client.id}
            defaultTab={devisFacturesSubTab}
          />
        ) : null;
      case "messages":
        return <MessagingInterface />;
      case "notes":
        return <ClientNotes />;
      case "chauffeurs":
        return <ClientDriversWithProfile onViewProfile={() => handleTabChange("profil-chauffeur")} />;
      case "profil-chauffeur":
        return <ClientDriverProfile />;
      case "compte":
        return <ClientProfile />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 p-4 flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">{t('clientDashboard.navigation')}</p>
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
            <p className="text-sm text-muted-foreground">{t('clientDashboard.navigation')}</p>
          </div>
          {renderNavigation()}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-2">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden flex-shrink-0"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              {activeTab !== "accueil" && (
                <NavigationHeader 
                  showBack={false}
                  showHome={true}
                  homeRoute="/client-dashboard"
                  onBack={() => handleTabChange("accueil")}
                  className="hidden sm:flex"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2 truncate">
                {t('clientDashboard.hello')}, {clientProfile?.full_name?.split(" ")[0] || "Client"}
                <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-yellow-500 flex-shrink-0" />
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                {t('clientDashboard.manageRides')}
              </p>
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <Button
                onClick={handleNewReservation}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white hidden sm:flex"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('clientDashboard.newRequest')}
              </Button>
              <Button
                onClick={handleNewReservation}
                size="icon"
                className="bg-orange-500 hover:bg-orange-600 text-white sm:hidden"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <LanguageSelector variant="header" />
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={signOut} className="flex-shrink-0">
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
