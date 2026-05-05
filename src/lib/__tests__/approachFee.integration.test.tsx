/**
 * Tests d'intégration — Prix d'approche
 *
 * Couvre :
 *  1. Cohérence Stripe : le hold/charge envoyé doit refléter le total TTC
 *     (course + approche), arrondi au centime, exprimé en cents entiers.
 *  2. Cohérence facture : chaque ligne (course, surcharges, approche) sommée
 *     redonne exactement le total estimated_price.
 *  3. Chaîne de recherche : useNearbyDrivers déclenche calculate-mapbox-route
 *     uniquement quand approach_enabled + immediate, et propage la distance
 *     vers calculate_course_price.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { computeApproachFee } from '@/lib/approachFee';

// ──────────────────────────────────────────────────────────────────
// Mock supabase client (RPC + functions.invoke)
// ──────────────────────────────────────────────────────────────────
const rpcMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}));

// Bypass the in-memory cache so each call reaches the mocked RPC
vi.mock('@/lib/nearbyDriversCache', () => ({
  getCachedNearbyDrivers: async (_p: any, fn: any) => fn(),
}));

// Import AFTER mocks
import { useNearbyDrivers } from '@/hooks/useNearbyDrivers';

beforeEach(() => {
  rpcMock.mockReset();
  invokeMock.mockReset();
});

// ════════════════════════════════════════════════════════════════════
// 1. Stripe — montant total avec approche (cents arrondis)
// ════════════════════════════════════════════════════════════════════
describe('Stripe — montant total TTC avec prix d\'approche', () => {
  /** Reproduit la logique de create-card-hold : Math.round(eurosTTC * 100) */
  const toStripeCents = (eurosTTC: number) => Math.round(eurosTTC * 100);

  it('inclut le frais d\'approche dans le hold envoyé à Stripe', () => {
    const baseFare = 12.5;
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 0.5, approachDistanceKm: 5, isImmediate: true,
    });
    const totalTTC = Math.round((baseFare + approach.fee) * 100) / 100;

    expect(approach.fee).toBe(2.5);
    expect(totalTTC).toBe(15);
    expect(toStripeCents(totalTTC)).toBe(1500); // cents entiers
  });

  it('arrondit correctement un total non rond (0,005 → cent supérieur)', () => {
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 0.33, approachDistanceKm: 7.77, isImmediate: true,
    });
    // 7.77 × 0.33 = 2.5641 → arrondi 2.56 €
    expect(approach.fee).toBe(2.56);
    const totalTTC = Math.round((9.99 + approach.fee) * 100) / 100;
    expect(toStripeCents(totalTTC)).toBe(1255); // 12.55 €
  });

  it('n\'ajoute jamais d\'approche si réservation (mode non immédiat)', () => {
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 1, approachDistanceKm: 10, isImmediate: false,
    });
    expect(approach.fee).toBe(0);
    expect(toStripeCents(20 + approach.fee)).toBe(2000);
  });

  it('respecte le plafond 1€/km côté Stripe (anti-fraude)', () => {
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 99, approachDistanceKm: 4, isImmediate: true,
    });
    expect(approach.ratePerKm).toBe(1);
    expect(approach.fee).toBe(4);
    expect(toStripeCents(15 + approach.fee)).toBe(1900);
  });

  it('n\'envoie jamais de cents fractionnaires à Stripe', () => {
    const samples = [
      computeApproachFee({ enabled: true, ratePerKm: 0.37, approachDistanceKm: 3.14, isImmediate: true }),
      computeApproachFee({ enabled: true, ratePerKm: 0.91, approachDistanceKm: 8.88, isImmediate: true }),
      computeApproachFee({ enabled: true, ratePerKm: 0.05, approachDistanceKm: 2.51, isImmediate: true }),
    ];
    for (const a of samples) {
      const cents = toStripeCents(10 + a.fee);
      expect(Number.isInteger(cents)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════
// 2. Cohérence facture : décomposition === total
// ════════════════════════════════════════════════════════════════════
describe('Facture — cohérence des lignes', () => {
  it('somme(base + surcharges + approche) === total facturé', () => {
    const base = 18.4;
    const surchargeEvening = 2.0;
    const surchargeWeekend = 0;
    const airportFee = 3.5;
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 0.6, approachDistanceKm: 4.2, isImmediate: true,
    });
    const total =
      Math.round((base + surchargeEvening + surchargeWeekend + airportFee + approach.fee) * 100) / 100;

    expect(approach.fee).toBe(2.52); // 4.2 × 0.6
    expect(total).toBe(26.42);
  });

  it('aucune ligne approche si fee=0 → cohérence préservée', () => {
    const approach = computeApproachFee({
      enabled: true, ratePerKm: 0.5, approachDistanceKm: 1.5, isImmediate: true, // < 2 km
    });
    expect(approach.applies).toBe(false);
    const total = Math.round((25.0 + approach.fee) * 100) / 100;
    expect(total).toBe(25.0);
  });
});

// ════════════════════════════════════════════════════════════════════
// 3. E2E recherche — calculate-mapbox-route + RPC pricing
// ════════════════════════════════════════════════════════════════════
describe('useNearbyDrivers — intégration Mapbox approche', () => {
  const baseDriver = {
    driver_id: 'drv-1',
    company_name: 'Test',
    display_name: 'D',
    profile_photo_url: null,
    base_fare: 5,
    per_km_rate: 1.5,
    minimum_price: 8,
    distance_meters: 4500,
    search_radius_used: 5,
    latitude: 48.85,
    longitude: 2.35,
    is_live_location: true,
    accepted_payment_methods: ['card', 'cash'],
    stripe_connect_charges_enabled: true,
    approach_enabled: true,
    approach_per_km_rate: 0.5,
  };

  it('appelle calculate-mapbox-route en mode immédiat pour chaque chauffeur éligible', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [baseDriver], error: null }) // find_nearby_drivers
      .mockResolvedValue({
        data: [{ total_price: 17.5, approach_fee: 2.5, surcharge_evening: 0, surcharge_weekend: 0, airport_fee: 0 }],
        error: null,
      }); // calculate_course_price

    invokeMock.mockResolvedValue({
      data: { success: true, distance_km: 5, duration_minutes: 8 },
      error: null,
    });

    const { result } = renderHook(() => useNearbyDrivers());
    await act(async () => {
      await result.current.searchNearbyDrivers(
        48.86, 2.34, 10, 15, undefined, 'A', 'B', 20, 'immediate'
      );
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'calculate-mapbox-route',
        expect.objectContaining({
          body: expect.objectContaining({
            pickup_latitude: 48.85,
            pickup_longitude: 2.35,
            destination_latitude: 48.86,
            destination_longitude: 2.34,
          }),
        })
      );
    });

    await waitFor(() => {
      const driver = result.current.drivers[0];
      expect(driver.approach_distance_km).toBe(5);
      expect(driver.approach_fee).toBe(2.5);
      expect(driver.estimated_price).toBe(17.5);
      expect(driver.has_surcharge).toBe(true);
    });
  });

  it('NE PAS appeler Mapbox si approach_enabled=false', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [{ ...baseDriver, approach_enabled: false }], error: null })
      .mockResolvedValue({
        data: [{ total_price: 15, approach_fee: 0, surcharge_evening: 0, surcharge_weekend: 0, airport_fee: 0 }],
        error: null,
      });

    const { result } = renderHook(() => useNearbyDrivers());
    await act(async () => {
      await result.current.searchNearbyDrivers(
        48.86, 2.34, 10, 15, undefined, 'A', 'B', 20, 'immediate'
      );
    });

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('NE PAS appeler Mapbox en mode réservation (même si approach activé)', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [baseDriver], error: null })
      .mockResolvedValue({
        data: [{ total_price: 15, approach_fee: 0, surcharge_evening: 0, surcharge_weekend: 0, airport_fee: 0 }],
        error: null,
      });

    const { result } = renderHook(() => useNearbyDrivers());
    await act(async () => {
      await result.current.searchNearbyDrivers(
        48.86, 2.34, 10, 15, new Date('2030-01-01'), 'A', 'B', 20, 'reservation'
      );
    });

    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('propage la distance Mapbox au RPC calculate_course_price', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [baseDriver], error: null })
      .mockResolvedValue({
        data: [{ total_price: 13, approach_fee: 1.5, surcharge_evening: 0, surcharge_weekend: 0, airport_fee: 0 }],
        error: null,
      });
    invokeMock.mockResolvedValue({
      data: { success: true, distance_km: 3, duration_minutes: 6 },
      error: null,
    });

    const { result } = renderHook(() => useNearbyDrivers());
    await act(async () => {
      await result.current.searchNearbyDrivers(
        48.86, 2.34, 10, 15, undefined, 'A', 'B', 20, 'immediate'
      );
    });

    await waitFor(() => {
      const priceCall = rpcMock.mock.calls.find(c => c[0] === 'calculate_course_price');
      expect(priceCall).toBeDefined();
      expect(priceCall![1]).toMatchObject({
        _driver_id: 'drv-1',
        _approach_distance_km: 3,
        _is_immediate: true,
      });
    });
  });

  it('si Mapbox échoue, le hook reste fonctionnel (approche=null, pas de crash)', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [baseDriver], error: null })
      .mockResolvedValue({
        data: [{ total_price: 15, approach_fee: 0, surcharge_evening: 0, surcharge_weekend: 0, airport_fee: 0 }],
        error: null,
      });
    invokeMock.mockResolvedValue({ data: null, error: { message: 'mapbox down' } });

    const { result } = renderHook(() => useNearbyDrivers());
    await act(async () => {
      await result.current.searchNearbyDrivers(
        48.86, 2.34, 10, 15, undefined, 'A', 'B', 20, 'immediate'
      );
    });

    await waitFor(() => {
      const priceCall = rpcMock.mock.calls.find(c => c[0] === 'calculate_course_price');
      expect(priceCall).toBeDefined();
      expect(priceCall![1]._approach_distance_km).toBeNull();
    });
    expect(result.current.error).toBeNull();
  });
});
