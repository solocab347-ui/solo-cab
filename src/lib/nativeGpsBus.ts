/**
 * Bus GPS natif partagé.
 *
 * Pourquoi ? Le plugin @capacitor-community/background-geolocation ne supporte
 * qu'UN watcher fiable côté Android (sinon le foreground service est démarré
 * deux fois → notifications dupliquées + arrêts inattendus).
 *
 * Tous les hooks (carte, tracker, diagnostic) doivent passer par ce bus
 * plutôt que d'appeler addWatcher directement.
 */

export interface NativeGpsFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  bearing: number | null;
  /** Timestamp ms du fix (rapporté par le plugin). */
  time: number;
}

type Listener = (fix: NativeGpsFix) => void;

const listeners = new Set<Listener>();
let lastFix: NativeGpsFix | null = null;

export function publishNativeGpsFix(fix: NativeGpsFix) {
  lastFix = fix;
  listeners.forEach((l) => {
    try { l(fix); } catch (err) { console.warn('[nativeGpsBus] listener error', err); }
  });
}

export function subscribeNativeGps(listener: Listener): () => void {
  listeners.add(listener);
  // Replay immédiatement le dernier fix connu pour éviter un flash "Localisation…"
  if (lastFix) {
    try { listener(lastFix); } catch { /* ignore */ }
  }
  return () => { listeners.delete(listener); };
}

export function getLastNativeGpsFix(): NativeGpsFix | null {
  return lastFix;
}

/** Indique si le service natif a publié au moins un fix dans la fenêtre donnée. */
export function isNativeGpsAlive(maxAgeMs = 90_000): boolean {
  if (!lastFix) return false;
  return Date.now() - lastFix.time < maxAgeMs;
}
