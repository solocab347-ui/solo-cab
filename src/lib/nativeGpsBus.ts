/**
 * Bus GPS natif partagé.
 *
 * Sur Capacitor, on ne doit avoir QU'UN SEUL watcher BackgroundGeolocation actif.
 * Avant cette fusion, `useDriverBackgroundGPS` (foreground service + DB writes)
 * et `useNativeGeolocation` (lecture UI) enregistraient chacun leur propre
 * `addWatcher`, doublant la charge GPS, la batterie et les écritures concurrentes.
 *
 * Désormais :
 *   - `useDriverBackgroundGPS` est le SEUL à enregistrer le watcher natif.
 *   - Chaque fix reçu est publié sur ce bus via `publishNativeFix(...)`.
 *   - `useNativeGeolocation` (et tout autre consommateur natif) se contente de
 *     `subscribeNativeFix(...)` pour recevoir les positions sans toucher au plugin.
 *
 * Sur web, ce bus n'est pas utilisé (chaque hook garde son `navigator.geolocation`).
 */

export interface NativeGpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  bearing?: number | null;
  provider?: string | null;
  timestamp: number;
}

type Listener = (fix: NativeGpsFix) => void;

const listeners = new Set<Listener>();
let lastFix: NativeGpsFix | null = null;

export function publishNativeFix(fix: NativeGpsFix) {
  lastFix = fix;
  listeners.forEach((l) => {
    try { l(fix); } catch (e) { console.warn('[nativeGpsBus] listener error', e); }
  });
}

export function subscribeNativeFix(listener: Listener): () => void {
  listeners.add(listener);
  // Replay le dernier fix connu pour éviter un état vide à l'abonnement
  if (lastFix) {
    try { listener(lastFix); } catch {/* ignore */}
  }
  return () => { listeners.delete(listener); };
}

export function getLastNativeFix(): NativeGpsFix | null {
  return lastFix;
}
