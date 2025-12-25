import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  QrCode, 
  Users, 
  Car, 
  TrendingUp, 
  Globe, 
  Eye,
  Send,
  Calendar,
  Star,
  ExternalLink,
  FileText,
  CreditCard,
  Route
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FleetDriver {
  id: string;
  driver_id: string;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand?: string | null;
    status: string;
    rating?: number | null;
    vehicle_photos?: string[] | null;
    profile?: {
      full_name: string;
      profile_photo_url?: string | null;
    };
  };
}

interface FleetHomeProps {
  fleetManager: {
    id: string;
    company_name: string;
    contact_name: string;
    status: string;
    subscription_status: string | null;
    show_drivers_in_public_storefront: boolean;
  };
  userProfile?: {
    full_name: string;
    profile_photo_url?: string | null;
  } | null;
  drivers: FleetDriver[];
  clientsCount: number;
  pendingInvitationsCount: number;
  onTabChange: (tab: string) => void;
  onViewDriverProfile: (driverId: string) => void;
}

export const FleetHome = ({ 
  fleetManager, 
  userProfile,
  drivers,
  clientsCount,
  pendingInvitationsCount,
  onTabChange,
  onViewDriverProfile
}: FleetHomeProps) => {
  const [stats, setStats] = useState({
    totalCourses: 0,
    monthRevenue: 0,
    completedCourses: 0
  });
  const [loading, setLoading] = useState(true);

  const avatarUrl = userProfile?.profile_photo_url;
  const initials = (userProfile?.full_name || fleetManager.contact_name || "FM")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get all driver IDs from the fleet
        const driverIds = drivers.map(d => d.driver_id).filter(Boolean);
        
        if (driverIds.length === 0) {
          setStats({ totalCourses: 0, monthRevenue: 0, completedCourses: 0 });
          setLoading(false);
          return;
        }

        // Get courses count
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .in('driver_id', driverIds);

        // Get completed courses
        const { count: completedCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .in('driver_id', driverIds)
          .eq('status', 'completed');

        // Get month revenue
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: factures } = await supabase
          .from('factures')
          .select('amount')
          .in('driver_id', driverIds)
          .eq('payment_status', 'paid')
          .gte('paid_at', startOfMonth.toISOString());

        const monthRevenue = factures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

        setStats({
          totalCourses: coursesCount || 0,
          completedCourses: completedCount || 0,
          monthRevenue
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [drivers]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col items-center text-center gap-4">
          {/* Manager Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 border-2 border-primary/30 shadow-xl">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Bienvenue, {userProfile?.full_name || fleetManager.contact_name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span>{fleetManager.company_name}</span>
                {fleetManager.subscription_status === 'active' && (
                  <Badge className="bg-success/20 text-success border-success/30">Premium</Badge>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action - Centered */}
          <Button 
            onClick={() => window.open(`/flotte/${fleetManager.id}`, '_blank')}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Voir ma vitrine
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Accès Rapide */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Accès Rapide
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Gestion des Courses */}
          <Card 
            className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 group"
            onClick={() => onTabChange("courses")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-info/20 to-info/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-info to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Route className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Gestion Courses</h3>
                <p className="text-sm text-muted-foreground">Gérer les réservations</p>
              </div>
            </div>
          </Card>

          {/* Inviter Chauffeur */}
          <Card 
            className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 group"
            onClick={() => onTabChange("invitations")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-success/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Inviter Chauffeur</h3>
                <p className="text-sm text-muted-foreground">Agrandir votre flotte</p>
              </div>
            </div>
          </Card>

          {/* QR Code Vitrine Publique */}
          <Card 
            className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 group"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">QR Code Vitrine</h3>
                <p className="text-sm text-muted-foreground">Partager ma vitrine</p>
              </div>
            </div>
          </Card>

          {/* Profil Public */}
          <Card 
            className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 group"
            onClick={() => onTabChange("public-profile")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Profil Public</h3>
                <p className="text-sm text-muted-foreground">Gérer ma vitrine</p>
              </div>
            </div>
          </Card>

          {/* Planning */}
          <Card 
            className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl hover:scale-[1.02] transition-all cursor-pointer border border-white/10 group"
            onClick={() => onTabChange("planning")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-info/20 to-info/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-info to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Planning</h3>
                <p className="text-sm text-muted-foreground">Gérer les disponibilités</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistiques */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Statistiques
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Chauffeurs */}
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{drivers.length}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Chauffeurs</p>
              </div>
            </div>
          </Card>

          {/* Clients */}
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{clientsCount}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Clients</p>
              </div>
            </div>
          </Card>

          {/* Courses */}
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">
                  {loading ? "..." : stats.totalCourses}
                </h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Courses</p>
              </div>
            </div>
          </Card>

          {/* Invitations */}
          <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 hover:scale-[1.02] transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-gradient-to-br from-warning to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Send className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-foreground mb-1">{pendingInvitationsCount}</h3>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Invitations</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mes Chauffeurs */}
      {drivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
              Mes Chauffeurs
            </h2>
            <Button variant="outline" size="sm" onClick={() => onTabChange("drivers")}>
              Voir tout
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.slice(0, 6).map((driver) => (
              <Card 
                key={driver.id}
                className="relative overflow-hidden p-4 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => driver.driver?.id && onViewDriverProfile(driver.driver.id)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-border/50 group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold">
                      {(driver.driver?.profile?.full_name || "C")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {driver.driver?.profile?.full_name || "Chauffeur"}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {driver.driver?.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="text-sm font-medium">{driver.driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <Badge 
                      variant={driver.driver?.status === "validated" ? "default" : "secondary"}
                      className={driver.driver?.status === "validated" ? "bg-success/20 text-success border-success/30" : ""}
                    >
                      {driver.driver?.status === "validated" ? "Actif" : "En attente"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {drivers.length === 0 && (
        <Card className="p-12 text-center bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
          <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mb-2">Aucun chauffeur</h3>
          <p className="text-muted-foreground mb-6">
            Commencez par inviter des chauffeurs à rejoindre votre flotte
          </p>
          <Button onClick={() => onTabChange("invitations")} className="gap-2">
            <Plus className="w-4 h-4" />
            Inviter un chauffeur
          </Button>
        </Card>
      )}
    </div>
  );
};
