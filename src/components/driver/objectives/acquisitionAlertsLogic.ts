/**
 * Logique pure de calcul des alertes d'acquisition.
 * Utilisée par <AcquisitionAlerts /> en prod et par <AcquisitionAlertsTester />
 * pour simuler des seuils sans toucher à la base.
 */
import type { DriverDailyEntry, DriverObjective } from './types';

export type AlertSeverity = 'warning' | 'critical' | 'info';

export interface ComputedAlert {
  id: string;
  severity: AlertSeverity;
  iconKey: 'hand' | 'qr' | 'signup' | 'crown' | 'trend-down';
  title: string;
  message: string;
  recommendation: string;
}

export interface AlertSignals {
  courses7: number;
  proposed7: number;
  scans7: number;
  signups7: number;
  proposalRate: number;
  scanRate: number;
  conversionRate: number;
  expectedCards7: number;
  expectedScans7: number;
  expectedClients7: number;
  totalDirectClients: number;
  loyalClientsCount: number;
}

export interface AlertsInput {
  entries: DriverDailyEntry[];
  objectives: DriverObjective[];
  totalDirectClients: number;
  loyalClientsCount: number;
}

export interface RuleEvaluation {
  id: string;
  label: string;
  condition: string;
  fired: boolean;
  reason: string;
}

export function computeAlertSignals(input: AlertsInput): AlertSignals {
  const monthly = input.objectives.find(o => o.period_type === 'monthly');
  const dailyCardsTarget = ((monthly?.cards_proposed_target || 0)) / 22;
  const dailyScansTarget = ((monthly?.qr_scans_target || 0)) / 22;
  const dailyClientsTarget = ((monthly?.direct_clients_target || 0)) / 22;

  const last7 = input.entries.slice(0, 7);
  const sum = (arr: DriverDailyEntry[], k: keyof DriverDailyEntry) =>
    arr.reduce((s, e) => s + (Number(e[k]) || 0), 0);

  const courses7 = sum(last7, 'courses_count');
  const proposed7 = sum(last7, 'cards_proposed_count' as keyof DriverDailyEntry);
  const scans7 = sum(last7, 'qr_scans_count' as keyof DriverDailyEntry);
  const signups7 = sum(last7, 'direct_signups_count' as keyof DriverDailyEntry);

  return {
    courses7,
    proposed7,
    scans7,
    signups7,
    proposalRate: courses7 > 0 ? proposed7 / courses7 : 0,
    scanRate: proposed7 > 0 ? scans7 / proposed7 : 0,
    conversionRate: scans7 > 0 ? signups7 / scans7 : 0,
    expectedCards7: dailyCardsTarget * 7,
    expectedScans7: dailyScansTarget * 7,
    expectedClients7: dailyClientsTarget * 7,
    totalDirectClients: input.totalDirectClients,
    loyalClientsCount: input.loyalClientsCount,
  };
}

export function computeAlertsFromSignals(s: AlertSignals): ComputedAlert[] {
  const out: ComputedAlert[] = [];

  if (s.expectedCards7 > 0 && s.proposed7 < s.expectedCards7 * 0.7) {
    const deficit = Math.max(1, Math.round(s.expectedCards7 - s.proposed7));
    out.push({
      id: 'thr-cards',
      severity: s.proposed7 < s.expectedCards7 * 0.4 ? 'critical' : 'warning',
      iconKey: 'hand',
      title: `Pas assez de cartes proposées (${s.proposed7}/${Math.round(s.expectedCards7)})`,
      message: `Sur 7 jours tu es à ${Math.round(s.proposalRate * 100)}% de propositions / course. Cible idéale : 1 carte par course.`,
      recommendation: `Propose ta carte sur tes ${deficit} prochaines courses. C'est l'action #1 qui débloque tout le reste.`,
    });
  }

  if (s.proposed7 >= 5 && s.scanRate < 0.3) {
    out.push({
      id: 'thr-scan-rate',
      severity: s.scanRate < 0.15 ? 'critical' : 'warning',
      iconKey: 'qr',
      title: `Taux de scan faible : ${Math.round(s.scanRate * 100)}%`,
      message: `Tu proposes ta carte (${s.proposed7}) mais peu de clients la scannent (${s.scans7}).`,
      recommendation: `Pose la carte dans la main du client + dis "scanne avant de descendre, c'est 5 secondes". Le geste change tout.`,
    });
  }

  if (s.scans7 >= 3 && s.conversionRate < 0.2) {
    out.push({
      id: 'thr-conversion',
      severity: 'warning',
      iconKey: 'signup',
      title: `Conversion scan → inscription : ${Math.round(s.conversionRate * 100)}%`,
      message: `${s.scans7} scans pour ${s.signups7} inscription(s). Ton profil public ne convainc peut-être pas assez.`,
      recommendation: `Vérifie ta photo, ton avatar, et les avis affichés sur ton profil public. C'est ce que voit le client après le scan.`,
    });
  }

  if (s.totalDirectClients >= 5 && s.loyalClientsCount / Math.max(1, s.totalDirectClients) < 0.2) {
    out.push({
      id: 'thr-clients',
      severity: 'info',
      iconKey: 'crown',
      title: `Peu de clients fidèles (${s.loyalClientsCount}/${s.totalDirectClients})`,
      message: `Moins de 20% de tes clients directs reviennent.`,
      recommendation: `Envoie un message après chaque course. Propose une réservation à l'avance pour leur prochain trajet.`,
    });
  }

  if (s.courses7 >= 10 && s.expectedClients7 >= 1 && s.signups7 === 0) {
    out.push({
      id: 'thr-clients',
      severity: 'warning',
      iconKey: 'trend-down',
      title: 'Aucun nouveau client direct cette semaine',
      message: `${s.courses7} courses sur 7 jours mais 0 inscription directe.`,
      recommendation: `L'objectif n'est pas la course, c'est le client. Propose la carte systématiquement la semaine prochaine.`,
    });
  }

  return out;
}

