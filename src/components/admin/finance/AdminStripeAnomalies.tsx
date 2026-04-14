import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Anomaly {
  id: string;
  driver_id: string;
  course_id: string | null;
  anomaly_type: string;
  description: string;
  expected_value: number | null;
  actual_value: number | null;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  detected_at: string;
  driver_name?: string;
}

const AdminStripeAnomalies = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    fetchAnomalies();
  }, [showResolved]);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stripe_anomalies")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(100);

      if (!showResolved) {
        query = query.eq("is_resolved", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch driver names
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map((a: any) => a.driver_id).filter(Boolean))];
        if (driverIds.length > 0) {
          const { data: drivers } = await supabase
            .from("drivers")
            .select("id, profiles:user_id(full_name)")
            .in("id", driverIds);

          const driverMap = new Map<string, string>();
          drivers?.forEach((d: any) => {
            driverMap.set(d.id, d.profiles?.full_name || "Inconnu");
          });

          data.forEach((a: any) => {
            a.driver_name = driverMap.get(a.driver_id) || "Inconnu";
          });
        }
      }

      setAnomalies((data as Anomaly[]) || []);
    } catch (err) {
      console.error("Error fetching anomalies:", err);
      toast.error("Erreur lors du chargement des anomalies");
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    try {
      // Cross-check: local records vs consistency
      const { data: pendingRecords, error: pendingError } = await supabase
        .from("driver_balance_pending")
        .select("id, driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type")
        .eq("status", "pending")
        .limit(500);

      if (pendingError) throw pendingError;

      let anomaliesFound = 0;

      for (const record of pendingRecords || []) {
        // 1. Check net_amount consistency: gross - solocab_fee - stripe_fee = net
        const expectedNet = Math.max(
          Number(record.gross_amount) - Number(record.solocab_fee) - Number(record.stripe_fee),
          0
        );
        const actualNet = Number(record.net_amount);
        const diff = Math.abs(expectedNet - actualNet);

        if (diff > 0.01) {
          await supabase.from("stripe_anomalies").insert({
            driver_id: record.driver_id,
            course_id: record.course_id,
            anomaly_type: "net_amount_mismatch",
            description: `Montant net incohérent: attendu ${expectedNet.toFixed(2)}€, trouvé ${actualNet.toFixed(2)}€`,
            expected_value: expectedNet,
            actual_value: actualNet,
            severity: "critical",
          });
          anomaliesFound++;
        }

        // 2. Check fee type correctness
        if (record.payment_type === "cash" && Number(record.stripe_fee) > 0) {
          await supabase.from("stripe_anomalies").insert({
            driver_id: record.driver_id,
            course_id: record.course_id,
            anomaly_type: "cash_with_stripe_fee",
            description: `Course espèces avec frais Stripe: ${Number(record.stripe_fee).toFixed(2)}€`,
            expected_value: 0,
            actual_value: Number(record.stripe_fee),
            severity: "critical",
          });
          anomaliesFound++;
        }

        // 3. Check SoloCab fee is valid (0.25, 0.50, or 0.80)
        const fee = Number(record.solocab_fee);
        if (![0.25, 0.50, 0.80].includes(fee) && fee > 0) {
          await supabase.from("stripe_anomalies").insert({
            driver_id: record.driver_id,
            course_id: record.course_id,
            anomaly_type: "invalid_solocab_fee",
            description: `Frais SoloCab non standard: ${fee.toFixed(2)}€ (attendu: 0.25€, 0.50€ ou 0.80€)`,
            expected_value: 0.50,
            actual_value: fee,
            severity: "warning",
          });
          anomaliesFound++;
        }
      }

      // 4. Cross-check stripe_transactions vs driver_balance_pending
      const { data: stripeRecords } = await supabase
        .from("stripe_transactions")
        .select("course_id, gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount, driver_id")
        .eq("status", "succeeded")
        .limit(500);

      const pendingMap = new Map<string, any>();
      (pendingRecords || []).forEach((r: any) => {
        if (r.course_id) pendingMap.set(r.course_id, r);
      });

      for (const sr of stripeRecords || []) {
        if (sr.course_id && pendingMap.has(sr.course_id)) {
          const pr = pendingMap.get(sr.course_id);
          const grossDiff = Math.abs(Number(sr.gross_amount) - Number(pr.gross_amount));
          if (grossDiff > 0.01) {
            await supabase.from("stripe_anomalies").insert({
              driver_id: sr.driver_id,
              course_id: sr.course_id,
              anomaly_type: "cross_table_mismatch",
              description: `Écart montant brut entre tables: transactions=${Number(sr.gross_amount).toFixed(2)}€ vs pending=${Number(pr.gross_amount).toFixed(2)}€`,
              expected_value: Number(pr.gross_amount),
              actual_value: Number(sr.gross_amount),
              severity: "critical",
            });
            anomaliesFound++;
          }
        }
      }

      if (anomaliesFound === 0) {
        toast.success("✅ Audit terminé — Aucune anomalie détectée !");
      } else {
        toast.warning(`⚠️ ${anomaliesFound} anomalie(s) détectée(s)`);
      }

      fetchAnomalies();
    } catch (err) {
      console.error("Audit error:", err);
      toast.error("Erreur lors de l'audit");
    } finally {
      setAuditing(false);
    }
  };

  const resolveAnomaly = async (id: string) => {
    try {
      const { error } = await supabase
        .from("stripe_anomalies")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || "Résolu manuellement",
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Anomalie résolue");
      setResolvingId(null);
      setResolutionNotes("");
      fetchAnomalies();
    } catch (err) {
      toast.error("Erreur lors de la résolution");
    }
  };

  const severityConfig: Record<string, { color: string; icon: any }> = {
    critical: { color: "destructive", icon: XCircle },
    warning: { color: "secondary", icon: AlertTriangle },
    info: { color: "outline", icon: ShieldAlert },
  };

  const unresolvedCount = anomalies.filter((a) => !a.is_resolved).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <CardTitle className="text-base">Anomalies Stripe</CardTitle>
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unresolvedCount} non résolue(s)
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
                className="text-xs"
              >
                {showResolved ? "Masquer résolues" : "Voir tout"}
              </Button>
              <Button
                size="sm"
                onClick={runAudit}
                disabled={auditing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditing ? "animate-spin" : ""}`} />
                {auditing ? "Audit..." : "Lancer l'audit"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chargement...</p>
          ) : anomalies.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="text-sm font-medium text-green-700">Aucune anomalie détectée</p>
              <p className="text-xs text-muted-foreground">
                Toutes les données financières sont synchronisées
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => {
                const config = severityConfig[anomaly.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={anomaly.id}
                    className={`border rounded-lg p-3 space-y-2 ${
                      anomaly.is_resolved ? "opacity-60 bg-muted/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.color as any} className="text-[10px]">
                              {anomaly.anomaly_type.replace(/_/g, " ")}
                            </Badge>
                            {anomaly.is_resolved && (
                              <Badge variant="outline" className="text-[10px] text-green-600">
                                ✓ Résolu
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs mt-1">{anomaly.description}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span>Chauffeur: {anomaly.driver_name || "—"}</span>
                            <span>
                              {new Date(anomaly.detected_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {anomaly.expected_value !== null && anomaly.actual_value !== null && (
                            <div className="flex gap-4 mt-1 text-[10px]">
                              <span className="text-green-600">
                                Attendu: {Number(anomaly.expected_value).toFixed(2)}€
                              </span>
                              <span className="text-destructive">
                                Trouvé: {Number(anomaly.actual_value).toFixed(2)}€
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {!anomaly.is_resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs shrink-0"
                          onClick={() =>
                            setResolvingId(resolvingId === anomaly.id ? null : anomaly.id)
                          }
                        >
                          Résoudre
                        </Button>
                      )}
                    </div>
                    {resolvingId === anomaly.id && (
                      <div className="flex gap-2 items-end pt-1">
                        <Textarea
                          placeholder="Notes de résolution..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="text-xs h-16"
                        />
                        <Button size="sm" onClick={() => resolveAnomaly(anomaly.id)} className="text-xs shrink-0">
                          Confirmer
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStripeAnomalies;
