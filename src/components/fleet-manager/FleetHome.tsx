import { useState, useEffect, useMemo, useCallback, memo } from "react";
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
  Tag,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FleetCourseEscalations } from "./FleetCourseEscalations";

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
    show_rating_for_sharing?: boolean | null;
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
  pendingPartnershipsCount?: number;
  pendingCoursesCount?: number;
  pendingCompanyPartnershipsCount?: number;
  onTabChange: (tab: string) => void;
  onViewDriverProfile: (driverId: string) => void;
}

// Composant Quick Action mémorisé pour éviter les re-renders
const QuickActionCard = memo(function QuickActionCard({
  onClick,
  icon: Icon,
  iconBgClass,
  label,
  badge
}: {
  onClick: () => void;
  icon: React.ElementType;
  iconBgClass: string;
  label: string;
  badge?: number;
}) {
  return (
    <Card 
      className="p-3 cursor-pointer group hover:bg-accent/10 transition-colors border-border/50 relative will-change-transform"
      onClick={onClick}
    >
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg z-10">
          {badge}
        </span>
      )}
      <div className="flex flex-col items-center text-center gap-1.5">
        <div className={`w-10 h-10 ${iconBgClass} rounded-xl flex items-center justify-center group-hover:opacity-80 transition-opacity`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
    </Card>
  );
});

export const FleetHome = memo(function FleetHome({ 
  fleetManager, 
  userProfile,
  drivers,
  clientsCount,
  pendingInvitationsCount,
  pendingPartnershipsCount = 0,
  pendingCoursesCount = 0,
  pendingCompanyPartnershipsCount = 0,
  onTabChange,
  onViewDriverProfile
}: FleetHomeProps) {
  const [stats, setStats] = useState({
    totalCourses: 0,
    monthRevenue: 0,
    completedCourses: 0
  });
  const [loading, setLoading] = useState(true);

  // Mémoiser les valeurs calculées
  const { avatarUrl, initials } = useMemo(() => ({
    avatarUrl: userProfile?.profile_photo_url,
    initials: (userProfile?.full_name || fleetManager.contact_name || "FM")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }), [userProfile?.profile_photo_url, userProfile?.full_name, fleetManager.contact_name]);

  // Optimisation: Charger les stats avec requêtes parallèles
  useEffect(() => {
    let cancelled = false;
    
    const loadStats = async () => {
      try {
        // Get current month boundaries for monthly stats
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        // ÉTAPE 1: Récupérer les IDs clients en parallèle
        const [fleetClientsResult, fleetManagerClientsResult, unassignedResult] = await Promise.all([
          supabase
            .from('clients')
            .select('id')
            .eq('fleet_manager_id', fleetManager.id),
          supabase
            .from('fleet_manager_clients')
            .select('client_id')
            .eq('fleet_manager_id', fleetManager.id),
          supabase
            .from('unassigned_fleet_courses')
            .select('*', { count: 'exact', head: true })
            .eq('fleet_manager_id', fleetManager.id)
            .is('resolved_at', null)
        ]);

        if (cancelled) return;

        const fleetClientIds = fleetClientsResult.data?.map(c => c.id) || [];
        const linkedClientIds = fleetManagerClientsResult.data?.map(c => c.client_id) || [];
        const allFleetClientIds = [...new Set([...fleetClientIds, ...linkedClientIds])];

        let totalCourses = 0;
        let completedCourses = 0;
        let monthRevenue = 0;

        if (allFleetClientIds.length > 0) {
          // ÉTAPE 2: Récupérer courses et factures en parallèle
          const driverIds = drivers.map(d => d.driver_id).filter(Boolean);
          
          // Requêtes parallèles pour les courses
          const [coursesResult, completedResult] = await Promise.all([
            supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .in('client_id', allFleetClientIds)
              .gte('scheduled_date', startOfMonth.toISOString())
              .lt('scheduled_date', endOfMonth.toISOString()),
            supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .in('client_id', allFleetClientIds)
              .eq('status', 'completed')
              .gte('scheduled_date', startOfMonth.toISOString())
              .lt('scheduled_date', endOfMonth.toISOString())
          ]);

          if (cancelled) return;

          totalCourses = coursesResult.count || 0;
          completedCourses = completedResult.count || 0;

          // Factures séparément si on a des chauffeurs
          if (driverIds.length > 0) {
            const { data: factures } = await supabase
              .from('factures')
              .select('amount, course:courses!inner(client_id)')
              .in('driver_id', driverIds)
              .eq('payment_status', 'paid')
              .gte('paid_at', startOfMonth.toISOString())
              .lt('paid_at', endOfMonth.toISOString());

            if (cancelled) return;

            const fleetFactures = factures?.filter((f: any) => 
              f.course && allFleetClientIds.includes(f.course.client_id)
            ) || [];
            monthRevenue = fleetFactures.reduce((sum: number, f: any) => sum + Number(f.amount), 0);
          }
        }

        if (!cancelled) {
          setStats({
            totalCourses: totalCourses + (unassignedResult.count || 0),
            completedCourses,
            monthRevenue
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading fleet stats:", error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStats();
    
    return () => {
      cancelled = true;
    };
  }, [drivers, fleetManager.id]);

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
            <span className="hidden sm:inline">Profil</span>
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Accès Rapide - Compact Grid avec composants mémorisés */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Accès Rapide</h2>
        
        {/* Première ligne - 4 boutons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <QuickActionCard
            onClick={() => onTabChange("courses")}
            icon={Route}
            iconBgClass="bg-info/10 text-info"
            label="Courses"
            badge={pendingCoursesCount}
          />
          <QuickActionCard
            onClick={() => onTabChange("drivers")}
            icon={Car}
            iconBgClass="bg-primary/10 text-primary"
            label="Chauffeurs"
          />
          <QuickActionCard
            onClick={() => onTabChange("clients")}
            icon={Users}
            iconBgClass="bg-success/10 text-success"
            label="Clients"
          />
          <QuickActionCard
            onClick={() => onTabChange("settings")}
            icon={Globe}
            iconBgClass="bg-muted text-muted-foreground"
            label="Profil"
          />
        </div>

        {/* Deuxième ligne - 4 boutons (Outils) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickActionCard
            onClick={() => onTabChange("partnerships")}
            icon={Handshake}
            iconBgClass="bg-warning/10 text-warning"
            label="Partenariats"
            badge={pendingPartnershipsCount + pendingCompanyPartnershipsCount}
          />
          <QuickActionCard
            onClick={() => onTabChange("invitations")}
            icon={Send}
            iconBgClass="bg-success/10 text-success"
            label="Invitations"
            badge={pendingInvitationsCount}
          />
          <QuickActionCard
            onClick={() => onTabChange("qrcode")}
            icon={QrCode}
            iconBgClass="bg-accent/10 text-accent"
            label="QR Code"
          />
          <QuickActionCard
            onClick={() => onTabChange("planning")}
            icon={Calendar}
            iconBgClass="bg-info/10 text-info"
            label="Planning"
          />
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      {/* Escalades en attente */}
      <FleetCourseEscalations fleetManagerId={fleetManager.id} />
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
                    {/* Rating visible uniquement si show_rating_for_sharing est true */}
                    {driver.driver?.show_rating_for_sharing !== false && driver.driver?.rating && driver.driver.rating > 0 && (
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
});
