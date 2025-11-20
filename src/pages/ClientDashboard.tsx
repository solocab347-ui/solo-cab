import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Sparkles
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DevisList from "@/components/DevisList";
import ClientCoursesList from "@/components/client/ClientCoursesList";
import ClientFacturesList from "@/components/client/ClientFacturesList";
import ClientProfile from "@/components/client/ClientProfile";
import ClientNotes from "@/components/client/ClientNotes";
import ClientDriversList from "@/components/client/ClientDriversList";
import ClientQRScanner from "@/components/client/ClientQRScanner";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import { cn } from "@/lib/utils";

const ClientDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accueil");
  const [stats, setStats] = useState({
    upcomingCourses: 0,
    pendingDevis: 0,
    unpaidInvoices: 0,
  });

  useEffect(() => {
    fetchClientProfile();
    fetchStats();
    
    // Check for payment success
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Paiement confirmé ! Votre course est réservée.");
      setSearchParams({});
    } else if (paymentStatus === "cancelled") {
      toast.error("Paiement annulé");
      setSearchParams({});
    }
  }, [user, searchParams]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) return;

      // Upcoming courses
      const { count: upcomingCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .in("status", ["pending", "accepted"]);

      // Pending devis
      const { count: pendingDevisCount } = await supabase
        .from("devis")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "pending");

      // Unpaid invoices
      const { count: unpaidCount } = await supabase
        .from("factures")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("payment_status", "pending");

      setStats({
        upcomingCourses: upcomingCount || 0,
        pendingDevis: pendingDevisCount || 0,
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
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const menuItems = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "courses", label: "Courses", icon: Clock },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "chauffeurs", label: "Mes Chauffeurs", icon: Users },
    { id: "scanner", label: "Scanner QR Code", icon: QrCode },
    { id: "compte", label: "Mon Compte", icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "accueil":
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Courses à venir</h3>
                </div>
                <p className="text-4xl font-bold text-white mb-2">{stats.upcomingCourses}</p>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Devis en attente</h3>
                </div>
                <p className="text-4xl font-bold text-white mb-2">{stats.pendingDevis}</p>
                {stats.pendingDevis > 0 && (
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/10 p-0"
                    onClick={() => setActiveTab("devis")}
                  >
                    Voir les devis →
                  </Button>
                )}
              </Card>

              <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Factures impayées</h3>
                </div>
                <p className="text-4xl font-bold text-white mb-2">{stats.unpaidInvoices}</p>
              </Card>
            </div>

            {clientProfile?.client?.is_exclusive && clientProfile?.client?.drivers && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Mon Chauffeur Préféré</h2>
                <div className="flex items-center gap-4">
                  {clientProfile.client.drivers.profiles?.profile_photo_url ? (
                    <img
                      src={clientProfile.client.drivers.profiles.profile_photo_url}
                      alt={clientProfile.client.drivers.profiles.full_name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Car className="w-10 h-10 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Votre chauffeur privé</p>
                    <h3 className="font-bold text-xl mb-2">
                      {clientProfile.client.drivers.profiles?.full_name || "Votre chauffeur"}
                    </h3>
                    <Button variant="outline">
                      <User className="w-4 h-4 mr-2" />
                      Voir le profil complet
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );
      case "courses":
        return clientProfile?.client?.id ? (
          <ClientCoursesList clientId={clientProfile.client.id} />
        ) : null;
      case "messages":
        return <MessagingInterface />;
      case "notes":
        return <ClientNotes />;
      case "chauffeurs":
        return <ClientDriversList />;
      case "scanner":
        return <ClientQRScanner />;
      case "compte":
        return <ClientProfile />;
      case "devis":
        return clientProfile?.client?.id ? (
          <DevisList clientId={clientProfile.client.id} />
        ) : null;
      case "factures":
        return clientProfile?.client?.id ? (
          <ClientFacturesList clientId={clientProfile.client.id} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card/50 p-4 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-premium-foreground" />
            </div>
            <span className="text-xl font-bold">SoloCab</span>
          </div>
          <p className="text-sm text-muted-foreground">Navigation</p>
        </div>

        <nav className="space-y-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  activeTab === item.id
                    ? "bg-orange-500/10 text-orange-500 font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="border-b border-border bg-card">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Bonjour, {clientProfile?.full_name?.split(" ")[0] || "Client"}
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos courses facilement
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleNewReservation}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle demande
              </Button>
              <NotificationBell />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{clientProfile?.full_name?.split(" ")[0]}</span>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default ClientDashboard;
