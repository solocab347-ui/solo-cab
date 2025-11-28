import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Car, FileText, Euro, TrendingUp, CheckCircle } from "lucide-react";
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

  const statCards = [
    {
      title: "Utilisateurs totaux",
      value: stats.total_users,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Chauffeurs",
      value: `${stats.validated_drivers}/${stats.total_drivers}`,
      description: "Validés / Total",
      icon: Car,
      color: "bg-green-500",
    },
    {
      title: "Chauffeurs en attente",
      value: stats.pending_drivers,
      icon: CheckCircle,
      color: "bg-yellow-500",
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
    {
      title: "Revenus totaux",
      value: `${parseFloat(stats.total_revenue).toFixed(2)} €`,
      icon: Euro,
      color: "bg-emerald-500",
    },
    {
      title: "Profils publics",
      value: stats.public_drivers,
      description: "Chauffeurs sur la vitrine",
      icon: Car,
      color: "bg-pink-500",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
          <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
          {stat.description && (
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          )}
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
