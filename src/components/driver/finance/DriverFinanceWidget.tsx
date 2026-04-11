import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw, CalendarClock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverFinanceWidgetProps {
  driverId: string;
  onViewDetails?: () => void;
}

interface FinanceSummary {
  // From stripe_transactions (DB)
  weekGross: number;
  weekStripeFees: number;
  weekSolocabFees: number;
  weekNet: number;
  weekCourses: number;
  totalNet: number;
  totalCourses: number;
  // From Stripe API (real-time)
  stripeAvailable: number;
  stripePending: number;
  stripePayoutsEnabled: boolean;
  lastPayoutAmount: number | null;
  lastPayoutDate: string | null;
}

function getNextMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

export function DriverFinanceWidget({ driverId, onViewDetails }: DriverFinanceWidgetProps) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [driverId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const weekStart = getWeekStart();

      // Parallel: DB transactions + Stripe real-time
      const [weekTxns, allWallet, stripeRes] = await Promise.all([
        supabase
          .from("stripe_transactions")
          .select("gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount")
          .eq("driver_id", driverId)
          .in("status", ["succeeded", "completed"])
          .gte("created_at", weekStart),
        supabase
          .from("driver_wallets")
          .select("net_earnings, total_courses")
          .eq("driver_id", driverId)
          .maybeSingle(),
        supabase.functions.invoke("driver-stripe-data", {
          body: { action: "get_balance" },
        }),
      ]);

      const weekData = weekTxns.data || [];
      const weekGross = weekData.reduce((s, t: any) => s + Number(t.gross_amount || 0), 0);
      const weekStripeFees = weekData.reduce((s, t: any) => s + Number(t.stripe_fee_amount || 0), 0);
      const weekSolocabFees = weekData.reduce((s, t: any) => s + Number(t.solocab_fee_amount || 0), 0);
      const weekNet = weekData.reduce((s, t: any) => s + Number(t.net_amount || 0), 0);

      // Get Stripe balance
      let stripeAvailable = 0, stripePending = 0, stripePayoutsEnabled = false;
      if (stripeRes.data && !stripeRes.data.error) {
        stripeAvailable = (stripeRes.data.available?.[0]?.amount || 0) / 100;
        stripePending = (stripeRes.data.pending?.[0]?.amount || 0) / 100;
        stripePayoutsEnabled = true;
      }

      // Get last payout
      let lastPayoutAmount: number | null = null;
      let lastPayoutDate: string | null = null;
      try {
        const payoutsRes = await supabase.functions.invoke("driver-stripe-data", {
          body: { action: "list_payouts" },
        });
        if (payoutsRes.data?.data?.[0]) {
          const p = payoutsRes.data.data[0];
          lastPayoutAmount = p.amount / 100;
          lastPayoutDate = new Date(p.arrival_date * 1000).toLocaleDateString('fr-FR');
        }
      } catch {}

      setSummary({
        weekGross,
        weekStripeFees,
        weekSolocabFees,
        weekNet,
        weekCourses: weekData.length,
        totalNet: Number(allWallet.data?.net_earnings || 0),
        totalCourses: Number(allWallet.data?.total_courses || 0),
        stripeAvailable,
        stripePending,
        stripePayoutsEnabled,
        lastPayoutAmount,
        lastPayoutDate,
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

  const nextMondayStr = getNextMonday();

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
            <CalendarClock className="w-3 h-3" />
            Lundi {nextMondayStr}
          </Badge>
        </div>
      </div>

      {/* Stripe Balance — main highlight */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Balance Stripe</p>
            <p className="text-2xl font-bold text-primary">
              {summary.stripeAvailable.toFixed(2)}€
            </p>
            <p className="text-[10px] text-muted-foreground">disponible</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-amber-600">{summary.stripePending.toFixed(2)}€</p>
            <p className="text-[10px] text-muted-foreground">en attente</p>
          </div>
        </div>
      </div>

      {/* Weekly Revenue & Fees */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-1 text-xs text-success mb-1">
            <ArrowUpRight className="w-3 h-3" />
            Revenus semaine
          </div>
          <p className="text-lg font-bold text-success">
            +{summary.weekGross.toFixed(2)}€
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.weekCourses} courses</p>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-1 text-xs text-destructive mb-1">
            <ArrowDownRight className="w-3 h-3" />
            Frais totaux
          </div>
          <p className="text-lg font-bold text-destructive">
            -{(summary.weekStripeFees + summary.weekSolocabFees).toFixed(2)}€
          </p>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Stripe: {summary.weekStripeFees.toFixed(2)}€</p>
            <p>SoloCab: {summary.weekSolocabFees.toFixed(2)}€</p>
          </div>
        </div>
      </div>

      {/* Last payout + historic */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total encaissé (historique)</span>
          <span className="font-semibold text-foreground">{summary.totalNet.toFixed(2)}€</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>{summary.totalCourses} courses au total</span>
          {summary.lastPayoutAmount !== null && (
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Dernier: {summary.lastPayoutAmount.toFixed(2)}€ ({summary.lastPayoutDate})
            </span>
          )}
        </div>
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
