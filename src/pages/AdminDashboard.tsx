import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  Users, 
  Activity, 
  Mail, 
  Shield, 
  LogOut, 
  Crown,
  HeadphonesIcon,
  Wrench,
  Settings,
  Menu,
  X
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import AdminHomeHub from "@/components/admin/hubs/AdminHomeHub";
import AdminUsersHub from "@/components/admin/hubs/AdminUsersHub";
import AdminSubscriptionsHub from "@/components/admin/hubs/AdminSubscriptionsHub";
import AdminSupportHub from "@/components/admin/hubs/AdminSupportHub";
import AdminTechHub from "@/components/admin/hubs/AdminTechHub";
import AdminCommunicationsHub from "@/components/admin/hubs/AdminCommunicationsHub";
import AdminSettingsHub from "@/components/admin/hubs/AdminSettingsHub";
import { CongressRegistrationsTab } from "@/components/admin/CongressRegistrationsTab";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
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

      if (error) throw error;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Vérification des permissions...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const menuItems = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "subscriptions", label: "Abonnements", icon: Activity },
    { id: "congress", label: "Congrès Pionniers", icon: Crown },
    { id: "support", label: "Litiges & Support", icon: HeadphonesIcon },
    { id: "tech", label: "Technique", icon: Wrench },
    { id: "communications", label: "Communications", icon: Mail },
    { id: "settings", label: "Paramètres", icon: Settings },
  ];

  const handleMenuClick = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <AdminHomeHub />;
      case "users":
        return <AdminUsersHub />;
      case "subscriptions":
        return <AdminSubscriptionsHub />;
      case "congress":
        return <CongressRegistrationsTab />;
      case "support":
        return <AdminSupportHub />;
      case "tech":
        return <AdminTechHub />;
      case "communications":
        return <AdminCommunicationsHub />;
      case "settings":
        return <AdminSettingsHub />;
      default:
        return <AdminHomeHub />;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          <span className="font-bold text-lg hidden sm:block">SoloCab</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm sm:text-base">A</span>
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold text-sm">Admin</p>
            <p className="text-xs text-muted-foreground">admin@solocab.fr</p>
          </div>
        </div>
      </div>

      <nav className="p-2 sm:p-4 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg mb-1 sm:mb-2 transition-colors ${
                isActive
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 sm:p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Déconnexion</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border min-h-screen fixed left-0 top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 border-b border-border bg-card">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <img src={logo} alt="SoloCab" className="w-8 h-8 object-contain" />
            <span className="font-bold text-sm">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Desktop Header */}
        <header className="hidden lg:block border-b border-border bg-card sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {menuItems.find((item) => item.id === activeSection)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Mobile Title */}
        <div className="lg:hidden px-4 py-3 bg-muted/30">
          <h1 className="text-lg font-bold">
            {menuItems.find((item) => item.id === activeSection)?.label}
          </h1>
        </div>

        <main className="p-3 sm:p-4 lg:p-6">{renderContent()}</main>
      </div>
    </div>
  );
};

export default AdminDashboard;
