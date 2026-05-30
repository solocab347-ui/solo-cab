/**
 * Prominent Disclosure — Conformité Google Play (User Data policy).
 *
 * Google Play exige qu'une application affiche une explication claire AVANT
 * de demander l'autorisation système d'accéder à la localisation en
 * arrière-plan (ACCESS_BACKGROUND_LOCATION). Ce module fournit :
 *
 *  1. Un bus d'évènements `requestBackgroundLocationDisclosure()` qui
 *     retourne une Promise résolue par l'utilisateur (accepté / refusé).
 *  2. Une persistance localStorage pour ne pas reposer la question si
 *     l'utilisateur a déjà accepté.
 *
 * Le composant `BackgroundLocationDisclosureDialog` (monté dans App.tsx)
 * s'abonne à ce bus et affiche la modale obligatoire.
 */

const STORAGE_KEY = 'solocab_bg_location_disclosure_v1';

export type DisclosureDecision = 'accepted' | 'declined';

type Resolver = (decision: DisclosureDecision) => void;
type Listener = (resolve: Resolver) => void;

let listener: Listener | null = null;

export function _registerDisclosureListener(l: Listener | null) {
  listener = l;
}

export function hasAcceptedBackgroundLocationDisclosure(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function resetBackgroundLocationDisclosure() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
}

/**
 * Affiche la modale d'information obligatoire (Prominent Disclosure) si
 * l'utilisateur ne l'a pas déjà acceptée. Retourne `true` s'il accepte
 * (ou avait déjà accepté), `false` s'il refuse.
 *
 * À appeler AVANT toute requête de permission ACCESS_BACKGROUND_LOCATION
 * ou avant de démarrer le foreground service GPS.
 */
export function requestBackgroundLocationDisclosure(): Promise<boolean> {
  if (hasAcceptedBackgroundLocationDisclosure()) return Promise.resolve(true);
  if (!listener) {
    // Pas de composant monté (SSR, tests) : on n'a pas le droit de présumer
    // l'accord — on refuse plutôt que de bypasser la conformité.
    console.warn('[ProminentDisclosure] Aucun listener monté — accès refusé par défaut.');
    return Promise.resolve(false);
  }
  return new Promise<boolean>((resolve) => {
    listener!((decision) => {
      try {
        if (decision === 'accepted') {
          localStorage.setItem(STORAGE_KEY, 'accepted');
        } else {
          localStorage.setItem(STORAGE_KEY, 'declined');
        }
      } catch {/* ignore */}
      resolve(decision === 'accepted');
    });
  });
}
