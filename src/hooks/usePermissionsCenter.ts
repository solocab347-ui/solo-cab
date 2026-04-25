/**
 * Centre de permissions unifié.
 * Détecte et demande toutes les autorisations natives nécessaires :
 *  - Localisation (foreground + background)
 *  - Notifications push (FCM/APNS/Web)
 *  - Superposition (Android SYSTEM_ALERT_WINDOW)
 *  - Optimisation batterie ignorée (Android)
 *  - Microphone (appels VoIP)
 *
 * Fonctionne sur web ET natif (Capacitor). Sur web, certaines permissions
 * natives sont marquées "non-applicable".
 */
import { useCallback, useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown';

export interface PermissionState {
  key: PermissionKey;
  label: string;
  description: string;
  status: PermissionStatus;
  required: boolean;
  platform: 'all' | 'native' | 'android' | 'ios' | 'web';
  icon: string;
}

export type PermissionKey =
  | 'location'
  | 'location_background'
  | 'notifications'
  | 'overlay'
  | 'battery'
  | 'microphone';

export type PermissionTestAction = PermissionKey | 'app_details';

interface UsePermissionsCenterOptions {
  role: 'driver' | 'client' | 'admin' | null;
}

interface SoloCabPermissionsPlugin {
  openOverlaySettings(): Promise<{ overlay?: boolean; battery?: boolean; microphone?: boolean }>;
  openBatteryOptimizationSettings(): Promise<{ overlay?: boolean; battery?: boolean; microphone?: boolean }>;
  openAppDetailsSettings(): Promise<{ overlay?: boolean; battery?: boolean; microphone?: boolean }>;
  checkSpecialPermissions(): Promise<{ overlay?: boolean; battery?: boolean; microphone?: boolean }>;
  requestMicrophone(): Promise<{ granted: boolean }>;
}

const SoloCabPermissions = registerPlugin<SoloCabPermissionsPlugin>('SoloCabPermissions');

/**
 * Vérifie si le plugin natif custom est réellement disponible.
 * Si l'APK n'a pas été rebuild après l'ajout du plugin, il faut utiliser des fallbacks.
 */
async function isCustomPluginAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
  try {
    await SoloCabPermissions.checkSpecialPermissions();
    return true;
  } catch (err) {
    console.warn('[Permissions] Plugin natif SoloCabPermissions indisponible (rebuild APK requis), fallback intent.', err);
    return false;
  }
}

/**
 * Fallback : ouvre les écrans Android système via App.openUrl (intent URL).
 * Fonctionne sans rebuild de plugin custom.
 */
async function openAndroidSettingsFallback(target: 'overlay' | 'battery' | 'app_details' | 'notifications'): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    const appId = 'com.solocab.app';
    let url: string;
    switch (target) {
      case 'overlay':
        // Settings.ACTION_MANAGE_OVERLAY_PERMISSION
        url = `intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;package=${appId};end`;
        break;
      case 'battery':
        // Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
        url = `intent:#Intent;action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;package=${appId};end`;
        break;
      case 'notifications':
        url = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${appId};end`;
        break;
      case 'app_details':
      default:
        url = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;package=${appId};end`;
        break;
    }
    await App.openUrl({ url });
  } catch (err) {
    console.error('[Permissions] Fallback intent échec', target, err);
    // Dernier recours : ouvrir les paramètres app génériques
    try {
      const { App } = await import('@capacitor/app');
      await App.openUrl({ url: `package:com.solocab.app` });
    } catch {/* abandon */}
  }
}

/**
 * Vérifie si l'overlay est accordé via une astuce DOM (l'app peut tenter window.open).
 * Sans plugin custom, on ne peut pas vraiment savoir : on retourne 'prompt' tant que non confirmé.
 */

const DRIVER_REQUIRED: PermissionKey[] = ['location', 'notifications', 'overlay', 'battery'];
const CLIENT_REQUIRED: PermissionKey[] = ['location', 'notifications'];

