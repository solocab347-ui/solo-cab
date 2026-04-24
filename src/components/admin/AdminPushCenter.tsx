/**
 * AdminPushCenter — Centre de tests & monitoring des notifications push.
 * 3 onglets :
 *  - Test : envoie une notif incoming_ride/generic à un user
 *  - Tokens : liste des tokens FCM/APNS/Web par user, dernière utilisation, désactivation
 *  - Logs : journal technique des envois (web/fcm/apns) avec succès/échec
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Send, Smartphone, ScrollText, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";

type Tab = "test" | "tokens" | "logs";

interface TokenRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  platform: string;
  device_model: string | null;
  app_version: string | null;
  is_active: boolean;
  last_used_at: string;
  token_preview: string;
  seconds_since_used: number;
}

interface LogRow {
  id: string;
  user_id: string | null;
  channel: string;
  notification_type: string | null;
  title: string | null;
  success: boolean;
  status_code: number | null;
  error_reason: string | null;
  created_at: string;
}

export default function AdminPushCenter() {
  const [tab, setTab] = useState<Tab>("test");
  const [targetUserId, setTargetUserId] = useState("");
  const [type, setType] = useState<"incoming_ride" | "generic">("incoming_ride");
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTokens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_push_tokens_view" as never)
      .select("*")
      .order("last_used_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Erreur chargement tokens : " + error.message);
    else setTokens((data as unknown as TokenRow[]) || []);
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("push_delivery_logs" as never)
      .select("id,user_id,channel,notification_type,title,success,status_code,error_reason,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Erreur chargement logs : " + error.message);
    else setLogs((data as unknown as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "tokens") loadTokens();
    if (tab === "logs") loadLogs();
  }, [tab]);

  const sendTest = async () => {
    if (!targetUserId.trim()) {
      toast.error("Renseigne un user_id cible");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-push", {
        body: { target_user_id: targetUserId.trim(), type },
      });
      if (error) throw error;
      toast.success("Test envoyé", {
        description: `Web: ${JSON.stringify(data?.web_push?.push_sent ?? "?")} | FCM: ${JSON.stringify(data?.fcm?.sent ?? "?")}`,
      });
    } catch (e: unknown) {
      toast.error("Erreur : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSending(false);
    }
  };

  const disableToken = async (id: string) => {
    const { error } = await supabase.from("push_tokens").update({ is_active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Token désactivé. L'appareil regénérera au prochain lancement.");
      loadTokens();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button variant={tab === "test" ? "default" : "ghost"} size="sm" onClick={() => setTab("test")} className="gap-2">
          <Send className="w-4 h-4" /> Test envoi
        </Button>
        <Button variant={tab === "tokens" ? "default" : "ghost"} size="sm" onClick={() => setTab("tokens")} className="gap-2">
          <Smartphone className="w-4 h-4" /> Tokens ({tokens.length || "—"})
        </Button>
        <Button variant={tab === "logs" ? "default" : "ghost"} size="sm" onClick={() => setTab("logs")} className="gap-2">
          <ScrollText className="w-4 h-4" /> Journal
        </Button>
      </div>

      {tab === "test" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" /> Envoyer une notification de test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User ID destinataire</Label>
              <Input
                placeholder="uuid du user (auth.users.id)"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Astuce : copie un user_id depuis l'onglet "Tokens".
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <Button variant={type === "incoming_ride" ? "default" : "outline"} size="sm" onClick={() => setType("incoming_ride")}>
                  🚖 Course (réveil écran)
                </Button>
                <Button variant={type === "generic" ? "default" : "outline"} size="sm" onClick={() => setType("generic")}>
                  🔔 Générique
                </Button>
              </div>
            </div>
            <Button onClick={sendTest} disabled={sending} className="gap-2">
              <Send className="w-4 h-4" /> {sending ? "Envoi…" : "Envoyer maintenant"}
            </Button>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <p><strong>Comportement attendu Android :</strong></p>
              <ul className="list-disc ml-5 space-y-0.5 text-muted-foreground">
                <li>Type <code>incoming_ride</code> : full-screen intent, écran s'allume, son haute priorité, ouverture sur <code>/driver-dashboard</code>.</li>
                <li>Type <code>generic</code> : notification standard, ouverture sur <code>/notifications</code>.</li>
                <li>Si Firebase non configuré, fallback web push + notification DB.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "tokens" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tokens enregistrés</CardTitle>
            <Button size="sm" variant="outline" onClick={loadTokens} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Rafraîchir
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-muted-foreground text-sm">Chargement…</p>
            ) : tokens.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun token enregistré.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-2">Utilisateur</th>
                    <th className="py-2 pr-2">Plateforme</th>
                    <th className="py-2 pr-2">Appareil</th>
                    <th className="py-2 pr-2">Token</th>
                    <th className="py-2 pr-2">Dernière maj</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-2">
                        <div className="font-medium">{t.full_name || "—"}</div>
                        <div className="text-muted-foreground">{t.email}</div>
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(t.user_id);
                            toast.success("user_id copié");
                          }}
                        >
                          {t.user_id.slice(0, 8)}…
                        </button>
                      </td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline">{t.platform}</Badge>
                      </td>
                      <td className="py-2 pr-2">
                        <div>{t.device_model || "—"}</div>
                        <div className="text-muted-foreground">v{t.app_version || "?"}</div>
                      </td>
                      <td className="py-2 pr-2 font-mono">{t.token_preview}</td>
                      <td className="py-2 pr-2">
                        {Math.floor(t.seconds_since_used / 3600)}h{" "}
                        {Math.floor((t.seconds_since_used % 3600) / 60)}min
                      </td>
                      <td className="py-2 pr-2">
                        {t.is_active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Actif</Badge>
                        ) : (
                          <Badge variant="outline">Inactif</Badge>
                        )}
                      </td>
                      <td className="py-2">
                        {t.is_active && (
                          <Button size="sm" variant="ghost" onClick={() => disableToken(t.id)} className="gap-1">
                            <XCircle className="w-3 h-3" /> Forcer regen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "logs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Journal technique (100 derniers envois)</CardTitle>
            <Button size="sm" variant="outline" onClick={loadLogs} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Rafraîchir
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <p className="text-muted-foreground text-sm">Chargement…</p>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun log pour l'instant.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Canal</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Titre</th>
                    <th className="py-2 pr-2">Statut</th>
                    <th className="py-2 pr-2">Erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-2">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                      <td className="py-2 pr-2"><Badge variant="outline">{l.channel}</Badge></td>
                      <td className="py-2 pr-2">{l.notification_type || "—"}</td>
                      <td className="py-2 pr-2 max-w-xs truncate">{l.title || "—"}</td>
                      <td className="py-2 pr-2">
                        {l.success ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> OK {l.status_code || ""}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" /> {l.status_code || "FAIL"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-2 max-w-md truncate text-muted-foreground">{l.error_reason || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
