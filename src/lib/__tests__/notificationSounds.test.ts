/**
 * TESTS - Notification Sounds (8 tests)
 */
import { describe, it, expect } from 'vitest';
import { getSoundCategory } from '../notificationSounds';

describe('getSoundCategory', () => {
  it('58. devrait retourner silent pour annulation', () => {
    expect(getSoundCategory('cancellation')).toBe('silent');
    expect(getSoundCategory('cancelled')).toBe('silent');
  });

  it('59. devrait retourner silent pour titre avec "annul"', () => {
    expect(getSoundCategory(undefined, 'Course annulée')).toBe('silent');
  });

  it('60. devrait retourner ride pour ride_request', () => {
    expect(getSoundCategory('ride_request')).toBe('ride');
    expect(getSoundCategory('new_course')).toBe('ride');
  });

  it('61. devrait retourner ride pour titre "Nouvelle course"', () => {
    expect(getSoundCategory(undefined, 'Nouvelle course reçue')).toBe('ride');
  });

  it('62. devrait retourner info par défaut', () => {
    expect(getSoundCategory('payment_received')).toBe('info');
    expect(getSoundCategory('message')).toBe('info');
  });

  it('63. devrait gérer undefined/empty', () => {
    expect(getSoundCategory(undefined, undefined)).toBe('info');
    expect(getSoundCategory('', '')).toBe('info');
  });

  it('64. silent devrait primer sur ride pour "Course annulée"', () => {
    // Title matches silent pattern
    expect(getSoundCategory('ride_request', 'Course annulée')).toBe('silent');
  });

  it('65. devrait retourner silent pour expirations', () => {
    expect(getSoundCategory(undefined, 'Demande expirée')).toBe('silent');
  });
});
