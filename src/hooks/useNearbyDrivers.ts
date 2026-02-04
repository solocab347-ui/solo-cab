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
  // Calculated fields
  estimated_price?: number;
  distance_km?: number;
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
    routeDistanceKm?: number
  ) => Promise<void>;
}

export function useNearbyDrivers(): UseNearbyDriversResult {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [noDriversFound, setNoDriversFound] = useState(false);

  const searchNearbyDrivers = useCallback(
    async (latitude: number, longitude: number, routeDistanceKm?: number) => {
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

        // Calculate estimated price for each driver based on route distance
        const driversWithPrices = data.map((driver: NearbyDriver) => {
          const distanceKm = driver.distance_meters / 1000;
          let estimatedPrice = driver.base_fare;

          if (routeDistanceKm) {
            estimatedPrice += driver.per_km_rate * routeDistanceKm;
          }

          // Apply minimum price
          estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);

          return {
            ...driver,
            distance_km: distanceKm,
            estimated_price: Math.round(estimatedPrice * 100) / 100,
          };
        });

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
