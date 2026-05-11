/**
 * Persistance native de la session Supabase via Capacitor Preferences.
 *
 * Problème résolu : sur Android, la WebView peut vider `localStorage` lors
 * d'un low-memory kill, d'une mise à jour de l'app, ou d'un nettoyage système.
 * Résultat : le chauffeur se retrouvait déconnecté en rouvrant l'app alors
 * qu'il n'avait jamais cliqué sur "Se déconnecter".
 *
 * Solution : on miroir les clés Supabase (`sb-*`) dans Capacitor Preferences,
 * qui est stocké dans SharedPreferences Android (non vidé par la WebView).
 *
 * Cycle :
 * 1. AVANT le boot React : restaurer les clés `sb-*` depuis Preferences vers
 *    localStorage si manquantes.
 * 2. À chaque changement de session (SIGNED_IN, TOKEN_REFRESHED), persister
 *    les clés `sb-*` dans Preferences.
 * 3. Sur SIGNED_OUT (déconnexion explicite), purger les Preferences.
 */

const SUPA_PREFIX = "sb-";

let initialized = false;

function isNative(): boolean {
  try {
    const cap = (window as any)?.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  } catch {
    return false;
  }
}

async function getPrefs() {
  const { Preferences } = await import("@capacitor/preferences");
  return Preferences;
}

/**
 * Restaure les clés Supabase depuis Capacitor Preferences vers localStorage.
 * À appeler AVANT que le client Supabase ne lise sa session.
 */
export async function restoreNativeSession(): Promise<void> {
  if (!isNative()) return;
  try {
    const Prefs = await getPrefs();
    const { keys } = await Prefs.keys();
    const supaKeys = keys.filter((k) => k.startsWith(SUPA_PREFIX));
    for (const k of supaKeys) {
      // Si déjà en localStorage, on ne touche pas (localStorage est plus frais)
      if (localStorage.getItem(k) !== null) continue;
      const { value } = await Prefs.get({ key: k });
      if (value !== null && value !== undefined) {
        localStorage.setItem(k, value);
      }
    }
    if (supaKeys.length > 0) {
      console.info("[nativeSession] restored", supaKeys.length, "keys from native storage");
    }
  } catch (err) {
    console.warn("[nativeSession] restore failed", err);
  }
}

/**
 * Persiste toutes les clés `sb-*` actuellement en localStorage vers Preferences.
 */
async function syncToNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const Prefs = await getPrefs();
    const supaKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SUPA_PREFIX)) supaKeys.push(k);
    }
    for (const k of supaKeys) {
      const v = localStorage.getItem(k);
      if (v !== null) {
        await Prefs.set({ key: k, value: v });
      }
    }
  } catch (err) {
    console.warn("[nativeSession] sync failed", err);
  }
}

/**
 * Purge les clés `sb-*` de Preferences (déconnexion explicite).
 */
async function clearNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const Prefs = await getPrefs();
    const { keys } = await Prefs.keys();
    for (const k of keys) {
      if (k.startsWith(SUPA_PREFIX)) {
        await Prefs.remove({ key: k });
      }
    }
  } catch (err) {
    console.warn("[nativeSession] clear failed", err);
  }
}

/**
 * À appeler une fois après le boot, dès que le client Supabase est prêt.
 * Branche la persistance native sur les événements d'auth.
 */
export async function initNativeSessionBridge(): Promise<void> {
  if (initialized || !isNative()) return;
  initialized = true;

  try {
    const { supabase } = await import("@/integrations/supabase/client");

    // Sync initial — capture la session déjà en mémoire
    await syncToNative();

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Déconnexion explicite : on purge le stockage natif aussi
        void clearNative();
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        void syncToNative();
      }
    });

    // Re-sync défensif toutes les 5 min en cas de refresh manuel
    setInterval(() => {
      void syncToNative();
    }, 5 * 60 * 1000);
  } catch (err) {
    console.warn("[nativeSession] init bridge failed", err);
  }
}
