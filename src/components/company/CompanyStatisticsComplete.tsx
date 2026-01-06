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
  Users,
  Car,
  Euro,
  Building2,
  Handshake,
  Calendar,
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
  Receipt,
  UserCheck,
  Search
} from "lucide-react";

interface CompanyStatisticsCompleteProps {
  companyId: string;
}

interface CourseStats {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  accepted: number;
}

interface SpendingStats {
  total: number;
  paid: number;
  pending: number;
  averagePerCourse: number;
}

interface DriverRanking {
  id: string;
  name: string;
  photo?: string;
  companyName?: string;
  coursesCount: number;
  totalSpent: number;
  rating?: number;
}

interface EmployeeRanking {
  id: string;
  name: string;
  email: string;
  coursesCount: number;
  totalSpent: number;
  department?: string;
}

interface GrowthStats {
  coursesGrowth: number;
  spendingGrowth: number;
}

export function CompanyStatisticsComplete({ companyId }: CompanyStatisticsCompleteProps) {
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [searchDriver, setSearchDriver] = useState("");
  
  const [courseStats, setCourseStats] = useState<CourseStats>({
    total: 0, completed: 0, cancelled: 0, pending: 0, accepted: 0
  });
  const [spendingStats, setSpendingStats] = useState<SpendingStats>({
    total: 0, paid: 0, pending: 0, averagePerCourse: 0
  });
  const [driversCount, setDriversCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [topDrivers, setTopDrivers] = useState<DriverRanking[]>([]);
  const [topFleetManagers, setTopFleetManagers] = useState<DriverRanking[]>([]);
  const [topEmployees, setTopEmployees] = useState<EmployeeRanking[]>([]);
  const [growthStats, setGrowthStats] = useState<GrowthStats>({
    coursesGrowth: 0, spendingGrowth: 0
  });
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
    if (companyId) {
      fetchAllStats();
    }
  }, [companyId, dateRange]);

  const fetchAllStats = async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      await Promise.all([
        fetchCourseAndSpendingStats(),
        fetchDriversAndEmployees(),
        fetchDriverRankings(),
        fetchEmployeeRankings(),
        fetchGrowthStats(),
        fetchDevisStats()
      ]);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseAndSpendingStats = async () => {
    // Get company courses
    const { data: companyCourses } = await supabase
      .from("company_courses")
      .select("course_id")
      .eq("company_id", companyId);

    const courseIds = companyCourses?.map(cc => cc.course_id) || [];

    if (courseIds.length === 0) {
      setCourseStats({ total: 0, completed: 0, cancelled: 0, pending: 0, accepted: 0 });
      setSpendingStats({ total: 0, paid: 0, pending: 0, averagePerCourse: 0 });
      return;
    }

    // Fetch courses within date range
    const { data: courses } = await supabase
      .from("courses")
      .select("id, status")
      .in("id", courseIds)
      .gte("scheduled_date", dateRange.start.toISOString())
      .lte("scheduled_date", dateRange.end.toISOString());

    // Fetch payments
    const { data: payments } = await supabase
      .from("company_payments")
      .select("amount, status")
      .eq("company_id", companyId)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const totalSpent = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const paidAmount = payments?.filter(p => p.status === 'received').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const pendingAmount = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const completedCourses = courses?.filter(c => c.status === 'completed') || [];

    setCourseStats({
      total: courses?.length || 0,
      completed: completedCourses.length,
      cancelled: courses?.filter(c => c.status === 'cancelled').length || 0,
      pending: courses?.filter(c => c.status === 'pending').length || 0,
      accepted: courses?.filter(c => c.status === 'accepted').length || 0
    });

    setSpendingStats({
      total: totalSpent,
      paid: paidAmount,
      pending: pendingAmount,
      averagePerCourse: completedCourses.length > 0 ? totalSpent / completedCourses.length : 0
    });
  };

  const fetchDriversAndEmployees = async () => {
    const { data: drivers } = await supabase
      .from("company_driver_agreements")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "accepted");

    const { data: employees } = await supabase
      .from("company_employees")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_active", true);

    setDriversCount(drivers?.length || 0);
    setEmployeesCount(employees?.length || 0);
  };

  const fetchDriverRankings = async () => {
    // Get driver agreements
    const { data: agreements } = await supabase
      .from("company_driver_agreements")
      .select("driver_id, total_billed")
      .eq("company_id", companyId)
      .eq("status", "accepted");

    if (!agreements || agreements.length === 0) {
      setTopDrivers([]);
      return;
    }

    const driverRankings: DriverRanking[] = [];

    for (const agreement of agreements) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("user_id, company_name, rating")
        .eq("id", agreement.driver_id)
        .single();

      if (driver) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, profile_photo_url")
          .eq("id", driver.user_id)
          .single();

        // Count courses for this driver
        const { data: companyCourses } = await supabase
          .from("company_courses")
          .select("course_id")
          .eq("company_id", companyId);

        const { data: driverCourses } = await supabase
          .from("courses")
          .select("id")
          .eq("driver_id", agreement.driver_id)
          .in("id", companyCourses?.map(cc => cc.course_id) || [])
          .eq("status", "completed");

        driverRankings.push({
          id: agreement.driver_id,
          name: profile?.full_name || "Chauffeur",
          photo: profile?.profile_photo_url || undefined,
          companyName: driver.company_name || undefined,
          coursesCount: driverCourses?.length || 0,
          totalSpent: agreement.total_billed || 0,
          rating: driver.rating || undefined
        });
      }
    }

    driverRankings.sort((a, b) => b.totalSpent - a.totalSpent);
    setTopDrivers(driverRankings);

    // Get fleet manager agreements
    const { data: fleetAgreements } = await supabase
      .from("company_fleet_agreements")
      .select("fleet_manager_id, total_amount")
      .eq("company_id", companyId)
      .eq("status", "accepted");

    const fleetRankings: DriverRanking[] = [];

    if (fleetAgreements) {
      for (const fa of fleetAgreements) {
        const { data: fleet } = await supabase
          .from("fleet_managers")
          .select("company_name, logo_url")
          .eq("id", fa.fleet_manager_id)
          .single();

        if (fleet) {
          fleetRankings.push({
            id: fa.fleet_manager_id,
            name: fleet.company_name || "Gestionnaire",
            photo: fleet.logo_url || undefined,
            coursesCount: 0,
            totalSpent: fa.total_amount || 0
          });
        }
      }
    }

    fleetRankings.sort((a, b) => b.totalSpent - a.totalSpent);
    setTopFleetManagers(fleetRankings.slice(0, 5));
  };

  const fetchEmployeeRankings = async () => {
    const { data: employees } = await supabase
      .from("company_employees")
      .select("id, user_id, department, current_month_spent")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (!employees || employees.length === 0) {
      setTopEmployees([]);
      return;
    }

    const employeeRankings: EmployeeRanking[] = [];

    for (const emp of employees) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", emp.user_id)
        .single();

      // Count courses for this employee
      const { data: empCourses } = await supabase
        .from("company_courses")
        .select("id")
        .eq("company_id", companyId)
        .eq("employee_id", emp.id);

      employeeRankings.push({
        id: emp.id,
        name: profile?.full_name || "Collaborateur",
        email: profile?.email || "",
        coursesCount: empCourses?.length || 0,
        totalSpent: emp.current_month_spent || 0,
        department: emp.department || undefined
      });
    }

    employeeRankings.sort((a, b) => b.coursesCount - a.coursesCount);
    setTopEmployees(employeeRankings);
  };

  const fetchGrowthStats = async () => {
    const { data: companyCourses } = await supabase
      .from("company_courses")
      .select("course_id")
      .eq("company_id", companyId);

    const courseIds = companyCourses?.map(cc => cc.course_id) || [];

    // Current period
    const { data: currentCourses } = await supabase
      .from("courses")
      .select("id")
      .in("id", courseIds)
      .eq("status", "completed")
      .gte("scheduled_date", dateRange.start.toISOString())
      .lte("scheduled_date", dateRange.end.toISOString());

    const { data: currentPayments } = await supabase
      .from("company_payments")
      .select("amount")
      .eq("company_id", companyId)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    // Previous period
    const { data: prevCourses } = await supabase
      .from("courses")
      .select("id")
      .in("id", courseIds)
      .eq("status", "completed")
      .gte("scheduled_date", previousDateRange.start.toISOString())
      .lte("scheduled_date", previousDateRange.end.toISOString());

    const { data: prevPayments } = await supabase
      .from("company_payments")
      .select("amount")
      .eq("company_id", companyId)
      .gte("created_at", previousDateRange.start.toISOString())
      .lte("created_at", previousDateRange.end.toISOString());

    const currentCoursesCount = currentCourses?.length || 0;
    const prevCoursesCount = prevCourses?.length || 0;
    const currentSpending = currentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const prevSpending = prevPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    setGrowthStats({
      coursesGrowth: prevCoursesCount > 0 ? ((currentCoursesCount - prevCoursesCount) / prevCoursesCount) * 100 : 0,
      spendingGrowth: prevSpending > 0 ? ((currentSpending - prevSpending) / prevSpending) * 100 : 0
    });
  };

  const fetchDevisStats = async () => {
    const { data: companyCourses } = await supabase
      .from("company_courses")
      .select("course_id")
      .eq("company_id", companyId);

    const courseIds = companyCourses?.map(cc => cc.course_id) || [];

    const { data: devis } = await supabase
      .from("devis")
      .select("status")
      .in("course_id", courseIds)
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
      (d.companyName && d.companyName.toLowerCase().includes(searchDriver.toLowerCase()))
    );
  }, [topDrivers, searchDriver]);

  const GrowthIndicator = ({ value }: { value: number }) => (
    <div className={`flex items-center gap-1 text-sm ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
      {value >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      <span>{Math.abs(value).toFixed(1)}%</span>
    </div>
  );

  const PartnerCard = ({ partner, rank }: { partner: DriverRanking; rank: number }) => (
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
          {partner.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              {partner.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{partner.totalSpent.toFixed(2)} €</p>
      </div>
    </div>
  );

  const EmployeeCard = ({ employee, rank }: { employee: EmployeeRanking; rank: number }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{employee.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {employee.department && <Badge variant="outline" className="text-[10px]">{employee.department}</Badge>}
          <span>{employee.coursesCount} courses</span>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-sm">{employee.totalSpent.toFixed(2)} €</p>
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
                <CardTitle className="text-2xl">Statistiques Entreprise</CardTitle>
                <p className="text-sm text-muted-foreground">Analyse de vos déplacements professionnels</p>
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

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total dépensé</p>
                <p className="text-3xl font-bold text-red-500">{spendingStats.total.toFixed(2)} €</p>
                <GrowthIndicator value={growthStats.spendingGrowth} />
              </div>
              <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Euro className="w-7 h-7 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chauffeurs</p>
                <p className="text-3xl font-bold text-purple-500">{driversCount}</p>
              </div>
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Handshake className="w-7 h-7 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collaborateurs</p>
                <p className="text-3xl font-bold text-green-500">{employeesCount}</p>
              </div>
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-green-500" />
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
          <TabsTrigger value="employees" className="gap-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Collaborateurs</span>
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
                  Analyse des dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <span>Total facturé</span>
                    <span className="font-bold text-blue-500">{spendingStats.total.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <span>Déjà payé</span>
                    <span className="font-bold text-green-500">{spendingStats.paid.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
                    <span>En attente de paiement</span>
                    <span className="font-bold text-orange-500">{spendingStats.pending.toFixed(2)} €</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                    <span>Moyenne par course</span>
                    <span className="font-bold text-purple-500">{spendingStats.averagePerCourse.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{devisStats.total}</p>
                <p className="text-sm text-muted-foreground">Devis reçus</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{devisStats.accepted}</p>
                <p className="text-sm text-muted-foreground">Devis acceptés</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{devisStats.conversionRate.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Taux acceptation</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <UserCheck className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{driversCount + (topFleetManagers?.length || 0)}</p>
                <p className="text-sm text-muted-foreground">Partenaires actifs</p>
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

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  Chauffeurs indépendants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun chauffeur</p>
                ) : (
                  <div className="space-y-2">
                    {filteredDrivers.map((d, i) => (
                      <PartnerCard key={d.id} partner={d} rank={i + 1} />
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
                {topFleetManagers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun gestionnaire</p>
                ) : (
                  <div className="space-y-2">
                    {topFleetManagers.map((f, i) => (
                      <PartnerCard key={f.id} partner={f} rank={i + 1} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Collaborateurs par utilisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun collaborateur enregistré</p>
              ) : (
                <div className="space-y-2">
                  {topEmployees.map((e, i) => (
                    <EmployeeCard key={e.id} employee={e} rank={i + 1} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rankings */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Chauffeurs (Dépenses)
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
                  Top Collaborateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topEmployees.slice(0, 5).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                ) : (
                  <div className="space-y-2">
                    {topEmployees.slice(0, 5).map((e, i) => (
                      <EmployeeCard key={e.id} employee={e} rank={i + 1} />
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
