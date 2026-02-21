import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  Car, 
  FileText, 
  Euro, 
  TrendingUp, 
  CheckCircle, 
  Crown, 
  Clock, 
  CreditCard, 
  Calendar, 
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Percent,
  Activity,
  Eye,
  Globe
} from "lucide-react";
import { logger } from "@/lib/productionLogger";

const AdminStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [connectionStats, setConnectionStats] = useState<{
    connectedToday: number;
    connectedThisWeek: number;
    connectedThisMonth: number;
    neverConnected: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchConnectionStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      setStats(data);
    } catch (error: any) {
      logger.error("Error fetching admin stats", { error });
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStats = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayRes, weekRes, monthRes, neverRes] = await Promise.all([
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", startOfToday)
          .eq("is_demo_account", false),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", startOfWeek)
          .eq("is_demo_account", false),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", startOfMonth)
          .eq("is_demo_account", false),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .is("last_seen_at", null)
          .eq("is_demo_account", false),
      ]);

      setConnectionStats({
        connectedToday: todayRes.count || 0,
        connectedThisWeek: weekRes.count || 0,
        connectedThisMonth: monthRes.count || 0,
        neverConnected: neverRes.count || 0,
      });
    } catch (error) {
      logger.error("Error fetching connection stats", { error });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des statistiques...</div>;
  }

  if (!stats) return null;

  // Section 0: Connexions & Visites
  const connectionCards = [
    {
      title: "Connectés aujourd'hui",
      value: connectionStats?.connectedToday || 0,
      description: "Chauffeurs inscrits actifs aujourd'hui",
      icon: Activity,
      color: "bg-emerald-500",
    },
    {
      title: "Connectés cette semaine",
      value: connectionStats?.connectedThisWeek || 0,
      description: "7 derniers jours",
      icon: Eye,
      color: "bg-blue-500",
    },
    {
      title: "Connectés ce mois",
      value: connectionStats?.connectedThisMonth || 0,
      description: "Depuis le 1er du mois",
      icon: Globe,
      color: "bg-purple-500",
    },
    {
      title: "Jamais connectés",
      value: connectionStats?.neverConnected || 0,
      description: "Inscrits mais jamais vus",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
  ];

  // Section 1: Revenus et Abonnements
  const revenueCards = [
    {
      title: "MRR (Revenu Mensuel Récurrent)",
      value: `${parseFloat(stats.mrr || 0).toFixed(2)} €`,
      description: `${stats.monthly_subscriptions || 0} mensuels + ${stats.annual_subscriptions || 0} annuels`,
      icon: Euro,
      color: "bg-emerald-500",
    },
    {
      title: "Revenus ce mois",
      value: `${parseFloat(stats.revenue_this_month || 0).toFixed(2)} €`,
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      title: "Revenus totaux (factures)",
      value: `${parseFloat(stats.total_revenue || 0).toFixed(2)} €`,
      icon: CreditCard,
      color: "bg-blue-500",
    },
  ];

  // Section 2: Abonnements
  const subscriptionCards = [
    {
      title: "Abonnements actifs",
      value: stats.active_subscriptions || 0,
      description: `${stats.monthly_subscriptions || 0} mensuels, ${stats.annual_subscriptions || 0} annuels`,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      title: "En période d'essai",
      value: stats.total_trials || 0,
      description: `${stats.trials_14_days || 0} essais 14j, ${stats.trials_30_days || 0} essais 30j`,
      icon: Clock,
      color: "bg-amber-500",
    },
    {
      title: "Essais expirés (non convertis)",
      value: stats.expired_trials || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      title: "Paiements en retard",
      value: stats.subscription_past_due || 0,
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
    {
      title: "Abonnements annulés",
      value: stats.subscription_canceled || 0,
      icon: RefreshCw,
      color: "bg-gray-500",
    },
    {
      title: "Taux de conversion",
      value: `${stats.trial_conversion_rate || 0}%`,
      description: "Essais → Abonnements payants",
      icon: Percent,
      color: "bg-purple-500",
    },
  ];

  // Section 3: Chauffeurs
  const driverCards = [
    {
      title: "Chauffeurs totaux",
      value: stats.total_drivers,
      description: `${stats.validated_drivers} validés, ${stats.pending_drivers} en attente`,
      icon: Car,
      color: "bg-blue-500",
    },
    {
      title: "Nouveaux cette semaine",
      value: stats.new_drivers_this_week || 0,
      icon: UserPlus,
      color: "bg-indigo-500",
    },
    {
      title: "Nouveaux ce mois",
      value: stats.new_drivers_this_month || 0,
      icon: Calendar,
      color: "bg-violet-500",
    },
    {
      title: "Profils publics",
      value: stats.public_drivers,
      description: "Chauffeurs sur la vitrine",
      icon: Users,
      color: "bg-pink-500",
    },
  ];

  // Section 4: Pionniers
  const pioneerCards = [
    {
      title: "Pionniers totaux",
      value: `${stats.validated_pioneers || 0}/${stats.total_pioneers || 0}`,
      description: "Validés / Total",
      icon: Crown,
      color: "bg-amber-500",
    },
    {
      title: "Pionniers en essai",
      value: stats.pioneers_in_trial || 0,
      icon: Clock,
      color: "bg-amber-400",
    },
    {
      title: "Pionniers abonnés",
      value: stats.pioneers_with_subscription || 0,
      icon: CreditCard,
      color: "bg-amber-600",
    },
    {
      title: "Pionniers en attente",
      value: stats.pending_pioneers || 0,
      icon: AlertTriangle,
      color: "bg-yellow-500",
    },
  ];

  // Section 5: Clients et Activité
  const activityCards = [
    {
      title: "Utilisateurs totaux",
      value: stats.total_users,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Clients totaux",
      value: stats.total_clients,
      description: `${stats.exclusive_clients} exclusifs, ${stats.free_clients} libres`,
      icon: Users,
      color: "bg-purple-500",
    },
    {
      title: "Courses",
      value: `${stats.completed_courses}/${stats.total_courses}`,
      description: "Complétées / Total",
      icon: FileText,
      color: "bg-indigo-500",
    },
    {
      title: "Devis acceptés",
      value: `${stats.accepted_devis}/${stats.total_devis}`,
      description: `Taux: ${stats.total_devis > 0 ? Math.round((stats.accepted_devis / stats.total_devis) * 100) : 0}%`,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  const renderSection = (title: string, cards: any[]) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">{title}</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
            <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
            {stat.description && (
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {renderSection("🟢 Connexions & Activité", connectionCards)}
      {renderSection("💰 Revenus et Facturation", revenueCards)}
      {renderSection("📊 Abonnements", subscriptionCards)}
      {renderSection("🚗 Chauffeurs", driverCards)}
      {renderSection("🏆 Pionniers", pioneerCards)}
      {renderSection("📈 Activité Plateforme", activityCards)}
    </div>
  );
};

export default AdminStats;
