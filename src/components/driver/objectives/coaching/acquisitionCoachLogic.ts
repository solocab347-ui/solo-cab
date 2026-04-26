import type { DriverDailyEntry } from '../types';

/**
 * Logique pure de l'AcquisitionCoach.
 *
 * Extraite du composant pour pouvoir être :
 *  1. Utilisée par le panneau debug (DebugLog)
 *  2. Réutilisée par la page de test (/driver/objectives-debug)
 *  3. Testée unitairement sans monter le composant React
 */

export type NudgeType = 'celebration' | 'opportunity' | 'tip' | 'alert';

export interface Nudge {
  id: string;
  type: NudgeType;
  title: string;
  body: string;
  cta?: { label: string; action: 'open-qr' | 'open-funnel' | 'dismiss' };
  oneShot?: boolean;
}

export interface NudgeEvaluation {
  id: string;
  type: NudgeType;
  title: string;
  /** True si la condition est remplie indépendamment du dismiss */
  conditionMet: boolean;
  /** Description humaine de la condition */
  condition: string;
  /** Valeurs réelles vs seuils */
  values: Record<string, number | string | boolean>;
  /** Raison du non-affichage (si non sélectionné) */
  reason: 'shown' | 'condition-not-met' | 'already-dismissed' | 'cooldown' | 'cap-reached' | 'lower-priority';
}

export interface CoachSignals {
  courses7: number;
  proposed7: number;
  scans7: number;
  signups7: number;
  courses3: number;
  proposed3: number;
  proposalRate7: number;
  conversionRate7: number;
  scanRate7: number;
}

export const COACH_DISMISSED_KEY = 'solocab_acq_coach_dismissed';
export const COACH_LAST_SHOWN_KEY = 'solocab_acq_coach_last';
export const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h
export const MAX_NUDGES_7D = 8;

export function computeSignals(entries: DriverDailyEntry[]): CoachSignals {
  const last7 = entries.slice(0, 7);
  const last3 = entries.slice(0, 3);

  const sum = (arr: DriverDailyEntry[], key: keyof DriverDailyEntry) =>
    arr.reduce((s, e) => s + (Number(e[key]) || 0), 0);

  const courses7 = sum(last7, 'courses_count');
  const proposed7 = sum(last7, 'cards_proposed_count' as keyof DriverDailyEntry);
  const scans7 = sum(last7, 'qr_scans_count' as keyof DriverDailyEntry);
  const signups7 = sum(last7, 'direct_signups_count' as keyof DriverDailyEntry);

  const courses3 = sum(last3, 'courses_count');
  const proposed3 = sum(last3, 'cards_proposed_count' as keyof DriverDailyEntry);

  return {
    courses7,
    proposed7,
    scans7,
    signups7,
    courses3,
    proposed3,
    proposalRate7: courses7 > 0 ? proposed7 / courses7 : 0,
    conversionRate7: scans7 > 0 ? signups7 / scans7 : 0,
    scanRate7: proposed7 > 0 ? scans7 / proposed7 : 0,
  };
}

interface RuleDef {
  nudge: Nudge;
  /** Évalue la condition pure et fournit les détails */
  evaluate: (
    s: CoachSignals,
    totalDirectClients: number,
    loyalClientsCount: number,
  ) => { met: boolean; condition: string; values: Record<string, number | string | boolean> };
}

/**
 * Liste ordonnée des règles. Le premier match (condition ok ET non dismissé)
 * gagne. L'ordre = priorité.
 */
