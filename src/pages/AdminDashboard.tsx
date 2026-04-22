import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Home, 
  Users, 
  Activity, 
  Mail, 
  LogOut, 
  HeadphonesIcon,
  Wrench,
  Settings,
  ArrowLeft,
  FolderOpen,
  Wallet
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import AdminHomeHub from "@/components/admin/hubs/AdminHomeHub";
import AdminUsersHub from "@/components/admin/hubs/AdminUsersHub";
import AdminSubscriptionsHub from "@/components/admin/hubs/AdminSubscriptionsHub";
import AdminSupportHub from "@/components/admin/hubs/AdminSupportHub";
import AdminTechHub from "@/components/admin/hubs/AdminTechHub";
import AdminCommunicationsHub from "@/components/admin/hubs/AdminCommunicationsHub";
import AdminSettingsHub from "@/components/admin/hubs/AdminSettingsHub";
import AdminDocumentsHub from "@/components/admin/hubs/AdminDocumentsHub";
import AdminFinancesHub from "@/components/admin/hubs/AdminFinancesHub";
import { PermissionsWidget } from "@/components/permissions/PermissionsWidget";


const AdminDashboard = () => {
  const { signOut, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    // CRITIQUE: Attendre que l'authentification soit complètement chargée
    if (authLoading) {
      return; // Ne rien faire pendant le chargement auth
    }
    
    checkAdminAccess();
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    // CRITIQUE: Ne pas rediriger si l'auth est encore en cours
    if (!user) {
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        // Ne pas rediriger immédiatement en cas d'erreur réseau
        // Réessayer une fois après un court délai
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: retryData, error: retryError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
          
        if (retryError || !retryData) {
          toast.error("Accès non autorisé");
          navigate("/");
          return;
        }
        setIsAdmin(true);
        return;
      }

      if (!data) {
        toast.error("Accès non autorisé");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast.error("Erreur lors de la vérification des permissions");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <img src={logo} alt="SoloCab" className="w-16 h-16 opacity-50" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const menuItems = [
    { id: "home", label: "Accueil", icon: Home, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { id: "users", label: "Utilisateurs", icon: Users, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { id: "documents", label: "Documents", icon: FolderOpen, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { id: "finances", label: "Finances", icon: Wallet, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { id: "subscriptions", label: "Abonnements", icon: Activity, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { id: "support", label: "Support", icon: HeadphonesIcon, color: "bg-red-500/10 text-red-600 dark:text-red-400" },
    { id: "tech", label: "Technique", icon: Wrench, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
    { id: "communications", label: "Communications", icon: Mail, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
    { id: "settings", label: "Paramètres", icon: Settings, color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <AdminHomeHub />;
      case "users":
        return <AdminUsersHub />;
      case "documents":
        return <AdminDocumentsHub />;
      case "finances":
        return <AdminFinancesHub />;
      case "subscriptions":
        return <AdminSubscriptionsHub />;
      case "support":
        return <AdminSupportHub />;
      case "tech":
        return <AdminTechHub />;
      case "communications":
        return <AdminCommunicationsHub />;
      case "settings":
        return <AdminSettingsHub />;
      default:
        return null;
    }
  };

  const getCurrentSectionLabel = () => {
    return menuItems.find((item) => item.id === activeSection)?.label || "";
  };

  // Vue principale avec grille de navigation
  if (activeSection === null) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="px-4 py-4 flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="font-bold text-lg">Administration</h1>
                <p className="text-xs text-muted-foreground">Panneau de contrôle</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Stats clés + Grille de navigation */}
        <main className="p-4 max-w-5xl mx-auto">
          {/* Statistiques principales visibles immédiatement */}
          <AdminDashboardStats />

          {/* Centre d'autorisations natives */}
          <div className="my-4">
            <PermissionsWidget role="admin" alwaysShow />
          </div>

          {/* Grille de navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-border/50"
                  onClick={() => setActiveSection(item.id)}
                >
                  <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3">
                    <div className={`p-3 sm:p-4 rounded-xl ${item.color}`}>
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // Vue de section avec bouton retour
  return (
    <div className="min-h-screen bg-background">
      {/* Header avec bouton retour */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="px-4 py-3 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveSection(null)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain" />
              <h1 className="font-bold text-lg truncate">{getCurrentSectionLabel()}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Contenu de la section */}
      <main className="p-4 max-w-5xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;