import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Activity, Euro, TrendingUp, Users2, Mail, Flag, Gift } from "lucide-react";

const AdminOverview = () => {
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
      console.error("Error fetching stats:", error);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement des statistiques...</div>;
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Chauffeurs",
      value: stats.total_drivers,
      icon: Users,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Abonnements Actifs",
      value: stats.validated_drivers,
      icon: Activity,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Revenus Mensuels",
      value: `${parseFloat(stats.total_revenue || 0).toFixed(0)}€`,
      icon: Euro,
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "En Attente",
      value: stats.pending_drivers,
      icon: TrendingUp,
      color: "from-orange-500 to-yellow-500",
    },
  ];

  const actionCards = [
    {
      title: "Gestion Chauffeurs",
      description: `${stats.pending_drivers} en attente de validation`,
      icon: Users2,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Abonnements",
      description: "Gérer les souscriptions",
      icon: Activity,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Envoi d'emails",
      description: "Communication en masse",
      icon: Mail,
      color: "from-violet-500 to-purple-500",
    },
    {
      title: "Signalements",
      description: "Modération et litiges",
      icon: Flag,
      color: "from-orange-500 to-red-500",
    },
    {
      title: "Accès Gratuits",
      description: "Suivi des gratuités accordées",
      icon: Gift,
      color: "from-green-500 to-teal-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Bienvenue dans le Panel Admin
        </h2>
        <p className="text-muted-foreground">Gérez votre plateforme SoloCab en toute simplicité</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 bg-gradient-to-br from-card to-card/50 border-border/50">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-4xl font-bold mb-2">{stat.value}</h3>
            <p className="text-sm text-muted-foreground">{stat.title}</p>
          </Card>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actionCards.map((card, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
