import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Car, Activity, Euro, AlertTriangle, CreditCard,
  TrendingUp, Clock, Zap, Share2, Wallet, ShieldAlert
} from "lucide-react";

interface FinanceStats {
  // Drivers
  total_drivers: number;
  validated_drivers: number;
  pending_drivers: number;
  rejected_drivers: number;
  active_today: number;
  online_now: number;
  new_drivers_7d: number;
  // Courses today
  courses_today: number;
  courses_in_progress: number;
  courses_completed_today: number;
  courses_cancelled_today: number;
  courses_shared_today: number;
  spontaneous_today: number;
  // Finance today
  ca_today: number;
  fees_today: number;
  net_drivers_today: number;
  // Weekly
  courses_week: number;
  ca_week: number;
  fees_week: number;
  net_drivers_week: number;
  pending_settlement: number;
  pending_admin_fees: number;
  drivers_to_pay: number;
  // Monthly
  ca_month: number;
  fees_month: number;
  // Last settlement
  last_settlement_amount: number;
  // Alerts
  disputes_open: number;
  payments_error: number;
  transfers_failed: number;
  drivers_no_stripe: number;
  courses_no_payment: number;
}

interface Props {
  stats: FinanceStats;
}

const StatCard = ({
  label, value, icon: Icon, color, bg, alert
}: {
  label: string; value: string | number; icon: any; color: string; bg: string; alert?: boolean;
}) => (
  <Card className={`border-border/50 ${alert ? "ring-2 ring-red-400/60 animate-pulse" : ""}`}>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
    </CardContent>
  </Card>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
    {children}
  </h3>
);

const AdminFinanceKPIs = ({ stats }: Props) => {
  return (
    <div className="space-y-1">
      {/* Bloc 1 — Chauffeurs */}
      <SectionTitle>👨‍✈️ Chauffeurs</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Inscrits total" value={stats.total_drivers} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="Validés" value={stats.validated_drivers} icon={Users} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="En attente" value={stats.pending_drivers} icon={Clock} color="text-amber-600" bg="bg-amber-500/10" alert={stats.pending_drivers > 0} />
        <StatCard label="Rejetés" value={stats.rejected_drivers} icon={Users} color="text-red-600" bg="bg-red-500/10" />
        <StatCard label="Actifs aujourd'hui" value={stats.active_today} icon={Activity} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="En ligne" value={stats.online_now} icon={Zap} color="text-green-500" bg="bg-green-500/10" />
        <StatCard label="Nouveaux (7j)" value={`+${stats.new_drivers_7d}`} icon={Users} color="text-indigo-600" bg="bg-indigo-500/10" />
      </div>

      {/* Bloc 2 — Activité */}
      <SectionTitle>📊 Activité aujourd'hui</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Courses aujourd'hui" value={stats.courses_today} icon={Car} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="En cours" value={stats.courses_in_progress} icon={Activity} color="text-amber-600" bg="bg-amber-500/10" />
        <StatCard label="Terminées" value={stats.courses_completed_today} icon={Car} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="Annulées" value={stats.courses_cancelled_today} icon={Car} color="text-red-600" bg="bg-red-500/10" />
        <StatCard label="Partagées" value={stats.courses_shared_today} icon={Share2} color="text-purple-600" bg="bg-purple-500/10" />
        <StatCard label="Spontanés" value={stats.spontaneous_today} icon={Zap} color="text-cyan-600" bg="bg-cyan-500/10" />
      </div>

      {/* Bloc 3 — Finances */}
      <SectionTitle>💰 Finances aujourd'hui</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="CA aujourd'hui" value={`${Number(stats.ca_today).toFixed(2)}€`} icon={Euro} color="text-emerald-600" bg="bg-emerald-500/10" />
        <StatCard label="Frais SoloCab" value={`${Number(stats.fees_today).toFixed(2)}€`} icon={TrendingUp} color="text-violet-600" bg="bg-violet-500/10" />
        <StatCard label="Net chauffeurs" value={`${Number(stats.net_drivers_today).toFixed(2)}€`} icon={Wallet} color="text-blue-600" bg="bg-blue-500/10" />
        <StatCard label="Virement lundi" value={`${Number(stats.pending_settlement).toFixed(2)}€`} icon={CreditCard} color="text-indigo-600" bg="bg-indigo-500/10" />
        <StatCard label="Frais en attente" value={`${Number(stats.pending_admin_fees).toFixed(2)}€`} icon={Euro} color="text-amber-600" bg="bg-amber-500/10" />
        <StatCard label="Chauffeurs à payer" value={stats.drivers_to_pay} icon={Users} color="text-blue-600" bg="bg-blue-500/10" />
      </div>

      {/* Bloc 4 — Alertes */}
      <SectionTitle>🚨 Alertes</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Litiges ouverts" value={stats.disputes_open} icon={AlertTriangle} color="text-red-600" bg="bg-red-500/10" alert={stats.disputes_open > 0} />
        <StatCard label="Paiements erreur" value={stats.payments_error} icon={ShieldAlert} color="text-red-600" bg="bg-red-500/10" alert={stats.payments_error > 0} />
        <StatCard label="Virements échoués" value={stats.transfers_failed} icon={CreditCard} color="text-red-600" bg="bg-red-500/10" alert={stats.transfers_failed > 0} />
        <StatCard label="Sans Stripe actif" value={stats.drivers_no_stripe} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-500/10" alert={stats.drivers_no_stripe > 0} />
        <StatCard label="Courses sans paiement" value={stats.courses_no_payment} icon={ShieldAlert} color="text-orange-600" bg="bg-orange-500/10" alert={stats.courses_no_payment > 0} />
      </div>
    </div>
  );
};

export default AdminFinanceKPIs;
