import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, ChevronRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverFinanceWidgetProps {
  driverId: string;
  onViewDetails?: () => void;
}

interface BalanceSummary {
  pendingCommissions: number;
  pendingFees: number;
  lastSettlementAmount: number;
  lastSettlementDate: string | null;
  currentWeekCourses: number;
  currentWeekShared: number;
}

export function DriverFinanceWidget({ driverId, onViewDetails }: DriverFinanceWidgetProps) {
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [driverId]);

  const loadSummary = async () => {
    try {
      // Get last completed settlement
      const { data: lastSettlement } = await supabase
        .from("driver_weekly_balances")
        .select("net_amount, transfer_executed_at, settlement_id")
        .eq("driver_id", driverId)
        .eq("transfer_status", "completed")
        .order("transfer_executed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get pending commissions (completed shared payments not yet settled)
      const { data: pendingPayments } = await supabase
        .from("shared_course_payments")
        .select("sender_commission_amount, sender_driver_id, receiver_driver_id, platform_fee")
        .eq("status", "completed")
        .is("settlement_id", null);

      let pendingCommissions = 0;
      let pendingFees = 0;

      for (const p of (pendingPayments || [])) {
        if (p.sender_driver_id === driverId) {
          pendingCommissions += p.sender_commission_amount;
        }
        if (p.receiver_driver_id === driverId) {
          pendingFees += (p.platform_fee || 0.10);
        }
      }

      // Count current week courses
      // Weekly course count from unified dashboard RPC (same source as driver stats widgets)

      const { data: dashboardStats } = await supabase
        .rpc("get_driver_dashboard_stats", { p_driver_id: driverId });

      const courseCount = Number((dashboardStats as any)?.week_courses || 0);

      const { count: sharedCount } = await supabase
        .from("shared_course_payments")
        .select("id", { count: "exact", head: true })
        .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        .eq("status", "completed")
        .is("settlement_id", null);

      setSummary({
        pendingCommissions,
        pendingFees,
        lastSettlementAmount: lastSettlement?.net_amount || 0,
        lastSettlementDate: lastSettlement?.transfer_executed_at || null,
        currentWeekCourses: courseCount || 0,
        currentWeekShared: sharedCount || 0,
      });
    } catch (err) {
      console.error("Error loading finance summary:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </Card>
    );
  }

  if (!summary) return null;

  const netPending = summary.pendingCommissions - summary.pendingFees;

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Solde financier</h3>
        </div>
        <Badge variant="outline" className="text-xs gap-1 border-warning/30 text-warning">
          <Clock className="w-3 h-3" />
          Prochain lundi
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-1 text-xs text-success mb-1">
            <ArrowUpRight className="w-3 h-3" />
            Commissions en attente
          </div>
          <p className="text-lg font-bold text-success">
            +{summary.pendingCommissions.toFixed(2)}€
          </p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-1 text-xs text-destructive mb-1">
            <ArrowDownRight className="w-3 h-3" />
            Frais de gestion
          </div>
          <p className="text-lg font-bold text-destructive">
            -{summary.pendingFees.toFixed(2)}€
          </p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Versement net estimé</span>
          <span className={`text-xl font-bold ${netPending >= 0 ? 'text-success' : 'text-destructive'}`}>
            {netPending >= 0 ? '+' : ''}{netPending.toFixed(2)}€
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Cette semaine : {summary.currentWeekCourses} courses • {summary.currentWeekShared} partages</span>
        {summary.lastSettlementDate && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Dernier : {summary.lastSettlementAmount.toFixed(2)}€
          </span>
        )}
      </div>

      {onViewDetails && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="w-full text-primary hover:text-primary/80 gap-1"
        >
          Voir le détail des finances
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </Card>
  );
}
