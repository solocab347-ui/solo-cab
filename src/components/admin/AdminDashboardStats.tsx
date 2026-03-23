import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Car,
  Clock,
  Activity,
  Eye,
  AlertTriangle,
  UserPlus,
  Euro,
} from "lucide-react";

interface QuickStats {
  totalDrivers: number;
  pendingDrivers: number;
  connectedToday: number;
  newDriversThisWeek: number;
  activeSubscriptions: number;
  mrr: number;
  totalClients: number;
  neverConnected: number;
}

const AdminDashboardStats = () => {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [platformRes, connectedTodayRes, neverConnectedRes, newWeekRes] = await Promise.all([
        supabase.rpc("get_platform_stats"),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .gte("last_seen_at", startOfToday)
          .eq("is_demo_account", false),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .is("last_seen_at", null)
          .eq("is_demo_account", false),
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfWeek)
          .eq("is_demo_account", false),
      ]);

      const p = platformRes.data as any;
      setStats({
        totalDrivers: p?.total_drivers || 0,
        pendingDrivers: p?.pending_drivers || 0,
        connectedToday: connectedTodayRes.count || 0,
        newDriversThisWeek: newWeekRes.count || 0,
        activeSubscriptions: p?.active_subscriptions || 0,
        mrr: (p?.active_subscriptions || 0) * 9.99,
        totalClients: p?.total_clients || 0,
        neverConnected: neverConnectedRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching quick stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 bg-muted rounded w-12 mb-2" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Chauffeurs inscrits",
      value: stats.totalDrivers,
      icon: Car,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "En attente validation",
      value: stats.pendingDrivers,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      alert: stats.pendingDrivers > 0,
    },
    {
      label: "Connectés aujourd'hui",
      value: stats.connectedToday,
      icon: Activity,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Nouveaux (7j)",
      value: `+${stats.newDriversThisWeek}`,
      icon: UserPlus,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Abonnements actifs",
      value: stats.activeSubscriptions,
      icon: Users,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "MRR",
      value: `${stats.mrr.toFixed(0)}€`,
      icon: Euro,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Clients totaux",
      value: stats.totalClients,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Jamais connectés",
      value: stats.neverConnected,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
      alert: stats.neverConnected > 5,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Card
            key={i}
            className={`border-border/50 ${item.alert ? "ring-1 ring-amber-400/50" : ""}`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded-lg ${item.bg}`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminDashboardStats;
