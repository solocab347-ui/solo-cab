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
  Route,
  Handshake,
  Tag
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
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header - Premium Glass Design */}
      <div className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-10">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-info/5 opacity-60" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex flex-col items-center text-center gap-6">
          {/* Manager Info */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-md opacity-50 animate-pulse-slow" />
              <Avatar className="relative w-16 h-16 md:w-20 md:h-20 border-3 border-primary/50 shadow-elegant">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-left">
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                Bienvenue, {userProfile?.full_name || fleetManager.contact_name}
              </h1>
              <p className="text-muted-foreground flex items-center gap-3 mt-1">
                <span className="text-lg">{fleetManager.company_name}</span>
                {fleetManager.subscription_status === 'active' && (
                  <Badge className="bg-gradient-premium text-white border-0 shadow-premium px-3">
                    ✨ Premium
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <Button 
            onClick={() => window.open(`/flotte/${fleetManager.id}`, '_blank')}
            className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-elegant px-6 py-2.5"
            size="lg"
          >
            <Eye className="w-5 h-5" />
            Voir ma vitrine
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Accès Rapide - Modern Cards with Glow - Ligne 1 */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-3">
          <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-accent rounded-full shadow-elegant"></div>
          Accès Rapide
        </h2>
        
        {/* Première ligne - 4 boutons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-fade-in mb-4">
          {/* Gestion des Courses */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-info"
            onClick={() => onTabChange("courses")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-info to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-info/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Route className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Courses</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Gérer les réservations</p>
              </div>
            </div>
          </Card>

          {/* Chauffeurs */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-primary"
            onClick={() => onTabChange("drivers")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-primary/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Car className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Chauffeurs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Gérer ma flotte</p>
              </div>
            </div>
          </Card>

          {/* Clients */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-success"
            onClick={() => onTabChange("clients")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-success/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Users className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Clients</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Voir les clients</p>
              </div>
            </div>
          </Card>

          {/* Paramètres & Vitrine */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-primary"
            onClick={() => onTabChange("settings")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-slate-500/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Globe className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Vitrine</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Paramètres profil</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Deuxième ligne - 4 boutons (Outils) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-fade-in">
          {/* Partenariats */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-warning"
            onClick={() => onTabChange("partnerships")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-warning to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-warning/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Handshake className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Partenariats</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Gérer les contrats</p>
              </div>
            </div>
          </Card>

          {/* Invitations */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-success"
            onClick={() => onTabChange("invitations")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-success/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Send className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Invitations</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Inviter chauffeurs</p>
              </div>
            </div>
          </Card>

          {/* QR Code Vitrine */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-accent"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-accent to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-accent/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <QrCode className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">QR Code</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Partager vitrine</p>
              </div>
            </div>
          </Card>

          {/* Planning */}
          <Card 
            className="card-modern p-5 cursor-pointer group hover-glow-info"
            onClick={() => onTabChange("planning")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-info to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <div className="absolute inset-0 bg-info/50 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity" />
                <Calendar className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Planning</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Disponibilités</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistiques - Animated Stat Cards */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-3">
          <div className="w-1.5 h-7 bg-gradient-to-b from-accent to-primary rounded-full shadow-premium"></div>
          Statistiques
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-fade-in">
          {/* Chauffeurs */}
          <Card className="card-modern p-6 hover-glow-primary group">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-elegant group-hover:scale-110 transition-transform">
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Car className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-foreground stat-number tabular-nums">{drivers.length}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">Chauffeurs</p>
              </div>
            </div>
          </Card>

          {/* Clients */}
          <Card className="card-modern p-6 hover-glow-success group">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-2xl flex items-center justify-center shadow-success group-hover:scale-110 transition-transform">
                <div className="absolute inset-0 bg-success/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Users className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-foreground stat-number tabular-nums">{clientsCount}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">Clients</p>
              </div>
            </div>
          </Card>

          {/* Courses */}
          <Card className="card-modern p-6 hover-glow-accent group">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-accent to-purple-600 rounded-2xl flex items-center justify-center shadow-premium group-hover:scale-110 transition-transform">
                <div className="absolute inset-0 bg-accent/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <TrendingUp className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-foreground stat-number tabular-nums">
                  {loading ? "..." : stats.totalCourses}
                </h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">Courses</p>
              </div>
            </div>
          </Card>

          {/* Invitations */}
          <Card className="card-modern p-6 hover-glow-warning group">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative w-14 h-14 bg-gradient-to-br from-warning to-orange-600 rounded-2xl flex items-center justify-center shadow-warning group-hover:scale-110 transition-transform">
                <div className="absolute inset-0 bg-warning/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Send className="relative w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-foreground stat-number tabular-nums">{pendingInvitationsCount}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mt-1">Invitations</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mes Chauffeurs - Modern Driver Cards */}
      {drivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
              <div className="w-1.5 h-7 bg-gradient-to-b from-primary to-accent rounded-full shadow-elegant"></div>
              Mes Chauffeurs
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onTabChange("drivers")}
              className="gap-2 hover:bg-primary/10 hover:border-primary/50 transition-colors"
            >
              Voir tout
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade-in">
            {drivers.slice(0, 6).map((driver) => (
              <Card 
                key={driver.id}
                className="card-modern p-5 cursor-pointer group hover-glow-primary"
                onClick={() => driver.driver?.id && onViewDriverProfile(driver.driver.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-sm opacity-0 group-hover:opacity-50 transition-opacity" />
                    <Avatar className="relative w-14 h-14 border-2 border-border/30 group-hover:border-primary/50 transition-all">
                      <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-bold">
                        {(driver.driver?.profile?.full_name || "C")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {driver.driver?.profile?.full_name || "Chauffeur"}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {driver.driver?.rating && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/10 rounded-lg">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="text-sm font-bold text-warning">{driver.driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <Badge 
                      variant={driver.driver?.status === "validated" ? "default" : "secondary"}
                      className={driver.driver?.status === "validated" ? "bg-success/20 text-success border-success/30 font-medium" : ""}
                    >
                      {driver.driver?.status === "validated" ? "✓ Actif" : "En attente"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Modern Design */}
      {drivers.length === 0 && (
        <Card className="card-modern p-12 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl" />
            <div className="relative w-full h-full bg-muted/50 rounded-2xl flex items-center justify-center">
              <Car className="w-10 h-10 text-muted-foreground/50" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3">Aucun chauffeur</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Commencez par inviter des chauffeurs à rejoindre votre flotte pour démarrer votre activité
          </p>
          <Button 
            onClick={() => onTabChange("invitations")} 
            className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-elegant px-6"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            Inviter un chauffeur
          </Button>
        </Card>
      )}
    </div>
  );
};
