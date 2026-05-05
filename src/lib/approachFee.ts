/**
 * APPROACH FEE — Calcul du prix d'approche chauffeur
 *
 * Règle métier (validée produit) :
 * - Activable / désactivable par chaque chauffeur (drivers.approach_enabled)
 * - Tarif libre entre 0€ et 1€ / km (drivers.approach_per_km_rate)
 * - Seuil fixe : 2 km. En dessous, AUCUN frais d'approche.
 * - Au-dessus de 2 km : facturation de TOUS les km parcourus (pas seulement l'excédent)
 * - Uniquement courses immédiates (pas réservations / pas mise à dispo)
 * - Distance d'approche = distance routière chauffeur → client (Mapbox de préférence)
 */

export const APPROACH_DISTANCE_THRESHOLD_KM = 2;
export const APPROACH_MAX_RATE_PER_KM = 1; // €/km — plafond strict

export interface ApproachFeeInput {
  enabled: boolean | null | undefined;
  ratePerKm: number | null | undefined; // €/km
  approachDistanceKm: number | null | undefined; // distance chauffeur → client
  isImmediate?: boolean; // défaut true
}

export interface ApproachFeeBreakdown {
  applies: boolean;
  approachDistanceKm: number;
  ratePerKm: number;
  fee: number; // € arrondi au centime
  reason?: 'disabled' | 'below_threshold' | 'not_immediate' | 'no_distance' | 'no_rate';
}

/**
 * Calcule le prix d'approche.
 * Retourne 0€ si l'une des conditions n'est pas remplie.
 */
export function computeApproachFee(input: ApproachFeeInput): ApproachFeeBreakdown {
  const enabled = !!input.enabled;
  const rate = clampRate(Number(input.ratePerKm) || 0);
  const distanceKm = Number(input.approachDistanceKm) || 0;
  const isImmediate = input.isImmediate !== false;

  if (!enabled) return makeEmpty(distanceKm, rate, 'disabled');
  if (!isImmediate) return makeEmpty(distanceKm, rate, 'not_immediate');
  if (rate <= 0) return makeEmpty(distanceKm, rate, 'no_rate');
  if (distanceKm <= 0) return makeEmpty(distanceKm, rate, 'no_distance');
  if (distanceKm <= APPROACH_DISTANCE_THRESHOLD_KM) {
    return makeEmpty(distanceKm, rate, 'below_threshold');
  }

  const fee = Math.round(distanceKm * rate * 100) / 100;
  return {
    applies: true,
    approachDistanceKm: round2(distanceKm),
    ratePerKm: rate,
    fee,
  };
}

function makeEmpty(
  distanceKm: number,
  rate: number,
  reason: ApproachFeeBreakdown['reason']
): ApproachFeeBreakdown {
  return {
    applies: false,
    approachDistanceKm: round2(distanceKm),
    ratePerKm: rate,
    fee: 0,
    reason,
  };
}

function clampRate(rate: number): number {
  if (Number.isNaN(rate) || rate < 0) return 0;
  if (rate > APPROACH_MAX_RATE_PER_KM) return APPROACH_MAX_RATE_PER_KM;
  return Math.round(rate * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Format affichage côté UI (client + chauffeur).
 * Ex: "+ 2,50 € d'approche (5 km × 0,50 €/km)"
 */
export function formatApproachLabel(b: ApproachFeeBreakdown): string {
  if (!b.applies) return '';
  return `+ ${b.fee.toFixed(2).replace('.', ',')} € d'approche (${b.approachDistanceKm.toFixed(1)} km × ${b.ratePerKm.toFixed(2).replace('.', ',')} €/km)`;
}
