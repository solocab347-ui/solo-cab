import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight, RefreshCw, CalendarClock, Banknote, CreditCard, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverFinanceWidgetProps {
  driverId: string;
  onViewDetails?: () => void;
}

interface FinanceSummary {
  // Cash (déjà encaissé en main propre — non virable)
  cashCollectedWeek: number;
  cashCoursesWeek: number;
  cashFeesOwedWeek: number;
  cashDebtTotal: number;
  // Card (en attente virement lundi)
  cardToTransfer: number;
  cardCoursesWeek: number;
  // Spontanés (déjà reçus directement)
  spontaneousReceivedWeek: number;
  spontaneousCount: number;
  // Estimation virement
  netTransferEstimate: number;
  // Stripe
  stripeAvailable: number;
  stripePending: number;
  stripePayoutsEnabled: boolean;
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

  useEffect(() => { loadSummary(); }, [driverId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const weekStart = getWeekStart();

      const [previewRes, spontRes, stripeRes] = await Promise.all([
        supabase.from("driver_settlement_preview").select("*").eq("driver_id", driverId).maybeSingle(),
        supabase.from("stripe_transactions")
          .select("net_amount, transaction_type")
          .eq("driver_id", driverId)
          .in("status", ["succeeded", "completed"])
          .in("transaction_type", ["spontaneous", "payment_request", "manual_link"])
          .gte("created_at", weekStart),
        supabase.functions.invoke("driver-stripe-data", { body: { action: "get_balance" } }),
      ]);

      const p = previewRes.data;
      const spontList = spontRes.data || [];
      const spontaneousReceivedWeek = spontList.reduce((s: number, t: any) => s + Number(t.net_amount || 0), 0);

      let stripeAvailable = 0, stripePending = 0, stripePayoutsEnabled = false;
      if (stripeRes.data && !stripeRes.data.error) {
        stripeAvailable = (stripeRes.data.available?.[0]?.amount || 0) / 100;
        stripePending = (stripeRes.data.pending?.[0]?.amount || 0) / 100;
        stripePayoutsEnabled = true;
      }

      setSummary({
        cashCollectedWeek: Number(p?.cash_collected_this_week || 0),
        cashCoursesWeek: Number(p?.cash_courses || 0),
        cashFeesOwedWeek: Number(p?.cash_fees_owed_this_week || 0),
        cashDebtTotal: Number(p?.cash_debt_pending || 0),
        cardToTransfer: Number(p?.card_to_transfer || 0),
        cardCoursesWeek: Number(p?.card_courses || 0),
        spontaneousReceivedWeek,
        spontaneousCount: spontList.length,
        netTransferEstimate: Number(p?.net_to_transfer_estimate || 0),
        stripeAvailable,
        stripePending,
        stripePayoutsEnabled,
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
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </Card>
    );
  }

  if (!summary) return null;

  const nextMondayStr = getNextMonday();
  const totalCashDebt = summary.cashFeesOwedWeek + summary.cashDebtTotal;
  const willCompensate = totalCashDebt > 0 && summary.cardToTransfer > 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-border shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Mes finances cette semaine</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSummary}>
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Section 1 : CASH déjà encaissé (NON virable) */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Espèces déjà encaissées</span>
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700">en main</Badge>
        </div>
        <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
          {summary.cashCollectedWeek.toFixed(2)}€
        </p>
        <p className="text-[11px] text-muted-foreground">
          {summary.cashCoursesWeek} courses · frais de transaction SoloCab dus : {summary.cashFeesOwedWeek.toFixed(2)}€
        </p>
      </div>

      {/* Section 2 : CARD à virer lundi */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">À virer lundi {nextMondayStr}</span>
          </div>
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1">
            <CalendarClock className="w-2.5 h-2.5" />
            virement Stripe
          </Badge>
        </div>
        <p className="text-2xl font-bold text-primary">
          {summary.netTransferEstimate.toFixed(2)}€
        </p>
        <p className="text-[11px] text-muted-foreground">
          {summary.cardCoursesWeek} courses carte · brut {summary.cardToTransfer.toFixed(2)}€
          {willCompensate && (
            <span className="text-amber-600"> − {totalCashDebt.toFixed(2)}€ frais de transaction cash</span>
          )}
        </p>
      </div>

      {/* Section 3 : SPONTANÉS déjà reçus directement */}
      {summary.spontaneousCount > 0 && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Encaissements directs (Premium)</span>
            </div>
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">déjà reçu</Badge>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            +{summary.spontaneousReceivedWeek.toFixed(2)}€
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.spontaneousCount} encaissement{summary.spontaneousCount > 1 ? 's' : ''} · versement Stripe direct
          </p>
        </div>
      )}

      {/* Alertes éventuelles */}
      {summary.cashDebtTotal > 0 && (
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-orange-700 dark:text-orange-400">
            Dette cash reportée des semaines précédentes : <strong>{summary.cashDebtTotal.toFixed(2)}€</strong>
            — sera déduite du prochain virement positif.
          </p>
        </div>
      )}
      {!summary.stripePayoutsEnabled && summary.cardToTransfer > 0 && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-[11px] text-destructive">
            Stripe Connect non configuré — activez-le pour recevoir vos virements.
          </p>
        </div>
      )}

      {onViewDetails && (
        <Button
          variant="ghost" size="sm" onClick={onViewDetails}
          className="w-full text-primary hover:text-primary/80 gap-1"
        >
          Voir le détail des finances
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </Card>
  );
}
