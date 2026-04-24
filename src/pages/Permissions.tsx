import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';
import { PermissionsCenter } from '@/components/permissions/PermissionsCenter';
import { useAuth } from '@/hooks/useAuth';

export default function Permissions() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    document.title = 'Autorisations · SoloCab';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Gérez les autorisations de localisation, notifications et superposition pour SoloCab.');
  }, []);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  const isDriver = userRole === 'driver' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Autorisations de l'application</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
        <PermissionsCenter role={userRole as 'driver' | 'client' | 'admin' | null} />

        {isDriver && (
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4"
            onClick={() => navigate('/diagnostic-gps')}
          >
            <div className="p-2 rounded-lg bg-primary/15">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-sm">Diagnostic GPS avancé</div>
              <div className="text-xs text-muted-foreground font-normal">
                Tester en temps réel + guide batterie Android
              </div>
            </div>
          </Button>
        )}
      </main>
    </div>
  );
}

