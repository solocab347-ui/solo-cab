import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyDriver {
  driver_id: string;
  company_name: string | null;
  display_name: string | null;
  profile_photo_url: string | null;
  base_fare: number;
  per_km_rate: number;
  minimum_price: number;
  distance_meters: number;
  search_radius_used: number;
  evening_surcharge: number | null;
  weekend_surcharge: number | null;
  // Calculated fields
  estimated_price?: number;
  distance_km?: number;
  has_surcharge?: boolean;
}

interface UseNearbyDriversResult {
  drivers: NearbyDriver[];
  isLoading: boolean;
  error: string | null;
  searchRadius: number | null;
  noDriversFound: boolean;
  searchNearbyDrivers: (
    latitude: number,
    longitude: number,
    routeDistanceKm?: number,
    routeDurationMinutes?: number,
    scheduledDate?: Date,
    pickupAddress?: string,
    destinationAddress?: string
  ) => Promise<void>;
}

export function useNearbyDrivers(): UseNearbyDriversResult {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [noDriversFound, setNoDriversFound] = useState(false);

  const searchNearbyDrivers = useCallback(
    async (
      latitude: number, 
      longitude: number, 
      routeDistanceKm?: number,
      routeDurationMinutes?: number,
      scheduledDate?: Date,
      pickupAddress?: string,
      destinationAddress?: string
    ) => {
      setIsLoading(true);
      setError(null);
      setNoDriversFound(false);

      try {
        const { data, error: rpcError } = await supabase.rpc('find_nearby_drivers', {
          p_latitude: latitude,
          p_longitude: longitude,
          p_limit: 10,
        });

        if (rpcError) {
          console.error('RPC error:', rpcError);
          setError('Erreur lors de la recherche des chauffeurs');
          setDrivers([]);
          return;
        }

        if (!data || data.length === 0) {
          setNoDriversFound(true);
          setDrivers([]);
          setSearchRadius(20); // Max radius tried
          return;
        }

        // Calculate estimated price for each driver using RPC for accurate surcharges
        const driversWithPrices = await Promise.all(
          data.map(async (driver: NearbyDriver) => {
            const distanceKm = driver.distance_meters / 1000;
            let estimatedPrice = driver.base_fare;
            let hasSurcharge = false;

            if (routeDistanceKm) {
              // Use RPC to calculate accurate price with surcharges
              const { data: priceData, error: priceError } = await supabase
                .rpc('calculate_course_price', {
                  _driver_id: driver.driver_id,
                  _distance_km: routeDistanceKm,
                  _duration_minutes: routeDurationMinutes || 0,
                  _use_hourly_rate: false,
                  _scheduled_date: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
                  _pickup_address: pickupAddress || null,
                  _destination_address: destinationAddress || null,
                });

              if (!priceError && priceData && priceData.length > 0) {
                estimatedPrice = priceData[0].total_price;
                // Check if any surcharge was applied
                hasSurcharge = (priceData[0].surcharge_evening || 0) > 0 || 
                               (priceData[0].surcharge_weekend || 0) > 0 ||
                               (priceData[0].airport_fee || 0) > 0;
              } else {
                // Fallback to simple calculation
                estimatedPrice = driver.base_fare + (driver.per_km_rate * routeDistanceKm);
                estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
              }
            } else {
              estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
            }

            return {
              ...driver,
              distance_km: distanceKm,
              estimated_price: Math.round(estimatedPrice * 100) / 100,
              has_surcharge: hasSurcharge,
            };
          })
        );

        setDrivers(driversWithPrices);
        setSearchRadius(data[0]?.search_radius_used || 5);
      } catch (err) {
        console.error('Search error:', err);
        setError('Erreur de connexion');
        setDrivers([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    drivers,
    isLoading,
    error,
    searchRadius,
    noDriversFound,
    searchNearbyDrivers,
  };
}
