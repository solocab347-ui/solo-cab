import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverFinancePageProps {
  driverId: string;
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

export function DriverFinancePage({ driverId }: DriverFinancePageProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [driverId]);

  const loadData = async () => {
    try {
      // Load historical settlements
      const { data: balances } = await supabase
        .from("driver_weekly_balances")
        .select(`
          id, net_amount, total_commissions_earned, total_solocab_fees,
          shared_courses_as_sender, shared_courses_as_receiver, standard_courses_count,
          transfer_status, stripe_transfer_id, transfer_executed_at, transfer_error,
          settlement:weekly_settlements(id, week_start, week_end)
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(20);

      const mapped = (balances || []).map((b: any) => ({
        ...b,
        week_start: b.settlement?.week_start,
        week_end: b.settlement?.week_end,
      }));
      setSettlements(mapped);

      // Load pending (unsettled) payments
      const { data: pending } = await supabase
        .from("shared_course_payments")
        .select("id, course_amount, commission_amount, sender_commission_amount, platform_fee, created_at, sender_driver_id, receiver_driver_id")
        .eq("status", "completed")
        .is("settlement_id", null)
        .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        .order("created_at", { ascending: false });

      setPendingPayments(pending || []);
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

  const totalPendingFees = pendingPayments
    .filter(p => p.receiver_driver_id === driverId)
    .reduce((sum, p) => sum + (p.platform_fee || 0.10), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Finances & Règlements</h2>
          <p className="text-sm text-muted-foreground">Versements hebdomadaires chaque lundi</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-2 text-success text-sm mb-1">
            <ArrowUpRight className="w-4 h-4" />
            Commissions en attente
          </div>
          <p className="text-2xl font-bold text-success">+{totalPendingCommissions.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingPayments.filter(p => p.sender_driver_id === driverId).length} courses partagées
          </p>
        </Card>
        <Card className="p-4 bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm mb-1">
            <ArrowDownRight className="w-4 h-4" />
            Frais à déduire
          </div>
          <p className="text-2xl font-bold text-destructive">-{totalPendingFees.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground mt-1">Frais de gestion SoloCab</p>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 text-primary text-sm mb-1">
            <Wallet className="w-4 h-4" />
            Net estimé
          </div>
          <p className="text-2xl font-bold text-foreground">
            {(totalPendingCommissions - totalPendingFees).toFixed(2)}€
          </p>
          <p className="text-xs text-muted-foreground mt-1">Prochain versement lundi 6h</p>
        </Card>
      </div>

      {/* Info banner */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">💡 Comment fonctionne le règlement ?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Les commissions de vos courses partagées sont accumulées pendant la semaine</li>
          <li>• Les frais de gestion SoloCab (0,50€/course en ligne + 0,10€/partage) sont déduits</li>
          <li>• Un versement net unique est effectué chaque <strong>lundi à 6h</strong> sur votre compte Stripe</li>
          <li>• Ce système réduit considérablement les frais de transaction Stripe</li>
        </ul>
      </Card>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="flex-1 gap-1">
            <Calendar className="w-4 h-4" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 gap-1">
            <Clock className="w-4 h-4" />
            En attente ({pendingPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
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
                    <span className="text-muted-foreground">Commissions</span>
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
                          {isSender ? "Commission à recevoir" : "Course reçue"}
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
                        <p className="text-xs text-muted-foreground">Course: {p.course_amount.toFixed(2)}€</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {isSender ? `sur ${p.course_amount.toFixed(2)}€` : `Frais: ${(p.platform_fee || 0.10).toFixed(2)}€`}
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
