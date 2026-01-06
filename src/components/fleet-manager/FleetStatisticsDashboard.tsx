import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Euro,
  Calendar,
  Star,
  Route,
  BarChart3,
  Trophy,
  Target,
  Wallet,
  HandCoins,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from "lucide-react";

interface FleetStatisticsDashboardProps {
  fleetManagerId: string;
}

interface DriverStats {
  driver_id: string;
  name: string;
  photo: string | null;
  vehicle: string;
  total_courses: number;
  completed_courses: number;
  cancelled_courses: number;
  pending_courses: number;
  total_revenue: number;
  commission_percentage: number;
  commission_earned: number;
  average_rating: number;
  is_salaried: boolean;
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
  completion_rate: number;
}

type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "all";

export const FleetStatisticsDashboard = ({ fleetManagerId }: FleetStatisticsDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("month");
  const [activeView, setActiveView] = useState<"overview" | "drivers" | "commissions">("overview");
  const [searchDriver, setSearchDriver] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "courses" | "rating" | "commission">("revenue");
  
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
    completion_rate: 0,
  });
  const [driverStats, setDriverStats] = useState<DriverStats[]>([]);
  const [previousPeriodStats, setPreviousPeriodStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [fleetManagerId, period]);

  const getDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case "today":
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        return { start: todayStart, end: now };
      case "week":
        return { start: startOfWeek(now, { locale: fr }), end: endOfWeek(now, { locale: fr }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        const quarterStart = subMonths(now, 3);
        return { start: startOfMonth(quarterStart), end: now };
      case "year":
        return { start: startOfYear(now), end: now };
      case "all":
      default:
        return { start: null, end: null };
    }
  };

  const getPreviousDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case "today":
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterdayStart);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterdayStart, end: yesterdayEnd };
      case "week":
        return { start: startOfWeek(subWeeks(now, 1), { locale: fr }), end: endOfWeek(subWeeks(now, 1), { locale: fr }) };
      case "month":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      default:
        return null;
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Get fleet manager drivers with their commissions
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

      // Get partnerships to include their commissions too
      const { data: partnerships } = await supabase
        .from("fleet_driver_partnerships")
        .select("driver_id, commission_percentage, total_owed, total_paid, status, contract_signed")
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted")
        .eq("contract_signed", true);

      const dateRange = getDateRange(period);
      let coursesQuery = supabase.from("courses").select("*").in("driver_id", driverIds);
      if (dateRange.start && dateRange.end) {
        coursesQuery = coursesQuery
          .gte("scheduled_date", dateRange.start.toISOString())
          .lte("scheduled_date", dateRange.end.toISOString());
      }
      const { data: courses } = await coursesQuery;

      let facturesQuery = supabase.from("factures").select("*").in("driver_id", driverIds).eq("payment_status", "paid");
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

      // Calculate commissions from both fleet_manager_drivers AND fleet_driver_partnerships
      let totalCommissions = 0;
      
      // Commissions from fleet_manager_drivers (drivers with is_salaried = false and commission > 0)
      fmdData.forEach(fmd => {
        if (!fmd.is_salaried && fmd.commission_percentage > 0) {
          const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
          const driverRevenue = driverFactures.reduce((sum, f) => sum + (f.amount || 0), 0);
          totalCommissions += driverRevenue * (fmd.commission_percentage / 100);
        }
      });

      // Add commissions from partnerships (total_owed)
      if (partnerships) {
        partnerships.forEach(p => {
          totalCommissions += p.total_owed || 0;
        });
      }

      const completionRate = courses && courses.length > 0 
        ? (completedCourses.length / courses.length) * 100 
        : 0;

      setGlobalStats({
        total_courses: courses?.length || 0,
        completed_courses: completedCourses.length,
        pending_courses: pendingCourses.length,
        cancelled_courses: cancelledCourses.length,
        total_revenue: totalRevenue,
        total_commissions: totalCommissions,
        total_clients: clients?.length || 0,
        total_drivers: fmdData.length,
        average_course_value: completedCourses.length > 0 ? totalRevenue / completedCourses.length : 0,
        completion_rate: completionRate,
      });

      // Fetch previous period stats for comparison
      const prevRange = getPreviousDateRange(period);
      if (prevRange) {
        let prevCoursesQuery = supabase.from("courses").select("*").in("driver_id", driverIds);
        prevCoursesQuery = prevCoursesQuery
          .gte("scheduled_date", prevRange.start.toISOString())
          .lte("scheduled_date", prevRange.end.toISOString());
        const { data: prevCourses } = await prevCoursesQuery;

        let prevFacturesQuery = supabase.from("factures").select("*").in("driver_id", driverIds).eq("payment_status", "paid");
        prevFacturesQuery = prevFacturesQuery
          .gte("created_at", prevRange.start.toISOString())
          .lte("created_at", prevRange.end.toISOString());
        const { data: prevFactures } = await prevFacturesQuery;

        const prevCompleted = prevCourses?.filter(c => c.status === "completed") || [];
        const prevRevenue = prevFactures?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

        setPreviousPeriodStats({
          total_courses: prevCourses?.length || 0,
          completed_courses: prevCompleted.length,
          pending_courses: 0,
          cancelled_courses: 0,
          total_revenue: prevRevenue,
          total_commissions: 0,
          total_clients: 0,
          total_drivers: 0,
          average_course_value: 0,
          completion_rate: 0,
        });
      }

      // Driver stats - include partnership commission data
      const stats: DriverStats[] = fmdData.map(fmd => {
        const driverCourses = courses?.filter(c => c.driver_id === fmd.driver_id) || [];
        const driverCompleted = driverCourses.filter(c => c.status === "completed");
        const driverCancelled = driverCourses.filter(c => c.status === "cancelled");
        const driverPending = driverCourses.filter(c => c.status === "pending");
        const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
        const driverRevenue = driverFactures.reduce((sum, f) => sum + (f.amount || 0), 0);
        
        // Get commission from either fleet_manager_drivers or partnerships
        let commissionPercentage = fmd.commission_percentage || 0;
        let commissionEarned = 0;
        
        // Check if there's a partnership with commission
        const partnership = partnerships?.find(p => p.driver_id === fmd.driver_id);
        if (partnership) {
          commissionPercentage = partnership.commission_percentage || commissionPercentage;
          commissionEarned = partnership.total_owed || 0;
        } else if (!fmd.is_salaried && fmd.commission_percentage > 0) {
          commissionEarned = driverRevenue * (fmd.commission_percentage / 100);
        }

        const profile = profiles?.find(p => p.id === (fmd.driver as any)?.user_id);
        const ratings = driverCourses.filter(c => c.client_rating).map(c => c.client_rating);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

        return {
          driver_id: fmd.driver_id,
          name: profile?.full_name || "Chauffeur",
          photo: profile?.profile_photo_url || null,
          vehicle: `${(fmd.driver as any)?.vehicle_brand || ""} ${(fmd.driver as any)?.vehicle_model || ""}`.trim(),
          total_courses: driverCourses.length,
          completed_courses: driverCompleted.length,
          cancelled_courses: driverCancelled.length,
          pending_courses: driverPending.length,
          total_revenue: driverRevenue,
          commission_percentage: commissionPercentage,
          commission_earned: commissionEarned,
          average_rating: avgRating,
          is_salaried: fmd.is_salaried || false,
        };
      });

      setDriverStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    let filtered = [...driverStats];
    
    if (searchDriver) {
      filtered = filtered.filter(d => 
        d.name.toLowerCase().includes(searchDriver.toLowerCase()) ||
        d.vehicle.toLowerCase().includes(searchDriver.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "revenue": return b.total_revenue - a.total_revenue;
        case "courses": return b.completed_courses - a.completed_courses;
        case "rating": return b.average_rating - a.average_rating;
        case "commission": return b.commission_earned - a.commission_earned;
        default: return 0;
      }
    });

    return filtered;
  }, [driverStats, searchDriver, sortBy]);

  const commissionDrivers = useMemo(() => {
    return driverStats.filter(d => !d.is_salaried && d.commission_percentage > 0);
  }, [driverStats]);

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const periodLabels: Record<PeriodType, string> = {
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année",
    all: "Tout"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Tableau de bord</h2>
              <p className="text-muted-foreground">Performance complète de votre flotte</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Période */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[160px] bg-background/50">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchStats} className="shrink-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "overview", label: "Vue d'ensemble", icon: PieChart },
          { id: "drivers", label: "Chauffeurs", icon: Car },
          { id: "commissions", label: "Commissions", icon: HandCoins },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeView === tab.id ? "default" : "outline"}
            onClick={() => setActiveView(tab.id as typeof activeView)}
            className={`gap-2 shrink-0 ${activeView === tab.id ? "bg-primary shadow-lg" : ""}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Vue d'ensemble */}
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chiffre d'affaires */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-emerald-500/5 to-transparent border border-success/20 p-5">
              {previousPeriodStats && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {getPercentageChange(globalStats.total_revenue, previousPeriodStats.total_revenue) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${
                    getPercentageChange(globalStats.total_revenue, previousPeriodStats.total_revenue) >= 0 
                      ? "text-success" : "text-destructive"
                  }`}>
                    {Math.abs(getPercentageChange(globalStats.total_revenue, previousPeriodStats.total_revenue)).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-success to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Euro className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.total_revenue.toLocaleString('fr-FR')}€</p>
                </div>
              </div>
            </div>

            {/* Commissions */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent border border-primary/20 p-5">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <HandCoins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Commissions</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.total_commissions.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</p>
                </div>
              </div>
            </div>

            {/* Courses terminées */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-info/10 via-cyan-500/5 to-transparent border border-info/20 p-5">
              {previousPeriodStats && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {getPercentageChange(globalStats.completed_courses, previousPeriodStats.completed_courses) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                  <span className={`text-xs font-medium ${
                    getPercentageChange(globalStats.completed_courses, previousPeriodStats.completed_courses) >= 0 
                      ? "text-success" : "text-destructive"
                  }`}>
                    {Math.abs(getPercentageChange(globalStats.completed_courses, previousPeriodStats.completed_courses)).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-info to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Courses terminées</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.completed_courses}</p>
                </div>
              </div>
            </div>

            {/* Taux de complétion */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 via-purple-500/5 to-transparent border border-accent/20 p-5">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taux de réussite</p>
                  <p className="text-2xl font-bold text-foreground">{globalStats.completion_rate.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats secondaires */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              <Clock className="w-6 h-6 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{globalStats.pending_courses}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">En attente</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold">{globalStats.cancelled_courses}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Annulées</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border/50 text-center">
              <Euro className="w-6 h-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{globalStats.average_course_value.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Panier moyen</p>
            </div>
          </div>

          {/* Top 5 chauffeurs */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
            <div className="p-5 border-b border-border/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-warning to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Top 5 chauffeurs</h3>
                <p className="text-sm text-muted-foreground">Par chiffre d'affaires - {periodLabels[period]}</p>
              </div>
            </div>

            <div className="p-5">
              {driverStats.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {driverStats.slice(0, 5).map((driver, index) => (
                    <div
                      key={driver.driver_id}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                        index === 0 ? "bg-warning/10 border border-warning/30" : "bg-muted/20 border border-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        index === 0 ? "bg-warning text-warning-foreground" :
                        index === 1 ? "bg-muted-foreground/60 text-background" :
                        index === 2 ? "bg-orange-600 text-white" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src={driver.photo || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm">
                          {driver.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{driver.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{driver.vehicle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-success">{driver.total_revenue.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">{driver.completed_courses} courses</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vue chauffeurs */}
      {activeView === "drivers" && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un chauffeur..."
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[180px] bg-background/50">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Trier par CA</SelectItem>
                <SelectItem value="courses">Trier par courses</SelectItem>
                <SelectItem value="rating">Trier par note</SelectItem>
                <SelectItem value="commission">Trier par commission</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des chauffeurs */}
          <div className="space-y-3">
            {filteredDrivers.map((driver, index) => (
              <div
                key={driver.driver_id}
                className="relative overflow-hidden rounded-xl bg-card/50 border border-border/50 p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                    index === 0 ? "bg-warning text-warning-foreground" :
                    index === 1 ? "bg-muted-foreground/60 text-background" :
                    index === 2 ? "bg-orange-600 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={driver.photo || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                      {driver.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{driver.name}</p>
                      {driver.is_salaried && <Badge variant="secondary" className="text-xs">Salarié</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{driver.vehicle}</p>
                  </div>
                  
                  <div className="hidden md:grid grid-cols-5 gap-4 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold text-success">{driver.total_revenue.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">CA</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{driver.completed_courses}</p>
                      <p className="text-xs text-muted-foreground">Terminées</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-warning">{driver.pending_courses}</p>
                      <p className="text-xs text-muted-foreground">En attente</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{driver.commission_earned.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="font-bold">{driver.average_rating > 0 ? driver.average_rating.toFixed(1) : "-"}</span>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="md:hidden flex items-center gap-2">
                    <Badge variant="secondary" className="text-success bg-success/10">
                      {driver.total_revenue.toFixed(2)}€
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-xs font-medium">{driver.average_rating > 0 ? driver.average_rating.toFixed(1) : "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredDrivers.length === 0 && (
              <div className="text-center py-12">
                <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucun chauffeur trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vue commissions */}
      {activeView === "commissions" && (
        <div className="space-y-6">
          {/* Résumé commissions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/10 via-emerald-500/5 to-transparent border border-success/20 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-success to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <HandCoins className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total à récupérer</p>
                  <p className="text-3xl font-bold text-success">{globalStats.total_commissions.toFixed(2)}€</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent border border-primary/20 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chauffeurs à commission</p>
                  <p className="text-3xl font-bold">{commissionDrivers.length}</p>
                </div>
              </div>
            </div>
          </div>

          {commissionDrivers.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-card/50 border border-border/50">
              <Euro className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun chauffeur indépendant avec commission</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissionDrivers.map((driver) => (
                <div
                  key={driver.driver_id}
                  className="relative overflow-hidden rounded-xl bg-card/50 border border-border/50 p-5"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={driver.photo || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                        {driver.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{driver.name}</h4>
                          <p className="text-sm text-muted-foreground">{driver.vehicle}</p>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 border-primary/30">
                          {driver.commission_percentage}% commission
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-xl font-bold text-primary">{driver.total_revenue.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">CA généré</p>
                        </div>
                        <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
                          <p className="text-xl font-bold text-success">{driver.commission_earned.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">À récupérer</p>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-xl font-bold">{driver.completed_courses}</p>
                          <p className="text-xs text-muted-foreground">Courses</p>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-warning fill-warning" />
                            <span className="text-xl font-bold">
                              {driver.average_rating > 0 ? driver.average_rating.toFixed(1) : "-"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Note</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
