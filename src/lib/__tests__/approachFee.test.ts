import { describe, it, expect } from 'vitest';
import { computeApproachFee, formatApproachLabel, APPROACH_DISTANCE_THRESHOLD_KM, APPROACH_MAX_RATE_PER_KM } from '../approachFee';

describe('computeApproachFee — règles métier prix d\'approche', () => {
  it('retourne 0 si désactivé', () => {
    const r = computeApproachFee({ enabled: false, ratePerKm: 0.5, approachDistanceKm: 5 });
    expect(r.applies).toBe(false);
    expect(r.fee).toBe(0);
    expect(r.reason).toBe('disabled');
  });

  it('retourne 0 si non immédiat (réservation)', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.5, approachDistanceKm: 5, isImmediate: false });
    expect(r.applies).toBe(false);
    expect(r.reason).toBe('not_immediate');
  });

  it('retourne 0 sous le seuil de 2 km', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.5, approachDistanceKm: 1.9 });
    expect(r.applies).toBe(false);
    expect(r.reason).toBe('below_threshold');
  });

  it('retourne 0 exactement à 2 km', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.5, approachDistanceKm: 2 });
    expect(r.applies).toBe(false);
  });

  it('facture la distance totale au-dessus de 2 km (pas seulement l\'excédent)', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.5, approachDistanceKm: 5 });
    expect(r.applies).toBe(true);
    expect(r.fee).toBe(2.5); // 5 × 0.5
  });

  it('plafonne le tarif à 1€/km', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 2.5, approachDistanceKm: 4 });
    expect(r.ratePerKm).toBe(APPROACH_MAX_RATE_PER_KM);
    expect(r.fee).toBe(4);
  });

  it('rejette les tarifs négatifs', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: -1, approachDistanceKm: 5 });
    expect(r.ratePerKm).toBe(0);
    expect(r.applies).toBe(false);
  });

  it('arrondit au centime', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.33, approachDistanceKm: 7.77 });
    expect(r.fee).toBe(Math.round(7.77 * 0.33 * 100) / 100);
  });

  it('formatApproachLabel rend une chaîne FR avec virgule', () => {
    const r = computeApproachFee({ enabled: true, ratePerKm: 0.5, approachDistanceKm: 5 });
    const label = formatApproachLabel(r);
    expect(label).toContain("d'approche");
    expect(label).toContain('2,50');
  });

  it('formatApproachLabel vide si non applicable', () => {
    const r = computeApproachFee({ enabled: false, ratePerKm: 0.5, approachDistanceKm: 5 });
    expect(formatApproachLabel(r)).toBe('');
  });

  it('seuil constant = 2 km', () => {
    expect(APPROACH_DISTANCE_THRESHOLD_KM).toBe(2);
  });
});
