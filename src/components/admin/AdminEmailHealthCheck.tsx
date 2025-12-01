import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * 🩺 ADMIN EMAIL HEALTH CHECK
 * Diagnostic complet du système d'emails
 */
const AdminEmailHealthCheck = () => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runHealthCheck = async (testSend: boolean = false) => {
    setLoading(true);
    try {
      console.log("🩺 Lancement diagnostic emails...");
      
      const { data, error } = await supabase.functions.invoke("email-health-check", {
        body: { test_send: testSend }
      });

      if (error) throw error;

      setDiagnostics(data);
      
      if (data.status === "healthy") {
        toast.success("✅ Système emails opérationnel");
      } else if (data.status === "unhealthy") {
        toast.error("❌ Problèmes détectés dans système emails");
      } else {
        toast.warning("⚠️ Système emails avec warnings");
      }

    } catch (error: any) {
      console.error("Erreur health check:", error);
      toast.error("Erreur lors du diagnostic: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">✅ Sain</Badge>;
      case "unhealthy":
        return <Badge className="bg-red-500">❌ Problème</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">⚠️ Warning</Badge>;
      default:
        return <Badge>Inconnu</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Diagnostic Système Emails</h2>
      </div>

      <p className="text-muted-foreground mb-6">
        Vérifiez l'état de santé complet du système d'envoi d'emails SoloCab.
        Tous les composants critiques sont testés.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          onClick={() => runHealthCheck(false)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Activity className="w-4 h-4" />
          Lancer Diagnostic
        </Button>

        <Button
          onClick={() => runHealthCheck(true)}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          📧 Test avec Envoi Réel
        </Button>
      </div>

      {diagnostics && (
        <div className="space-y-6">
          {/* Statut Global */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-semibold text-lg">Statut Global</div>
              <div className="text-sm text-muted-foreground">
                {new Date(diagnostics.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
            {getStatusBadge(diagnostics.status)}
          </div>

          {/* Erreurs */}
          {diagnostics.errors && diagnostics.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Erreurs Critiques ({diagnostics.errors.length})
              </div>
              <ul className="space-y-1">
                {diagnostics.errors.map((error: string, index: number) => (
                  <li key={index} className="text-sm text-red-800">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checks Détaillés */}
          <div className="space-y-3">
            <div className="font-semibold text-lg">Checks Détaillés</div>
            
            {Object.entries(diagnostics.checks).map(([key, check]: [string, any]) => (
              <div key={key} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {check.message}
                    </div>
                    
                    {check.action_required && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <strong>Action requise:</strong>{" "}
                        <a 
                          href={check.action_required}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {check.action_required}
                        </a>
                      </div>
                    )}

                    {check.email_id && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Email ID: {check.email_id}
                      </div>
                    )}

                    {check.functions && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Fonctions: {check.functions.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions Recommandées */}
          {diagnostics.status !== "healthy" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">
                📋 Actions Recommandées
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                {diagnostics.errors?.includes("RESEND_API_KEY") && (
                  <li>• Vérifier que RESEND_API_KEY est configurée dans les secrets Supabase</li>
                )}
                {diagnostics.checks.domain_verification?.status === "warning" && (
                  <li>• Vérifier que le domaine solocab.fr est vérifié dans Resend Dashboard</li>
                )}
                {diagnostics.errors?.includes("Resend inaccessible") && (
                  <li>• Vérifier connexion internet et statut API Resend</li>
                )}
                {diagnostics.errors?.includes("Supabase inaccessible") && (
                  <li>• Vérifier connexion base de données Supabase</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {!diagnostics && !loading && (
        <div className="text-center text-muted-foreground py-8">
          Cliquez sur "Lancer Diagnostic" pour vérifier l'état du système
        </div>
      )}
    </Card>
  );
};

export default AdminEmailHealthCheck;