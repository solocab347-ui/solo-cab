import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Activity, DollarSign, TrendingUp, Gift, CreditCard, Building2, Truck, Crown, Clock, RefreshCw, CalendarDays, Eye, Car, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlatformStats {
  total_drivers: number;
  validated_drivers: number;
  pending_drivers: number;
  on_hold_drivers: number;
  new_drivers_this_week: number;
  new_drivers_this_month: number;
  public_drivers: number;
  total_pioneers: number;
  validated_pioneers: number;
  pending_pioneers: number;
  pioneers_in_trial: number;
  pioneers_with_subscription: number;
  active_subscriptions: number;
  inactive_subscriptions: number;
  paying_drivers: number;
  free_access_drivers: number;
  trial_drivers: number;
  mrr: number;
  total_clients: number;
  exclusive_clients: number;
  free_clients: number;
  total_users: number;
  total_companies: number;
  total_fleet_managers: number;
  total_courses: number;
  completed_courses: number;
  total_devis: number;
  accepted_devis: number;
}

interface DailyStats {
  drivers_today: number;
  clients_today: number;
  exclusive_clients_today: number;
  free_clients_today: number;
  revenue_today: number;
  courses_today: number;
  completed_courses_today: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch both platform stats and daily stats in parallel
      const [platformResult, dailyResult] = await Promise.all([
        supabase.rpc("get_platform_stats"),
        supabase.rpc("get_daily_stats")
      ]);
      
      if (platformResult.error) throw platformResult.error;
      if (dailyResult.error) throw dailyResult.error;
      
      const statsData = platformResult.data as unknown as PlatformStats;
      const dailyData = dailyResult.data as unknown as DailyStats;
      
      setStats(statsData);
      setDailyStats(dailyData);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Impossible de charger les statistiques</p>
        <Button onClick={fetchStats} variant="outline" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bouton Rafraîchir */}
      <div className="flex justify-end">
        <Button onClick={fetchStats} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* STATISTIQUES DU JOUR - Section prioritaire */}
      {dailyStats && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Statistiques du Jour
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Chauffeurs inscrits aujourd'hui */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chauffeurs inscrits</CardTitle>
                <Car className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                  {dailyStats.drivers_today}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Aujourd'hui
                </p>
              </CardContent>
            </Card>

            {/* Clients inscrits aujourd'hui */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clients inscrits</CardTitle>
                <UserPlus className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {dailyStats.clients_today}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                  {dailyStats.exclusive_clients_today} exclusifs, {dailyStats.free_clients_today} libres
                </p>
              </CardContent>
            </Card>

            {/* Chiffre d'affaires du jour */}
            <Card className="bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/20 dark:to-lime-950/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CA du jour</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                  {(dailyStats.revenue_today / 100).toFixed(2)}€
                </div>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  {dailyStats.completed_courses_today} courses terminées
                </p>
              </CardContent>
            </Card>

            {/* Courses du jour */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Courses du jour</CardTitle>
                <Activity className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                  {dailyStats.courses_today}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Total aujourd'hui
                </p>
              </CardContent>
            </Card>

            {/* Visites du site - Placeholder */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visites solocab.fr</CardTitle>
                <Eye className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                  —
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                  Connecter un outil analytics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
                {stats.mrr.toFixed(2)}€
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {stats.active_subscriptions} × 19.99€/mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnements Payants</CardTitle>
              <Activity className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {stats.paying_drivers}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Chauffeurs avec abonnement actif
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Période d'Essai</CardTitle>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">
                {stats.trial_drivers}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Essais en cours (14 jours)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accès Gratuits</CardTitle>
              <Gift className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                {stats.free_access_drivers}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                Accès accordés manuellement
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Statistiques des Pionniers */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Programme Pionniers
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pionniers</CardTitle>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_pioneers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.validated_pioneers} validés, {stats.pending_pioneers} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pionniers en Essai</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pioneers_in_trial}</div>
              <p className="text-xs text-muted-foreground">
                Période d'essai 14 jours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pionniers Abonnés</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pioneers_with_subscription}</div>
              <p className="text-xs text-muted-foreground">
                Abonnement actif payé
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux Conversion</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_pioneers > 0 ? ((stats.pioneers_with_subscription / stats.total_pioneers) * 100).toFixed(0) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Pionniers → Abonnés
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
                {stats.exclusive_clients} exclusifs, {stats.free_clients} libres
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
              <CardTitle className="text-sm font-medium">Flottes</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_fleet_managers}</div>
              <p className="text-xs text-muted-foreground">
                Gestionnaires de flotte
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nouveaux ce mois</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.new_drivers_this_month}</div>
              <p className="text-xs text-muted-foreground">
                Chauffeurs inscrits
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activité */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Activité de la plateforme
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_courses}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completed_courses} terminées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_devis}</div>
              <p className="text-xs text-muted-foreground">
                {stats.accepted_devis} acceptés ({stats.total_devis > 0 ? ((stats.accepted_devis / stats.total_devis) * 100).toFixed(0) : 0}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profils Publics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.public_drivers}</div>
              <p className="text-xs text-muted-foreground">
                Chauffeurs sur la vitrine
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nouveaux (7j)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.new_drivers_this_week}</div>
              <p className="text-xs text-muted-foreground">
                Cette semaine
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
