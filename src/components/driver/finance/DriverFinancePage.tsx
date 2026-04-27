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

export function DriverFinancePage({ driverId, initialTab = "transactions" }: DriverFinancePageProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [pendingBalance, setPendingBalance] = useState<PendingBalanceStats | null>(null);
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
      const [balancesResult, pendingResult, paymentsResult, driverResult, pendingBalanceResult] = await Promise.all([
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
          .from("drivers")
          .select("stripe_connect_charges_enabled")
          .eq("id", driverId)
          .single(),
        // ⚠️ driver_balance_pending reste non-filtré : il porte naturellement
        // la semaine en cours + tout carry-over (frais espèces non prélevés,
        // virements précédents échoués) qui n'a pas encore été settlé.
        supabase
          .from("driver_balance_pending" as any)
          .select("gross_amount, solocab_fee, stripe_fee, net_amount, payment_type")
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

  // Liste des mois disponibles dans l'historique des règlements (12 derniers max)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) {
      if (!s.week_start) continue;
      const d = new Date(s.week_start);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    // Inclure aussi le mois courant pour pouvoir le sélectionner même sans data
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return Array.from(set).sort().reverse().slice(0, 12);
  }, [settlements]);

  // Agrégat mensuel à partir des règlements hebdomadaires
  const monthlyAggregate = useMemo(() => {
    const filtered = settlements.filter((s) => {
      if (!s.week_start) return false;
      const d = new Date(s.week_start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === selectedMonth;
    });
    return {
      weeks: filtered,
      totalNet: filtered.reduce((sum, s) => sum + (s.net_amount || 0), 0),
      totalFees: filtered.reduce((sum, s) => sum + (s.total_solocab_fees || 0), 0),
      totalCommissions: filtered.reduce((sum, s) => sum + (s.total_commissions_earned || 0), 0),
      totalCourses: filtered.reduce(
        (sum, s) => sum + (s.standard_courses_count || 0) + (s.shared_courses_as_sender || 0) + (s.shared_courses_as_receiver || 0),
        0
      ),
    };
  }, [settlements, selectedMonth]);

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
            <p className="text-2xl font-bold text-destructive">
              -{pendingBalance.totalSolocabFees.toFixed(2)}€
            </p>
            <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
              <p>✅ Prélevé (CB): {pendingBalance.cardFeesCollected.toFixed(2)}€</p>
              <p>⏳ À déduire (Espèces): {pendingBalance.cashFeesOwed.toFixed(2)}€</p>
            </div>
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
            <Calendar className="w-4 h-4" />
            Versements
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
          {/* Info banner */}
          <Card className="p-4 bg-primary/10 border-primary/20">
            <h4 className="font-semibold text-primary mb-2">💡 Comment fonctionne le règlement ?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Les frais SoloCab (0,50€/course) sont déduits automatiquement</li>
              <li>• Pour les CB : frais prélevés à la transaction</li>
              <li>• Pour les espèces : frais déduits du prochain versement</li>
              <li>• Versement net unique chaque <strong>lundi à 6h</strong></li>
            </ul>
          </Card>

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
