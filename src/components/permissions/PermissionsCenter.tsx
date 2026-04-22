import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Smartphone, Shield } from 'lucide-react';
import { usePermissionsCenter, type PermissionState, type PermissionStatus } from '@/hooks/usePermissionsCenter';
import { cn } from '@/lib/utils';

interface PermissionsCenterProps {
  role: 'driver' | 'client' | 'admin' | null;
  variant?: 'page' | 'widget';
  onAllGranted?: () => void;
}

const STATUS_META: Record<PermissionStatus, { color: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  granted:     { color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Activée',         icon: CheckCircle2 },
  denied:      { color: 'text-red-600',     bg: 'bg-red-500/10',     label: 'Refusée',         icon: XCircle },
  prompt:      { color: 'text-amber-600',   bg: 'bg-amber-500/10',   label: 'À activer',       icon: AlertCircle },
  unsupported: { color: 'text-muted-foreground', bg: 'bg-muted',     label: 'Non disponible',  icon: AlertCircle },
  unknown:     { color: 'text-muted-foreground', bg: 'bg-muted',     label: 'Inconnue',        icon: AlertCircle },
};

export function PermissionsCenter({ role, variant = 'page', onAllGranted }: PermissionsCenterProps) {
  const { permissions, loading, requestPermission, allRequiredGranted, missingRequired, isNative, platform } =
    usePermissionsCenter({ role });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visible = permissions.filter((p) => p.status !== 'unsupported' || p.platform === 'all');

  return (
    <div className="space-y-4">
      {/* Header */}
      {variant === 'page' && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Centre d'autorisations</CardTitle>
                <CardDescription className="mt-1">
                  Activez ces autorisations pour profiter de toutes les fonctionnalités{' '}
                  {role === 'driver' ? 'chauffeur (alertes immédiates style Uber/Bolt)' : 'client'}.
                </CardDescription>
              </div>
              <Badge variant={isNative ? 'default' : 'secondary'} className="gap-1">
                <Smartphone className="h-3 w-3" /> {isNative ? `App ${platform}` : 'Web'}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Bandeau de complétion */}
      {missingRequired.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ {missingRequired.length} autorisation{missingRequired.length > 1 ? 's' : ''} essentielle{missingRequired.length > 1 ? 's' : ''} à activer
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sans ces autorisations, vous risquez de manquer des courses.
            </p>
          </CardContent>
        </Card>
      )}

      {allRequiredGranted && missingRequired.length === 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Tout est prêt !</p>
              <p className="text-xs text-muted-foreground">Vous recevrez les alertes en temps réel.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {visible.map((perm) => (
          <PermissionRow key={perm.key} perm={perm} onRequest={() => requestPermission(perm.key).then((s) => {
            if (s === 'granted' && allRequiredGranted) onAllGranted?.();
          })} />
        ))}
      </div>

      {!isNative && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Pour bénéficier des alertes même téléphone verrouillé, installez l'application mobile.
        </p>
      )}
    </div>
  );
}

function PermissionRow({ perm, onRequest }: { perm: PermissionState; onRequest: () => void }) {
  const meta = STATUS_META[perm.status];
  const Icon = meta.icon;

  return (
    <Card className={cn('transition-all', perm.required && perm.status !== 'granted' && 'border-amber-500/40')}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="text-2xl shrink-0">{perm.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{perm.label}</h3>
            {perm.required && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-700 dark:text-amber-400">
                Obligatoire
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{perm.description}</p>
          <div className={cn('inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs', meta.bg, meta.color)}>
            <Icon className="h-3 w-3" />
            <span>{meta.label}</span>
          </div>
        </div>
        {perm.status !== 'granted' && perm.status !== 'unsupported' && (
          <Button size="sm" variant={perm.required ? 'default' : 'outline'} onClick={onRequest}>
            Activer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
