import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlatform, isMobileApp } from "@/lib/platform";

type CheckStatus = "pending" | "ok" | "warn" | "fail";

interface HealthCheckItem {
  id: string;
  label: string;
  details: string;
  status: CheckStatus;
}

const EXPECTED_HOST = "solocab.fr";

const CRITICAL_ROUTES = [
  { id: "login", label: "Login JWT", path: "/login" },
  { id: "client-dashboard", label: "Tableau de bord client", path: "/client-dashboard" },
  { id: "driver-dashboard", label: "Tableau de bord chauffeur", path: "/driver-dashboard?view=dashboard" },
  { id: "client-notes", label: "Notes / contestations client", path: "/client-dashboard?tab=notes" },
  { id: "driver-ratings", label: "Notes / contestations chauffeur", path: "/driver-dashboard?view=dashboard&tab=performance&sub=ratings" },
];

const statusStyle: Record<CheckStatus, string> = {
  pending: "border-muted text-muted-foreground",
  ok: "border-success/30 text-success bg-success/10",
  warn: "border-warning/30 text-warning bg-warning/10",
  fail: "border-destructive/30 text-destructive bg-destructive/10",
};

const StatusIcon = ({ status }: { status: CheckStatus }) => {
  if (status === "pending") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "ok") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "warn") return <ShieldAlert className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
};

export default function ApkHealthCheck() {
  const [checks, setChecks] = useState<HealthCheckItem[]>([]);
  const [running, setRunning] = useState(false);
  const platform = getPlatform();

  const runtimeChecks = useMemo<HealthCheckItem[]>(() => {
    const host = window.location.hostname;
    const isExpectedHost = host === EXPECTED_HOST || host.endsWith(`.${EXPECTED_HOST}`);

    return [
      {
        id: "runtime-platform",
        label: "Environnement APK",
        status: isMobileApp() ? "ok" : "warn",
        details: isMobileApp()
          ? `Capacitor détecté (${platform})`
          : `Mode web détecté (${platform}) — ouvrez cette page dans l'APK pour valider le conteneur natif`,
      },
      {
        id: "runtime-host",
        label: "URL chargée par l'application",
        status: isExpectedHost ? "ok" : "fail",
        details: isExpectedHost
          ? `L'APK charge bien ${window.location.origin}`
          : `URL actuelle: ${window.location.origin}. Attendu: https://${EXPECTED_HOST}`,
      },
    ];
  }, [platform]);

  const updateCheck = (item: HealthCheckItem) => {
    setChecks((prev) => prev.map((check) => (check.id === item.id ? item : check)));
  };

  const runChecks = async () => {
    setRunning(true);
    const initialRouteChecks = CRITICAL_ROUTES.map((route) => ({
      id: route.id,
      label: route.label,
      status: "pending" as CheckStatus,
      details: route.path,
    }));
    const authCheck: HealthCheckItem = {
      id: "auth-login-function",
      label: "Fonction login JWT",
      status: "pending",
      details: "auth-login",
    };

    setChecks([...runtimeChecks, authCheck, ...initialRouteChecks]);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-login`, { method: "OPTIONS" });
      updateCheck({
        id: "auth-login-function",
        label: "Fonction login JWT",
        status: response.ok ? "ok" : "fail",
        details: response.ok ? "Endpoint auth-login joignable" : `Réponse inattendue: HTTP ${response.status}`,
      });
    } catch (error) {
      updateCheck({
        id: "auth-login-function",
        label: "Fonction login JWT",
        status: "fail",
        details: error instanceof Error ? error.message : "Endpoint auth-login inaccessible",
      });
    }

    for (const route of CRITICAL_ROUTES) {
      try {
        const response = await fetch(route.path, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "text/html" },
        });
        const contentType = response.headers.get("content-type") || "";
        const isHtml = contentType.includes("text/html");
        updateCheck({
          id: route.id,
          label: route.label,
          status: response.ok && isHtml ? "ok" : "fail",
          details: response.ok && isHtml ? `${route.path} répond correctement` : `${route.path} → HTTP ${response.status} (${contentType || "type inconnu"})`,
        });
      } catch (error) {
        updateCheck({
          id: route.id,
          label: route.label,
          status: "fail",
          details: error instanceof Error ? error.message : `${route.path} inaccessible`,
        });
      }
    }

    setRunning(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const failures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/30 text-primary">Diagnostic APK</Badge>
          <h1 className="text-2xl font-bold">Santé SoloCab</h1>
          <p className="text-sm text-muted-foreground">
            Vérification des routes critiques, de l'URL réellement chargée et de l'accès au login JWT.
          </p>
        </div>

        <Card className="p-4 border-border bg-card/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {failures > 0 ? "Action requise" : warnings > 0 ? "Valide avec avertissement" : "Tous les contrôles sont valides"}
              </p>
              <p className="text-xs text-muted-foreground">Origine actuelle : {window.location.origin}</p>
            </div>
            <Button size="sm" variant="outline" onClick={runChecks} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Relancer
            </Button>
          </div>
        </Card>

        <div className="space-y-2">
          {checks.map((check) => (
            <Card key={check.id} className={`p-4 border ${statusStyle[check.status]}`}>
              <div className="flex items-start gap-3">
                <StatusIcon status={check.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{check.label}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{check.details}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-4 border-warning/30 bg-warning/10 text-sm text-muted-foreground">
          Si l'URL affichée n'est pas <strong className="text-foreground">https://solocab.fr</strong>, l'APK installé n'a pas été resynchronisé après le changement Capacitor : il faut relancer build + sync puis réinstaller l'application.
        </Card>

        <Button asChild variant="ghost" className="w-full">
          <Link to="/">Retour accueil</Link>
        </Button>
      </div>
    </main>
  );
}