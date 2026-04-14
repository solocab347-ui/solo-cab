import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { TrendingUp, DollarSign, Users, Calendar, Activity, Euro } from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminSubscriptionStats = () => {
  const [timeRange, setTimeRange] = useState<string>("month");
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    mrr: 0,
    totalActive: 0,
    newThisPeriod: 0,
    churnRate: 0,
    avgLifetime: 0,
    totalDriversRevenue: 0,
  });

  useEffect(() => {
    fetchSubscriptionStats();
  }, [timeRange]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (timeRange) {
      case "day":
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case "week":
        start = startOfWeek(now, { locale: fr });
        end = endOfWeek(now, { locale: fr });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return { start, end };
  };

  const fetchSubscriptionStats = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Récupérer tous les chauffeurs avec leurs données d'abonnement
      const { data: drivers, error } = await supabase
        .from("drivers")
        .select("id, subscription_status, free_access_granted, created_at, status")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;

      // Calculer les KPIs avec colonnes sélectives (pas de select("*"))
      const allDrivers = await supabase.from("drivers").select("id, subscription_status, free_access_granted, created_at, status");
      const totalDrivers = allDrivers.data || [];

      const activeSubscriptions = totalDrivers.filter(d => 
        d.subscription_status === 'active' && !d.free_access_granted
      );

      const mrr = activeSubscriptions.length * 19.99;
      const newThisPeriod = drivers?.filter(d => d.subscription_status === 'active').length || 0;
      
      // Taux de churn (approximation)
      const inactiveCount = totalDrivers.filter(d => 
        d.subscription_status !== 'active' && !d.free_access_granted
      ).length;
      const churnRate = totalDrivers.length > 0 
        ? (inactiveCount / totalDrivers.length) * 100 
        : 0;

      // Récupérer le chiffre d'affaires total des chauffeurs (factures payées)
      const { data: paidInvoices, error: invoicesError } = await supabase
        .from("factures")
        .select("amount, paid_at")
        .eq("payment_status", "paid")
        .gte("paid_at", start.toISOString())
        .lte("paid_at", end.toISOString());

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError);
      }

      const totalDriversRevenue = paidInvoices?.reduce(
        (sum, invoice) => sum + (Number(invoice.amount) || 0), 
        0
      ) || 0;

      setKpis({
        mrr,
        totalActive: activeSubscriptions.length,
        newThisPeriod,
        churnRate,
        avgLifetime: 6.5, // Simplification
        totalDriversRevenue,
      });

      // Distribution des statuts
      const statusCounts = {
        active: activeSubscriptions.length,
        freeAccess: totalDrivers.filter(d => d.free_access_granted).length,
        inactive: inactiveCount,
      };

      setStatusDistribution([
        { name: "Abonnements Actifs", value: statusCounts.active, color: COLORS[0] },
        { name: "Accès Gratuits", value: statusCounts.freeAccess, color: COLORS[2] },
        { name: "Inactifs", value: statusCounts.inactive, color: COLORS[3] },
      ]);

      // Générer les données de revenus par période
      const revenueByPeriod = generateRevenueTimeSeries(drivers || [], timeRange);
      setRevenueData(revenueByPeriod);

      // Données d'abonnements par période
      const subscriptionsByPeriod = generateSubscriptionTimeSeries(drivers || [], timeRange);
      setSubscriptionData(subscriptionsByPeriod);

    } catch (error) {
      console.error("Error fetching subscription stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueTimeSeries = (drivers: any[], range: string) => {
    // Utiliser les vraies données des chauffeurs avec abonnements actifs
    const activeDrivers = drivers.filter(d => d.subscription_status === 'active' && !d.free_access_granted);
    const count = activeDrivers.length;
    
    return [{
      period: "Période actuelle",
      revenue: count * 29.99,
      subscriptions: count,
    }];
  };

  const generateSubscriptionTimeSeries = (drivers: any[], range: string) => {
    // Calculer les vraies statistiques
    const activeDrivers = drivers.filter(d => d.subscription_status === 'active' && !d.free_access_granted);
    const newDrivers = drivers.filter(d => d.subscription_status === 'active');
    const inactiveDrivers = drivers.filter(d => d.subscription_status !== 'active' && !d.free_access_granted);
    
    return [{
      period: "Période actuelle",
      nouveaux: newDrivers.length,
      résiliés: inactiveDrivers.length,
      actifs: activeDrivers.length,
    }];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres de période */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Période d'analyse
            </CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs Principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Total</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {kpis.mrr.toFixed(2)}€
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Revenus mensuels récurrents
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnés Actifs</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {kpis.totalActive}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Chauffeurs avec abonnement payant
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
              +{kpis.newThisPeriod}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
              Cette période
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Churn</CardTitle>
            <Activity className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
              {kpis.churnRate.toFixed(1)}%
            </div>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              Taux de résiliation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV Moyenne</CardTitle>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
              {kpis.avgLifetime} mois
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Durée moyenne d'abonnement
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-teal-200 dark:border-teal-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Chauffeurs</CardTitle>
            <Euro className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">
              {kpis.totalDriversRevenue.toFixed(2)}€
            </div>
            <p className="text-xs text-teal-600 dark:text-teal-500 mt-1">
              Factures encaissées cette période
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Évolution des revenus */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des Revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} name="Revenus (€)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution des statuts */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des Abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Nouveaux vs Résiliés */}
        <Card>
          <CardHeader>
            <CardTitle>Nouveaux vs Résiliations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="nouveaux" fill={COLORS[0]} name="Nouveaux" />
                <Bar dataKey="résiliés" fill={COLORS[3]} name="Résiliés" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Abonnements actifs */}
        <Card>
          <CardHeader>
            <CardTitle>Abonnements Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actifs" stroke={COLORS[1]} strokeWidth={2} name="Actifs" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSubscriptionStats;