export const COACH_RULES: RuleDef[] = [
  // --- Célébrations ---
  {
    nudge: {
      id: 'celeb-first-client',
      type: 'celebration',
      title: '🎉 Ton premier client direct !',
      body: "Bravo, tu viens de signer ta première vraie victoire. Chaque client direct = 0% de commission plateforme. C'est ça, l'indépendance.",
      oneShot: true,
    },
    evaluate: (_, t) => ({
      met: t === 1,
      condition: 'totalDirectClients === 1',
      values: { totalDirectClients: t },
    }),
  },
  {
    nudge: {
      id: 'celeb-10-clients',
      type: 'celebration',
      title: '🏆 10 clients directs !',
      body: 'Tu construis ta vraie clientèle. Continue : à 50, tu commences à pouvoir te passer des plateformes les jours creux.',
      oneShot: true,
    },
    evaluate: (_, t) => ({
      met: t >= 10 && t < 11,
      condition: '10 ≤ totalDirectClients < 11',
      values: { totalDirectClients: t },
    }),
  },
  {
    nudge: {
      id: 'celeb-50-clients',
      type: 'celebration',
      title: '👑 50 clients directs — Tu es indépendant',
      body: "À ce stade, tu as une base solide. Concentre-toi sur la fidélisation : un client qui revient = bien plus rentable qu'un nouveau.",
      oneShot: true,
    },
    evaluate: (_, t) => ({
      met: t >= 50 && t < 51,
      condition: '50 ≤ totalDirectClients < 51',
      values: { totalDirectClients: t },
    }),
  },
  {
    nudge: {
      id: 'celeb-first-loyals',
      type: 'celebration',
      title: '❤️ 5 clients fidèles',
      body: "Ces clients reviennent. C'est le vrai indicateur d'indépendance — bien plus que le CA brut.",
      oneShot: true,
    },
    evaluate: (_, __, l) => ({
      met: l >= 5,
      condition: 'loyalClientsCount ≥ 5',
      values: { loyalClientsCount: l },
    }),
  },

  // --- Alertes ---
  {
    nudge: {
      id: 'alert-no-proposal-3d',
      type: 'alert',
      title: '10 courses, 0 carte proposée',
      body: 'Tu travailles dur sur les plateformes mais tu ne captes aucun client pour toi. Une simple phrase à la fin de la course peut tout changer : « Si vous voulez me reprendre directement, scannez ce QR ».',
      cta: { label: 'Voir mon QR code', action: 'open-qr' },
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.courses3 >= 10 && s.proposed3 === 0,
      condition: 'courses (3 derniers jours) ≥ 10 ET proposed (3j) = 0',
      values: { courses3: s.courses3, proposed3: s.proposed3 },
    }),
  },
  {
    nudge: {
      id: 'alert-low-proposal-rate',
      type: 'alert',
      title: 'Taux de propositions trop bas',
      body: "Tu proposes ta carte à moins d'1 client sur 5. Vise 80% : la majorité accepte au moins de scanner par curiosité, et c'est gratuit pour toi.",
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.courses7 >= 20 && s.proposalRate7 < 0.2 && s.proposed7 > 0,
      condition: 'courses 7j ≥ 20 ET taux propositions < 20% ET proposed > 0',
      values: {
        courses7: s.courses7,
        proposed7: s.proposed7,
        proposalRate7Pct: Math.round(s.proposalRate7 * 100),
      },
    }),
  },
  {
    nudge: {
      id: 'alert-no-scans-after-proposals',
      type: 'alert',
      title: 'Tu proposes mais personne ne scanne',
      body: "Soit ta carte/QR n'est pas accessible (pas affiché dans la voiture ?), soit ta phrase est trop floue. Astuce : pose la carte sur le siège passager, pas dans la boîte à gants.",
      cta: { label: 'Voir mon QR code', action: 'open-qr' },
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.proposed7 >= 10 && s.scans7 === 0,
      condition: 'proposed 7j ≥ 10 ET scans 7j = 0',
      values: { proposed7: s.proposed7, scans7: s.scans7 },
    }),
  },
  {
    nudge: {
      id: 'alert-low-conversion',
      type: 'alert',
      title: "Des scans, mais pas d'inscrits",
      body: "Les clients scannent mais ne finalisent pas. Vérifie que ton profil public est bien rempli (photo, véhicule, présentation). Un profil vide = méfiance.",
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.scans7 >= 5 && s.signups7 === 0,
      condition: 'scans 7j ≥ 5 ET signups 7j = 0',
      values: { scans7: s.scans7, signups7: s.signups7 },
    }),
  },

  // --- Tips / opportunités ---
  {
    nudge: {
      id: 'tip-improve-profile',
      type: 'tip',
      title: 'Ton profil mérite mieux',
      body: "Tes clients scannent (bon signe !) mais hésitent à s'inscrire. Une bio courte + une vraie photo = +60% de conversion en moyenne.",
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.scanRate7 >= 0.3 && s.conversionRate7 < 0.3 && s.scans7 >= 3,
      condition: 'taux scan ≥ 30% ET taux conversion < 30% ET scans 7j ≥ 3',
      values: {
        scanRate7Pct: Math.round(s.scanRate7 * 100),
        conversionRate7Pct: Math.round(s.conversionRate7 * 100),
        scans7: s.scans7,
      },
    }),
  },
  {
    nudge: {
      id: 'tip-fidelisation',
      type: 'tip',
      title: 'Pense à recontacter',
      body: "Tu as des clients directs mais aucun ne revient. Un SMS « disponible ce week-end ? » 1x par mois suffit à créer le réflexe.",
      oneShot: true,
    },
    evaluate: (_, t, l) => ({
      met: t >= 3 && l === 0,
      condition: 'clients ≥ 3 ET fidèles = 0',
      values: { totalDirectClients: t, loyalClientsCount: l },
    }),
  },
  {
    nudge: {
      id: 'tip-getting-started',
      type: 'tip',
      title: 'Démarre ta base clients',
      body: 'Aucune saisie cette semaine. Même si tu roules sur Uber/Bolt, note tes courses ici : ça te permet de tracker combien de clients tu pourrais convertir en direct.',
      cta: { label: "Comprendre l'acquisition", action: 'open-funnel' },
      oneShot: true,
    },
    evaluate: (s, t) => ({
      met: s.courses7 === 0 && t < 3,
      condition: 'courses 7j = 0 ET clients < 3',
      values: { courses7: s.courses7, totalDirectClients: t },
    }),
  },
  {
    nudge: {
      id: 'tip-pro-mode',
      type: 'celebration',
      title: "🚀 Tu maîtrises l'acquisition",
      body: 'Tes ratios sont excellents : tu proposes, on scanne, on s\'inscrit. À ce rythme tu deviendras indépendant beaucoup plus vite que la moyenne.',
      oneShot: true,
    },
    evaluate: (s) => ({
      met: s.proposalRate7 >= 0.5 && s.scanRate7 >= 0.4 && s.conversionRate7 >= 0.3,
      condition: 'taux prop ≥ 50% ET taux scan ≥ 40% ET taux conv ≥ 30%',
      values: {
        proposalRate7Pct: Math.round(s.proposalRate7 * 100),
        scanRate7Pct: Math.round(s.scanRate7 * 100),
        conversionRate7Pct: Math.round(s.conversionRate7 * 100),
      },
    }),
  },
];

