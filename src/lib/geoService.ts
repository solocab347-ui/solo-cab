/**
 * geoService — service unifié de géolocalisation pour TOUTE l'app.
 *
 * Pourquoi ce module existe :
 *  - Avant cette refonte, plusieurs endroits (booking client, recherche immédiate,
 *    partner pool, tracker driver web) appelaient directement `navigator.geolocation`.
 *  - Sur Capacitor (Android/iOS), `navigator.geolocation` ne déclenche PAS toujours
 *    le prompt système → l'utilisateur ne voit jamais la demande de permission,
 *    le GPS reste muet, l'indicateur OS "l'application utilise votre position"
 *    n'apparaît pas, et la position retombe sur du géocodage IP (≈ Beaubourg).
 *  - Cette unification garantit qu'UN SEUL chemin code touche la géolocalisation,
 *    et que la permission est TOUJOURS demandée explicitement avant tout usage.
 *
 * Règles d'or :
 *  1. Sur natif → `@capacitor/geolocation` exclusivement (jamais navigator.geolocation).
 *  2. Sur web → `navigator.geolocation`.
 *  3. Toute lecture passe par `ensureLocationPermission()` au préalable.
 *  4. Pour le tracking continu chauffeur en background, c'est `useDriverBackgroundGPS`
 *     qui pilote `@capacitor-community/background-geolocation` (foreground service Android).
 */
import { Capacitor } from '@capacitor/core';
import { ensureLocationPermission } from './ensureLocationPermission';

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface GeoOptions {
  enableHighAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
}

const DEFAULTS: Required<GeoOptions> = {
  enableHighAccuracy: true,
  timeoutMs: 15_000,
  maximumAgeMs: 5_000,
};

/**
 * Récupère UNE position courante. Demande la permission si nécessaire.
 * Renvoie null en cas d'échec (jamais throw — l'appelant gère le fallback UI).
 */
export async function getCurrentLocation(opts: GeoOptions = {}): Promise<GeoFix | null> {
  const o = { ...DEFAULTS, ...opts };
  const perm = await ensureLocationPermission({ silent: false });
  if (perm !== 'granted') return null;

  try {
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: o.enableHighAccuracy,
        timeout: o.timeoutMs,
        maximumAge: o.maximumAgeMs,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? 0,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
        timestamp: pos.timestamp,
      };
    }

    if (!('geolocation' in navigator)) return null;
    return await new Promise<GeoFix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
          speed: pos.coords.speed ?? null,
          heading: pos.coords.heading ?? null,
          timestamp: pos.timestamp,
        }),
        (err) => {
          console.warn('[geoService] getCurrentPosition failed', err);
          resolve(null);
        },
        {
          enableHighAccuracy: o.enableHighAccuracy,
          timeout: o.timeoutMs,
          maximumAge: o.maximumAgeMs,
        },
      );
    });
  } catch (e) {
    console.warn('[geoService] getCurrentLocation error', e);
    return null;
  }
}

/**
 * Watcher continu. Renvoie une fonction de cleanup. Utilisé pour les UI live
 * (carte client, position en temps réel sur la page de réservation).
 *
 * NB : pour le foreground service chauffeur en background, utiliser
 * `useDriverBackgroundGPS` qui s'appuie sur le plugin background-geolocation.
 */
export async function watchLocation(
  onFix: (fix: GeoFix) => void,
  onError?: (msg: string) => void,
  opts: GeoOptions = {},
): Promise<() => void> {
  const o = { ...DEFAULTS, ...opts };
  const perm = await ensureLocationPermission({ silent: false });
  if (perm !== 'granted') {
    onError?.('Permission de localisation refusée');
    return () => {};
  }

  if (Capacitor.isNativePlatform()) {
    let watcherId: string | null = null;
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      watcherId = await Geolocation.watchPosition(
        { enableHighAccuracy: o.enableHighAccuracy, timeout: o.timeoutMs, maximumAge: o.maximumAgeMs },
        (pos, err) => {
          if (err || !pos) {
            onError?.(err ? String(err.message ?? err) : 'Position indisponible');
            return;
          }
          onFix({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 0,
            speed: pos.coords.speed ?? null,
            heading: pos.coords.heading ?? null,
            timestamp: pos.timestamp,
          });
        },
      );
    } catch (e) {
      console.warn('[geoService] native watchPosition failed', e);
      onError?.('GPS natif indisponible');
    }
    return () => {
      if (watcherId) {
        import('@capacitor/geolocation').then(({ Geolocation }) =>
          Geolocation.clearWatch({ id: watcherId! }).catch(() => {}),
        ).catch(() => {});
      }
    };
  }

  if (!('geolocation' in navigator)) {
    onError?.('Géolocalisation non disponible');
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => onFix({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? 0,
      speed: pos.coords.speed ?? null,
      heading: pos.coords.heading ?? null,
      timestamp: pos.timestamp,
    }),
    (err) => onError?.(err.message || 'Erreur GPS'),
    { enableHighAccuracy: o.enableHighAccuracy, timeout: o.timeoutMs, maximumAge: o.maximumAgeMs },
  );
  return () => navigator.geolocation.clearWatch(id);
}

/**
 * Vérifie l'état actuel sans déclencher de prompt. Utile pour des bandeaux
 * de notification ("votre GPS est désactivé") sans ennuyer l'utilisateur.
 */
export async function checkLocationPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const s = await Geolocation.checkPermissions();
      if (s.location === 'granted' || (s as any).coarseLocation === 'granted') return 'granted';
      if (s.location === 'denied') return 'denied';
      return 'prompt';
    }
    if ('permissions' in navigator) {
      const s = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return s.state as 'granted' | 'denied' | 'prompt';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
