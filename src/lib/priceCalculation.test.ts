/**
 * TESTS UNITAIRES POUR LES CALCULS DE PRIX ET TVA
 * Garantir la fiabilité du cœur de métier SoloCab
 */

import { describe, it, expect } from 'vitest';

// Types pour les calculs
interface DriverPricing {
  base_fare: number;
  per_km_rate: number;
  hourly_rate: number;
  tva_rate: number;
  tva_included: boolean;
  evening_surcharge: number;
  weekend_surcharge: number;
}

interface PriceCalculationResult {
  base_price: number;
  distance_price: number;
  time_price: number;
  subtotal: number;
  tva_amount: number;
  total_price: number;
  surcharge_evening?: number;
  surcharge_weekend?: number;
}

/**
 * Calcul de prix pour course classique (au kilomètre)
 */
function calculateDistancePrice(
  distanceKm: number,
  driver: DriverPricing,
  scheduledDate?: Date
): PriceCalculationResult {
  const baseFare = driver.base_fare;
  const perKmRate = driver.per_km_rate;
  const tvaRate = 10; // TVA 10% pour facturation au km

  let subtotal: number;
  let base_price: number;
  let distance_price: number;

  if (driver.tva_included) {
    // TVA comprise : calculer HT puis recalculer TTC
    const baseFareHT = baseFare / (1 + tvaRate / 100);
    const perKmRateHT = perKmRate / (1 + tvaRate / 100);
    const subtotalHT = baseFareHT + distanceKm * perKmRateHT;
    
    base_price = baseFareHT;
    distance_price = distanceKm * perKmRateHT;
    subtotal = subtotalHT;
  } else {
    // TVA non comprise : ajouter TVA au subtotal
    base_price = baseFare;
    distance_price = distanceKm * perKmRate;
    subtotal = base_price + distance_price;
  }

  // Calculer augmentations soirée/weekend
  let surcharge_evening = 0;
  let surcharge_weekend = 0;

  if (scheduledDate) {
    const hour = scheduledDate.getHours();
    const dayOfWeek = scheduledDate.getDay();

    // Soirée: 20h-6h
    if (hour >= 20 || hour < 6) {
      surcharge_evening = subtotal * (driver.evening_surcharge / 100);
      subtotal += surcharge_evening;
    }

    // Weekend: samedi (6) ou dimanche (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      surcharge_weekend = subtotal * (driver.weekend_surcharge / 100);
      subtotal += surcharge_weekend;
    }
  }

  const tva_amount = subtotal * (tvaRate / 100);
  const total_price = subtotal + tva_amount;

  return {
    base_price,
    distance_price,
    time_price: 0,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend,
  };
}

/**
 * Calcul de prix pour mise à disposition (horaire)
 */
function calculateHourlyPrice(
  durationHours: number,
  driver: DriverPricing,
  scheduledDate?: Date
): PriceCalculationResult {
  const hourlyRate = driver.hourly_rate;
  const tvaRate = 20; // TVA 20% pour mise à disposition

  let subtotal: number;
  let time_price: number;

  if (driver.tva_included) {
    // TVA comprise : calculer HT puis recalculer TTC
    const timeHT = (durationHours * hourlyRate) / (1 + tvaRate / 100);
    time_price = timeHT;
    subtotal = timeHT;
  } else {
    // TVA non comprise : ajouter TVA au subtotal
    time_price = durationHours * hourlyRate;
    subtotal = time_price;
  }

  // Calculer augmentations soirée/weekend
  let surcharge_evening = 0;
  let surcharge_weekend = 0;

  if (scheduledDate) {
    const hour = scheduledDate.getHours();
    const dayOfWeek = scheduledDate.getDay();

    if (hour >= 20 || hour < 6) {
      surcharge_evening = subtotal * (driver.evening_surcharge / 100);
      subtotal += surcharge_evening;
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      surcharge_weekend = subtotal * (driver.weekend_surcharge / 100);
      subtotal += surcharge_weekend;
    }
  }

  const tva_amount = subtotal * (tvaRate / 100);
  const total_price = subtotal + tva_amount;

  return {
    base_price: 0,
    distance_price: 0,
    time_price,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend,
  };
}

// ============= TESTS =============

