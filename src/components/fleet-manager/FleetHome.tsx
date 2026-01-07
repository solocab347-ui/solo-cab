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

        // Get current month boundaries for monthly stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        // Get courses count for current month only
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .in('driver_id', driverIds)
          .gte('scheduled_date', startOfMonth.toISOString())
          .lt('scheduled_date', endOfMonth.toISOString());

        // Get completed courses for current month only
        const { count: completedCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .in('driver_id', driverIds)
          .eq('status', 'completed')
          .gte('scheduled_date', startOfMonth.toISOString())
          .lt('scheduled_date', endOfMonth.toISOString());

        // Get month revenue
        const { data: factures } = await supabase
          .from('factures')
          .select('amount')
          .in('driver_id', driverIds)
          .eq('payment_status', 'paid')
          .gte('paid_at', startOfMonth.toISOString())
          .lt('paid_at', endOfMonth.toISOString());

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
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* Welcome Header - Compact Design */}
      <div className="relative overflow-hidden rounded-2xl glass-strong p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-60" />
        
        <div className="relative flex items-center justify-between gap-4">
          {/* Manager Info - Compact */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                {userProfile?.full_name || fleetManager.contact_name}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {fleetManager.company_name}
                {fleetManager.subscription_status === 'active' && (
                  <Badge className="bg-gradient-premium text-white border-0 text-xs px-1.5 py-0">
                    ✨ Pro
                  </Badge>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Button - Compact */}
          <Button 
            onClick={() => window.open(`/flotte/${fleetManager.id}`, '_blank')}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vitrine</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Accès Rapide - Compact Grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Accès Rapide</h2>
        
        {/* Première ligne - 4 boutons */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("courses")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center group-hover:bg-info/20 transition-colors">
                <Route className="w-5 h-5 text-info" />
              </div>
              <span className="text-xs font-medium text-foreground">Courses</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("drivers")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Chauffeurs</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("clients")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Users className="w-5 h-5 text-success" />
              </div>
              <span className="text-xs font-medium text-foreground">Clients</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("settings")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">Vitrine</span>
            </div>
          </Card>
        </div>

        {/* Deuxième ligne - 4 boutons (Outils) */}
        <div className="grid grid-cols-4 gap-2">
          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("partnerships")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                <Handshake className="w-5 h-5 text-warning" />
              </div>
              <span className="text-xs font-medium text-foreground">Partenariats</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("invitations")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <Send className="w-5 h-5 text-success" />
              </div>
              <span className="text-xs font-medium text-foreground">Invitations</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <QrCode className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground">QR Code</span>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50"
            onClick={() => onTabChange("planning")}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center group-hover:bg-info/20 transition-colors">
                <Calendar className="w-5 h-5 text-info" />
              </div>
              <span className="text-xs font-medium text-foreground">Planning</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Statistiques Mensuelles - Compact Stats Row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Statistiques Mensuelles
          </h2>
          <Badge variant="outline" className="text-xs">
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-3 text-center border-border/50">
            <div className="flex flex-col items-center gap-1">
              <Car className="w-4 h-4 text-primary" />
              <span className="text-xl font-bold text-foreground tabular-nums">{drivers.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Chauffeurs</span>
            </div>
          </Card>
          <Card className="p-3 text-center border-border/50">
            <div className="flex flex-col items-center gap-1">
              <Users className="w-4 h-4 text-success" />
              <span className="text-xl font-bold text-foreground tabular-nums">{clientsCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Clients</span>
            </div>
          </Card>
          <Card className="p-3 text-center border-border/50">
            <div className="flex flex-col items-center gap-1">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-xl font-bold text-foreground tabular-nums">{loading ? "..." : stats.totalCourses}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Courses</span>
            </div>
          </Card>
          <Card className="p-3 text-center border-border/50">
            <div className="flex flex-col items-center gap-1">
              <Send className="w-4 h-4 text-warning" />
              <span className="text-xl font-bold text-foreground tabular-nums">{pendingInvitationsCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase">Invitations</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Mes Chauffeurs - Compact Driver List */}
      {drivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mes Chauffeurs</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onTabChange("drivers")}
              className="gap-1 text-xs h-7 px-2"
            >
              Tout voir
              <Eye className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
