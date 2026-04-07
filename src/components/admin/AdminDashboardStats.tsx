import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Car, Clock, Activity, AlertTriangle, UserPlus, Euro,
  Zap, Share2, Wallet, ShieldAlert, CreditCard, TrendingUp
} from "lucide-react";

const AdminDashboardStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_finance_stats");
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-6 bg-muted rounded w-10 mb-1" />
              <div className="h-3 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const StatCard = ({
    label, value, icon: Icon, color, bg, alert
  }: {
    label: string; value: string | number; icon: any; color: string; bg: string; alert?: boolean;
  }) => (
    <Card className={`border-border/50 ${alert ? "ring-1 ring-red-400/50" : ""}`}>
      <CardContent className="p-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <div className={`p-1 rounded-md ${bg}`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
          </div>
        </div>
        <div className="text-lg font-bold tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
    </div>
  );

  return (
    <div className="mb-4">
      <Section title="👨‍✈️ Chauffeurs">
        <StatCard label="Inscrits" value={stats.total_drivers} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="En attente" value={stats.pending_drivers} icon={Clock} color="text-amber-600" bg="bg-amber-500/10" alert={stats.pending_drivers > 0} />
        <StatCard label="Actifs aujourd'hui" value={stats.active_today} icon={Activity} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="Nouveaux (7j)" value={`+${stats.new_drivers_7d}`} icon={UserPlus} color="text-indigo-600" bg="bg-indigo-500/10" />
      </Section>

      <Section title="📊 Activité">
        <StatCard label="Courses aujourd'hui" value={stats.courses_today} icon={Car} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="En cours" value={stats.courses_in_progress} icon={Activity} color="text-amber-600" bg="bg-amber-500/10" />
        <StatCard label="Terminées" value={stats.courses_completed_today} icon={Car} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="Partagées" value={stats.courses_shared_today} icon={Share2} color="text-purple-600" bg="bg-purple-500/10" />
      </Section>

      <Section title="💰 Finances">
        <StatCard label="CA aujourd'hui" value={`${Number(stats.ca_today).toFixed(0)}€`} icon={Euro} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="Frais SoloCab" value={`${Number(stats.fees_today).toFixed(2)}€`} icon={TrendingUp} color="text-violet-600" bg="bg-violet-500/10" />
        <StatCard label="Virement lundi" value={`${Number(stats.pending_settlement).toFixed(0)}€`} icon={Wallet} color="text-indigo-600" bg="bg-indigo-500/10" />
        <StatCard label="En attente" value={`${Number(stats.pending_admin_fees).toFixed(2)}€`} icon={Euro} color="text-amber-600" bg="bg-amber-500/10" />
      </Section>

      <Section title="🚨 Alertes">
        <StatCard label="Litiges" value={stats.disputes_open} icon={AlertTriangle} color="text-red-600" bg="bg-red-500/10" alert={stats.disputes_open > 0} />
        <StatCard label="Erreurs paiement" value={stats.payments_error} icon={ShieldAlert} color="text-red-600" bg="bg-red-500/10" alert={stats.payments_error > 0} />
        <StatCard label="Sans Stripe" value={stats.drivers_no_stripe} icon={CreditCard} color="text-amber-600" bg="bg-amber-500/10" alert={stats.drivers_no_stripe > 0} />
        <StatCard label="Sans paiement" value={stats.courses_no_payment} icon={ShieldAlert} color="text-orange-600" bg="bg-orange-500/10" alert={stats.courses_no_payment > 0} />
      </Section>
    </div>
  );
};

export default AdminDashboardStats;
