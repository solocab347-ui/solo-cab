/**
 * Widget compact à insérer dans le dashboard chauffeur ou client
 * pour rappeler à l'utilisateur d'activer ses permissions essentielles.
 * Affiche uniquement si au moins une permission requise n'est pas accordée.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissionsCenter } from '@/hooks/usePermissionsCenter';

interface PermissionsWidgetProps {
  role: 'driver' | 'client' | 'admin' | null;
  /** Si true, affiche même quand tout est OK (avec un état "vert") */
  alwaysShow?: boolean;
}

export function PermissionsWidget({ role, alwaysShow = false }: PermissionsWidgetProps) {
  const navigate = useNavigate();
  const { missingRequired, allRequiredGranted, loading } = usePermissionsCenter({ role });

  if (loading) return null;
  if (allRequiredGranted && !alwaysShow) return null;

  const hasIssues = missingRequired.length > 0;

  return (
    <Card
      onClick={() => navigate('/permissions')}
      className={`cursor-pointer transition-all hover:scale-[1.01] ${
        hasIssues ? 'border-destructive/40 bg-destructive/5' : 'border-primary/30 bg-primary/5'
      }`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${hasIssues ? 'bg-destructive/15' : 'bg-primary/15'}`}>
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <Shield className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            {hasIssues ? 'Autorisations à activer' : 'Toutes les autorisations sont actives'}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {hasIssues
              ? `${missingRequired.length} autorisation${missingRequired.length > 1 ? 's' : ''} requise${missingRequired.length > 1 ? 's' : ''} pour ne rater aucune alerte`
              : 'Vous recevez toutes les alertes en temps réel'}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
