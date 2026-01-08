import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Activity, DollarSign, TrendingUp, Gift, CreditCard, Building2, Truck } from "lucide-react";
import { startOfMonth } from "date-fns";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_drivers: 0,
    validated_drivers: 0,
    pending_drivers: 0,
    total_clients: 0,
    clients_driver: 0,
    clients_company: 0,
    clients_fleet: 0,
    total_companies: 0,
    total_fleet_managers: 0,
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
      // Statistiques d'abonnements et chauffeurs
      // EXCLUSION: Comptes de démonstration non inclus dans les statistiques
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select("subscription_paid, subscription_status, free_access_granted, created_at, status")
        .eq("is_demo_account", false);
      
      if (driversError) throw driversError;

      // Récupérer les IDs des chauffeurs démo pour les exclure
      const { data: demoDrivers } = await supabase
        .from("drivers")
        .select("id")
        .eq("is_demo_account", true);
      
      const demoDriverIds = demoDrivers?.map(d => d.id) || [];

      // 1. TOUS les clients de la table clients (sans exclusion complexe)
      const { count: clientsFromTable } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // Clients liés à un chauffeur indépendant (driver_id non null, fleet_manager_id null)
      const { count: clientsDriver } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .not("driver_id", "is", null)
        .is("fleet_manager_id", null);

      // Clients liés à un gestionnaire de flotte
      const { count: clientsFleet } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .not("fleet_manager_id", "is", null);

      // 2. Collaborateurs d'entreprises (table company_employees)
      const { count: companyEmployees } = await supabase
        .from("company_employees")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Compter les entreprises
      const { count: totalCompanies } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });

      // Compter les gestionnaires de flotte
      const { count: totalFleetManagers } = await supabase
        .from("fleet_managers")
        .select("*", { count: "exact", head: true });

      const totalDrivers = driversData?.length || 0;

      // Total clients = clients table + collaborateurs entreprises
      const totalClients = (clientsFromTable || 0) + (companyEmployees || 0);

      // Total utilisateurs = chauffeurs + clients globaux + entreprises + gestionnaires de flotte
      const totalUsers = totalDrivers + totalClients + (totalCompanies || 0) + (totalFleetManagers || 0);

      // Compter les chauffeurs validés
      const validatedDrivers = driversData?.filter(d => d.status === 'validated').length || 0;

      // Compter les chauffeurs en attente (pending + on_hold)
      const pendingDrivers = driversData?.filter(d => 
        d.status === 'pending' || d.status === 'on_hold'
      ).length || 0;

      // CRITIQUE: Calculer les abonnements payants actifs
      const activeSubscriptions = driversData?.filter(d => 
        d.status === 'validated' &&
        (d.subscription_paid === true || d.subscription_status === 'active') && 
        !d.free_access_granted
      ).length || 0;

      // Compter les accès gratuits actifs
      const freeAccessCount = driversData?.filter(d => 
        d.free_access_granted === true
      ).length || 0;

      // Compter les abonnements inactifs
      const inactiveSubscriptions = driversData?.filter(d => 
        d.status === 'validated' &&
        d.subscription_paid !== true && 
        d.subscription_status !== 'active' && 
        !d.free_access_granted
      ).length || 0;

      // Revenus mensuels
      const monthlyRevenue = activeSubscriptions * 49.99;

      // Nouveaux abonnements ce mois
      const startOfCurrentMonth = startOfMonth(new Date());
      const newSubscriptionsMonth = driversData?.filter(d => 
        new Date(d.created_at) >= startOfCurrentMonth && 
        d.status === 'validated' &&
        (d.subscription_paid === true || d.subscription_status === 'active')
      ).length || 0;

      setStats({
        total_users: totalUsers,
        total_drivers: totalDrivers,
        validated_drivers: validatedDrivers,
        pending_drivers: pendingDrivers,
        total_clients: totalClients,
        clients_driver: clientsDriver || 0,
        clients_company: companyEmployees || 0,
        clients_fleet: clientsFleet || 0,
        total_companies: totalCompanies || 0,
        total_fleet_managers: totalFleetManagers || 0,
        active_subscriptions: activeSubscriptions,
        free_access_count: freeAccessCount,
        inactive_subscriptions: inactiveSubscriptions,
        monthly_revenue: monthlyRevenue,
        total_revenue: monthlyRevenue,
        new_subscriptions_month: newSubscriptionsMonth,
        churned_subscriptions_month: 0,
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                Tous types confondus
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chauffeurs</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_drivers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.validated_drivers} validés, {stats.pending_drivers} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_clients}</div>
              <p className="text-xs text-muted-foreground">
                {stats.clients_driver} chauffeurs, {stats.clients_company} entreprises, {stats.clients_fleet} flottes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_companies}</div>
              <p className="text-xs text-muted-foreground">
                Comptes entreprise
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestionnaires Flotte</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_fleet_managers}</div>
              <p className="text-xs text-muted-foreground">
                Fleet managers
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
                {stats.validated_drivers > 0 
                  ? ((stats.active_subscriptions / stats.validated_drivers) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Validés → abonnés
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