export function pickNudge(
  signals: CoachSignals,
  totalDirectClients: number,
  loyalClientsCount: number,
  alreadyDismissed: Set<string>,
): Nudge | null {
  for (const rule of COACH_RULES) {
    const { met } = rule.evaluate(signals, totalDirectClients, loyalClientsCount);
    if (met && !alreadyDismissed.has(rule.nudge.id)) return rule.nudge;
  }
  return null;
}

/**
 * Évalue toutes les règles pour le panneau debug : montre la raison
 * pour CHAQUE règle (condition ok/ko, dismissé, cap, cooldown).
 */
export function evaluateAllNudges(
  signals: CoachSignals,
  totalDirectClients: number,
  loyalClientsCount: number,
  alreadyDismissed: Set<string>,
  capReached: boolean,
  inCooldown: boolean,
): NudgeEvaluation[] {
  let firstMatchAssigned = false;

  return COACH_RULES.map((rule) => {
    const { met, condition, values } = rule.evaluate(signals, totalDirectClients, loyalClientsCount);
    let reason: NudgeEvaluation['reason'];

    if (!met) reason = 'condition-not-met';
    else if (alreadyDismissed.has(rule.nudge.id)) reason = 'already-dismissed';
    else if (capReached) reason = 'cap-reached';
    else if (inCooldown) reason = 'cooldown';
    else if (firstMatchAssigned) reason = 'lower-priority';
    else {
      reason = 'shown';
      firstMatchAssigned = true;
    }

    return {
      id: rule.nudge.id,
      type: rule.nudge.type,
      title: rule.nudge.title,
      conditionMet: met,
      condition,
      values,
      reason,
    };
  });
}
