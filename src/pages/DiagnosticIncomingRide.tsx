import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PEER_MAP: Record<string, string> = {
  'abdallahkanoute080@gmail.com': 'Alexandre',
  'abdallahkanoute72@gmail.com': 'Alexandre',
  'alexandrediarra00@gmail.com': 'Abdallah',
};

export default function DiagnosticIncomingRide() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<null | { ok: boolean; detail: string }>(null);

  const email = (user?.email || '').toLowerCase();
  const peerLabel = PEER_MAP[email];
  const allowed = !!peerLabel;

  useEffect(() => {
    document.title = 'Diagnostic course entrante · SoloCab';
  }, []);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Accès restreint</h1>
          <p className="text-sm text-muted-foreground">
            Cet outil de diagnostic n'est pas disponible pour ce compte.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
        </Card>
      </div>
    );
  }

  const handleSend = async () => {
    setSending(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('driver-self-test-incoming-ride', {
        body: {},
      });
      if (error) throw error;
      setLastResult({ ok: true, detail: JSON.stringify(data, null, 2) });
      toast.success('Notification envoyée — vérifiez votre device.');
    } catch (e: any) {
      const msg = e?.message || String(e);
      setLastResult({ ok: false, detail: msg });
      toast.error('Échec : ' + msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Diagnostic course entrante</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Test push « incoming_ride »</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Envoie une fausse course à <strong>{peerLabel}</strong>. Idéal pour tester
                à deux en condition réelle (son, bannière, overlay, deep-link).
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
            <div><strong>Avant le test :</strong> mettez l'app en arrière-plan, verrouillez
            l'écran, ou ouvrez une autre app.</div>
            <div><strong>iOS :</strong> bannière time-sensitive depuis le haut.</div>
            <div><strong>Android :</strong> overlay système plein écran (si permission accordée).</div>
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full" size="lg">
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</>
            ) : (
              <><Bell className="h-4 w-4 mr-2" /> Envoyer un faux incoming_ride</>
            )}
          </Button>
        </Card>

        {lastResult && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              {lastResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm font-medium">
                {lastResult.ok ? 'Notification envoyée' : 'Échec'}
              </span>
            </div>
            <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {lastResult.detail}
            </pre>
          </Card>
        )}
      </main>
    </div>
  );
}
