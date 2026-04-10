/**
 * TESTS - Address Privacy (8 tests)
 */
import { describe, it, expect } from 'vitest';
import { extractCityDepartment, getDepartmentName } from '../addressPrivacy';

describe('extractCityDepartment', () => {
  it('71. devrait extraire ville et département', () => {
    const result = extractCityDepartment('10 rue de la Paix, 75002 Paris, France');
    expect(result).toContain('Paris');
    expect(result).toContain('75');
  });

  it('72. devrait gérer les DOM-TOM', () => {
    const result = extractCityDepartment('5 rue Machin, 97100 Basse-Terre');
    expect(result).toContain('Basse-Terre');
  });

  it('73. devrait retourner null pour null/undefined', () => {
    expect(extractCityDepartment(null)).toBeNull();
    expect(extractCityDepartment(undefined)).toBeNull();
  });

  it('74. devrait gérer les adresses sans code postal', () => {
    const result = extractCityDepartment('Aéroport Charles de Gaulle, Roissy, France');
    expect(result).toBeTruthy();
  });

  it('75. ne devrait pas retourner France', () => {
    const result = extractCityDepartment('Paris, France');
    expect(result).not.toBe('France');
  });
});

describe('getDepartmentName', () => {
  it('76. devrait retourner Paris pour 75', () => {
    expect(getDepartmentName('75')).toBe('Paris');
  });

  it('77. devrait retourner Bouches-du-Rhône pour 13', () => {
    expect(getDepartmentName('13')).toBe('Bouches-du-Rhône');
  });

  it('78. devrait retourner null pour code inconnu', () => {
    expect(getDepartmentName('99')).toBeNull();
  });
});