/**
 * Évalue chaque règle pour le diagnostic (mode test).
 * Retourne TOUTES les règles avec leur statut de déclenchement.
 */
export function evaluateAllRules(s: AlertSignals): RuleEvaluation[] {
  return [
    {
      id: 'thr-cards',
      label: 'Cartes proposées sous la cible',
      condition: `proposed7 < expectedCards7 × 0.7  (${s.proposed7} < ${(s.expectedCards7 * 0.7).toFixed(1)})`,
      fired: s.expectedCards7 > 0 && s.proposed7 < s.expectedCards7 * 0.7,
      reason: s.expectedCards7 === 0
        ? 'Aucune cible mensuelle de cartes définie'
        : (s.proposed7 < s.expectedCards7 * 0.7
            ? `Déficit : ${Math.round(s.expectedCards7 - s.proposed7)} cartes manquantes sur 7j`
            : `OK — ${s.proposed7} cartes proposées, attendu ${Math.round(s.expectedCards7)}`),
    },
    {
      id: 'thr-scan-rate',
      label: 'Taux de scan trop bas',
      condition: `proposed7 ≥ 5 ET scanRate < 0.3  (${s.proposed7} ≥ 5 ET ${(s.scanRate * 100).toFixed(0)}% < 30%)`,
      fired: s.proposed7 >= 5 && s.scanRate < 0.3,
      reason: s.proposed7 < 5
        ? `Pas assez de cartes proposées (${s.proposed7}/5 min) pour évaluer`
        : (s.scanRate < 0.3 ? `Scan rate ${(s.scanRate * 100).toFixed(0)}% sous le seuil 30%` : `OK — ${(s.scanRate * 100).toFixed(0)}% de scan rate`),
    },
    {
      id: 'thr-conversion',
      label: 'Conversion scan→signup faible',
      condition: `scans7 ≥ 3 ET conversionRate < 0.2  (${s.scans7} ≥ 3 ET ${(s.conversionRate * 100).toFixed(0)}% < 20%)`,
      fired: s.scans7 >= 3 && s.conversionRate < 0.2,
      reason: s.scans7 < 3
        ? `Pas assez de scans (${s.scans7}/3 min) pour évaluer`
        : (s.conversionRate < 0.2 ? `Conversion ${(s.conversionRate * 100).toFixed(0)}% sous le seuil 20%` : `OK — ${(s.conversionRate * 100).toFixed(0)}% de conversion`),
    },
    {
      id: 'thr-clients-loyalty',
      label: 'Peu de clients fidèles',
      condition: `totalDirectClients ≥ 5 ET ratio loyaux < 0.2`,
      fired: s.totalDirectClients >= 5 && s.loyalClientsCount / Math.max(1, s.totalDirectClients) < 0.2,
      reason: s.totalDirectClients < 5
        ? `Pas assez de clients directs (${s.totalDirectClients}/5 min)`
        : `${s.loyalClientsCount}/${s.totalDirectClients} fidèles = ${Math.round((s.loyalClientsCount / s.totalDirectClients) * 100)}%`,
    },
    {
      id: 'thr-clients-stagnation',
      label: 'Aucun signup malgré 10+ courses',
      condition: `courses7 ≥ 10 ET expectedClients7 ≥ 1 ET signups7 = 0`,
      fired: s.courses7 >= 10 && s.expectedClients7 >= 1 && s.signups7 === 0,
      reason: s.courses7 < 10
        ? `Pas assez de courses (${s.courses7}/10 min)`
        : (s.signups7 === 0 ? 'Aucune inscription en 7j malgré activité' : `${s.signups7} signup(s) — OK`),
    },
  ];
}

/** Topics couverts par les alertes → nudges du coach à supprimer (miroir de AcquisitionCoach) */
export const ALERT_TO_NUDGE_MAP: Record<string, string[]> = {
  'thr-cards': ['alert-no-proposal-3d', 'alert-low-proposal-rate'],
  'thr-scans': ['alert-no-scans-after-proposals'],
  'thr-scan-rate': ['alert-no-scans-after-proposals'],
  'thr-conversion': ['alert-low-conversion', 'tip-improve-profile'],
  'thr-clients': ['tip-fidelisation'],
  'thr-clients-loyalty': ['tip-fidelisation'],
  'thr-clients-stagnation': ['tip-fidelisation'],
};
