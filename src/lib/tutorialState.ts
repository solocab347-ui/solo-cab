/**
 * État du tutoriel chauffeur — règles de présentation.
 *
 * Modèle "Uber/Bolt" demandé par le métier :
 *  - Si le chauffeur a TERMINÉ le tutoriel au moins une fois → ne plus l'afficher.
 *  - Sinon, on lui propose au LOGIN max 3 fois. Au 4ème login : silence.
 *  - Il pourra toujours le relancer manuellement depuis Réglages.
 *
 * Stockage : localStorage scoping par driverId.
 *   solocab_tutorial_state_<driverId> = JSON.stringify({
 *     shownCount: number,         // nombre de fois où on l'a PROPOSÉ
 *     completed: boolean,         // true si l'utilisateur a fini ou cliqué "Terminer"
 *     dismissedForever: boolean,  // true après 3 refus ou clic explicite
 *     lastShownAt: number,        // timestamp ms
 *   })
 */
const KEY_PREFIX = "solocab_tutorial_state_";
const MAX_AUTO_SHOWS = 3;

export interface TutorialState {
  shownCount: number;
  completed: boolean;
  dismissedForever: boolean;
  lastShownAt: number;
}

const DEFAULT_STATE: TutorialState = {
  shownCount: 0,
  completed: false,
  dismissedForever: false,
  lastShownAt: 0,
};

function key(driverId: string) {
  return `${KEY_PREFIX}${driverId}`;
}

export function getTutorialState(driverId: string): TutorialState {
  try {
    const raw = localStorage.getItem(key(driverId));
    if (!raw) {
      // Compatibilité ascendante : ancienne clé "solocab_tutorial_done_<id>"
      const legacy = localStorage.getItem(`solocab_tutorial_done_${driverId}`);
      if (legacy === "true") {
        return { ...DEFAULT_STATE, completed: true, dismissedForever: true };
      }
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function setTutorialState(driverId: string, partial: Partial<TutorialState>) {
  try {
    const current = getTutorialState(driverId);
    const next = { ...current, ...partial };
    localStorage.setItem(key(driverId), JSON.stringify(next));
    return next;
  } catch {
    return getTutorialState(driverId);
  }
}

/**
 * Doit-on proposer automatiquement le tutoriel au login/dashboard ?
 *
 * Non si :
 *  - déjà complété au moins une fois
 *  - "dismissedForever" coché
 *  - déjà présenté >= MAX_AUTO_SHOWS fois
 */
export function shouldAutoShowTutorial(driverId: string): boolean {
  const s = getTutorialState(driverId);
  if (s.completed) return false;
  if (s.dismissedForever) return false;
  if (s.shownCount >= MAX_AUTO_SHOWS) return false;
  return true;
}

/** À appeler quand on PRÉSENTE le tutoriel (pour incrémenter le compteur). */
export function markTutorialShown(driverId: string) {
  const s = getTutorialState(driverId);
  const nextCount = s.shownCount + 1;
  return setTutorialState(driverId, {
    shownCount: nextCount,
    lastShownAt: Date.now(),
    // Si on vient d'atteindre le cap, on bascule en "dismissedForever"
    dismissedForever: nextCount >= MAX_AUTO_SHOWS ? true : s.dismissedForever,
  });
}

/** À appeler quand l'utilisateur termine le tutoriel jusqu'au bout. */
export function markTutorialCompleted(driverId: string) {
  return setTutorialState(driverId, {
    completed: true,
    dismissedForever: true,
  });
}

/** À appeler quand l'utilisateur clique "Plus tard". On ne désactive PAS définitivement. */
export function markTutorialPostponed(driverId: string) {
  // Le compteur a déjà été incrémenté via markTutorialShown au moment du display.
  // Ici on n'ajoute rien, on laisse la logique du cap décider.
  return getTutorialState(driverId);
}

/** Reset manuel (depuis Réglages → "Revoir le tutoriel"). */
export function resetTutorialState(driverId: string) {
  try {
    localStorage.removeItem(key(driverId));
    localStorage.removeItem(`solocab_tutorial_done_${driverId}`);
  } catch {
    /* ignore */
  }
}

export const TUTORIAL_MAX_AUTO_SHOWS = MAX_AUTO_SHOWS;
