import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { CheckCircle2, AlertCircle, XCircle, Loader2, Smartphone, Shield, Zap, Mic, Bell, Settings, ExternalLink, Info } from 'lucide-react';
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
  const isDenied = perm.status === 'denied';

  const handleClick = async () => {
    setBusy(true);
    try { await onRequest(); } finally { setBusy(false); }
  };

  return (
    <Card className={cn(
      'transition-all',
      perm.required && perm.status !== 'granted' && 'border-destructive/40',
      isDenied && 'border-destructive/60 bg-destructive/5',
    )}>
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

          {/* ─── Bloc d'aide détaillé pour les permissions refusées ─── */}
          {isDenied && (
            <DeniedGuidance permKey={perm.key} onOpenSettings={handleClick} busy={busy} />
          )}
        </div>
        {perm.status !== 'granted' && perm.status !== 'unsupported' && !isDenied && (
          <Button
            size="sm"
            variant={perm.required ? 'default' : 'outline'}
            onClick={handleClick}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Activer'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Panneau d'instructions étape par étape adapté à la plateforme
 * pour expliquer pourquoi le bouton "Activer" ne suffit plus et
 * comment réactiver la permission depuis les Réglages système.
 */
function DeniedGuidance({
  permKey,
  onOpenSettings,
  busy,
}: {
  permKey: PermissionKey;
  onOpenSettings: () => Promise<void> | void;
  busy: boolean;
}) {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const { title, helper, steps, ctaLabel } = useMemo(() => {
    const isNotif = permKey === 'notifications';
    const isLoc = permKey === 'location' || permKey === 'location_background';
    const isMic = permKey === 'microphone';
    const subject = isNotif ? 'les notifications' : isLoc ? 'la localisation' : isMic ? 'le microphone' : 'cette autorisation';

    if (isNative && platform === 'android') {
      return {
        title: `Autorisation refusée`,
        helper: `Le bouton ci-dessous ouvre directement les Réglages Android. Activez ${subject}, puis revenez.`,
        steps: [
          'Touchez « Ouvrir les Réglages »',
          'Section « Autorisations »',
          `Activez ${subject}`,
        ],
        ctaLabel: 'Ouvrir les Réglages',
      };
    }
    if (isNative && platform === 'ios') {
      return {
        title: `Autorisation refusée`,
        helper: `Le bouton ouvre directement les Réglages iOS. Activez ${subject}, puis revenez.`,
        steps: [
          'Touchez « Ouvrir les Réglages »',
          `Activez ${subject}`,
        ],
        ctaLabel: 'Ouvrir les Réglages',
      };
    }
    // Web / PWA — on retente toujours la prompt système au clic
    return {
      title: `Autorisation refusée par le navigateur`,
      helper: `Touchez le bouton pour redemander l'autorisation. Si le navigateur ne réaffiche pas la fenêtre, suivez la procédure ci-dessous.`,
      steps: [
        'Icône 🔒 (cadenas) à gauche de l\'URL',
        '« Autorisations du site »',
        `${subject.charAt(0).toUpperCase() + subject.slice(1)} → « Autoriser »`,
        'Recharger la page',
      ],
      ctaLabel: 'Demander l\'autorisation',
    };
  }, [permKey, isNative, platform]);

  return (
    <div className="mt-3 rounded-lg border border-destructive/30 bg-background/60 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{helper}</p>
        </div>
      </div>

      {/* CTA en PREMIER — action directe */}
      <Button
        size="sm"
        variant="default"
        onClick={onOpenSettings}
        disabled={busy}
        className="w-full gap-2"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Settings className="h-3.5 w-3.5" />
            {ctaLabel}
            <ExternalLink className="h-3 w-3 opacity-70" />
          </>
        )}
      </Button>

      <details className="text-[11px]">
        <summary className="text-muted-foreground cursor-pointer select-none py-1">
          Procédure manuelle (si le bouton ne suffit pas)
        </summary>
        <ol className="text-muted-foreground space-y-1 pl-1 mt-1">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive/15 text-destructive text-[10px] font-semibold shrink-0">
                {i + 1}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