export function usePermissionsCenter({ role }: UsePermissionsCenterOptions) {
  const [permissions, setPermissions] = useState<PermissionState[]>([]);
  const [loading, setLoading] = useState(true);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const buildBaseList = useCallback((): PermissionState[] => {
    const required = role === 'driver' ? DRIVER_REQUIRED : role === 'client' ? CLIENT_REQUIRED : [];
    return [
      {
        key: 'location',
        label: 'Localisation',
        description: role === 'driver'
          ? 'Indispensable pour recevoir les courses près de vous et guider les clients.'
          : 'Permet de définir précisément votre point de départ.',
        status: 'unknown',
        required: required.includes('location'),
        platform: 'all',
        icon: '📍',
      },
      {
        key: 'location_background',
        label: 'GPS en arrière-plan',
        description: 'Continue à émettre votre position même quand l\'app est fermée. Crucial pour ne pas rater une course.',
        status: 'unknown',
        required: role === 'driver' && isNative,
        platform: 'native',
        icon: '🚗',
      },
      {
        key: 'notifications',
        label: 'Notifications',
        description: 'Recevez les alertes de course même téléphone verrouillé.',
        status: 'unknown',
        required: required.includes('notifications'),
        platform: 'all',
        icon: '🔔',
      },
      {
        key: 'overlay',
        label: 'Affichage par-dessus les autres apps',
        description: 'Permet d\'afficher la nouvelle course par-dessus n\'importe quelle application (style Uber/Bolt). Indispensable.',
        status: 'unknown',
        required: required.includes('overlay') && platform === 'android',
        platform: 'android',
        icon: '📱',
      },
      {
        key: 'battery',
        label: 'Optimisation batterie désactivée',
        description: 'Empêche Android de mettre l\'app en veille et de bloquer les alertes.',
        status: 'unknown',
        required: required.includes('battery') && platform === 'android',
        platform: 'android',
        icon: '🔋',
      },
      {
        key: 'microphone',
        label: 'Microphone',
        description: 'Pour les appels in-app entre client et chauffeur.',
        status: 'unknown',
        required: false,
        platform: 'all',
        icon: '🎤',
      },
    ];
  }, [role, isNative, platform]);

  // ======== CHECK each permission ========
  const checkLocation = useCallback(async (): Promise<PermissionStatus> => {
    if (isNative) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const status = await Geolocation.checkPermissions();
        return mapCapacitorState(status.location);
      } catch {
        return 'unknown';
      }
    }
    if (!navigator.permissions) return 'unsupported';
    try {
      const r = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return r.state as PermissionStatus;
    } catch {
      return 'unknown';
    }
  }, [isNative]);

  const checkNotifications = useCallback(async (): Promise<PermissionStatus> => {
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const r = await PushNotifications.checkPermissions();
        return mapCapacitorState(r.receive);
      } catch {
        return 'unknown';
      }
    }
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PermissionStatus;
  }, [isNative]);

  const checkOverlay = useCallback(async (): Promise<PermissionStatus> => {
    if (platform !== 'android') return 'unsupported';
    if (!isNative) return 'unsupported';
    try {
      const r = await SoloCabPermissions.checkSpecialPermissions();
      return r.overlay ? 'granted' : 'prompt';
    } catch {
      return 'unknown';
    }
  }, [isNative, platform]);

  const checkBattery = useCallback(async (): Promise<PermissionStatus> => {
    if (platform !== 'android') return 'unsupported';
    if (!isNative) return 'unsupported';
    try {
      const r = await SoloCabPermissions.checkSpecialPermissions();
      return r.battery ? 'granted' : 'prompt';
    } catch {
      return 'unknown';
    }
  }, [isNative, platform]);

  const checkMicrophone = useCallback(async (): Promise<PermissionStatus> => {
    if (isNative && platform === 'android') {
      try {
        const r = await SoloCabPermissions.checkSpecialPermissions();
        return r.microphone ? 'granted' : 'prompt';
      } catch {
        return 'unknown';
      }
    }
    if (!navigator.permissions) return 'unsupported';
    try {
      const r = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return r.state as PermissionStatus;
    } catch {
      return 'unknown';
    }
  }, [isNative, platform]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const base = buildBaseList();
    const checked = await Promise.all(base.map(async (p) => {
      let status: PermissionStatus = 'unknown';
      switch (p.key) {
        case 'location':
        case 'location_background':
          status = await checkLocation();
          break;
        case 'notifications':
          status = await checkNotifications();
          break;
        case 'overlay':
          status = await checkOverlay();
          break;
        case 'battery':
          status = await checkBattery();
          break;
        case 'microphone':
          status = await checkMicrophone();
          break;
      }
      return { ...p, status };
    }));
    setPermissions(checked);
    setLoading(false);
  }, [buildBaseList, checkLocation, checkNotifications, checkOverlay, checkBattery, checkMicrophone]);

  // ======== REQUEST each permission ========
  const requestPermission = useCallback(async (key: PermissionKey): Promise<PermissionStatus> => {
    let result: PermissionStatus = 'denied';
    try {
      switch (key) {
        case 'location':
        case 'location_background': {
          if (isNative) {
            const { Geolocation } = await import('@capacitor/geolocation');
            const r = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
            result = mapCapacitorState(r.location);
            if (key === 'location_background' && platform === 'android') {
              try {
                await SoloCabPermissions.openAppDetailsSettings();
              } catch {/* fallback ignored */}
            }
          } else {
            await new Promise<void>((res) => navigator.geolocation.getCurrentPosition(() => res(), () => res(), { timeout: 5000 }));
            result = await checkLocation();
          }
          break;
        }
        case 'notifications': {
          if (isNative) {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            const r = await PushNotifications.requestPermissions();
            result = mapCapacitorState(r.receive);
            if (result === 'granted') {
              try {
                await PushNotifications.register();
              } catch (regErr: any) {
                const msg = String(regErr?.message || regErr || '');
                if (msg.includes('Firebase')) {
                  console.warn('[Permissions] Firebase non configuré, register() ignoré.');
                } else {
                  console.warn('[Permissions] register() a échoué:', regErr);
                }
              }
            }
          } else if ('Notification' in window) {
            const r = await Notification.requestPermission();
            result = r as PermissionStatus;
          }
          break;
        }
        case 'overlay': {
          if (isNative && platform === 'android') {
            const r = await SoloCabPermissions.openOverlaySettings();
            result = r.overlay ? 'granted' : 'prompt';
          } else {
            result = 'unsupported';
          }
          break;
        }
        case 'battery': {
          if (isNative && platform === 'android') {
            const r = await SoloCabPermissions.openBatteryOptimizationSettings();
            result = r.battery ? 'granted' : 'prompt';
          } else {
            result = 'unsupported';
          }
          break;
        }
        case 'microphone': {
          if (isNative && platform === 'android') {
            const r = await SoloCabPermissions.requestMicrophone();
            result = r.granted ? 'granted' : 'denied';
            break;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            result = 'granted';
          } catch {
            result = 'denied';
          }
          break;
        }
      }
    } catch (err) {
      console.error('[Permissions] request error', key, err);
      result = 'denied';
    }

    // Logger côté Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_permissions_log').insert({
          user_id: user.id,
          permission_key: key,
          status: result,
          platform,
        });
      }
    } catch {/* ignore log errors */}

    await refreshAll();
    return result;
  }, [isNative, platform, checkLocation, refreshAll]);

  const openPermissionTestAction = useCallback(async (action: PermissionTestAction): Promise<void> => {
    if (action === 'app_details') {
      if (isNative && platform === 'android') {
        await SoloCabPermissions.openAppDetailsSettings();
      }
      await refreshAll();
      return;
    }

    await requestPermission(action);
  }, [isNative, platform, refreshAll, requestPermission]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const onFocus = () => void refreshAll();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    let appStateHandle: { remove: () => Promise<void> } | undefined;
    if (isNative) {
      void import('@capacitor/app').then(({ App }) => {
        void App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void refreshAll();
        }).then((handle) => {
          appStateHandle = handle;
        });
      });
    }

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      void appStateHandle?.remove();
    };
  }, [isNative, refreshAll]);

  const allRequiredGranted = permissions
    .filter((p) => p.required)
    .every((p) => p.status === 'granted');

  const missingRequired = permissions.filter((p) => p.required && p.status !== 'granted');

  return {
    permissions,
    loading,
    refreshAll,
    requestPermission,
    openPermissionTestAction,
    allRequiredGranted,
    missingRequired,
    isNative,
    platform,
  };
}

function mapCapacitorState(s: string | undefined): PermissionStatus {
  switch (s) {
    case 'granted': return 'granted';
    case 'denied': return 'denied';
    case 'prompt':
    case 'prompt-with-rationale': return 'prompt';
    default: return 'unknown';
  }
}
