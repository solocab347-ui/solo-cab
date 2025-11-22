import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Activity, DollarSign, TrendingUp, Gift, CreditCard } from "lucide-react";
import { startOfMonth } from "date-fns";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_drivers: 0,
    validated_drivers: 0,
    pending_drivers: 0,
    total_clients: 0,
    active_subscriptions: 0,
    free_access_count: 0,
    inactive_subscriptions: 0,
    monthly_revenue: 0,
    total_revenue: 0,
    new_subscriptions_month: 0,
    churned_subscriptions_month: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Statistiques générales
      const { data: platformData, error: platformError } = await supabase.rpc("get_platform_stats");
      if (platformError) throw platformError;

      // Statistiques d'abonnements
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("subscription_status, free_access_granted, created_at");
      
      if (driversError) throw driversError;

      // Calculer les statistiques d'abonnements
      const activeSubscriptions = driversData?.filter(d => 
        d.subscription_status === 'active' && !d.free_access_granted
      ).length || 0;

      const freeAccessCount = driversData?.filter(d => 
        d.free_access_granted === true
      ).length || 0;

      const inactiveSubscriptions = driversData?.filter(d => 
        d.subscription_status !== 'active' && !d.free_access_granted
      ).length || 0;

      // Revenus mensuels (49.99€ par abonnement actif)
      const monthlyRevenue = activeSubscriptions * 49.99;

      // Nouveaux abonnements ce mois
      const startOfCurrentMonth = startOfMonth(new Date());
      const newSubscriptionsMonth = driversData?.filter(d => 
        new Date(d.created_at) >= startOfCurrentMonth && 
        d.subscription_status === 'active'
      ).length || 0;

      // Résiliations ce mois (approximation basée sur les inactifs)
      const churned = driversData?.filter(d => 
        d.subscription_status !== 'active' && 
        !d.free_access_granted
      ).length || 0;

      const platformStats = platformData as any;

      setStats({
        total_users: platformStats?.total_users || 0,
        total_drivers: platformStats?.total_drivers || 0,
        validated_drivers: platformStats?.validated_drivers || 0,
        pending_drivers: platformStats?.pending_drivers || 0,
        total_clients: platformStats?.total_clients || 0,
        active_subscriptions: activeSubscriptions,
        free_access_count: freeAccessCount,
        inactive_subscriptions: inactiveSubscriptions,
        monthly_revenue: monthlyRevenue,
        total_revenue: monthlyRevenue, // Simplification
        new_subscriptions_month: newSubscriptionsMonth,
        churned_subscriptions_month: churned,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques d'abonnements - PRIORITÉ #1 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Revenus et Abonnements
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR (Revenus Mensuels)</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                {stats.monthly_revenue.toFixed(2)}€
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {stats.active_subscriptions} × 49.99€
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnements Actifs</CardTitle>
              <Activity className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {stats.active_subscriptions}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Chauffeurs payants
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accès Gratuits</CardTitle>
              <Gift className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {stats.free_access_count}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                Chauffeurs en période gratuite
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nouveaux ce mois</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                +{stats.new_subscriptions_month}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                Nouveaux abonnements
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistiques générales de la plateforme */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Vue d'ensemble de la plateforme
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_drivers} chauffeurs, {stats.total_clients} clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chauffeurs Validés</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.validated_drivers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending_drivers} en attente de validation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnements Inactifs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inactive_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Chauffeurs sans abonnement actif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_drivers > 0 
                  ? ((stats.active_subscriptions / stats.total_drivers) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Chauffeurs validés → abonnés
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
