import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Wallet, ArrowDownToLine, ShieldAlert, Calculator
} from "lucide-react";

type Coherence = {
  stripe_balance: { available: number; pending: number };
  total_to_transfer: number;
  total_cash_debt: number;
  drivers_count: number;
  drivers_without_stripe: number;
  can_settle: boolean;
  issues: any[];
  previews: any[];
};

const AdminSettlements = () => {
  const [coherence, setCoherence] = useState<Coherence | null>(null);
  const [recalc, setRecalc] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: hist }, { data: al }] = await Promise.all([
        supabase.from("weekly_settlements")
          .select("id, week_start, week_end, status, total_transfer_amount, total_transfers_executed, processed_at")
          .order("created_at", { ascending: false }).limit(8),
        supabase.from("settlement_alerts")
          .select("*, weekly_settlements(week_start)")
          .order("created_at", { ascending: false }).limit(20),
      ]);
      setHistory(hist || []);
      setAlerts(al || []);
    } finally {
      setLoading(false);
    }
  };

  const runCoherence = async () => {
    setBusy("coherence");
    try {
      const { data, error } = await supabase.functions.invoke("check-settlement-coherence");
      if (error) throw error;
      setCoherence(data);
      toast.success("Vérification cohérence terminée");
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const runRecalc = async (settlementId?: string) => {
    setBusy("recalc");
    try {
      const { data, error } = await supabase.functions.invoke("recalculate-settlement", {
        body: settlementId ? { settlement_id: settlementId } : {},
      });
      if (error) throw error;
      setRecalc(data);
      toast.success("Recalcul à blanc terminé");
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { color: string; label: string }> = {
      completed: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", label: "Réussi" },
      completed_with_errors: { color: "bg-amber-500/10 text-amber-700 border-amber-200", label: "Erreurs" },
      processing: { color: "bg-blue-500/10 text-blue-700 border-blue-200", label: "En cours" },
      failed: { color: "bg-red-500/10 text-red-700 border-red-200", label: "Échec" },
    };
    const m = map[s] || { color: "bg-muted text-muted-foreground", label: s };
    return <Badge variant="outline" className={m.color}>{m.label}</Badge>;
  };

  const sevColor = (s: string) =>
    s === "critical" ? "text-red-600 bg-red-500/10" :
    s === "warning" ? "text-amber-600 bg-amber-500/10" :
    "text-blue-600 bg-blue-500/10";

  return (
    <div className="space-y-4">
      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  Vérification cohérence
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Compare le solde Stripe au montant à virer pour le prochain lundi.
                </p>
              </div>
              <Button size="sm" onClick={runCoherence} disabled={busy === "coherence"}>
                {busy === "coherence" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lancer"}
              </Button>
            </div>
            {coherence && (
              <div className="space-y-2 pt-2 border-t">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">Solde Stripe</div>
                    <div className="font-bold">{coherence.stripe_balance.available.toFixed(2)} €</div>
                  </div>
                  <div className="p-2 bg-muted/30 rounded">
                    <div className="text-muted-foreground">À virer</div>
                    <div className="font-bold">{coherence.total_to_transfer.toFixed(2)} €</div>
                  </div>
                </div>
                {coherence.can_settle ? (
                  <Alert className="border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800 text-xs">
                      Solde suffisant — {coherence.drivers_count} chauffeurs prêts.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-xs">
                      Solde insuffisant ou aucun virement à exécuter.
                    </AlertDescription>
                  </Alert>
                )}
                {coherence.issues?.length > 0 && (
                  <div className="space-y-1">
                    {coherence.issues.slice(0, 3).map((i: any, idx: number) => (
                      <div key={idx} className="text-[11px] p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        ⚠️ {i.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-violet-600" />
                  Recalcul à blanc
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Simule le dernier règlement avec la nouvelle logique cash/carte (sans rien modifier).
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => runRecalc()} disabled={busy === "recalc"}>
                {busy === "recalc" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Simuler"}
              </Button>
            </div>
            {recalc && (
              <div className="pt-2 border-t space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <div className="text-emerald-700">À virer (réel)</div>
                    <div className="font-bold text-emerald-900">{recalc.summary.total_should_transfer} €</div>
                  </div>
                  <div className="p-2 bg-amber-50 rounded border border-amber-200">
                    <div className="text-amber-700">Dette cash</div>
                    <div className="font-bold text-amber-900">{recalc.summary.total_cash_debt_to_recover} €</div>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5">
                  {recalc.drivers.map((d: any) => (
                    <div key={d.driver_id} className="text-[11px] p-2 bg-muted/30 rounded border">
                      <div className="font-semibold flex items-center justify-between">
                        <span>{d.company}</span>
                        <span className={d.real_net_should_transfer >= 1 ? "text-emerald-600" : "text-amber-600"}>
                          {d.real_net_should_transfer.toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        Carte: {d.card_courses} courses ({d.card_net.toFixed(2)}€) · Cash: {d.cash_courses} ({d.cash_collected_by_driver.toFixed(2)}€)
                      </div>
                      <div className="text-[10px] mt-0.5">{d.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historique settlements */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            Historique des règlements
            <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={loadAll}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {loading ? (
            <div className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun règlement</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-2.5 rounded border bg-muted/20 text-xs">
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{h.week_start} → {h.week_end}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {h.total_transfers_executed || 0} virement(s) · {Number(h.total_transfer_amount || 0).toFixed(2)}€
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(h.status)}
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => runRecalc(h.id)}>
                    Simuler
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Alertes */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Alertes récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune alerte</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className={`p-2.5 rounded border text-xs ${sevColor(a.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{a.alert_type.replace(/_/g, ' ')}</div>
                    <div className="mt-0.5 text-[11px]">{a.message}</div>
                    <div className="text-[10px] mt-1 opacity-70">
                      {new Date(a.created_at).toLocaleString("fr-FR")}
                      {a.weekly_settlements?.week_start && ` · Semaine ${a.weekly_settlements.week_start}`}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{a.severity}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettlements;
