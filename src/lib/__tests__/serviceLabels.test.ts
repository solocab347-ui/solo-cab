/**
 * TESTS - Service Labels (5 tests)
 */
import { describe, it, expect } from 'vitest';
import { getServiceLabel, getServiceIcon, serviceLabels } from '../serviceLabels';

describe('getServiceLabel', () => {
  it('66. devrait retourner le label connu', () => {
    expect(getServiceLabel('airport_transfer')).toBe('Transferts aéroport');
    expect(getServiceLabel('wedding')).toBe('Mariage');
  });

  it('67. devrait formatter les services inconnus', () => {
    expect(getServiceLabel('custom_service')).toBe('Custom Service');
  });
});

describe('getServiceIcon', () => {
  it('68. devrait retourner l\'icône connue', () => {
    expect(getServiceIcon('airport_transfer')).toBe('✈️');
    expect(getServiceIcon('medical')).toBe('🏥');
  });

  it('69. devrait retourner 🚗 par défaut', () => {
    expect(getServiceIcon('unknown_service')).toBe('🚗');
  });

  it('70. tous les services connus doivent avoir une icône', () => {
    Object.keys(serviceLabels).forEach(key => {
      const icon = getServiceIcon(key);
      expect(icon).toBeTruthy();
    });
  });
});
