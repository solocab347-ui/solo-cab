/**
 * TESTS - Input Sanitizer (20 tests)
 */
import { describe, it, expect, vi } from 'vitest';

// Mock productionLogger
vi.mock('../productionLogger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeAddress,
  sanitizeAmount,
  sanitizeInteger,
  sanitizeUrl,
  sanitizeFileName,
  sanitizeObject,
  sanitizeCourseData,
  sanitizeDriverProfile,
} from '../inputSanitizer';

describe('sanitizeString', () => {
  it('1. devrait retourner une chaîne vide pour null/undefined', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });

  it('2. devrait supprimer les balises script', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).not.toContain('script');
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toContain('Hello');
  });

  it('3. devrait supprimer les balises HTML', () => {
    const result = sanitizeString('<div><b>Bold</b></div>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('4. devrait échapper les caractères spéciaux', () => {
    const result = sanitizeString('test & "quotes"');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
  });

  it('5. devrait supprimer les caractères de contrôle', () => {
    const result = sanitizeString('hello\x00world\x1F');
    expect(result).toBe('helloworld');
  });
});

describe('sanitizeEmail', () => {
  it('6. devrait accepter un email valide', () => {
    expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
  });

  it('7. devrait rejeter un email invalide', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
    expect(sanitizeEmail('missing@')).toBe('');
  });

  it('8. devrait gérer null/undefined', () => {
    expect(sanitizeEmail(null)).toBe('');
    expect(sanitizeEmail(undefined)).toBe('');
  });
});

describe('sanitizePhone', () => {
  it('9. devrait accepter un numéro valide', () => {
    expect(sanitizePhone('+33 6 12 34 56 78')).toBe('+33 6 12 34 56 78');
  });

  it('10. devrait retirer les caractères non-numériques', () => {
    const result = sanitizePhone('+33 6 12-34.56.78 abc');
    expect(result).not.toContain('abc');
    expect(result).not.toContain('.');
  });

  it('11. devrait rejeter les numéros trop courts', () => {
    expect(sanitizePhone('123')).toBe('');
  });
});

describe('sanitizeAmount', () => {
  it('12. devrait arrondir à 2 décimales', () => {
    expect(sanitizeAmount(10.555)).toBe(10.56);
    expect(sanitizeAmount(10.554)).toBe(10.55);
  });

  it('13. devrait rejeter les montants négatifs', () => {
    expect(sanitizeAmount(-50)).toBe(0);
  });

  it('14. devrait parser les strings numériques', () => {
    expect(sanitizeAmount('25.50')).toBe(25.50);
  });

  it('15. devrait retourner 0 pour NaN', () => {
    expect(sanitizeAmount('abc')).toBe(0);
    expect(sanitizeAmount(null)).toBe(0);
  });
});

describe('sanitizeInteger', () => {
  it('16. devrait clamper entre min et max', () => {
    expect(sanitizeInteger(5, 1, 10)).toBe(5);
    expect(sanitizeInteger(15, 1, 10)).toBe(10);
    expect(sanitizeInteger(-5, 1, 10)).toBe(1);
  });

  it('17. devrait arrondir vers le bas', () => {
    expect(sanitizeInteger(5.9, 0, 10)).toBe(5);
  });
});

describe('sanitizeUrl', () => {
  it('18. devrait rejeter les protocoles non-http', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('ftp://server.com')).toBe('');
  });
});

describe('sanitizeFileName', () => {
  it('19. devrait nettoyer les caractères dangereux', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('/');
    expect(sanitizeFileName('file<script>.txt')).toBe('file_script_.txt');
  });
});

describe('sanitizeCourseData', () => {
  it('20. devrait sanitizer toutes les propriétés', () => {
    const result = sanitizeCourseData({
      pickupAddress: '<script>alert(1)</script>10 rue de Paris',
      passengersCount: 25,
      notes: 'A'.repeat(2000),
    });
    expect(result.pickupAddress).not.toContain('script');
    expect(result.passengersCount).toBe(20); // max clamp
    expect(result.notes.length).toBeLessThanOrEqual(1000);
  });
});
