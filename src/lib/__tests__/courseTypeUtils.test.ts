/**
 * TESTS - Course Type Utils (10 tests)
 */
import { describe, it, expect } from 'vitest';
import { getCourseType, getCourseTypeFilters, COURSE_TYPE_CONFIG } from '../courseTypeUtils';

describe('getCourseType', () => {
  const driverId = 'driver-1';

  it('48. devrait retourner personal par défaut', () => {
    const result = getCourseType({ id: 'c1' }, driverId);
    expect(result.type).toBe('personal');
  });

  it('49. devrait détecter une course partenaire reçue', () => {
    const course = {
      id: 'c1',
      shared_courses: [{
        sender_driver_id: 'other-driver',
        receiver_driver_id: driverId,
        sender_driver: { profiles: { full_name: 'Jean' } },
        receiver_driver: { profiles: { full_name: 'Pierre' } },
      }],
    };
    const result = getCourseType(course, driverId);
    expect(result.type).toBe('partner');
    expect(result.partnerType).toBe('Reçue');
  });

  it('50. devrait détecter une course partenaire envoyée', () => {
    const course = {
      id: 'c1',
      shared_courses: [{
        sender_driver_id: driverId,
        receiver_driver_id: 'other-driver',
        sender_driver: { profiles: { full_name: 'Pierre' } },
        receiver_driver: { profiles: { full_name: 'Jean' } },
      }],
    };
    const result = getCourseType(course, driverId);
    expect(result.type).toBe('partner');
    expect(result.partnerType).toBe('Envoyée');
  });

  it('51. devrait détecter une course entreprise', () => {
    const course = {
      id: 'c1',
      company_courses: [{ company_id: 'comp1', company: { company_name: 'Acme Corp' } }],
    };
    const result = getCourseType(course, driverId);
    expect(result.type).toBe('company');
    expect(result.partnerName).toBe('Acme Corp');
  });

  it('52. devrait détecter une course flotte', () => {
    const course = {
      id: 'c1',
      fleet_course_info: { fleet_manager_id: 'fm-1', fleet_name: 'Ma Flotte' },
    };
    const result = getCourseType(course, driverId);
    expect(result.type).toBe('fleet');
  });

  it('53. course partenaire devrait primer sur personal', () => {
    const course = {
      id: 'c1',
      shared_courses: [{
        sender_driver_id: 'other',
        receiver_driver_id: driverId,
        sender_driver: { profiles: { full_name: 'X' } },
        receiver_driver: { profiles: { full_name: 'Y' } },
      }],
    };
    expect(getCourseType(course, driverId).type).toBe('partner');
  });
});

describe('getCourseTypeFilters', () => {
  it('54. devrait inclure "all" et les 4 types', () => {
    const filters = getCourseTypeFilters();
    expect(filters).toHaveLength(5);
    expect(filters[0].value).toBe('all');
  });
});

describe('COURSE_TYPE_CONFIG', () => {
  it('55. chaque type devrait avoir label, icon, et color', () => {
    for (const [, config] of Object.entries(COURSE_TYPE_CONFIG)) {
      expect(config.label).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.color).toBeTruthy();
    }
  });

  it('56. personal devrait utiliser les tokens primary', () => {
    expect(COURSE_TYPE_CONFIG.personal.color).toContain('primary');
  });

  it('57. les 4 types doivent être définis', () => {
    expect(Object.keys(COURSE_TYPE_CONFIG)).toEqual(['personal', 'partner', 'company', 'fleet']);
  });
});
