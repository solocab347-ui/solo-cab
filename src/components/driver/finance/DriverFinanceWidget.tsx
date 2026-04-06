import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, ChevronRight, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverFinanceWidgetProps {
  driverId: string;
  onViewDetails?: () => void;
}

interface BalanceSummary {
  totalRevenue: number;
  solocabFees: number;
  stripeFees: number;
  netEarnings: number;
  totalCourses: number;
  pendingBalance: number;
  // Partnership data
  pendingCommissions: number;
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
      setLoading(true);

      // 1. Get actual course revenue from driver_wallets view
      const { data: wallet } = await supabase
        .from("driver_wallets")
        .select("*")
        .eq("driver_id", driverId)
        .maybeSingle();

      // 2. Get pending partnership commissions
      const { data: pendingPayments } = await supabase
        .from("shared_course_payments")
        .select("sender_commission_amount, sender_driver_id")
        .eq("status", "completed")
        .eq("sender_driver_id", driverId)
        .is("settlement_id", null);

      let pendingCommissions = 0;
      for (const p of (pendingPayments || [])) {
        pendingCommissions += p.sender_commission_amount || 0;
      }

      const { count: sharedCount } = await supabase
        .from("shared_course_payments")
        .select("id", { count: "exact", head: true })
        .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        .eq("status", "completed")
        .is("settlement_id", null);

      setSummary({
        totalRevenue: Number(wallet?.total_revenue || 0),
        solocabFees: Number(wallet?.total_solocab_fees || 0),
        stripeFees: Number(wallet?.total_stripe_fees || 0),
        netEarnings: Number(wallet?.net_earnings || 0),
        totalCourses: Number(wallet?.total_courses || 0),
        pendingBalance: Number(wallet?.pending_balance || 0),
        pendingCommissions,
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

  const totalFees = summary.solocabFees + summary.stripeFees;

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Solde financier</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSummary}>
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Badge variant="outline" className="text-xs gap-1 border-warning/30 text-warning">
            <Clock className="w-3 h-3" />
            Prochain lundi
          </Badge>
        </div>
      </div>

      {/* Course revenue */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-1 text-xs text-success mb-1">
            <ArrowUpRight className="w-3 h-3" />
            Revenus bruts
          </div>
          <p className="text-lg font-bold text-success">
            +{summary.totalRevenue.toFixed(2)}€
          </p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-1 text-xs text-destructive mb-1">
            <ArrowDownRight className="w-3 h-3" />
            Frais totaux
          </div>
          <p className="text-lg font-bold text-destructive">
            -{totalFees.toFixed(2)}€
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            SoloCab: {summary.solocabFees.toFixed(2)}€ • Stripe: {summary.stripeFees.toFixed(2)}€
          </p>
        </div>
      </div>

      {/* Net earnings */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Versement net estimé</span>
          <span className={`text-xl font-bold ${summary.netEarnings >= 0 ? 'text-success' : 'text-destructive'}`}>
            +{summary.netEarnings.toFixed(2)}€
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{summary.totalCourses} courses encaissées • {summary.currentWeekShared} partages</span>
        {summary.pendingCommissions > 0 && (
          <span className="flex items-center gap-1 text-success">
            <TrendingUp className="w-3 h-3" />
            +{summary.pendingCommissions.toFixed(2)}€ commissions
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
