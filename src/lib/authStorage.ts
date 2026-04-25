/**
 * Storage adapter pour Supabase Auth, contrôlé par "Se souvenir de moi".
 *
 * Comportement (modèle Uber/Bolt) :
 *  - Par défaut "Se souvenir de moi" est ACTIVÉ → session persistante en localStorage.
 *    L'utilisateur reste connecté indéfiniment, même après fermeture/rouverture
 *    de l'app (jusqu'à un signOut explicite).
 *  - Si l'utilisateur DÉCOCHE → la session est stockée en sessionStorage et est
 *    perdue à la fermeture du navigateur/onglet.
 *
 * Le flag est lu/écrit via la clé `solocab_remember_session`.
 *
 * Important : Supabase appelle `getItem`/`setItem` à chaque rafraîchissement
 * de token. On lit donc le mode "à la volée" pour respecter le choix utilisateur
 * sans rebuild du client.
 */
const REMEMBER_SESSION_KEY = "solocab_remember_session";

/**
 * Lit le mode souhaité.
 * Par défaut TRUE (persistance permanente, comme Uber/Bolt).
 */
export function getRememberMe(): boolean {
  try {
    const v = localStorage.getItem(REMEMBER_SESSION_KEY);
    if (v === null) return true; // défaut : on garde la session
    return v === "true";
  } catch {
    return true;
  }
}

/**
 * Définit le mode "Se souvenir de moi".
 * À appeler AVANT signIn pour que le token soit stocké au bon endroit.
 *
 * Si on bascule de persistant → temporaire, on déplace immédiatement
 * la session existante de localStorage vers sessionStorage (et inversement).
 */
export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_SESSION_KEY, remember ? "true" : "false");

    // Déplacer la session existante si nécessaire (pour appliquer immédiatement)
    const SUPA_KEY_PREFIX = "sb-";
    const fromStore = remember ? sessionStorage : localStorage;
    const toStore = remember ? localStorage : sessionStorage;

    const keysToMove: string[] = [];
    for (let i = 0; i < fromStore.length; i++) {
      const k = fromStore.key(i);
      if (k && k.startsWith(SUPA_KEY_PREFIX)) keysToMove.push(k);
    }
    for (const k of keysToMove) {
      const val = fromStore.getItem(k);
      if (val !== null) {
        toStore.setItem(k, val);
        fromStore.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Storage adapter pour Supabase qui route vers local ou session storage
 * selon la préférence courante.
 *
 * Pour chaque opération on regarde où la clé existe (lecture) ou on choisit
 * la cible selon getRememberMe() (écriture).
 */
export const supabaseAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      // Chercher d'abord dans le storage actif, puis l'autre (fallback)
      const remember = getRememberMe();
      const primary = remember ? localStorage : sessionStorage;
      const secondary = remember ? sessionStorage : localStorage;
      return primary.getItem(key) ?? secondary.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const remember = getRememberMe();
      const target = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;
      target.setItem(key, value);
      // Nettoyer une éventuelle copie dans l'autre storage
      try { other.removeItem(key); } catch {}
    } catch {
      /* ignore */
    }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  },
};
