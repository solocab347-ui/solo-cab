import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
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
      // Get fleet drivers
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

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", driverUserIds);

      // Get courses
      const dateRange = getDateRange();
      let coursesQuery = supabase
        .from("courses")
        .select("*")
        .in("driver_id", driverIds);

      if (dateRange.start && dateRange.end) {
        coursesQuery = coursesQuery
          .gte("scheduled_date", dateRange.start.toISOString())
          .lte("scheduled_date", dateRange.end.toISOString());
      }

      const { data: courses } = await coursesQuery;

      // Get factures for revenue
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

      // Get clients count
      const { data: clients } = await supabase
        .from("fleet_manager_clients")
        .select("client_id")
        .eq("fleet_manager_id", fleetManagerId);

      // Calculate global stats
      const completedCourses = courses?.filter(c => c.status === "completed") || [];
      const pendingCourses = courses?.filter(c => c.status === "pending") || [];
      const cancelledCourses = courses?.filter(c => c.status === "cancelled") || [];
      const totalRevenue = factures?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

      // Calculate commissions
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

      // Calculate per-driver stats
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

      // Sort by revenue
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

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Statistiques
        </h2>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="week">Cette semaine</TabsTrigger>
            <TabsTrigger value="month">Ce mois</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Global stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Euro className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold">{globalStats.total_revenue.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-success/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions</p>
                <p className="text-2xl font-bold">{globalStats.total_commissions.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-info/20 rounded-xl">
                <Route className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Courses terminées</p>
                <p className="text-2xl font-bold">{globalStats.completed_courses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/20 rounded-xl">
                <Euro className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur moyenne</p>
                <p className="text-2xl font-bold">{globalStats.average_course_value.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{globalStats.total_clients}</p>
            <p className="text-sm text-muted-foreground">Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Car className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{globalStats.total_drivers}</p>
            <p className="text-sm text-muted-foreground">Chauffeurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-warning" />
            <p className="text-3xl font-bold">{globalStats.pending_courses}</p>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-driver stats */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par chauffeur</CardTitle>
          <CardDescription>
            Classement par chiffre d'affaires généré
          </CardDescription>
        </CardHeader>
        <CardContent>
          {driverStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-4">
              {driverStats.map((driver, index) => (
                <div
                  key={driver.driver_id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border"
                >
                  <div className="text-2xl font-bold text-muted-foreground w-8">
                    #{index + 1}
                  </div>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={driver.photo || ""} />
                    <AvatarFallback>
                      {driver.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{driver.name}</h4>
                    <p className="text-sm text-muted-foreground">{driver.vehicle}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-lg font-semibold">{driver.completed_courses}</p>
                      <p className="text-xs text-muted-foreground">Courses</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-primary">
                        {driver.total_revenue.toFixed(0)}€
                      </p>
                      <p className="text-xs text-muted-foreground">CA</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-success">
                        {driver.commission_earned.toFixed(0)}€
                      </p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-semibold">
                        {driver.average_rating > 0 ? driver.average_rating.toFixed(1) : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
