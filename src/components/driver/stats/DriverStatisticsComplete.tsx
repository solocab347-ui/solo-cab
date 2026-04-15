import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Euro,
  Building2,
  Handshake,
  Filter,
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
  Star
} from "lucide-react";

interface DriverStatisticsCompleteProps {
  driverProfile: any;
}

interface CourseStats {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  personal: number;
  partner: number;
  fleet: number;
  company: number;
}

interface RevenueStats {
  total: number;
  personal: number;
  partner: number;
  fleet: number;
  company: number;
  netAfterCommissions: number;
  commissionsOwed: number;
  commissionsReceived: number;
}

interface PartnerRanking {
  id: string;
  name: string;
  photo?: string;
  type: 'driver' | 'fleet' | 'company';
  coursesCount: number;
  revenue: number;
  commissionPercentage?: number;
}

interface GrowthStats {
  coursesGrowth: number;
  revenueGrowth: number;
  clientsGrowth: number;
  previousPeriodCourses: number;
  previousPeriodRevenue: number;
  previousPeriodClients: number;
}

export function DriverStatisticsComplete({ driverProfile }: DriverStatisticsCompleteProps) {
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  
  // Stats states
  const [courseStats, setCourseStats] = useState<CourseStats>({
    total: 0, completed: 0, cancelled: 0, pending: 0,
    personal: 0, partner: 0, fleet: 0, company: 0
  });
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    total: 0, personal: 0, partner: 0, fleet: 0, company: 0,
    netAfterCommissions: 0, commissionsOwed: 0, commissionsReceived: 0
  });
  const [clientsCount, setClientsCount] = useState(0);
  const [topPartners, setTopPartners] = useState<PartnerRanking[]>([]);
  const [topFleets, setTopFleets] = useState<PartnerRanking[]>([]);
  const [topCompanies, setTopCompanies] = useState<PartnerRanking[]>([]);
  const [growthStats, setGrowthStats] = useState<GrowthStats>({
    coursesGrowth: 0, revenueGrowth: 0, clientsGrowth: 0,
    previousPeriodCourses: 0, previousPeriodRevenue: 0, previousPeriodClients: 0
  });
  const [distanceStats, setDistanceStats] = useState({ total: 0, duration: 0 });
  const [devisStats, setDevisStats] = useState({ total: 0, accepted: 0, rejected: 0, pending: 0, conversionRate: 0 });

  const driverId = driverProfile?.driver?.id;

  // Calculate date range
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

  // Previous period for growth calculation
  const previousDateRange = useMemo(() => {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.end.getTime() - duration)
    };
  }, [dateRange]);

  useEffect(() => {
    if (driverId) {
      fetchAllStats();
    }
  }, [driverId, dateRange]);

  const fetchAllStats = async () => {
    if (!driverId) return;
    setLoading(true);

    try {
      await Promise.all([
        fetchCourseStats(),
        fetchRevenueStats(),
        fetchClientsStats(),
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

  const fetchCourseStats = async () => {
    // All courses for this driver in period - include financial fields for revenue sync
    const { data: courses } = await supabase
      .from('courses')
      .select('id, status, distance_km, duration_minutes, final_payment_amount, final_payment_status, payment_method, guest_estimated_price')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .gte('scheduled_date', dateRange.start.toISOString())
      .lte('scheduled_date', dateRange.end.toISOString());

    // Get shared courses (partner)
    const { data: sharedCourses } = await supabase
      .from('shared_courses')
      .select('course_id')
      .eq('receiver_driver_id', driverId)
      .eq('status', 'completed');

    const sharedCourseIds = new Set(sharedCourses?.map(sc => sc.course_id) || []);

    // Get company courses
    const { data: companyCourses } = await supabase
      .from('company_courses')
      .select('course_id')
      .in('course_id', courses?.map(c => c.id) || []);

    const companyCourseIds = new Set(companyCourses?.map(cc => cc.course_id) || []);

    // Get fleet courses
    let fleetCourseIds = new Set<string>();
    const { data: fleetPartnership } = await supabase
      .from('fleet_driver_partnerships')
      .select('fleet_manager_id')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .maybeSingle();

    if (fleetPartnership) {
      const { data: fleetCommissions } = await supabase
        .from('partnership_course_commissions')
        .select('course_id')
        .in('course_id', courses?.map(c => c.id) || []);
      
      fleetCourseIds = new Set(fleetCommissions?.map(fc => fc.course_id) || []);
    }

    // Calculate stats - only count completed courses
    const completedCourses = courses?.filter(c => c.status === 'completed') || [];
    const stats: CourseStats = {
      total: completedCourses.length,
      completed: completedCourses.length,
      cancelled: courses?.filter(c => c.status === 'cancelled').length || 0,
      pending: courses?.filter(c => c.status === 'pending').length || 0,
      partner: sharedCourseIds.size,
      company: companyCourseIds.size,
      fleet: fleetCourseIds.size,
      personal: completedCourses.length - sharedCourseIds.size - companyCourseIds.size - fleetCourseIds.size
    };

    setCourseStats(stats);

    // Distance and duration
    const totalDistance = completedCourses.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0);
    const totalDuration = completedCourses.reduce((sum, c) => sum + (Number(c.duration_minutes) || 0), 0);
    setDistanceStats({ total: totalDistance, duration: totalDuration });

    // Store completed courses for revenue sync
    return completedCourses;
  };

  const fetchRevenueStats = async () => {
    // Get all paid invoices
    const { data: factures } = await supabase
      .from('factures')
      .select('amount, course_id')
      .eq('driver_id', driverId)
      .eq('payment_status', 'paid')
      .gte('paid_at', dateRange.start.toISOString())
      .lte('paid_at', dateRange.end.toISOString());

    const totalRevenue = factures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;

    // Get commissions owed (to fleet/partners)
    const { data: commissionsOwed } = await supabase
      .from('partnership_course_commissions')
      .select('commission_amount')
      .eq('payment_status', 'pending')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const totalCommissionsOwed = commissionsOwed?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

    // Get commissions received (from shared courses where we are sender)
    const { data: sharedByMe } = await supabase
      .from('shared_courses')
      .select('commission_amount')
      .eq('sender_driver_id', driverId)
      .eq('status', 'completed')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const totalCommissionsReceived = sharedByMe?.reduce((sum, s) => sum + Number(s.commission_amount || 0), 0) || 0;

    setRevenueStats({
      total: totalRevenue,
      personal: totalRevenue * 0.6, // Estimation for now
      partner: totalRevenue * 0.1,
      fleet: totalRevenue * 0.2,
      company: totalRevenue * 0.1,
      netAfterCommissions: totalRevenue - totalCommissionsOwed + totalCommissionsReceived,
      commissionsOwed: totalCommissionsOwed,
      commissionsReceived: totalCommissionsReceived
    });
  };

  const fetchClientsStats = async () => {
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    setClientsCount(clients?.length || 0);
  };

  const fetchPartnerRankings = async () => {
    // Driver partnerships
    const { data: driverPartnerships } = await supabase
      .from('driver_partnerships')
      .select('id, driver_a_id, driver_b_id, commission_percentage')
      .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
      .eq('status', 'active');

    const partnerRankings: PartnerRanking[] = [];
    
    for (const p of driverPartnerships || []) {
      const partnerId = p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id;
      
      // Get shared courses count
      const { data: sharedCourses } = await supabase
        .from('shared_courses')
        .select('id, course_amount')
        .eq('partnership_id', p.id)
        .eq('status', 'completed');

      // Get partner info
      const { data: partnerDriver } = await supabase
        .from('drivers')
        .select('user_id, company_name')
        .eq('id', partnerId)
        .single();

      if (partnerDriver) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url')
          .eq('id', partnerDriver.user_id)
          .single();

        partnerRankings.push({
          id: partnerId,
          name: profile?.full_name || partnerDriver.company_name || 'Partenaire',
          photo: profile?.profile_photo_url || undefined,
          type: 'driver',
          coursesCount: sharedCourses?.length || 0,
          revenue: sharedCourses?.reduce((sum, s) => sum + Number(s.course_amount || 0), 0) || 0,
          commissionPercentage: p.commission_percentage
        });
      }
    }

    // Sort by courses count
    partnerRankings.sort((a, b) => b.coursesCount - a.coursesCount);
    setTopPartners(partnerRankings.slice(0, 5));

    // Fleet partnerships
    const { data: fleetPartnerships } = await supabase
      .from('fleet_driver_partnerships')
      .select('id, fleet_manager_id, commission_percentage, total_owed, total_paid')
      .eq('driver_id', driverId)
      .eq('status', 'active');

    const fleetRankings: PartnerRanking[] = [];
    for (const fp of fleetPartnerships || []) {
      const { data: fleet } = await supabase
        .from('fleet_managers')
        .select('company_name, logo_url')
        .eq('id', fp.fleet_manager_id)
        .single();

      if (fleet) {
        // Get courses count
        const { data: commissions } = await supabase
          .from('partnership_course_commissions')
          .select('id, course_amount')
          .eq('partnership_id', fp.id);

        fleetRankings.push({
          id: fp.fleet_manager_id,
          name: fleet.company_name || 'Gestionnaire',
          photo: fleet.logo_url || undefined,
          type: 'fleet',
          coursesCount: commissions?.length || 0,
          revenue: commissions?.reduce((sum, c) => sum + Number(c.course_amount || 0), 0) || 0,
          commissionPercentage: fp.commission_percentage
        });
      }
    }

    fleetRankings.sort((a, b) => b.revenue - a.revenue);
    setTopFleets(fleetRankings.slice(0, 5));

    // Company agreements
    const { data: companyAgreements } = await supabase
      .from('company_driver_agreements')
      .select('id, company_id, discount_percentage, total_billed')
      .eq('driver_id', driverId)
      .eq('status', 'accepted');

    const companyRankings: PartnerRanking[] = [];
    for (const ca of companyAgreements || []) {
      const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', ca.company_id)
        .single();

      if (company) {
        // Get courses count from company_courses
        const { data: companyCourses } = await supabase
          .from('company_courses')
          .select('course_id, course:courses(final_payment_amount, guest_estimated_price, status)')
          .eq('company_id', ca.company_id);

        const completedCourses = companyCourses?.filter(
          (cc: any) => cc.course?.status === 'completed'
        ) || [];
        
        const totalRevenue = completedCourses.reduce(
          (sum: number, cc: any) => sum + (Number(cc.course?.final_payment_amount) || Number(cc.course?.guest_estimated_price) || 0), 0
        );

        companyRankings.push({
          id: ca.company_id,
          name: company.company_name || 'Entreprise',
          type: 'company',
          coursesCount: completedCourses.length,
          revenue: totalRevenue || Number(ca.total_billed) || 0,
          commissionPercentage: ca.discount_percentage
        });
      }
    }

    companyRankings.sort((a, b) => b.coursesCount - a.coursesCount);
    setTopCompanies(companyRankings.slice(0, 5));
  };

  const fetchGrowthStats = async () => {
    // Current period
    const { data: currentCourses } = await supabase
      .from('courses')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .eq('status', 'completed')
      .gte('scheduled_date', dateRange.start.toISOString())
      .lte('scheduled_date', dateRange.end.toISOString());

    const { data: currentFactures } = await supabase
      .from('factures')
      .select('amount')
      .eq('driver_id', driverId)
      .eq('payment_status', 'paid')
      .gte('paid_at', dateRange.start.toISOString())
      .lte('paid_at', dateRange.end.toISOString());

    const { data: currentClients } = await supabase
      .from('clients')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Previous period
    const { data: prevCourses } = await supabase
      .from('courses')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .eq('status', 'completed')
      .gte('scheduled_date', previousDateRange.start.toISOString())
      .lte('scheduled_date', previousDateRange.end.toISOString());

    const { data: prevFactures } = await supabase
      .from('factures')
      .select('amount')
      .eq('driver_id', driverId)
      .eq('payment_status', 'paid')
      .gte('paid_at', previousDateRange.start.toISOString())
      .lte('paid_at', previousDateRange.end.toISOString());

    const { data: prevClients } = await supabase
      .from('clients')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .gte('created_at', previousDateRange.start.toISOString())
      .lte('created_at', previousDateRange.end.toISOString());

    const currentCoursesCount = currentCourses?.length || 0;
    const prevCoursesCount = prevCourses?.length || 0;
    const currentRevenue = currentFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const prevRevenue = prevFactures?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const currentClientsCount = currentClients?.length || 0;
    const prevClientsCount = prevClients?.length || 0;

    setGrowthStats({
      coursesGrowth: prevCoursesCount > 0 ? ((currentCoursesCount - prevCoursesCount) / prevCoursesCount) * 100 : 0,
      revenueGrowth: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      clientsGrowth: prevClientsCount > 0 ? ((currentClientsCount - prevClientsCount) / prevClientsCount) * 100 : 0,
      previousPeriodCourses: prevCoursesCount,
      previousPeriodRevenue: prevRevenue,
      previousPeriodClients: prevClientsCount
    });
  };

  const fetchDevisStats = async () => {
    const { data: devis } = await supabase
      .from('devis')
      .select('status')
      .eq('driver_id', driverId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

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

  const GrowthIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center gap-1 text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {value >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );

  const PartnerCard = ({ partner, rank }: { partner: PartnerRanking; rank: number }) => (
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
        <p className="font-semibold text-sm">{partner.revenue.toFixed(2)} €</p>
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
    <div className="space-y-6 p-4">
      {/* Header with filters */}
      <Card className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Tableau de Bord Statistiques</CardTitle>
                <p className="text-sm text-muted-foreground">Analyse complète de votre activité</p>
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
            </div>
          </div>
          
          {periodFilter === 'custom' && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Du</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Au</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          )}
          
          <Badge variant="outline" className="w-fit mt-2">
            <Calendar className="w-3 h-3 mr-1" />
            {format(dateRange.start, "dd MMM yyyy", { locale: fr })} - {format(dateRange.end, "dd MMM yyyy", { locale: fr })}
          </Badge>
        </CardHeader>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-3xl font-bold text-green-500">{revenueStats.total.toFixed(2)} €</p>
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
                <p className="text-sm text-muted-foreground">Nouveaux clients</p>
                <p className="text-3xl font-bold text-purple-500">{clientsCount}</p>
                <GrowthIndicator value={growthStats.clientsGrowth} />
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
                <p className="text-sm text-muted-foreground">Taux conversion devis</p>
                <p className="text-3xl font-bold text-orange-500">{devisStats.conversionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">{devisStats.accepted}/{devisStats.total}</p>
              </div>
              <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for detailed views */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
          <TabsTrigger value="overview" className="gap-1">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-1">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Courses</span>
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Courses by type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  Répartition des courses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>Courses personnelles</span>
                    </div>
                    <Badge variant="secondary">{courseStats.personal}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      <span>Courses partenaires</span>
                    </div>
                    <Badge variant="secondary">{courseStats.partner}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full" />
                      <span>Courses gestionnaire</span>
                    </div>
                    <Badge variant="secondary">{courseStats.fleet}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Courses entreprise</span>
                    </div>
                    <Badge variant="secondary">{courseStats.company}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue breakdown */}
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
                    <span>CA brut</span>
                    <span className="font-bold text-green-500">{revenueStats.total.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                    <span>Commissions à reverser</span>
                    <span className="font-bold text-red-500">-{revenueStats.commissionsOwed.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <span>Commissions reçues</span>
                    <span className="font-bold text-blue-500">+{revenueStats.commissionsReceived.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                    <span className="font-semibold">CA net</span>
                    <span className="font-bold text-primary text-lg">{revenueStats.netAfterCommissions.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distance and time stats */}
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
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{courseStats.completed}</p>
                <p className="text-sm text-muted-foreground">Courses terminées</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">{courseStats.cancelled}</p>
                <p className="text-sm text-muted-foreground">Courses annulées</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Statuts des courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span>Terminées</span>
                    <Badge className="bg-green-500">{courseStats.completed}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-yellow-500/10 rounded">
                    <span>En attente</span>
                    <Badge className="bg-yellow-500">{courseStats.pending}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-red-500/10 rounded">
                    <span>Annulées</span>
                    <Badge className="bg-red-500">{courseStats.cancelled}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Par type de source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-blue-500/10 rounded">
                    <span>Mes clients</span>
                    <Badge variant="outline">{courseStats.personal}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-orange-500/10 rounded">
                    <span>Partenaires chauffeurs</span>
                    <Badge variant="outline">{courseStats.partner}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-purple-500/10 rounded">
                    <span>Gestionnaire de flotte</span>
                    <Badge variant="outline">{courseStats.fleet}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span>Entreprises</span>
                    <Badge variant="outline">{courseStats.company}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance devis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Total émis</span>
                    <Badge variant="outline">{devisStats.total}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span>Acceptés</span>
                    <Badge className="bg-green-500">{devisStats.accepted}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-red-500/10 rounded">
                    <span>Refusés</span>
                    <Badge className="bg-red-500">{devisStats.rejected}</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-yellow-500/10 rounded">
                    <span>En attente</span>
                    <Badge className="bg-yellow-500">{devisStats.pending}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Partnerships Tab */}
        <TabsContent value="partnerships" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Chauffeurs partenaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPartners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun partenariat actif
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topPartners.map((p, i) => (
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
                  Gestionnaires de flotte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topFleets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun partenariat flotte actif
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topFleets.map((f, i) => (
                      <PartnerCard key={f.id} partner={f} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-green-500" />
                  Entreprises
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun accord entreprise actif
                  </p>
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

        {/* Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top 5 Chauffeurs Partenaires
                </CardTitle>
                <p className="text-sm text-muted-foreground">Par volume de courses</p>
              </CardHeader>
              <CardContent>
                {topPartners.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topPartners.map((p, i) => (
                      <PartnerCard key={p.id} partner={p} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Top 5 Gestionnaires de Flotte
                </CardTitle>
                <p className="text-sm text-muted-foreground">Par chiffre d'affaires</p>
              </CardHeader>
              <CardContent>
                {topFleets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topFleets.map((f, i) => (
                      <PartnerCard key={f.id} partner={f} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-green-500" />
                  Top 5 Entreprises
                </CardTitle>
                <p className="text-sm text-muted-foreground">Par volume de courses</p>
              </CardHeader>
              <CardContent>
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune donnée disponible
                  </p>
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
      </Tabs>
    </div>
  );
}
