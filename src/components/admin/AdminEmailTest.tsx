import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Activity, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface TestResult {
  email: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export const AdminEmailTest = () => {
  const [sending, setSending] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const testEmails = [
    { email: "alexandrediarra00@gmail.com", name: "Alexandre Diarra" },
    { email: "abdallahkanoute72@gmail.com", name: "Abdallah Kanoute" },
  ];

  const sendTestEmail = async (targetEmail: string, targetName: string) => {
    setTestResults(prev => [...prev.filter(r => r.email !== targetEmail), { email: targetEmail, status: "pending" }]);
    
    try {
      const { data, error } = await supabase.functions.invoke("email-health-check", {
        body: {
          test_send: true,
          test_email: targetEmail
        }
      });

      if (error) {
        console.error("Erreur envoi email:", error);
        setTestResults(prev => prev.map(r => r.email === targetEmail ? { ...r, status: "error", message: error.message } : r));
        toast.error(`Erreur envoi vers ${targetName}`);
      } else {
        console.log("Email envoyé avec succès:", data);
        setTestResults(prev => prev.map(r => r.email === targetEmail ? { ...r, status: "success", message: data?.checks?.test_email?.message } : r));
        toast.success(`Email de test envoyé à ${targetName} !`);
      }
    } catch (error: any) {
      console.error("Erreur:", error);
      setTestResults(prev => prev.map(r => r.email === targetEmail ? { ...r, status: "error", message: error.message } : r));
      toast.error("Erreur lors de l'envoi");
    }
  };

  const runHealthCheck = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-health-check", {
        body: { test_send: false }
      });

      if (error) {
        console.error("Erreur health check:", error);
        toast.error("Erreur lors du diagnostic");
      } else {
        console.log("Health check:", data);
        if (data?.status === "healthy") {
          toast.success("✅ Système d'emails opérationnel !");
        } else {
          toast.warning(`⚠️ Système avec warnings: ${data?.warnings?.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du diagnostic");
    } finally {
      setSending(false);
    }
  };

  const sendAllTests = async () => {
    setSending(true);
    for (const { email, name } of testEmails) {
      await sendTestEmail(email, name);
    }
    setSending(false);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="flex items-center gap-4 mb-4">
        <Mail className="w-8 h-8 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Test Système Emails</h3>
          <p className="text-sm text-muted-foreground">
            Vérifier que les emails sont correctement envoyés
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Health Check */}
        <Button 
          onClick={runHealthCheck} 
          disabled={sending}
          variant="outline"
          className="w-full"
        >
          <Activity className="w-4 h-4 mr-2" />
          Diagnostic du système
        </Button>

        {/* Test individuel par email */}
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <p className="text-sm font-medium">Envoyer un email de test à :</p>
          
          {testEmails.map(({ email, name }) => {
            const result = testResults.find(r => r.email === email);
            return (
              <div key={email} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                {result?.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {result?.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                {result?.status === "pending" && <span className="animate-spin">⏳</span>}
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => sendTestEmail(email, name)}
                  disabled={sending || result?.status === "pending"}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Test
                </Button>
              </div>
            );
          })}
        </div>
        
        {/* Envoyer à tous */}
        <Button 
          onClick={sendAllTests} 
          disabled={sending}
          className="w-full"
        >
          {sending ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer à tous les destinataires test
            </>
          )}
        </Button>

        {/* Résultats */}
        {testResults.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
            <p className="font-medium">Résultats :</p>
            {testResults.map(r => (
              <p key={r.email} className={r.status === "success" ? "text-green-600" : r.status === "error" ? "text-red-600" : "text-gray-500"}>
                {r.email}: {r.status === "success" ? "✅ Envoyé" : r.status === "error" ? `❌ ${r.message}` : "⏳ En cours..."}
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
