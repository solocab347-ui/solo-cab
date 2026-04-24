/**
 * Écran de diagnostic Android pour le GPS background.
 *
 * Vérifie en temps réel et affiche :
 *  - permission de localisation (foreground + background)
 *  - permission de notifications (Android 13+)
 *  - état du tracker GPS (latence, précision, vitesse, seuil adaptatif)
 *  - état du foreground service GPS chauffeur
 *  - guide pas à pas pour les optimisations batterie OEM (Xiaomi/MIUI, Samsung, Oppo, Huawei)
 *
 * Accessible via /diagnostic-gps (chauffeurs) ou depuis le centre d'autorisations.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Smartphone,
  Battery,
  MapPin,
  Bell,
  Settings as SettingsIcon,
  RefreshCw,
  Activity,
  Gauge,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';

type PermState = 'granted' | 'denied' | 'prompt' | 'unknown';

interface PermissionRow {
  key: string;
  icon: typeof MapPin;
  label: string;
  description: string;
  state: PermState;
  action?: () => void | Promise<void>;
  actionLabel?: string;
}

function StateBadge({ state }: { state: PermState }) {
  if (state === 'granted') {
    return (
      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
      </Badge>
    );
  }
  if (state === 'denied') {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">
        <XCircle className="h-3 w-3 mr-1" /> Refusé
      </Badge>
    );
  }
  if (state === 'prompt') {
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/15">
        <AlertTriangle className="h-3 w-3 mr-1" /> À activer
      </Badge>
    );
  }
  return <Badge variant="outline">Inconnu</Badge>;
}

export default function GpsDiagnostic() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [manufacturer, setManufacturer] = useState<string>('');
  const [androidVersion, setAndroidVersion] = useState<string>('');
  const [isNative, setIsNative] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [locPerm, setLocPerm] = useState<PermState>('unknown');
  const [bgLocPerm, setBgLocPerm] = useState<PermState>('unknown');
  const [pushPerm, setPushPerm] = useState<PermState>('unknown');

  // Live GPS tracker — read-only (no toggle)
  const tracker = useDriverLocationTracker({
    driverId,
    enabled: true,
    updateIntervalMs: 8_000,
  });

  // Bootstrap: native detection + driver_id
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    (async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await Device.getInfo();
          setManufacturer(info.manufacturer || '');
          setAndroidVersion(info.osVersion || '');
        } catch {/* silent */}
      }
      if (user?.id) {
        const { data } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setDriverId(data.id);
      }
    })();
  }, [user?.id]);

  // Re-check permissions on mount + every refresh + when app returns to foreground
  useEffect(() => {
    let listener: { remove: () => void } | null = null;
    const check = async () => {
      // Geolocation perms
      try {
        const r = await Geolocation.checkPermissions();
        // location = foreground; coarseLocation may not exist on web
        const fg = (r.location as PermState) ?? 'unknown';
        setLocPerm(fg);
        // ALWAYS perm (background) is exposed under different names per version
        const bg = ((r as any).location === 'granted' && (r as any).coarseLocation === 'granted')
          ? 'granted'
          : ((r as any).location as PermState) ?? 'unknown';
        setBgLocPerm(bg);
      } catch {
        setLocPerm('unknown');
        setBgLocPerm('unknown');
      }
      // Push perms (only on native)
      if (Capacitor.isNativePlatform()) {
        try {
          const p = await PushNotifications.checkPermissions();
          setPushPerm(p.receive as PermState);
        } catch {
          setPushPerm('unknown');
        }
      } else if ('Notification' in window) {
        const p = Notification.permission;
        setPushPerm(p === 'default' ? 'prompt' : (p as PermState));
      }
    };
    check();

    // Re-check on resume (user comes back from settings)
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) check();
      }).then((l) => { listener = l; });
    }
    return () => { listener?.remove(); };
  }, [refreshTick]);

  const requestLocation = async () => {
    try {
      await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] as any });
    } catch {/* silent */}
    setRefreshTick((t) => t + 1);
  };

  const requestPush = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await PushNotifications.requestPermissions();
      } catch {/* silent */}
    } else if ('Notification' in window) {
      try { await Notification.requestPermission(); } catch {/* silent */}
    }
    setRefreshTick((t) => t + 1);
  };

  const openAppSettings = () => {
    // Capacitor doesn't expose openSettings directly — best-effort fallback message
    if (Capacitor.isNativePlatform()) {
      // The user must navigate manually. We surface a clear instruction below.
      alert('Va dans : Réglages Android → Applications → SoloCab → Autorisations');
    }
  };

  const permissionRows: PermissionRow[] = useMemo(
    () => [
      {
        key: 'location',
        icon: MapPin,
        label: 'Localisation précise',
        description: 'Indispensable pour recevoir les courses à proximité.',
        state: locPerm,
        action: locPerm === 'granted' ? openAppSettings : requestLocation,
        actionLabel: locPerm === 'granted' ? 'Ouvrir réglages' : 'Activer',
      },
      {
        key: 'bgLocation',
        icon: MapPin,
        label: 'Localisation en arrière-plan',
        description: '« Toujours autoriser » — pour rester visible app fermée.',
        state: bgLocPerm,
        action: openAppSettings,
        actionLabel: 'Ouvrir réglages',
      },
      {
        key: 'push',
        icon: Bell,
        label: 'Notifications',
        description: 'Réveil immédiat quand une nouvelle course arrive.',
        state: pushPerm,
        action: pushPerm === 'granted' ? openAppSettings : requestPush,
        actionLabel: pushPerm === 'granted' ? 'Ouvrir réglages' : 'Activer',
      },
    ],
    [locPerm, bgLocPerm, pushPerm]
  );

  // GPS live data
  const lastUpdateAge = tracker.lastUpdate
    ? Math.floor((Date.now() - tracker.lastUpdate.getTime()) / 1000)
    : null;
  const speedKmh = tracker.speedMs ? Math.round(tracker.speedMs * 3.6) : 0;
  const isMoving = (tracker.speedMs ?? 0) >= 1.5;

  // Manufacturer-specific battery optimization tips
  const oemTips = useMemo(() => getOemTips(manufacturer), [manufacturer]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-2xl py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-base font-semibold">Diagnostic GPS</h1>
            <p className="text-xs text-muted-foreground">Vérification en temps réel du tracking</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setRefreshTick((t) => t + 1)}
            aria-label="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-4 space-y-4">
        {!isNative && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Mode navigateur détecté</AlertTitle>
            <AlertDescription>
              Le diagnostic complet (background, batterie OEM) est disponible uniquement dans l'app Android installée.
            </AlertDescription>
          </Alert>
        )}

        {/* Live GPS state */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              État du tracker GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Statut"
                value={tracker.isTracking ? (tracker.isStale ? 'Obsolète' : 'Actif') : 'Inactif'}
                tone={tracker.isTracking && !tracker.isStale ? 'good' : tracker.isStale ? 'warn' : 'bad'}
              />
              <Stat
                label="Dernier fix"
                value={lastUpdateAge != null ? `il y a ${lastUpdateAge}s` : '—'}
                tone={
                  lastUpdateAge == null ? 'neutral'
                    : lastUpdateAge * 1000 < tracker.staleThresholdMs / 2 ? 'good'
                    : lastUpdateAge * 1000 < tracker.staleThresholdMs ? 'warn'
                    : 'bad'
                }
              />
              <Stat
                label="Précision"
                value={tracker.accuracy ? `±${Math.round(tracker.accuracy)} m` : '—'}
                tone={
                  !tracker.accuracy ? 'neutral'
                    : tracker.accuracy <= 20 ? 'good'
                    : tracker.accuracy <= 50 ? 'warn'
                    : 'bad'
                }
              />
              <Stat
                label="Vitesse"
                value={`${speedKmh} km/h`}
                tone="neutral"
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Gauge className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div>
                <strong className="text-foreground">Seuil adaptatif :</strong>{' '}
                {Math.round(tracker.staleThresholdMs / 1000)}s
                <span className="block mt-1">
                  {isMoving
                    ? '🚗 En mouvement — fix attendu rapidement'
                    : tracker.accuracy && tracker.accuracy <= 20
                    ? '🅿️ Stationnaire avec bon signal — tolérance large'
                    : '🅿️ Stationnaire avec signal moyen — tolérance moyenne'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Android permissions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-primary" />
              Autorisations système
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {permissionRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.key} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    row.state === 'granted' ? 'bg-success/15' : 'bg-muted'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      row.state === 'granted' ? 'text-success' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{row.label}</span>
                      <StateBadge state={row.state} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                    {row.state !== 'granted' && row.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={() => row.action!()}
                      >
                        {row.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Battery optimization — OEM specific */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Battery className="h-4 w-4 text-primary" />
              Optimisation batterie
              {manufacturer && (
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {manufacturer} · Android {androidVersion}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Pourquoi c'est critique</AlertTitle>
              <AlertDescription className="text-xs">
                Android peut tuer le service GPS de SoloCab pour économiser la batterie.
                Sans ces réglages, vous arrêterez de recevoir des courses dès que l'écran s'éteint.
              </AlertDescription>
            </Alert>
            <ol className="space-y-2.5">
              {oemTips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary font-semibold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <strong className="block text-foreground">{tip.title}</strong>
                    <span className="text-xs text-muted-foreground">{tip.steps}</span>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Les vérifications sont mises à jour automatiquement quand vous revenez des réglages.
        </p>
      </main>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const toneClass = {
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
    neutral: 'text-foreground',
  }[tone];
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${toneClass}`}>{value}</div>
    </div>
  );
}

interface OemTip {
  title: string;
  steps: string;
}

function getOemTips(manufacturer: string): OemTip[] {
  const m = manufacturer.toLowerCase();
  const generic: OemTip[] = [
    {
      title: 'Désactiver l\'optimisation de batterie pour SoloCab',
      steps: 'Réglages → Applications → SoloCab → Batterie → choisir « Sans restriction » ou « Ne pas optimiser ».',
    },
    {
      title: 'Autoriser l\'exécution en arrière-plan',
      steps: 'Réglages → Applications → SoloCab → Autoriser l\'activité en arrière-plan.',
    },
    {
      title: 'Verrouiller l\'app dans les récents',
      steps: 'Ouvre l\'écran des applications récentes → maintiens SoloCab → cadenas / verrouiller.',
    },
  ];

  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
    return [
      {
        title: 'Démarrage automatique (MIUI)',
        steps: 'Réglages → Applications → Permissions → Démarrage automatique → activer SoloCab.',
      },
      {
        title: 'Sans restriction de batterie',
        steps: 'Réglages → Batterie → Économie de batterie d\'application → SoloCab → « Sans restriction ».',
      },
      {
        title: 'Verrouillage dans les récents',
        steps: 'Ouvre les apps récentes → glisse SoloCab vers le bas pour le verrouiller (cadenas).',
      },
      {
        title: 'Notifications haute priorité',
        steps: 'Réglages → Notifications → SoloCab → activer « Afficher en haut de l\'écran » et « Sonner et vibrer ».',
      },
    ];
  }
  if (m.includes('samsung')) {
    return [
      {
        title: 'Apps non mises en veille',
        steps: 'Réglages → Maintenance de l\'appareil → Batterie → Limites d\'utilisation en arrière-plan → Apps jamais mises en veille → ajouter SoloCab.',
      },
      {
        title: 'Désactiver « optimiser la batterie »',
        steps: 'Réglages → Applications → SoloCab → Batterie → « Sans restriction ».',
      },
      ...generic.slice(2),
    ];
  }
  if (m.includes('huawei') || m.includes('honor')) {
    return [
      {
        title: 'Démarrage manuel autorisé',
        steps: 'Réglages → Batterie → Démarrage des applications → SoloCab → désactiver « Gérer automatiquement » et activer les 3 options manuelles.',
      },
      {
        title: 'Verrouillage dans les récents',
        steps: 'Apps récentes → glisser SoloCab vers le bas pour verrouiller.',
      },
      ...generic,
    ];
  }
  if (m.includes('oppo') || m.includes('realme') || m.includes('oneplus')) {
    return [
      {
        title: 'Activité en arrière-plan',
        steps: 'Réglages → Batterie → Optimisation de la batterie → SoloCab → « Ne pas optimiser ».',
      },
      {
        title: 'Démarrage automatique',
        steps: 'Réglages → Gestion des applications → Démarrage automatique → activer SoloCab.',
      },
      ...generic.slice(2),
    ];
  }
  if (m.includes('vivo') || m.includes('iqoo')) {
    return [
      {
        title: 'Démarrage en arrière-plan',
        steps: 'iManager → Gestionnaire de batterie → Consommation en arrière-plan → SoloCab → autoriser.',
      },
      ...generic,
    ];
  }
  return generic;
}