describe('Calculs de prix - Course au kilomètre', () => {
  const driver: DriverPricing = {
    base_fare: 10,
    per_km_rate: 2,
    hourly_rate: 40,
    tva_rate: 10,
    tva_included: false,
    evening_surcharge: 0,
    weekend_surcharge: 0,
  };

  it('devrait calculer correctement avec TVA NON comprise', () => {
    const result = calculateDistancePrice(15, driver);

    expect(result.base_price).toBe(10);
    expect(result.distance_price).toBe(30); // 15km * 2€
    expect(result.subtotal).toBe(40); // 10 + 30
    expect(result.tva_amount).toBe(4); // 40 * 10%
    expect(result.total_price).toBe(44); // 40 + 4
  });

  it('devrait calculer correctement avec TVA comprise', () => {
    const driverTVAIncluded = { ...driver, tva_included: true };
    const result = calculateDistancePrice(15, driverTVAIncluded);

    const baseFareHT = 10 / 1.1; // 9.09
    const perKmRateHT = 2 / 1.1; // 1.82
    const subtotalHT = baseFareHT + 15 * perKmRateHT; // 36.36

    expect(result.subtotal).toBeCloseTo(36.36, 2);
    expect(result.tva_amount).toBeCloseTo(3.64, 2);
    expect(result.total_price).toBeCloseTo(40, 2); // Doit revenir au prix TTC original
  });

  it('devrait appliquer augmentation soirée (20h-6h)', () => {
    const driverWithSurcharge = { ...driver, evening_surcharge: 20 };
    const eveningDate = new Date('2024-01-15T22:00:00'); // 22h

    const result = calculateDistancePrice(15, driverWithSurcharge, eveningDate);

    expect(result.subtotal).toBe(48); // 40 + 20%
    expect(result.surcharge_evening).toBe(8);
    expect(result.tva_amount).toBeCloseTo(4.8, 10); // 48 * 10%
    expect(result.total_price).toBeCloseTo(52.8, 10);
  });

  it('devrait appliquer augmentation weekend', () => {
    const driverWithSurcharge = { ...driver, weekend_surcharge: 15 };
    const saturdayDate = new Date('2024-01-13T14:00:00'); // Samedi

    const result = calculateDistancePrice(15, driverWithSurcharge, saturdayDate);

    expect(result.subtotal).toBe(46); // 40 + 15%
    expect(result.surcharge_weekend).toBe(6);
    expect(result.total_price).toBe(50.6);
  });

  it('devrait cumuler augmentations soirée ET weekend', () => {
    const driverWithBoth = { 
      ...driver, 
      evening_surcharge: 20, 
      weekend_surcharge: 15 
    };
    const saturdayEvening = new Date('2024-01-13T21:00:00'); // Samedi soir

    const result = calculateDistancePrice(15, driverWithBoth, saturdayEvening);

    // Subtotal: 40
    // + Evening 20%: 48
    // + Weekend 15% (appliqué sur 48): 55.2
    expect(result.subtotal).toBe(55.2);
    expect(result.surcharge_evening).toBe(8);
    expect(result.surcharge_weekend).toBeCloseTo(7.2, 2);
  });
});

describe('Calculs de prix - Mise à disposition (horaire)', () => {
  const driver: DriverPricing = {
    base_fare: 10,
    per_km_rate: 2,
    hourly_rate: 40,
    tva_rate: 20,
    tva_included: false,
    evening_surcharge: 0,
    weekend_surcharge: 0,
  };

  it('devrait calculer correctement avec TVA NON comprise', () => {
    const result = calculateHourlyPrice(3, driver);

    expect(result.time_price).toBe(120); // 3h * 40€
    expect(result.subtotal).toBe(120);
    expect(result.tva_amount).toBe(24); // 120 * 20%
    expect(result.total_price).toBe(144);
    expect(result.base_price).toBe(0);
    expect(result.distance_price).toBe(0);
  });

  it('devrait calculer correctement avec TVA comprise', () => {
    const driverTVAIncluded = { ...driver, tva_included: true };
    const result = calculateHourlyPrice(3, driverTVAIncluded);

    const timeHT = 120 / 1.2; // 100

    expect(result.subtotal).toBe(100);
    expect(result.tva_amount).toBe(20);
    expect(result.total_price).toBe(120); // Revient au prix TTC original
  });

  it('devrait appliquer augmentation soirée sur mise à disposition', () => {
    const driverWithSurcharge = { ...driver, evening_surcharge: 25 };
    const eveningDate = new Date('2024-01-15T23:00:00');

    const result = calculateHourlyPrice(3, driverWithSurcharge, eveningDate);

    expect(result.subtotal).toBe(150); // 120 + 25%
    expect(result.surcharge_evening).toBe(30);
    expect(result.tva_amount).toBe(30); // 150 * 20%
    expect(result.total_price).toBe(180);
  });
});

describe('Scénarios Edge Cases', () => {
  it('devrait gérer distance zéro', () => {
    const driver: DriverPricing = {
      base_fare: 10,
      per_km_rate: 2,
      hourly_rate: 40,
      tva_rate: 10,
      tva_included: false,
      evening_surcharge: 0,
      weekend_surcharge: 0,
    };

    const result = calculateDistancePrice(0, driver);

    expect(result.base_price).toBe(10);
    expect(result.distance_price).toBe(0);
    expect(result.total_price).toBe(11); // 10 + TVA 10%
  });

  it('devrait gérer durée zéro', () => {
    const driver: DriverPricing = {
      base_fare: 10,
      per_km_rate: 2,
      hourly_rate: 40,
      tva_rate: 20,
      tva_included: false,
      evening_surcharge: 0,
      weekend_surcharge: 0,
    };

    const result = calculateHourlyPrice(0, driver);

    expect(result.total_price).toBe(0);
  });

  it('devrait gérer augmentations à 0%', () => {
    const driver: DriverPricing = {
      base_fare: 10,
      per_km_rate: 2,
      hourly_rate: 40,
      tva_rate: 10,
      tva_included: false,
      evening_surcharge: 0,
      weekend_surcharge: 0,
    };

    const eveningDate = new Date('2024-01-15T22:00:00');
    const result = calculateDistancePrice(15, driver, eveningDate);

    expect(result.surcharge_evening).toBe(0);
    expect(result.total_price).toBe(44); // Prix normal sans augmentation
  });
});

describe('Validation de la cohérence TVA', () => {
  it('TVA comprise et non comprise doivent donner le même TTC quand tva_included=true', () => {
    const baseDriver: DriverPricing = {
      base_fare: 11, // 11 TTC = 10 HT
      per_km_rate: 2.2, // 2.2 TTC = 2 HT
      hourly_rate: 40,
      tva_rate: 10,
      tva_included: true,
      evening_surcharge: 0,
      weekend_surcharge: 0,
    };

    const result = calculateDistancePrice(10, baseDriver);

    // Prix TTC = 11 + (10km * 2.2) = 33 TTC
    expect(result.total_price).toBeCloseTo(33, 1);
  });
});
