import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Smartphone, Shield, Zap, Mic, Bell, MapPin } from 'lucide-react';
import { usePermissionsCenter, type PermissionState, type PermissionStatus, type PermissionKey } from '@/hooks/usePermissionsCenter';
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

/**
 * Page Permissions simplifiée — 3 sections claires :
 *  1. Essentielles (localisation + notifications)
 *  2. Mode chauffeur pro (Android : overlay + batterie)
 *  3. Optionnel (microphone)
 */
export function PermissionsCenter({ role, variant = 'page', onAllGranted }: PermissionsCenterProps) {
  const { permissions, loading, requestPermission, allRequiredGranted, missingRequired, isNative, platform } =
    usePermissionsCenter({ role });
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const find = (k: PermissionKey) => permissions.find((p) => p.key === k);
    return {
      essentials: [find('location'), find('location_background'), find('notifications')].filter(Boolean) as PermissionState[],
      androidPro: platform === 'android' && isNative
        ? ([find('overlay'), find('battery')].filter(Boolean) as PermissionState[])
        : [],
      optional: [find('microphone')].filter(Boolean) as PermissionState[],
    };
  }, [permissions, platform, isNative]);

  const handleRequestAll = async () => {
    setBusy(true);
    try {
      // Chaîner les requests dans l'ordre logique
      const order: PermissionKey[] = ['location', 'notifications', 'overlay', 'battery'];
      for (const key of order) {
        const perm = permissions.find((p) => p.key === key);
        if (perm && perm.status !== 'granted' && perm.status !== 'unsupported') {
          await requestPermission(key);
        }
      }
      if (allRequiredGranted) onAllGranted?.();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Bandeau état global + CTA "Tout autoriser" ─── */}
      {variant === 'page' && (
        <Card className={cn('border-2', allRequiredGranted ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5')}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn('p-2.5 rounded-xl shrink-0', allRequiredGranted ? 'bg-primary/15' : 'bg-destructive/15')}>
                {allRequiredGranted ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Shield className="h-6 w-6 text-destructive" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold">
                  {allRequiredGranted ? 'Tout est prêt' : `${missingRequired.length} autorisation${missingRequired.length > 1 ? 's' : ''} requise${missingRequired.length > 1 ? 's' : ''}`}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allRequiredGranted
                    ? 'Vous recevrez les courses en temps réel, même hors application.'
                    : 'Sans ces réglages, vous risquez de manquer des courses.'}
                </p>
                {!allRequiredGranted && missingRequired.length > 0 && (
                  <Button onClick={handleRequestAll} disabled={busy} className="mt-3 w-full sm:w-auto gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Tout autoriser en 1 clic
                  </Button>
                )}
              </div>
              <Badge variant={isNative ? 'default' : 'secondary'} className="gap-1 shrink-0">
                <Smartphone className="h-3 w-3" /> {isNative ? platform : 'Web'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Section 1 : Essentielles ─── */}
      <Section
        icon={<Bell className="h-4 w-4" />}
        title="Essentielles"
        subtitle="Pour recevoir les courses et naviguer"
        items={groups.essentials}
        onRequest={requestPermission}
      />

      {/* ─── Section 2 : Mode chauffeur pro (Android only) ─── */}
      {groups.androidPro.length > 0 && (
        <Section
          icon={<Zap className="h-4 w-4" />}
          title="Mode chauffeur pro"
          subtitle="Recevoir les alertes même téléphone verrouillé (style Uber/Bolt)"
          items={groups.androidPro}
          onRequest={requestPermission}
        />
      )}

      {/* ─── Section 3 : Optionnel ─── */}
      <Section
        icon={<Mic className="h-4 w-4" />}
        title="Optionnel"
        subtitle="Confort supplémentaire"
        items={groups.optional}
        onRequest={requestPermission}
      />

      {!isNative && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Pour bénéficier des alertes même téléphone verrouillé, installez l'application mobile.
        </p>
      )}
    </div>
  );
}

function Section({
  icon, title, subtitle, items, onRequest,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: PermissionState[];
  onRequest: (key: PermissionKey) => Promise<unknown>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((perm) => (
          <PermissionRow key={perm.key} perm={perm} onRequest={() => onRequest(perm.key)} />
        ))}
      </div>
    </div>
  );
}

function PermissionRow({ perm, onRequest }: { perm: PermissionState; onRequest: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const meta = STATUS_META[perm.status];
  const Icon = meta.icon;

  const handleClick = async () => {
    setBusy(true);
    try { await onRequest(); } finally { setBusy(false); }
  };

  return (
    <Card className={cn('transition-all', perm.required && perm.status !== 'granted' && 'border-destructive/40')}>
      <CardContent className="p-3.5 flex items-start gap-3">
        <div className="text-xl shrink-0 leading-none mt-0.5">{perm.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm leading-tight">{perm.label}</h3>
            {perm.required && (
              <Badge variant="outline" className="text-[10px] h-4 border-destructive/40 text-destructive px-1.5">
                Requis
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{perm.description}</p>
          <div className={cn('inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px]', meta.bg, meta.color)}>
            <Icon className="h-2.5 w-2.5" />
            <span>{meta.label}</span>
          </div>
        </div>
        {perm.status !== 'granted' && perm.status !== 'unsupported' && (
          <Button
            size="sm"
            variant={perm.required ? 'default' : 'outline'}
            onClick={handleClick}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : perm.status === 'denied' ? (
              'Réglages'
            ) : (
              'Activer'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
