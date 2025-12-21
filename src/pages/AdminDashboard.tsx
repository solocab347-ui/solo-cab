import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Home, Users, Activity, Mail, Gift, Shield, LogOut, Bot, AlertTriangle, TrendingUp, Lightbulb, Database, Handshake } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import logo from "@/assets/logo-solocab.png";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminSubscriptionStats from "@/components/admin/AdminSubscriptionStats";
import AdminDriversManagement from "@/components/admin/AdminDriversManagement";
import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import AdminEmails from "@/components/admin/AdminEmails";
import AdminFreeAccess from "@/components/admin/AdminFreeAccess";
import AdminRGPD from "@/components/admin/AdminRGPD";
import { AdminAssistantRequests } from "@/components/admin/AdminAssistantRequests";
import AdminDisputes from "@/components/admin/AdminDisputes";
import AdminFeedback from "@/components/admin/AdminFeedback";
import { AdminDataIntegrity } from "@/components/admin/AdminDataIntegrity";
import { AdminRLSAudit } from "@/components/admin/AdminRLSAudit";
import { AdminInvitationTokens } from "@/components/admin/AdminInvitationTokens";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminSocialLinks from "@/components/admin/AdminSocialLinks";
import AdminUserCleanup from "@/components/admin/AdminUserCleanup";
import { AdminTestData } from "@/components/admin/AdminTestData";
import { AdminPartnershipDisputes } from "@/components/admin/AdminPartnershipDisputes";
import { AdminFleetManagersDocuments } from "@/components/admin/AdminFleetManagersDocuments";

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
    { id: "stats", label: "Statistiques", icon: TrendingUp },
    { id: "drivers", label: "Gestion Chauffeurs", icon: Users },
    { id: "fleet-managers", label: "Gestionnaires Flotte", icon: Users },
    { id: "subscriptions", label: "Abonnements", icon: Activity },
    { id: "free-access", label: "Accès Gratuits", icon: Gift },
    { id: "test-campaign", label: "Campagne Test", icon: Users },
    { id: "test-data", label: "Données Test Alexandre", icon: Database },
    { id: "emails", label: "Envoi d'emails", icon: Mail },
    { id: "user-cleanup", label: "Nettoyage Comptes", icon: AlertTriangle },
    { id: "assistant", label: "Demandes Liberty", icon: Bot },
    { id: "disputes", label: "Signalement et litige", icon: AlertTriangle },
    { id: "partnership-disputes", label: "Litiges Partenaires", icon: Handshake },
    { id: "feedback", label: "Feedbacks Chauffeurs", icon: Lightbulb },
    { id: "data-integrity", label: "Intégrité des Données", icon: Database },
    { id: "rls-audit", label: "Audit Sécurité RLS", icon: Shield },
    { id: "rgpd", label: "RGPD", icon: Shield },
    { id: "social-links", label: "Réseaux Sociaux", icon: Activity },
    { id: "settings", label: "Paramètres Admin", icon: Shield },
    { id: "reset", label: "⚠️ Réinitialiser", icon: AlertTriangle },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "stats":
        return <AdminSubscriptionStats />;
      case "drivers":
        return <AdminDriversManagement />;
      case "fleet-managers":
        return <AdminFleetManagersDocuments />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "free-access":
        return <AdminFreeAccess />;
      case "test-campaign":
        return <AdminInvitationTokens />;
      case "test-data":
        return <AdminTestData />;
      case "emails":
        return <AdminEmails />;
      case "user-cleanup":
        return <AdminUserCleanup />;
      case "assistant":
        return <AdminAssistantRequests />;
      case "disputes":
        return <AdminDisputes />;
      case "partnership-disputes":
        return <AdminPartnershipDisputes />;
      case "feedback":
        return <AdminFeedback />;
      case "data-integrity":
        return <AdminDataIntegrity />;
      case "rls-audit":
        return <AdminRLSAudit />;
      case "rgpd":
        return <AdminRGPD />;
      case "social-links":
        return <AdminSocialLinks />;
      case "settings":
        return <AdminSettings />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border min-h-screen">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
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
