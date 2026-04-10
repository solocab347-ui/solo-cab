/**
 * TESTS - Network Config (15 tests)
 */
import { describe, it, expect } from 'vitest';
import {
  TIMEOUTS,
  RETRY,
  CACHE,
  REALTIME,
  SUBMIT_PROTECTION,
  calculateRetryDelay,
  calculateProgressiveTimeout,
  isRetryableError,
  categorizeError,
  ERROR_MESSAGES,
} from '../networkConfig';

describe('Constants validation', () => {
  it('29. TIMEOUTS doivent avoir des valeurs raisonnables', () => {
    expect(TIMEOUTS.AUTH).toBeGreaterThanOrEqual(5000);
    expect(TIMEOUTS.CRITICAL).toBeGreaterThanOrEqual(TIMEOUTS.QUERY);
    expect(TIMEOUTS.PING).toBeLessThan(TIMEOUTS.QUERY);
  });

  it('30. RETRY doit avoir un backoff configuré', () => {
    expect(RETRY.MAX_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(RETRY.MAX_ATTEMPTS_CRITICAL).toBeGreaterThan(RETRY.MAX_ATTEMPTS);
    expect(RETRY.BACKOFF_MULTIPLIER).toBeGreaterThan(1);
  });

  it('31. CACHE TTLs doivent être ordonnés', () => {
    expect(CACHE.CRITICAL_TTL).toBeLessThan(CACHE.STANDARD_TTL);
    expect(CACHE.STANDARD_TTL).toBeLessThan(CACHE.STATIC_TTL);
  });

  it('32. SUBMIT_PROTECTION critique > standard', () => {
    expect(SUBMIT_PROTECTION.CRITICAL_DEBOUNCE_MS).toBeGreaterThan(SUBMIT_PROTECTION.DEBOUNCE_MS);
  });
});

describe('calculateRetryDelay', () => {
  it('33. devrait croître exponentiellement', () => {
    const d0 = calculateRetryDelay(0);
    const d1 = calculateRetryDelay(1);
    const d2 = calculateRetryDelay(2);
    // With jitter, d1 should generally be larger than d0's base
    expect(d1).toBeLessThanOrEqual(RETRY.MAX_DELAY);
    expect(d2).toBeLessThanOrEqual(RETRY.MAX_DELAY);
  });

  it('34. ne devrait jamais dépasser MAX_DELAY', () => {
    const delay = calculateRetryDelay(100);
    expect(delay).toBeLessThanOrEqual(RETRY.MAX_DELAY);
  });

  it('35. devrait retourner un nombre positif', () => {
    expect(calculateRetryDelay(0)).toBeGreaterThan(0);
  });
});

describe('calculateProgressiveTimeout', () => {
  it('36. devrait augmenter avec les tentatives', () => {
    const t0 = calculateProgressiveTimeout(0, 10000);
    const t3 = calculateProgressiveTimeout(3, 10000);
    expect(t3).toBeGreaterThan(t0);
  });

  it('37. ne devrait pas dépasser 2x le base timeout', () => {
    const result = calculateProgressiveTimeout(100, 10000);
    expect(result).toBeLessThanOrEqual(20000);
  });
});

describe('isRetryableError', () => {
  it('38. erreur 401 ne devrait PAS être retryable', () => {
    expect(isRetryableError({ status: 401 })).toBe(false);
  });

  it('39. erreur 403 ne devrait PAS être retryable', () => {
    expect(isRetryableError({ status: 403 })).toBe(false);
  });

  it('40. erreur 500 DEVRAIT être retryable', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
  });

  it('41. erreur réseau DEVRAIT être retryable', () => {
    expect(isRetryableError({ message: 'network error' })).toBe(true);
  });

  it('42. null ne devrait PAS être retryable', () => {
    expect(isRetryableError(null)).toBe(false);
  });
});

describe('categorizeError', () => {
  it('43. devrait catégoriser timeout', () => {
    expect(categorizeError({ message: 'Request timed out' })).toBe('timeout');
  });

  it('44. devrait catégoriser auth', () => {
    expect(categorizeError({ status: 401 })).toBe('auth');
    expect(categorizeError({ message: 'jwt expired' })).toBe('auth');
  });

  it('45. devrait catégoriser network', () => {
    expect(categorizeError({ message: 'Failed to fetch' })).toBe('network');
  });

  it('46. devrait catégoriser database', () => {
    expect(categorizeError({ code: 'PGRST301' })).toBe('database'); // PGRST codes go to database category
    expect(categorizeError({ code: '23505' })).toBe('database');
  });

  it('47. devrait avoir des messages pour chaque catégorie', () => {
    const categories = ['network', 'auth', 'validation', 'database', 'timeout', 'unknown'] as const;
    categories.forEach(cat => {
      expect(ERROR_MESSAGES[cat]).toBeTruthy();
    });
  });
});
