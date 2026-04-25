import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Smartphone, Shield, Wrench, RefreshCw, Activity, Trash2 } from 'lucide-react';
import { usePermissionsCenter, type PermissionState, type PermissionStatus, type PermissionTestAction, type PermissionDiagnosticEntry } from '@/hooks/usePermissionsCenter';
import { cn } from '@/lib/utils';

interface PermissionsCenterProps {
  role: 'driver' | 'client' | 'admin' | null;
  variant?: 'page' | 'widget';
  onAllGranted?: () => void;
}

const STATUS_META: Record<PermissionStatus, { color: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  granted:     { color: 'text-primary',          bg: 'bg-primary/10',     label: 'Activée',        icon: CheckCircle2 },
  denied:      { color: 'text-destructive',      bg: 'bg-destructive/10', label: 'Refusée',        icon: XCircle },
  prompt:      { color: 'text-foreground',       bg: 'bg-accent',         label: 'À activer',      icon: AlertCircle },
  unsupported: { color: 'text-muted-foreground', bg: 'bg-muted',          label: 'Non disponible', icon: AlertCircle },
  unknown:     { color: 'text-muted-foreground', bg: 'bg-muted',          label: 'Inconnue',       icon: AlertCircle },
};

export function PermissionsCenter({ role, variant = 'page', onAllGranted }: PermissionsCenterProps) {
  const { permissions, loading, refreshAll, requestPermission, openPermissionTestAction, allRequiredGranted, missingRequired, isNative, platform, diagnostics, clearDiagnostics } =
    usePermissionsCenter({ role });
  const [testingAction, setTestingAction] = useState<PermissionTestAction | null>(null);

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
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-destructive">
              ⚠️ {missingRequired.length} autorisation{missingRequired.length > 1 ? 's' : ''} essentielle{missingRequired.length > 1 ? 's' : ''} à activer
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sans ces autorisations, vous risquez de manquer des courses.
            </p>
          </CardContent>
        </Card>
      )}

      {allRequiredGranted && missingRequired.length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">Tout est prêt !</p>
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

      {variant === 'page' && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/15">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Test des boutons système</CardTitle>
                <CardDescription>Ouvrez chaque réglage puis revenez ici : l'état se met à jour automatiquement.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { action: 'overlay' as const, label: 'Tester overlay', perm: permissions.find((p) => p.key === 'overlay') },
              { action: 'battery' as const, label: 'Tester batterie', perm: permissions.find((p) => p.key === 'battery') },
              { action: 'microphone' as const, label: 'Tester micro', perm: permissions.find((p) => p.key === 'microphone') },
              { action: 'app_details' as const, label: 'Tester détails appli', perm: undefined },
            ].map(({ action, label, perm }) => (
              <TestRow
                key={action}
                action={action}
                label={label}
                status={perm?.status ?? 'unknown'}
                disabled={!isNative || platform !== 'android' || testingAction !== null}
                loading={testingAction === action}
                onClick={async () => {
                  setTestingAction(action);
                  try {
                    await openPermissionTestAction(action);
                  } finally {
                    setTestingAction(null);
                  }
                }}
              />
            ))}
            <Button variant="outline" className="w-full gap-2" onClick={refreshAll} disabled={testingAction !== null}>
              <RefreshCw className="h-4 w-4" /> Rafraîchir l'état
            </Button>
          </CardContent>
        </Card>
      )}

      {!isNative && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Pour bénéficier des alertes même téléphone verrouillé, installez l'application mobile.
        </p>
      )}
    </div>
  );
}

function TestRow({ action, label, status, disabled, loading, onClick }: {
  action: PermissionTestAction;
  label: string;
  status: PermissionStatus;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <div className={cn('inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs', meta.bg, meta.color)}>
          <Icon className="h-3 w-3" />
          <span>{action === 'app_details' ? 'Retour attendu' : meta.label}</span>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onClick} disabled={disabled}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ouvrir'}
      </Button>
    </div>
  );
}

function PermissionRow({ perm, onRequest }: { perm: PermissionState; onRequest: () => void }) {
  const meta = STATUS_META[perm.status];
  const Icon = meta.icon;

  return (
    <Card className={cn('transition-all', perm.required && perm.status !== 'granted' && 'border-destructive/40')}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="text-2xl shrink-0">{perm.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{perm.label}</h3>
            {perm.required && (
              <Badge variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive">
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
