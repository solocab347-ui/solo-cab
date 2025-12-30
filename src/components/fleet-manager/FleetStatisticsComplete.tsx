import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Euro,
  Building2,
  Handshake,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  PieChart,
  Star,
  RefreshCw,
  HandCoins,
  Search
} from "lucide-react";

interface FleetStatisticsCompleteProps {
  fleetManagerId: string;
}

interface CourseStats {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  accepted: number;
}

interface RevenueStats {
  total: number;
  commissionsReceived: number;
  commissionsDue: number;
  averagePerCourse: number;
}

interface DriverRanking {
  id: string;
  name: string;
  photo?: string;
  vehicle: string;
  coursesCount: number;
  revenue: number;
  rating: number;
  commissionPercentage: number;
  commissionAmount: number;
  isSalaried: boolean;
}

interface PartnerRanking {
  id: string;
  name: string;
  photo?: string;
  type: 'driver' | 'company';
  coursesCount: number;
  revenue: number;
  commissionPercentage?: number;
}

interface GrowthStats {
  coursesGrowth: number;
  revenueGrowth: number;
  driversGrowth: number;
  clientsGrowth: number;
}

export function FleetStatisticsComplete({ fleetManagerId }: FleetStatisticsCompleteProps) {
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [searchDriver, setSearchDriver] = useState("");
  
  const [courseStats, setCourseStats] = useState<CourseStats>({
    total: 0, completed: 0, cancelled: 0, pending: 0, accepted: 0
  });
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    total: 0, commissionsReceived: 0, commissionsDue: 0, averagePerCourse: 0
  });
  const [clientsCount, setClientsCount] = useState(0);
  const [driversCount, setDriversCount] = useState(0);
  const [topDrivers, setTopDrivers] = useState<DriverRanking[]>([]);
  const [topPartnerDrivers, setTopPartnerDrivers] = useState<PartnerRanking[]>([]);
  const [topCompanies, setTopCompanies] = useState<PartnerRanking[]>([]);
  const [growthStats, setGrowthStats] = useState<GrowthStats>({
    coursesGrowth: 0, revenueGrowth: 0, driversGrowth: 0, clientsGrowth: 0
  });
  const [distanceStats, setDistanceStats] = useState({ total: 0, duration: 0 });
  const [devisStats, setDevisStats] = useState({ total: 0, accepted: 0, rejected: 0, pending: 0, conversionRate: 0 });

  const dateRange = useMemo(() => {
    const today = new Date();
    switch (periodFilter) {
      case "today":
        return { start: startOfDay(today), end: endOfDay(today) };
      case "week":
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "year":
        return { start: startOfYear(today), end: endOfYear(today) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: new Date(customStartDate), end: new Date(customEndDate) };
        }
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  }, [periodFilter, customStartDate, customEndDate]);

  const previousDateRange = useMemo(() => {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.end.getTime() - duration)
    };
  }, [dateRange]);

  useEffect(() => {
    if (fleetManagerId) {
      fetchAllStats();
    }
  }, [fleetManagerId, dateRange]);

  const fetchAllStats = async () => {
    if (!fleetManagerId) return;
    setLoading(true);

    try {
      await Promise.all([
        fetchCourseAndRevenueStats(),
        fetchDriversAndClients(),
        fetchDriverRankings(),
        fetchPartnerRankings(),
        fetchGrowthStats(),
        fetchDevisStats()
      ]);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseAndRevenueStats = async () => {
    // Get fleet drivers
    const { data: fmdData } = await supabase
      .from("fleet_manager_drivers")
      .select("driver_id, commission_percentage, is_salaried")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    if (!fmdData || fmdData.length === 0) {
      setCourseStats({ total: 0, completed: 0, cancelled: 0, pending: 0, accepted: 0 });
      setRevenueStats({ total: 0, commissionsReceived: 0, commissionsDue: 0, averagePerCourse: 0 });
      return;
    }

    const driverIds = fmdData.map(d => d.driver_id);

    // Fetch courses
    const { data: courses } = await supabase
      .from("courses")
      .select("id, status, distance_km, duration_minutes")
      .in("driver_id", driverIds)
      .gte("scheduled_date", dateRange.start.toISOString())
      .lte("scheduled_date", dateRange.end.toISOString());

    // Fetch paid invoices
    const { data: factures } = await supabase
      .from("factures")
      .select("amount, driver_id")
      .in("driver_id", driverIds)
      .eq("payment_status", "paid")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const totalRevenue = factures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const completedCourses = courses?.filter(c => c.status === 'completed') || [];

    // Calculate commissions
    let totalCommissions = 0;
    fmdData.forEach(fmd => {
      if (!fmd.is_salaried && fmd.commission_percentage > 0) {
        const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
        const driverRevenue = driverFactures.reduce((sum, f) => sum + Number(f.amount), 0);
        totalCommissions += driverRevenue * (fmd.commission_percentage / 100);
      }
    });

    // Add partnership commissions
    const { data: partnerships } = await supabase
      .from("fleet_driver_partnerships")
      .select("total_owed")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    const partnershipCommissions = partnerships?.reduce((sum, p) => sum + Number(p.total_owed || 0), 0) || 0;

    setCourseStats({
      total: courses?.length || 0,
      completed: completedCourses.length,
      cancelled: courses?.filter(c => c.status === 'cancelled').length || 0,
      pending: courses?.filter(c => c.status === 'pending').length || 0,
      accepted: courses?.filter(c => c.status === 'accepted').length || 0
    });

    setRevenueStats({
      total: totalRevenue,
      commissionsReceived: totalCommissions + partnershipCommissions,
      commissionsDue: partnershipCommissions,
      averagePerCourse: completedCourses.length > 0 ? totalRevenue / completedCourses.length : 0
    });

    const totalDistance = courses?.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0) || 0;
    const totalDuration = courses?.reduce((sum, c) => sum + (Number(c.duration_minutes) || 0), 0) || 0;
    setDistanceStats({ total: totalDistance, duration: totalDuration });
  };

  const fetchDriversAndClients = async () => {
    const { data: drivers } = await supabase
      .from("fleet_manager_drivers")
      .select("id")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    const { data: clients } = await supabase
      .from("fleet_manager_clients")
      .select("id")
      .eq("fleet_manager_id", fleetManagerId);

    setDriversCount(drivers?.length || 0);
    setClientsCount(clients?.length || 0);
  };

  const fetchDriverRankings = async () => {
    const { data: fmdData } = await supabase
      .from("fleet_manager_drivers")
      .select(`
        driver_id,
        commission_percentage,
        is_salaried,
        driver:drivers(id, vehicle_model, vehicle_brand, user_id, rating)
      `)
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    if (!fmdData) return;

    const driverIds = fmdData.map(d => d.driver_id);
    const userIds = fmdData.filter(d => d.driver).map(d => (d.driver as any).user_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, profile_photo_url")
      .in("id", userIds);

    const { data: courses } = await supabase
      .from("courses")
      .select("id, driver_id, status")
      .in("driver_id", driverIds)
      .eq("status", "completed")
      .gte("scheduled_date", dateRange.start.toISOString())
      .lte("scheduled_date", dateRange.end.toISOString());

    const { data: factures } = await supabase
      .from("factures")
      .select("amount, driver_id")
      .in("driver_id", driverIds)
      .eq("payment_status", "paid")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const rankings: DriverRanking[] = fmdData.map(fmd => {
      const driverCourses = courses?.filter(c => c.driver_id === fmd.driver_id) || [];
      const driverFactures = factures?.filter(f => f.driver_id === fmd.driver_id) || [];
      const revenue = driverFactures.reduce((sum, f) => sum + Number(f.amount), 0);
      const profile = profiles?.find(p => p.id === (fmd.driver as any)?.user_id);
      const commissionAmount = !fmd.is_salaried && fmd.commission_percentage > 0 
        ? revenue * (fmd.commission_percentage / 100) : 0;

      return {
        id: fmd.driver_id,
        name: profile?.full_name || "Chauffeur",
        photo: profile?.profile_photo_url || undefined,
        vehicle: `${(fmd.driver as any)?.vehicle_brand || ""} ${(fmd.driver as any)?.vehicle_model || ""}`.trim(),
        coursesCount: driverCourses.length,
        revenue,
        rating: (fmd.driver as any)?.rating || 0,
        commissionPercentage: fmd.commission_percentage || 0,
        commissionAmount,
        isSalaried: fmd.is_salaried || false
      };
    });

    rankings.sort((a, b) => b.revenue - a.revenue);
    setTopDrivers(rankings);
  };

  const fetchPartnerRankings = async () => {
    // Partner drivers (from fleet_driver_partnerships)
    const { data: partnerships } = await supabase
      .from("fleet_driver_partnerships")
      .select("id, driver_id, commission_percentage, total_owed")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    const partnerRankings: PartnerRanking[] = [];
    
    if (partnerships) {
      for (const p of partnerships) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("user_id, company_name")
          .eq("id", p.driver_id)
          .single();

        if (driver) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", driver.user_id)
            .single();

          const { data: commissions } = await supabase
            .from("partnership_course_commissions")
            .select("id, course_amount")
            .eq("partnership_id", p.id);

          partnerRankings.push({
            id: p.driver_id,
            name: profile?.full_name || driver.company_name || "Partenaire",
            photo: profile?.profile_photo_url || undefined,
            type: 'driver',
            coursesCount: commissions?.length || 0,
            revenue: commissions?.reduce((sum, c) => sum + Number(c.course_amount || 0), 0) || 0,
            commissionPercentage: p.commission_percentage
          });
        }
      }
    }

    partnerRankings.sort((a, b) => b.revenue - a.revenue);
    setTopPartnerDrivers(partnerRankings.slice(0, 5));

    // Company agreements
    const { data: companyAgreements } = await supabase
      .from("company_fleet_agreements")
      .select("id, company_id")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "accepted");

    const companyRankings: PartnerRanking[] = [];
    
    if (companyAgreements) {
      for (const ca of companyAgreements) {
        const { data: company } = await supabase
          .from("companies")
          .select("company_name")
          .eq("id", ca.company_id)
          .single();

        if (company) {
          const { data: payments } = await supabase
            .from("company_fleet_payments")
            .select("amount, courses_count")
            .eq("agreement_id", ca.id)
            .eq("status", "received");

          companyRankings.push({
            id: ca.company_id,
            name: company.company_name || "Entreprise",
            type: 'company',
            coursesCount: payments?.reduce((sum, p) => sum + (p.courses_count || 0), 0) || 0,
            revenue: payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0
          });
        }
      }
    }

    companyRankings.sort((a, b) => b.revenue - a.revenue);
    setTopCompanies(companyRankings.slice(0, 5));
  };

  const fetchGrowthStats = async () => {
    const { data: fmdData } = await supabase
      .from("fleet_manager_drivers")
      .select("driver_id")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    const driverIds = fmdData?.map(d => d.driver_id) || [];

    // Current period
    const { data: currentCourses } = await supabase
      .from("courses")
      .select("id")
      .in("driver_id", driverIds)
      .eq("status", "completed")
      .gte("scheduled_date", dateRange.start.toISOString())
      .lte("scheduled_date", dateRange.end.toISOString());

    const { data: currentFactures } = await supabase
      .from("factures")
      .select("amount")
      .in("driver_id", driverIds)
      .eq("payment_status", "paid")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Previous period
    const { data: prevCourses } = await supabase
      .from("courses")
      .select("id")
      .in("driver_id", driverIds)
      .eq("status", "completed")
      .gte("scheduled_date", previousDateRange.start.toISOString())
      .lte("scheduled_date", previousDateRange.end.toISOString());

    const { data: prevFactures } = await supabase
      .from("factures")
      .select("amount")
      .in("driver_id", driverIds)
      .eq("payment_status", "paid")
      .gte("created_at", previousDateRange.start.toISOString())
      .lte("created_at", previousDateRange.end.toISOString());

    const currentCoursesCount = currentCourses?.length || 0;
    const prevCoursesCount = prevCourses?.length || 0;
    const currentRevenue = currentFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const prevRevenue = prevFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

    setGrowthStats({
      coursesGrowth: prevCoursesCount > 0 ? ((currentCoursesCount - prevCoursesCount) / prevCoursesCount) * 100 : 0,
      revenueGrowth: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      driversGrowth: 0,
      clientsGrowth: 0
    });
  };

  const fetchDevisStats = async () => {
    const { data: fmdData } = await supabase
      .from("fleet_manager_drivers")
      .select("driver_id")
      .eq("fleet_manager_id", fleetManagerId)
      .eq("status", "active");

    const driverIds = fmdData?.map(d => d.driver_id) || [];

    const { data: devis } = await supabase
      .from("devis")
      .select("status")
      .in("driver_id", driverIds)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const total = devis?.length || 0;
    const accepted = devis?.filter(d => d.status === 'accepted').length || 0;
    const rejected = devis?.filter(d => d.status === 'rejected').length || 0;
    const pending = devis?.filter(d => d.status === 'pending').length || 0;

    setDevisStats({
      total,
      accepted,
      rejected,
      pending,
      conversionRate: total > 0 ? (accepted / total) * 100 : 0
    });
  };

  const filteredDrivers = useMemo(() => {
    if (!searchDriver) return topDrivers;
    return topDrivers.filter(d => 
      d.name.toLowerCase().includes(searchDriver.toLowerCase()) ||
      d.vehicle.toLowerCase().includes(searchDriver.toLowerCase())
    );
  }, [topDrivers, searchDriver]);

  const GrowthIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center gap-1 text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {value >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );

  const PartnerCard = ({ partner, rank }: { partner: PartnerRanking | DriverRanking; rank: number }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
        {rank}
      </div>
      <Avatar className="w-10 h-10 border border-border">
        <AvatarImage src={partner.photo} />
        <AvatarFallback className="text-xs">
          {partner.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{partner.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{partner.coursesCount} courses</span>
          {partner.commissionPercentage && (
            <Badge variant="outline" className="text-[10px] px-1">
              {partner.commissionPercentage}%
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{partner.revenue.toFixed(0)} €</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-white/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Statistiques Complètes</CardTitle>
                <p className="text-sm text-muted-foreground">Performance de votre flotte</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchAllStats}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {periodFilter === 'custom' && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Du</Label>
                <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Au</Label>
                <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-auto" />
              </div>
            </div>
          )}
          
          <Badge variant="outline" className="w-fit mt-2">
            <Calendar className="w-3 h-3 mr-1" />
            {format(dateRange.start, "dd MMM yyyy", { locale: fr })} - {format(dateRange.end, "dd MMM yyyy", { locale: fr })}
          </Badge>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-3xl font-bold text-green-500">{revenueStats.total.toFixed(0)} €</p>
                <GrowthIndicator value={growthStats.revenueGrowth} />
              </div>
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Euro className="w-7 h-7 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses terminées</p>
                <p className="text-3xl font-bold text-blue-500">{courseStats.completed}</p>
                <GrowthIndicator value={growthStats.coursesGrowth} />
              </div>
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Car className="w-7 h-7 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chauffeurs actifs</p>
                <p className="text-3xl font-bold text-purple-500">{driversCount}</p>
              </div>
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commissions</p>
                <p className="text-3xl font-bold text-orange-500">{revenueStats.commissionsReceived.toFixed(0)} €</p>
              </div>
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <HandCoins className="w-7 h-7 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-1">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Chauffeurs</span>
          </TabsTrigger>
          <TabsTrigger value="partnerships" className="gap-1">
            <Handshake className="w-4 h-4" />
            <span className="hidden sm:inline">Partenariats</span>
          </TabsTrigger>
          <TabsTrigger value="rankings" className="gap-1">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Classements</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  Statuts des courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>Terminées</span>
                    </div>
                    <Badge className="bg-green-500">{courseStats.completed}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>Acceptées</span>
                    </div>
                    <Badge className="bg-blue-500">{courseStats.accepted}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span>En attente</span>
                    </div>
                    <Badge className="bg-yellow-500">{courseStats.pending}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>Annulées</span>
                    </div>
                    <Badge className="bg-red-500">{courseStats.cancelled}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Euro className="w-5 h-5 text-green-500" />
                  Analyse financière
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <span>CA total</span>
                    <span className="font-bold text-green-500">{revenueStats.total.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                    <span>Commissions à récupérer</span>
                    <span className="font-bold text-orange-500">{revenueStats.commissionsReceived.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <span>Moyenne par course</span>
                    <span className="font-bold text-blue-500">{revenueStats.averagePerCourse.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                    <span>Clients</span>
                    <span className="font-bold text-purple-500">{clientsCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{distanceStats.total.toFixed(0)} km</p>
                <p className="text-sm text-muted-foreground">Distance parcourue</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{(distanceStats.duration / 60).toFixed(0)} h</p>
                <p className="text-sm text-muted-foreground">Temps de conduite</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{devisStats.total}</p>
                <p className="text-sm text-muted-foreground">Devis émis</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{devisStats.conversionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Taux conversion</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drivers */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un chauffeur..."
                value={searchDriver}
                onChange={(e) => setSearchDriver(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredDrivers.map((driver, i) => (
              <Card key={driver.id} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {i + 1}
                    </div>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={driver.photo} />
                      <AvatarFallback>{driver.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">{driver.vehicle}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-green-500">{driver.revenue.toFixed(0)} €</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{driver.coursesCount} courses</span>
                        {driver.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {driver.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {!driver.isSalaried && driver.commissionPercentage > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {driver.commissionPercentage}% - {driver.commissionAmount.toFixed(0)} €
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Partnerships */}
        <TabsContent value="partnerships" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Chauffeurs partenaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPartnerDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun partenariat actif</p>
                ) : (
                  <div className="space-y-2">
                    {topPartnerDrivers.map((p, i) => (
                      <PartnerCard key={p.id} partner={p} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-500" />
                  Entreprises partenaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun accord entreprise actif</p>
                ) : (
                  <div className="space-y-2">
                    {topCompanies.map((c, i) => (
                      <PartnerCard key={c.id} partner={c} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rankings */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top 5 Chauffeurs (CA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topDrivers.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {topDrivers.slice(0, 5).map((d, i) => (
                      <PartnerCard key={d.id} partner={d} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top 5 par nombre de courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {[...topDrivers].sort((a, b) => b.coursesCount - a.coursesCount).slice(0, 5).map((d, i) => (
                      <PartnerCard key={d.id} partner={d} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
