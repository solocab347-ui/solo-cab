/**
 * TESTS - Course Validation (12 tests)
 */
import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  sanitizeNotes,
  sanitizePromoCode,
  safeCourseValidation,
  coordinatesSchema,
  courseDataSchema,
} from '../courseValidation';

describe('validateCoordinates', () => {
  it('79. devrait accepter des coordonnées valides', () => {
    expect(validateCoordinates({ latitude: 48.8566, longitude: 2.3522 })).toBe(true);
  });

  it('80. devrait rejeter latitude hors bornes', () => {
    expect(validateCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(validateCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
  });

  it('81. devrait rejeter longitude hors bornes', () => {
    expect(validateCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
  });

  it('82. devrait rejeter null', () => {
    expect(validateCoordinates(null)).toBe(false);
  });
});

describe('sanitizeNotes', () => {
  it('83. devrait retourner null pour vide', () => {
    expect(sanitizeNotes('')).toBeNull();
    expect(sanitizeNotes(undefined)).toBeNull();
    expect(sanitizeNotes('   ')).toBeNull();
  });

  it('84. devrait supprimer < et >', () => {
    expect(sanitizeNotes('<script>alert(1)</script>')).not.toContain('<');
    expect(sanitizeNotes('<script>alert(1)</script>')).not.toContain('>');
  });

  it('85. devrait tronquer à 1000 caractères', () => {
    const long = 'A'.repeat(2000);
    expect(sanitizeNotes(long)!.length).toBe(1000);
  });
});

describe('sanitizePromoCode', () => {
  it('86. devrait retourner null pour vide ou "none"', () => {
    expect(sanitizePromoCode('')).toBeNull();
    expect(sanitizePromoCode('none')).toBeNull();
    expect(sanitizePromoCode(undefined)).toBeNull();
  });

  it('87. devrait mettre en majuscules', () => {
    expect(sanitizePromoCode('summer2024')).toBe('SUMMER2024');
  });

  it('88. devrait rejeter les caractères spéciaux', () => {
    expect(sanitizePromoCode('CODE@#$%')).toBeNull();
  });

  it('89. devrait accepter tirets et underscores', () => {
    expect(sanitizePromoCode('VIP-2024_PROMO')).toBe('VIP-2024_PROMO');
  });
});

describe('safeCourseValidation', () => {
  it('90. devrait retourner success false pour données invalides', () => {
    const result = safeCourseValidation({});
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('91. devrait retourner success true pour données complètes', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const result = safeCourseValidation({
      pickupAddress: '10 rue de Paris, 75001 Paris',
      pickupCoordinates: { latitude: 48.86, longitude: 2.35 },
      destinationAddress: '20 avenue des Champs-Élysées, 75008 Paris',
      destinationCoordinates: { latitude: 48.87, longitude: 2.30 },
      scheduledDate: futureDate,
      passengersCount: 2,
      distanceKm: 5,
      durationMinutes: 15,
    });
    expect(result.success).toBe(true);
  });
});
