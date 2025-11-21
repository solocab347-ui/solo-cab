import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Home, Users, Activity, Mail, Gift, Flag, MessageSquare, Shield, LogOut, Bot } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminStats from "@/components/admin/AdminStats";
import DriversValidation from "@/components/admin/DriversValidation";
import UsersList from "@/components/admin/UsersList";
import AdminDriversManagement from "@/components/admin/AdminDriversManagement";
import AdminClientsManagement from "@/components/admin/AdminClientsManagement";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminEmails from "@/components/admin/AdminEmails";
import AdminFreeAccess from "@/components/admin/AdminFreeAccess";
import AdminReports from "@/components/admin/AdminReports";
import AdminCommunications from "@/components/admin/AdminCommunications";
import AdminRGPD from "@/components/admin/AdminRGPD";
import { AdminAssistantRequests } from "@/components/admin/AdminAssistantRequests";

const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

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
    { id: "overview", label: "Vue d'ensemble", icon: Home },
    { id: "drivers", label: "Gestion Chauffeurs", icon: Users },
    { id: "assistant", label: "Demandes Liberty", icon: Bot },
    { id: "subscriptions", label: "Abonnements", icon: Activity },
    { id: "emails", label: "Envoi d'emails", icon: Mail },
    { id: "free-access", label: "Accès Gratuits", icon: Gift },
    { id: "reports", label: "Signalements & Litiges", icon: Flag },
    { id: "communications", label: "Communications", icon: MessageSquare },
    { id: "rgpd", label: "RGPD & Confidentialité", icon: Shield },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "drivers":
        return <AdminDriversManagement />;
      case "assistant":
        return <AdminAssistantRequests />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "emails":
        return <AdminEmails />;
      case "free-access":
        return <AdminFreeAccess />;
      case "reports":
        return <AdminReports />;
      case "communications":
        return <AdminCommunications />;
      case "rgpd":
        return <AdminRGPD />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border min-h-screen">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold">SoloCab</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">A</span>
            </div>
            <div>
              <p className="font-semibold">Admin</p>
              <p className="text-xs text-muted-foreground">admin@solocab.fr</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="border-b border-border bg-card">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {menuItems.find((item) => item.id === activeSection)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  );
};

export default AdminDashboard;
