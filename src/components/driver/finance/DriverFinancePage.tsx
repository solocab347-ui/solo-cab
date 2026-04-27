import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle, Clock, XCircle, AlertCircle, CreditCard, TrendingUp, Euro, Banknote, RefreshCw, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Bornes de la semaine VTC en cours.
 * Convention SoloCab (alignée sur process-weekly-settlement) :
 *   Lundi 00:00 UTC → Dimanche 23:59:59 UTC
 * Le settlement tourne ensuite le lundi suivant à 6h.
 */
function getCurrentVtcWeek(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=dimanche, 1=lundi
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - daysFromMonday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

interface DriverFinancePageProps {
  driverId: string;
  initialTab?: string;
}

interface Settlement {
  id: string;
  week_start: string;
  week_end: string;
  net_amount: number;
  total_commissions_earned: number;
  total_solocab_fees: number;
  shared_courses_as_sender: number;
  shared_courses_as_receiver: number;
  standard_courses_count: number;
  transfer_status: string;
  stripe_transfer_id: string | null;
  transfer_executed_at: string | null;
  transfer_error: string | null;
}

interface PendingPayment {
  id: string;
  course_amount: number;
  commission_amount: number;
  sender_commission_amount: number;
  platform_fee: number | null;
  created_at: string;
  sender_driver_id: string;
  receiver_driver_id: string;
}

interface TransactionItem {
  id: string;
  course_id: string;
  amount: number;
  net_to_driver: number;
  stripe_fee_amount: number;
  solocab_fee_amount: number;
  status: string;
  payment_type: string;
  payment_method: string;
  created_at: string;
}

interface WalletStats {
  totalEarned: number;
  totalFees: number;
  totalNet: number;
  totalCourses: number;
  avgPerCourse: number;
  // Breakdown by payment method
  cardCourses: number;
  cashCourses: number;
  cardStripeFees: number;
  cardSolocabFees: number;
  cashSolocabFees: number;
  recentTransactions: TransactionItem[];
}

interface PendingBalanceStats {
  totalGross: number;
  totalSolocabFees: number;
  totalStripeFees: number;
  totalNet: number;
  courseCount: number;
  cashFeesOwed: number; // SoloCab fees from cash courses (to be deducted)
  cardFeesCollected: number; // SoloCab fees from card courses (already taken)
}

/**
 * Reports / arriérés portés depuis les semaines précédentes :
 *  - frais espèces non encore prélevés (status pending, créés AVANT lundi 00:00 UTC)
 *  - virements Stripe précédents en échec / skipped (RIB manquant, rejet bancaire…)
 *
 * Ces montants se cumulent semaine après semaine jusqu'à être encaissés.
 */
interface CarryOverStats {
  cashFeesOwedFromPastWeeks: number;
  pastPendingNet: number;
  pastPendingCourses: number;
  failedSettlements: Settlement[];
  failedSettlementsTotal: number;
}

export function DriverFinancePage({ driverId, initialTab = "transactions" }: DriverFinancePageProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [pendingBalance, setPendingBalance] = useState<PendingBalanceStats | null>(null);
  const [carryOver, setCarryOver] = useState<CarryOverStats | null>(null);
  const [monthlyTransactions, setMonthlyTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripeBalance, setStripeBalance] = useState<any>(null);
  const [stripePayouts, setStripePayouts] = useState<any[]>([]);
  const [historyView, setHistoryView] = useState<"week" | "month">("week");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    loadData();
  }, [driverId]);

  const loadData = async () => {
    try {
      // Bornes de la semaine VTC en cours (lundi → dimanche UTC)
      const { start: weekStart, end: weekEnd } = getCurrentVtcWeek();
      const weekStartIso = weekStart.toISOString();
      const weekEndIso = weekEnd.toISOString();

      // Load all data in parallel
      const monthFloor = new Date();
      monthFloor.setUTCMonth(monthFloor.getUTCMonth() - 11, 1);
      monthFloor.setUTCHours(0, 0, 0, 0);

      const [balancesResult, pendingResult, paymentsResult, monthlyPaymentsResult, driverResult, pendingBalanceResult] = await Promise.all([
        supabase
          .from("driver_weekly_balances")
          .select(`
            id, net_amount, total_commissions_earned, total_solocab_fees,
            shared_courses_as_sender, shared_courses_as_receiver, standard_courses_count,
            transfer_status, stripe_transfer_id, transfer_executed_at, transfer_error,
            settlement:weekly_settlements(id, week_start, week_end)
          `)
          .eq("driver_id", driverId)
          .order("created_at", { ascending: false })
          .limit(52),
        supabase
          .from("shared_course_payments")
          .select("id, course_amount, commission_amount, sender_commission_amount, platform_fee, created_at, sender_driver_id, receiver_driver_id")
          .eq("status", "completed")
          .is("settlement_id", null)
          .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
          .order("created_at", { ascending: false }),
        // ⚠️ Transactions filtrées sur la SEMAINE EN COURS uniquement
        // (le bilan hebdo doit repartir à zéro chaque lundi).
        supabase
          .from("stripe_transactions")
          .select("id, course_id, gross_amount, net_amount, stripe_fee_amount, solocab_fee_amount, status, transaction_type, payment_method, created_at, description")
          .eq("driver_id", driverId)
          .in("status", ["succeeded", "completed"])
          .gte("created_at", weekStartIso)
          .lte("created_at", weekEndIso)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("stripe_transactions")
          .select("id, course_id, gross_amount, net_amount, stripe_fee_amount, solocab_fee_amount, status, transaction_type, payment_method, created_at, description")
          .eq("driver_id", driverId)
          .in("status", ["succeeded", "completed"])
          .gte("created_at", monthFloor.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("drivers")
          .select("stripe_connect_charges_enabled, cash_debt_pending")
          .eq("id", driverId)
          .single(),
        // ⚠️ driver_balance_pending reste non-filtré : il porte naturellement
        // la semaine en cours + tout carry-over (frais espèces non prélevés,
        // virements précédents échoués) qui n'a pas encore été settlé.
        supabase
          .from("driver_balance_pending" as any)
          .select("gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, created_at")
          .eq("driver_id", driverId)
          .eq("status", "pending"),
      ]);

      setStripeEnabled(!!driverResult.data?.stripe_connect_charges_enabled);
      const mapped = (balancesResult.data || []).map((b: any) => ({
        ...b,
        week_start: b.settlement?.week_start,
        week_end: b.settlement?.week_end,
      }));
      setSettlements(mapped);
      setPendingPayments(pendingResult.data || []);
      setMonthlyTransactions(((monthlyPaymentsResult.data || []) as any[]).map((p: any) => ({
        id: p.id,
        course_id: p.course_id || p.id,
        amount: Number(p.gross_amount || 0),
        net_to_driver: Number(p.net_amount || 0),
        stripe_fee_amount: Number(p.stripe_fee_amount || 0),
        solocab_fee_amount: Number(p.solocab_fee_amount || 0),
        status: p.status,
        payment_type: p.transaction_type || "course_payment",
        payment_method: p.payment_method || "stripe",
        created_at: p.created_at,
      })));

      // Calculate wallet stats from stripe_transactions
      const txns = (paymentsResult.data || []) as any[];
      const totalEarned = txns.reduce((s: number, p: any) => s + (p.gross_amount || 0), 0);
      const totalStripeFees = txns.reduce((s: number, p: any) => s + (p.stripe_fee_amount || 0), 0);
      const totalSolocabFees = txns.reduce((s: number, p: any) => s + (p.solocab_fee_amount || 0), 0);
      const totalFees = totalStripeFees + totalSolocabFees;
      const totalNet = txns.reduce((s: number, p: any) => s + (p.net_amount || 0), 0);

      const cardTxns = txns.filter((t: any) => t.payment_method !== 'cash');
      const cashTxns = txns.filter((t: any) => t.payment_method === 'cash');

      setWalletStats({
        totalEarned,
        totalFees,
        totalNet,
        totalCourses: txns.length,
        avgPerCourse: txns.length > 0 ? totalEarned / txns.length : 0,
        cardCourses: cardTxns.length,
        cashCourses: cashTxns.length,
        cardStripeFees: cardTxns.reduce((s: number, t: any) => s + (t.stripe_fee_amount || 0), 0),
        cardSolocabFees: cardTxns.reduce((s: number, t: any) => s + (t.solocab_fee_amount || 0), 0),
        cashSolocabFees: cashTxns.reduce((s: number, t: any) => s + (t.solocab_fee_amount || 0), 0),
        recentTransactions: txns.slice(0, 30).map((p: any) => ({
          id: p.id,
          course_id: p.course_id || '',
          amount: p.gross_amount || 0,
          net_to_driver: p.net_amount || 0,
          stripe_fee_amount: p.stripe_fee_amount || 0,
          solocab_fee_amount: p.solocab_fee_amount || 0,
          status: p.status,
          payment_type: p.transaction_type || "full_payment",
          payment_method: p.payment_method || 'stripe',
          created_at: p.created_at,
        })),
      });

      // Calculate pending balance from driver_balance_pending
      const pbData = (pendingBalanceResult.data || []) as any[];
      let cashFeesOwed = 0;
      let cardFeesCollected = 0;
      for (const b of pbData) {
        const fee = Number(b.solocab_fee || 0);
        if (b.payment_type === 'cash') {
          cashFeesOwed += fee;
        } else {
          cardFeesCollected += fee;
        }
      }
      setPendingBalance({
        totalGross: pbData.reduce((s: number, b: any) => s + Number(b.gross_amount || 0), 0),
        totalSolocabFees: pbData.reduce((s: number, b: any) => s + Number(b.solocab_fee || 0), 0),
        totalStripeFees: pbData.reduce((s: number, b: any) => s + Number(b.stripe_fee || 0), 0),
        totalNet: pbData.reduce((s: number, b: any) => s + Number(b.net_amount || 0), 0),
        courseCount: pbData.length,
        cashFeesOwed,
        cardFeesCollected,
      });

      // 🔁 CARRY-OVER : tout ce qui n'est pas encore réglé et qui date d'AVANT
      // le début de la semaine en cours (lundi 00:00 UTC).
      //  - cashFeesOwedFromPastWeeks : frais espèces non encore prélevés.
      //    Source PRINCIPALE = `drivers.cash_debt_pending` (alimenté par
      //    process-weekly-settlement quand le net carte ne suffit pas à éponger
      //    la commission cash). On y ajoute le résiduel `pending` créé après
      //    le settlement (cas rares : course cash réglée juste après le lundi 6h).
      //  - pastPendingNet / pastPendingCourses : net qui n'a pas pu être versé
      //    et qui se cumule jusqu'au prochain virement réussi.
      //  - failedSettlements : règlements hebdo en échec ou ignorés
      //    (RIB manquant, rejet bancaire, virement non exécuté…).
      const pastPbData = pbData.filter(
        (b: any) => b.created_at && new Date(b.created_at).getTime() < weekStart.getTime()
      );
      const cashDebtFromDriver = Number(driverResult.data?.cash_debt_pending || 0);
      const pastPendingCashFees = pastPbData.reduce(
        (sum: number, b: any) => sum + (b.payment_type === 'cash' ? Number(b.solocab_fee || 0) : 0),
        0
      );
      // Source autoritaire : la dette consolidée par le settlement hebdo.
      // On prend le MAX pour couvrir aussi les cas où des entries pending
      // n'ont pas encore été agrégées (ex: course cash réglée après lundi 6h).
      const cashFeesOwedFromPastWeeks = Math.max(cashDebtFromDriver, pastPendingCashFees);
      const pastPendingNet = pastPbData.reduce(
        (sum: number, b: any) => sum + Number(b.net_amount || 0),
        0
      );
      const failedSettlements = mapped.filter(
        (s: Settlement) => s.transfer_status === 'failed' || s.transfer_status === 'skipped'
      );
      const failedSettlementsTotal = failedSettlements.reduce(
        (sum: number, s: Settlement) => sum + Number(s.net_amount || 0),
        0
      );
      setCarryOver({
        cashFeesOwedFromPastWeeks,
        pastPendingNet,
        pastPendingCourses: pastPbData.length,
        failedSettlements,
        failedSettlementsTotal,
      });

      // Fetch Stripe real-time data
      try {
        const [balRes, payRes] = await Promise.all([
          supabase.functions.invoke("driver-stripe-data", { body: { action: "get_balance" } }),
          supabase.functions.invoke("driver-stripe-data", { body: { action: "list_payouts" } }),
        ]);
        if (balRes.data && !balRes.data.error) setStripeBalance(balRes.data);
        if (payRes.data?.data) setStripePayouts(payRes.data.data);
      } catch (e) {
        console.error("Stripe data fetch error:", e);
      }
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/10 text-success border-success/30 gap-1"><CheckCircle className="w-3 h-3" />Versé</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1 border-warning/30 text-warning"><Clock className="w-3 h-3" />En attente</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Échoué</Badge>;
      case "skipped":
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Ignoré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "course_payment": return "Course";
      case "full_payment": return "Course complète";
      case "capture": return "Capture paiement";
      case "final_payment": return "Solde final";
      case "deposit_payment": return "Acompte";
      case "cancellation_fee": return "Frais d'annulation";
      case "spontaneous_payment": return "Encaissement libre";
      case "refund": return "Remboursement";
      case "partner_transfer": return "Transfert partenaire";
      default: return type;
    }
  };

  // ⚠️ TOUS les hooks (useMemo, etc.) DOIVENT être déclarés AVANT tout early return
  // sinon React lève "Rendered more hooks than during the previous render".

  // Liste des mois disponibles dans l'historique des règlements (12 derniers max).
  // On indexe sur week_end (date où la semaine se "comptabilise") pour éviter
  // qu'une semaine à cheval sur 2 mois disparaisse de la sélection.
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) {
      const ref = s.week_end || s.week_start;
      if (!ref) continue;
      const d = new Date(ref);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    for (const t of monthlyTransactions) {
      const d = new Date(t.created_at);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    // Toujours inclure les 6 derniers mois pour permettre une consultation
    // même si aucun règlement n'a été produit (nouveau chauffeur, période creuse).
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(set).sort().reverse().slice(0, 12);
  }, [settlements, monthlyTransactions]);

  // Agrégat mensuel à partir des règlements hebdomadaires.
  // On utilise week_end pour rattacher chaque règlement au mois où il a été clôturé,
  // ce qui correspond à la perception réelle du chauffeur.
  const monthlyAggregate = useMemo(() => {
    const filtered = settlements.filter((s) => {
      const ref = s.week_end || s.week_start;
      if (!ref) return false;
      const d = new Date(ref);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });
    const txns = monthlyTransactions.filter((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });
    const uniqueCourses = new Set(txns.map((t) => t.course_id || t.id));
    return {
      weeks: filtered,
      transactions: txns,
      totalNet: txns.length > 0
        ? txns.reduce((sum, t) => sum + (t.net_to_driver || 0), 0)
        : filtered.reduce((sum, s) => sum + (s.net_amount || 0), 0),
      totalFees: txns.length > 0
        ? txns.reduce((sum, t) => sum + (t.solocab_fee_amount || 0), 0)
        : filtered.reduce((sum, s) => sum + (s.total_solocab_fees || 0), 0),
      totalCommissions: filtered.reduce((sum, s) => sum + (s.total_commissions_earned || 0), 0),
      totalCourses: txns.length > 0 ? uniqueCourses.size : filtered.reduce(
        (sum, s) => sum + (s.standard_courses_count || 0) + (s.shared_courses_as_sender || 0) + (s.shared_courses_as_receiver || 0),
        0
      ),
      failedCount: filtered.filter((s) => s.transfer_status === 'failed' || s.transfer_status === 'skipped').length,
    };
  }, [settlements, monthlyTransactions, selectedMonth]);

  // Early return APRÈS tous les hooks pour préserver l'ordre stable des hooks.
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const totalPendingCommissions = pendingPayments
    .filter(p => p.sender_driver_id === driverId)
    .reduce((sum, p) => sum + p.sender_commission_amount, 0);

  // Bornes de la semaine en cours pour affichage
  const currentWeek = getCurrentVtcWeek();
  const weekLabel = `${format(currentWeek.start, "d MMM", { locale: fr })} → ${format(currentWeek.end, "d MMM yyyy", { locale: fr })}`;

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return format(d, "MMMM yyyy", { locale: fr });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Portefeuille & Finances</h2>
          <p className="text-sm text-muted-foreground">Vue complète de vos revenus et versements</p>
        </div>
      </div>

      {/* Bandeau semaine en cours — repère temporel clair */}
      <Card className="p-3 bg-primary/5 border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Semaine en cours</p>
            <p className="text-sm font-semibold text-foreground">{weekLabel}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          Reset chaque lundi 6h
        </Badge>
      </Card>

      {/* 🔁 REPORTS DES SEMAINES PRÉCÉDENTES — toujours visibles s'il y en a,
          pour éviter au chauffeur de fouiller l'historique. */}
      {carryOver && (carryOver.cashFeesOwedFromPastWeeks > 0
        || carryOver.failedSettlements.length > 0
        || carryOver.pastPendingNet !== 0) && (
        <Card className="p-4 bg-warning/5 border-warning/30 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-warning">Reports des semaines précédentes</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Frais espèces non prélevés portés sur les semaines passées */}
            <div className="p-3 rounded-lg bg-background/40 border border-warning/20">
              <p className="text-[11px] text-muted-foreground">Frais espèces à régulariser</p>
              <p className="text-lg font-bold text-warning">
                {carryOver.cashFeesOwedFromPastWeeks.toFixed(2)}€
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Issus de courses cash non encore débitées
              </p>
            </div>

            {/* Net pending hérité (gross espèces + cb pending + carry-over) */}
            <div className="p-3 rounded-lg bg-background/40 border border-warning/20">
              <p className="text-[11px] text-muted-foreground">Net en report</p>
              <p className={`text-lg font-bold ${carryOver.pastPendingNet >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {carryOver.pastPendingNet.toFixed(2)}€
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {carryOver.pastPendingCourses} course(s) en attente de règlement
              </p>
            </div>

            {/* Virements échoués / ignorés (RIB manquant, rejet bancaire…) */}
            <div className="p-3 rounded-lg bg-background/40 border border-destructive/30">
              <p className="text-[11px] text-muted-foreground">Virements non exécutés</p>
              <p className="text-lg font-bold text-destructive">
                {carryOver.failedSettlementsTotal.toFixed(2)}€
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {carryOver.failedSettlements.length} règlement(s) en échec
              </p>
            </div>
          </div>

          {carryOver.failedSettlements.length > 0 && (
            <div className="border-t border-warning/20 pt-3 space-y-1">
              <p className="text-[11px] font-semibold text-foreground">Détail des virements en échec :</p>
              {carryOver.failedSettlements.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {s.week_start && format(new Date(s.week_start), "dd MMM", { locale: fr })}
                    {' → '}
                    {s.week_end && format(new Date(s.week_end), "dd MMM yyyy", { locale: fr })}
                  </span>
                  <span className="font-medium text-destructive">{s.net_amount.toFixed(2)}€</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic pt-1">
                💡 Vérifiez votre RIB dans l'onglet "RIB" pour débloquer les virements.
              </p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground italic border-t border-warning/20 pt-2">
            Ces montants se cumulent semaine après semaine jusqu'à être encaissés ou réglés.
            Ils sont déjà inclus dans le total "Prochain versement" ci-dessous.
          </p>
        </Card>
      )}

      {/* Wallet summary cards */}
      {walletStats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total encaissé (brut) — semaine</p>
                <p className="text-3xl font-bold text-foreground">{walletStats.totalEarned.toFixed(2)}€</p>
              </div>
              <div className="p-3 rounded-full bg-primary/20">
                <Euro className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-success" />
              <span>{walletStats.totalCourses} courses • {walletStats.cardCourses} CB • {walletStats.cashCourses} Espèces</span>
            </div>
          </Card>

          <Card className="p-3 bg-success/5 border-success/20">
            <p className="text-xs text-muted-foreground mb-1">Net chauffeur (semaine)</p>
            <p className="text-xl font-bold text-success">{walletStats.totalNet.toFixed(2)}€</p>
          </Card>
          <Card className="p-3 bg-destructive/5 border-destructive/20">
            <p className="text-xs text-muted-foreground mb-1">Total frais (semaine)</p>
            <p className="text-xl font-bold text-destructive">-{walletStats.totalFees.toFixed(2)}€</p>
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              <p>Stripe: -{(walletStats.cardStripeFees).toFixed(2)}€</p>
              <p>SoloCab: -{(walletStats.cardSolocabFees + walletStats.cashSolocabFees).toFixed(2)}€</p>
            </div>
          </Card>
        </div>
      )}

      {/* Weekly settlement summary from driver_balance_pending */}
      {pendingBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 text-primary text-sm mb-1">
              <Wallet className="w-4 h-4" />
              Prochain versement
            </div>
            <p className="text-2xl font-bold text-foreground">
              {pendingBalance.totalNet.toFixed(2)}€
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingBalance.courseCount} courses • Lundi 6h
            </p>
          </Card>
          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <div className="flex items-center gap-2 text-destructive text-sm mb-1">
              <ArrowDownRight className="w-4 h-4" />
              Frais SoloCab
            </div>
            {(() => {
              // Semaine en cours = frais SoloCab visibles dans walletStats
              // (déjà filtré sur la semaine VTC en cours).
              const weekFees =
                (walletStats?.cardSolocabFees || 0) + (walletStats?.cashSolocabFees || 0);
              // Arriérés = frais espèces non prélevés des semaines passées
              // (déjà calculé dans carryOver à partir de driver_balance_pending).
              const previousFees = carryOver?.cashFeesOwedFromPastWeeks || 0;
              const total = weekFees + previousFees;
              return (
                <>
                  <p className="text-2xl font-bold text-destructive">
                    -{total.toFixed(2)}€
                  </p>
                  <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                    <p>📅 Semaine en cours : -{weekFees.toFixed(2)}€</p>
                    {previousFees > 0 ? (
                      <p className="text-warning font-medium">
                        + Frais antécédents impayés : -{previousFees.toFixed(2)}€
                      </p>
                    ) : (
                      <p className="text-success">✅ Aucun frais antécédent impayé</p>
                    )}
                    <p className="pt-1 border-t border-destructive/10 mt-1">
                      ✅ Prélevé (CB) : {pendingBalance.cardFeesCollected.toFixed(2)}€
                    </p>
                    <p>⏳ À déduire (Espèces) : {pendingBalance.cashFeesOwed.toFixed(2)}€</p>
                  </div>
                </>
              );
            })()}
          </Card>
          {totalPendingCommissions > 0 ? (
            <Card className="p-4 bg-success/5 border-success/20">
              <div className="flex items-center gap-2 text-success text-sm mb-1">
                <ArrowUpRight className="w-4 h-4" />
                Frais de transaction partage
              </div>
              <p className="text-2xl font-bold text-success">+{totalPendingCommissions.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingPayments.filter(p => p.sender_driver_id === driverId).length} courses partagées
              </p>
            </Card>
          ) : (
            <Card className="p-4 bg-muted/30 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CreditCard className="w-4 h-4" />
                Frais Stripe
              </div>
              <p className="text-2xl font-bold text-destructive">
                -{pendingBalance.totalStripeFees.toFixed(2)}€
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingBalance.totalStripeFees > 0 
                  ? `Frais sur ${walletStats?.cardCourses || 0} transaction(s) CB`
                  : 'Aucune transaction CB en attente'}
              </p>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="wallet" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="wallet" className="flex-1 gap-1">
            <CreditCard className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex-1 gap-1">
            <Wallet className="w-4 h-4" />
            Stripe
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1">
            <History className="w-4 h-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 gap-1">
            <Clock className="w-4 h-4" />
            ({pendingPayments.length})
          </TabsTrigger>
        </TabsList>

        {/* Wallet / Transaction History */}
        <TabsContent value="wallet" className="space-y-3">
          {!walletStats?.recentTransactions.length ? (
            <Card className="p-8 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune transaction pour le moment</p>
            </Card>
          ) : (
            walletStats.recentTransactions.map((t) => {
              const isCash = t.payment_method === 'cash';
              return (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isCash ? 'bg-amber-500/10' : 'bg-success/10'}`}>
                        {isCash ? (
                          <Banknote className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{getPaymentTypeLabel(t.payment_type)}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isCash ? 'border-amber-500/30 text-amber-500' : 'border-primary/30 text-primary'}`}>
                            {isCash ? 'Espèces' : 'CB'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{t.amount.toFixed(2)}€</p>
                      <p className="text-xs text-success">Net: {t.net_to_driver.toFixed(2)}€</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {isCash ? (
                      <>
                        <span className="text-amber-500">⏳ SoloCab: -{t.solocab_fee_amount.toFixed(2)}€</span>
                        <span className="text-muted-foreground italic">À déduire lundi</span>
                      </>
                    ) : (
                      <>
                        {t.stripe_fee_amount > 0 && <span>Stripe: -{t.stripe_fee_amount.toFixed(2)}€</span>}
                        <span>SoloCab: -{t.solocab_fee_amount.toFixed(2)}€</span>
                        <span className="text-success">✓ Prélevé</span>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Stripe Balance & Payouts */}
        <TabsContent value="stripe" className="space-y-3">
          {/* Stripe Balance */}
          {stripeBalance ? (
            <Card className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Balance Stripe (temps réel)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
                  <p className="text-2xl font-bold text-success">
                    {((stripeBalance.available?.[0]?.amount || 0) / 100).toFixed(2)}€
                  </p>
                  <p className="text-xs text-muted-foreground">Disponible</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {((stripeBalance.pending?.[0]?.amount || 0) / 100).toFixed(2)}€
                  </p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Balance Stripe indisponible</p>
              <p className="text-xs mt-1">Activez votre compte Stripe Connect pour voir votre balance</p>
            </Card>
          )}

          {/* Stripe Payouts */}
          <Card className="p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Virements Stripe récents
            </h4>
            {stripePayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun virement effectué</p>
            ) : (
              <div className="space-y-2">
                {stripePayouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(p.arrival_date * 1000), "dd MMM yyyy", { locale: fr })}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{(p.amount / 100).toFixed(2)}€</p>
                      <Badge variant={p.status === "paid" ? "default" : "outline"} className="text-[10px]">
                        {p.status === "paid" ? "Versé" : p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <h4 className="font-semibold text-primary text-sm mb-2">💡 Virements automatiques</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Stripe verse automatiquement votre solde chaque <strong>lundi</strong></li>
              <li>• Les frais Stripe sont déduits à chaque transaction CB</li>
              <li>• Les frais SoloCab (0,50€) sont prélevés via application_fee</li>
              <li>• SoloCab ne détient jamais vos fonds</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {/* Sélecteur de vue : Semaine / Mois */}
          <Card className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => setHistoryView("week")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    historyView === "week"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Par semaine
                </button>
                <button
                  onClick={() => setHistoryView("month")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    historyView === "month"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Par mois
                </button>
              </div>
              {historyView === "month" && availableMonths.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs capitalize">
                        {formatMonthLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>

          {/* Info banner */}
          <Card className="p-4 bg-primary/10 border-primary/20">
            <h4 className="font-semibold text-primary mb-2">💡 Comment fonctionne le règlement ?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Les frais SoloCab (0,50€/course) sont déduits automatiquement</li>
              <li>• Pour les CB : frais prélevés à la transaction</li>
              <li>• Pour les espèces : frais déduits du prochain versement</li>
              <li>• Versement net unique chaque <strong>lundi à 6h</strong></li>
              <li>• Les chiffres en haut concernent <strong>uniquement la semaine en cours</strong></li>
            </ul>
          </Card>

          {/* VUE MOIS — récap agrégé puis liste des semaines du mois */}
          {historyView === "month" && (
            <>
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <p className="text-xs text-muted-foreground mb-1 capitalize">{formatMonthLabel(selectedMonth)}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Net versé (mois)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {monthlyAggregate.totalNet.toFixed(2)}€
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total frais</p>
                    <p className="text-2xl font-bold text-destructive">
                      -{monthlyAggregate.totalFees.toFixed(2)}€
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
                  <span>{monthlyAggregate.weeks.length} semaine(s)</span>
                  <span>{monthlyAggregate.totalCourses} courses</span>
                  <span className="text-success">+{monthlyAggregate.totalCommissions.toFixed(2)}€ frais transaction</span>
                  {monthlyAggregate.failedCount > 0 && (
                    <span className="text-destructive font-medium">
                      ⚠️ {monthlyAggregate.failedCount} virement(s) en échec
                    </span>
                  )}
                </div>
              </Card>

              {monthlyAggregate.weeks.length === 0 && monthlyAggregate.transactions.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun règlement pour ce mois</p>
                </Card>
              ) : (
                <>
                  {monthlyAggregate.weeks.map((s) => (
                    <Card key={s.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {s.week_start && format(new Date(s.week_start), "dd MMM", { locale: fr })} → {s.week_end && format(new Date(s.week_end), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        {getStatusBadge(s.transfer_status)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Frais transaction</span>
                          <p className="font-semibold text-success">+{s.total_commissions_earned.toFixed(2)}€</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frais</span>
                          <p className="font-semibold text-destructive">-{s.total_solocab_fees.toFixed(2)}€</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net versé</span>
                          <p className={`font-semibold ${s.net_amount >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {s.net_amount.toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {monthlyAggregate.weeks.length === 0 && monthlyAggregate.transactions.length > 0 && (
                    <Card className="p-4 bg-primary/5 border-primary/20 text-sm text-muted-foreground">
                      Courses du mois visibles ci-dessus ; le règlement hebdomadaire correspondant n'a pas encore été clôturé.
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* VUE SEMAINE — liste classique */}
          {historyView === "week" && (
            <>
              {settlements.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun règlement effectué pour le moment</p>
                  <p className="text-xs mt-1">Les règlements apparaîtront ici après le premier lundi</p>
                </Card>
              ) : (
                settlements.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {s.week_start && format(new Date(s.week_start), "dd MMM", { locale: fr })} → {s.week_end && format(new Date(s.week_end), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      {getStatusBadge(s.transfer_status)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Frais de transaction</span>
                        <p className="font-semibold text-success">+{s.total_commissions_earned.toFixed(2)}€</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Frais</span>
                        <p className="font-semibold text-destructive">-{s.total_solocab_fees.toFixed(2)}€</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Net versé</span>
                        <p className={`font-semibold ${s.net_amount >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {s.net_amount.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{s.shared_courses_as_sender} envoyées</span>
                      <span>{s.shared_courses_as_receiver} reçues</span>
                      <span>{s.standard_courses_count} standards</span>
                    </div>
                    {s.transfer_error && (
                      <p className="text-xs text-destructive mt-2">{s.transfer_error}</p>
                    )}
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {pendingPayments.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun paiement en attente</p>
            </Card>
          ) : (
            pendingPayments.map((p) => {
              const isSender = p.sender_driver_id === driverId;
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSender ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {isSender ? "Frais de transaction à recevoir" : "Course reçue"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isSender ? (
                        <p className="font-bold text-success">+{p.sender_commission_amount.toFixed(2)}€</p>
                      ) : (
                        <p className="font-bold text-foreground">{p.course_amount.toFixed(2)}€</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {isSender ? `sur ${p.course_amount.toFixed(2)}€` : `Frais: -${(p.platform_fee || 0.25).toFixed(2)}€`}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
