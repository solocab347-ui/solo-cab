/**
 * TESTS - Courses Filter Utils (9 tests)
 */
import { describe, it, expect } from 'vitest';
import {
  sortByDate,
  sortConfirmedWithInProgressFirst,
  getClientDisplayName,
  getClientPhone,
  getLatestDevis,
} from '../coursesFilterUtils';

const makeCourse = (date: string, status = 'accepted', overrides = {}) => ({
  id: Math.random().toString(),
  scheduled_date: date,
  status,
  ...overrides,
});

describe('sortByDate', () => {
  it('92. devrait trier du plus récent au plus ancien', () => {
    const courses = [
      makeCourse('2024-01-01'),
      makeCourse('2024-06-15'),
      makeCourse('2024-03-10'),
    ];
    const sorted = sortByDate(courses);
    expect(new Date(sorted[0].scheduled_date).getTime()).toBeGreaterThan(new Date(sorted[1].scheduled_date).getTime());
  });
});

describe('sortConfirmedWithInProgressFirst', () => {
  it('93. devrait mettre in_progress en premier', () => {
    const courses = [
      makeCourse('2024-06-15', 'accepted'),
      makeCourse('2024-01-01', 'in_progress'),
      makeCourse('2024-03-10', 'accepted'),
    ];
    const sorted = sortConfirmedWithInProgressFirst(courses);
    expect(sorted[0].status).toBe('in_progress');
  });

  it('94. devrait trier par date au sein du même statut', () => {
    const courses = [
      makeCourse('2024-01-01', 'accepted'),
      makeCourse('2024-06-15', 'accepted'),
    ];
    const sorted = sortConfirmedWithInProgressFirst(courses);
    expect(new Date(sorted[0].scheduled_date).getTime()).toBeGreaterThan(new Date(sorted[1].scheduled_date).getTime());
  });
});

describe('getClientDisplayName', () => {
  it('95. devrait retourner le nom du profil client', () => {
    const course = { clients: { profiles: { full_name: 'Jean Dupont' } } };
    expect(getClientDisplayName(course)).toBe('Jean Dupont');
  });

  it('96. devrait retourner guest_name pour invité', () => {
    const course = { is_guest_booking: true, guest_name: 'Marie' };
    expect(getClientDisplayName(course)).toBe('Marie');
  });

  it('97. devrait retourner "Client invité" par défaut', () => {
    const course = { is_guest_booking: true };
    expect(getClientDisplayName(course)).toBe('Client invité');
  });

  it('98. devrait prioriser le nom employé entreprise', () => {
    const course = { clients: { profiles: { full_name: 'Jean' } } };
    expect(getClientDisplayName(course, { employeeName: 'Pierre Corporate' })).toBe('Pierre Corporate');
  });
});

describe('getLatestDevis', () => {
  it('99. devrait retourner le devis accepté en priorité', () => {
    const course = {
      devis: [
        { status: 'pending', created_at: '2024-06-15', amount: 50 },
        { status: 'accepted', created_at: '2024-06-10', amount: 45 },
      ],
    };
    expect(getLatestDevis(course).status).toBe('accepted');
  });

  it('100. devrait retourner null sans devis', () => {
    expect(getLatestDevis({ devis: [] })).toBeNull();
    expect(getLatestDevis({})).toBeNull();
  });
});
