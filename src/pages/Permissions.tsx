import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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

      <main className="container max-w-2xl mx-auto px-4 py-6 pb-24">
        <PermissionsCenter role={userRole as 'driver' | 'client' | 'admin' | null} />
      </main>
    </div>
  );
}
