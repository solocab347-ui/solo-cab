import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  TrendingUp,
  Users,
  Car,
  Euro,
  Calendar,
  Star,
  Route,
  BarChart3,
  Trophy,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";

interface FleetStatisticsProps {
  fleetManagerId: string;
}

interface DriverStats {
  driver_id: string;
  name: string;
  photo: string | null;
  vehicle: string;
  total_courses: number;
  completed_courses: number;
  total_revenue: number;
  commission_earned: number;
  average_rating: number;
}

interface GlobalStats {
  total_courses: number;
  completed_courses: number;
  pending_courses: number;
  cancelled_courses: number;
  total_revenue: number;
  total_commissions: number;
  total_clients: number;
  total_drivers: number;
  average_course_value: number;
}

export const FleetStatistics = ({ fleetManagerId }: FleetStatisticsProps) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    total_courses: 0,
    completed_courses: 0,
    pending_courses: 0,
    cancelled_courses: 0,
    total_revenue: 0,
    total_commissions: 0,
    total_clients: 0,
    total_drivers: 0,
    average_course_value: 0,
  });
  const [driverStats, setDriverStats] = useState<DriverStats[]>([]);

  useEffect(() => {
    fetchStats();
  }, [fleetManagerId, period]);

  const getDateRange = () => {
    const now = new Date();
    if (period === "week") {
      return {
        start: startOfWeek(now, { locale: fr }),
        end: endOfWeek(now, { locale: fr }),
      };
    } else if (period === "month") {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }
    return { start: null, end: null };
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: fmdData } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          commission_percentage,
          is_salaried,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id,
            rating
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (!fmdData || fmdData.length === 0) {
        setLoading(false);
        return;
      }

      const driverIds = fmdData.map(d => d.driver_id);
      const driverUserIds = fmdData.filter(d => d.driver).map(d => (d.driver as any).user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", driverUserIds);

      const dateRange = getDateRange();
      
      // IMPORTANT: Ne compter QUE les courses créées par ce gestionnaire (fleet_manager_id)
      // et non pas toutes les courses de ses chauffeurs (qui peuvent être des courses personnelles)
      let coursesQuery = supabase
        .from("courses")
        .select("*")
        .eq("fleet_manager_id", fleetManagerId);

      if (dateRange.start && dateRange.end) {
        coursesQuery = coursesQuery
          .gte("scheduled_date", dateRange.start.toISOString())
          .lte("scheduled_date", dateRange.end.toISOString());
      }

      const { data: courses } = await coursesQuery;

      // Pour les factures, on garde les factures des chauffeurs de la flotte
      let facturesQuery = supabase
        .from("factures")
        .select("*")
        .in("driver_id", driverIds)
        .eq("payment_status", "paid");

      if (dateRange.start && dateRange.end) {
        facturesQuery = facturesQuery
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data: factures } = await facturesQuery;

      const { data: clients } = await supabase
        .from("fleet_manager_clients")
        .select("client_id")
        .eq("fleet_manager_id", fleetManagerId);

      const completedCourses = courses?.filter(c => c.status === "completed") || [];
      const pendingCourses = courses?.filter(c => c.status === "pending") || [];
      const cancelledCourses = courses?.filter(c => c.status === "cancelled") || [];
      const totalRevenue = factures?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

      let totalCommissions = 0;
      fmdData.forEach(fmd => {
        if (!fmd.is_salaried && fmd.commission_percentage > 0) {
          const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
          const driverRevenue = driverFactures.reduce((sum, f) => sum + (f.amount || 0), 0);
          totalCommissions += driverRevenue * (fmd.commission_percentage / 100);
        }
      });

      setGlobalStats({
        total_courses: courses?.length || 0,
        completed_courses: completedCourses.length,
        pending_courses: pendingCourses.length,
        cancelled_courses: cancelledCourses.length,
        total_revenue: totalRevenue,
        total_commissions: totalCommissions,
        total_clients: clients?.length || 0,
        total_drivers: fmdData.length,
        average_course_value: completedCourses.length > 0 
          ? totalRevenue / completedCourses.length 
          : 0,
      });

      const stats: DriverStats[] = fmdData.map(fmd => {
        const driverCourses = courses?.filter(c => c.driver_id === fmd.driver_id) || [];
        const driverCompleted = driverCourses.filter(c => c.status === "completed");
        const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
        const driverRevenue = driverFactures.reduce((sum, f) => sum + (f.amount || 0), 0);
        
        let commission = 0;
        if (!fmd.is_salaried && fmd.commission_percentage > 0) {
          commission = driverRevenue * (fmd.commission_percentage / 100);
        }

        const profile = profiles?.find(p => p.id === (fmd.driver as any)?.user_id);
        const ratings = driverCourses.filter(c => c.client_rating).map(c => c.client_rating);
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : 0;

        return {
          driver_id: fmd.driver_id,
          name: profile?.full_name || "Chauffeur",
          photo: profile?.profile_photo_url || null,
          vehicle: `${(fmd.driver as any)?.vehicle_brand || ""} ${(fmd.driver as any)?.vehicle_model || ""}`.trim(),
          total_courses: driverCourses.length,
          completed_courses: driverCompleted.length,
          total_revenue: driverRevenue,
          commission_earned: commission,
          average_rating: avgRating,
        };
      });

      stats.sort((a, b) => b.total_revenue - a.total_revenue);
      setDriverStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const periodLabels = {
    week: "Cette semaine",
    month: "Ce mois",
    all: "Tout"
  };

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Statistiques</h2>
            <p className="text-sm text-muted-foreground">Performance de votre flotte</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(["week", "month", "all"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className={period === p ? "bg-primary shadow-lg" : ""}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-emerald-500/5 to-transparent border border-success/20 p-5">
          <div className="absolute top-3 right-3">
            <ArrowUpRight className="w-5 h-5 text-success" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-success to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Euro className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.total_revenue.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent border border-primary/20 p-5">
          <div className="absolute top-3 right-3">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commissions</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.total_commissions.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-info/10 via-cyan-500/5 to-transparent border border-info/20 p-5">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-info to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Route className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Courses terminées</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.completed_courses}</p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent border border-accent/20 p-5">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur moyenne</p>
              <p className="text-2xl font-bold text-foreground">{globalStats.average_course_value.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats secondaires */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{globalStats.total_clients}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clients</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <Car className="w-6 h-6 mx-auto mb-2 text-info" />
          <p className="text-2xl font-bold">{globalStats.total_drivers}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Chauffeurs</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-warning" />
          <p className="text-2xl font-bold">{globalStats.pending_courses}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">En attente</p>
        </div>
        <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
          <Route className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{globalStats.total_courses}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total courses</p>
        </div>
      </div>

      {/* Classement des chauffeurs */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
        <div className="p-5 border-b border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-warning to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Classement des chauffeurs</h3>
            <p className="text-sm text-muted-foreground">Par chiffre d'affaires généré</p>
          </div>
        </div>

        <div className="p-5">
          {driverStats.length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucune donnée disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverStats.map((driver, index) => (
                <div
                  key={driver.driver_id}
                  className={`relative overflow-hidden rounded-xl border p-4 transition-all hover:border-primary/30 ${
                    index === 0 ? "bg-warning/5 border-warning/30" : 
                    index === 1 ? "bg-muted/30 border-muted-foreground/20" :
                    index === 2 ? "bg-orange-500/5 border-orange-500/20" :
                    "bg-card/50 border-border/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rang */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                      index === 0 ? "bg-warning text-warning-foreground" :
                      index === 1 ? "bg-muted-foreground/80 text-background" :
                      index === 2 ? "bg-orange-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-border shrink-0">
                      <AvatarImage src={driver.photo || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                        {driver.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{driver.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{driver.vehicle}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:grid grid-cols-4 gap-6 text-center shrink-0">
                      <div>
                        <p className="text-lg font-bold">{driver.completed_courses}</p>
                        <p className="text-xs text-muted-foreground">Courses</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-success">{driver.total_revenue.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">CA</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-primary">{driver.commission_earned.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">Commission</p>
                      </div>
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-bold">
                          {driver.average_rating > 0 ? driver.average_rating.toFixed(1) : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Stats mobile */}
                    <div className="sm:hidden flex items-center gap-2">
                      <Badge variant="secondary" className="text-success">
                        {driver.total_revenue.toFixed(2)}€
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
