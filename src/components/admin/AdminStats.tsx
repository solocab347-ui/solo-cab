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
  Percent
} from "lucide-react";
import { logger } from "@/lib/productionLogger";

const AdminStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des statistiques...</div>;
  }

  if (!stats) return null;

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
      {renderSection("💰 Revenus et Facturation", revenueCards)}
      {renderSection("📊 Abonnements", subscriptionCards)}
      {renderSection("🚗 Chauffeurs", driverCards)}
      {renderSection("🏆 Pionniers", pioneerCards)}
      {renderSection("📈 Activité Plateforme", activityCards)}
    </div>
  );
};

export default AdminStats;
