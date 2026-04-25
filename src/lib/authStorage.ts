/**
 * Gestion "Se souvenir de moi" pour la session Supabase.
 *
 * Modèle Uber/Bolt : par défaut, la session est PERSISTANTE (l'utilisateur reste
 * connecté entre les ouvertures de l'app). C'est déjà le comportement natif de
 * Supabase (persistSession + localStorage).
 *
 * Si l'utilisateur DÉCOCHE "Se souvenir de moi", on déplace les tokens
 * Supabase de localStorage vers sessionStorage. Résultat : à la fermeture
 * du navigateur/onglet, la session est perdue → il devra se reconnecter.
 *
 * Sur app native (Capacitor), sessionStorage est aussi vidé au cold-start,
 * donc le comportement est cohérent.
 */
const REMEMBER_KEY = "solocab_remember_session";
const SUPA_PREFIX = "sb-"; // toutes les clés Supabase commencent par sb-

export function getRememberMe(): boolean {
  try {
    const v = localStorage.getItem(REMEMBER_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
    applyRememberMode(remember);
  } catch {
    /* ignore */
  }
}

/**
 * Déplace les tokens Supabase entre localStorage et sessionStorage
 * pour refléter la préférence courante.
 *
 * - remember = true  → tout en localStorage (persistant)
 * - remember = false → tout en sessionStorage (volatile)
 */
export function applyRememberMode(remember: boolean) {
  try {
    const from = remember ? sessionStorage : localStorage;
    const to = remember ? localStorage : sessionStorage;

    const keys: string[] = [];
    for (let i = 0; i < from.length; i++) {
      const k = from.key(i);
      if (k && k.startsWith(SUPA_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      const val = from.getItem(k);
      if (val !== null) {
        to.setItem(k, val);
        from.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * À appeler au boot de l'app, AVANT que le client Supabase ne lise sa session.
 * Si l'utilisateur a précédemment décoché "Se souvenir de moi" et qu'on vient
 * de relancer l'app, sessionStorage est vide → il sera donc bien déconnecté
 * et atterrira sur l'écran de login. Si coché, rien ne change.
 *
 * En revanche, si on trouve des clés au mauvais endroit (ex: après un toggle
 * sans rechargement), on les remet à la bonne place.
 */
export function initRememberOnBoot() {
  applyRememberMode(getRememberMe());
}
