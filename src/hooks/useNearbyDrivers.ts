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
  evening_surcharge?: number | null;
  weekend_surcharge?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  is_live_location?: boolean | null;
  // Calculated fields
  estimated_price?: number;
  distance_km?: number;
  has_surcharge?: boolean;
  // Payment info
  accepted_payment_methods?: string[] | null;
  stripe_connect_charges_enabled?: boolean;
  // Vehicle info
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
}

type SearchMode = 'reservation' | 'immediate';

interface NearbyDriverRpcRow {
  driver_id: string;
  company_name: string | null;
  display_name: string | null;
  profile_photo_url: string | null;
  base_fare: number;
  per_km_rate: number;
  minimum_price: number;
  distance_meters: number;
  search_radius_used: number;
  latitude?: number | null;
  longitude?: number | null;
  is_live_location?: boolean | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  stripe_connect_charges_enabled?: boolean;
  accepted_payment_methods?: string[] | null;
}

interface UseNearbyDriversResult {
  drivers: NearbyDriver[];
  isLoading: boolean;
  error: string | null;
  searchRadius: number | null;
  noDriversFound: boolean;
  fallbackToReservation: boolean;
  searchNearbyDrivers: (
    latitude: number,
    longitude: number,
    routeDistanceKm?: number,
    routeDurationMinutes?: number,
    scheduledDate?: Date,
    pickupAddress?: string,
    destinationAddress?: string,
    maxSearchRadiusKm?: number,
    mode?: SearchMode
  ) => Promise<void>;
}

export function useNearbyDrivers(): UseNearbyDriversResult {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number | null>(null);
  const [noDriversFound, setNoDriversFound] = useState(false);
  const [fallbackToReservation, setFallbackToReservation] = useState(false);

  const searchNearbyDrivers = useCallback(
    async (
      latitude: number, 
      longitude: number, 
      routeDistanceKm?: number,
      routeDurationMinutes?: number,
      scheduledDate?: Date,
      pickupAddress?: string,
      destinationAddress?: string,
      maxSearchRadiusKm: number = 20,
      mode: SearchMode = 'reservation'
    ) => {
      setIsLoading(true);
      setError(null);
      setNoDriversFound(false);
      setFallbackToReservation(false);

      try {
        const searchDrivers = async (searchMode: SearchMode) => supabase.rpc('find_nearby_drivers', {
          p_latitude: latitude,
          p_longitude: longitude,
          p_limit: 10,
          p_max_radius_km: maxSearchRadiusKm,
          p_mode: searchMode,
        });

        let data: NearbyDriverRpcRow[] | null = null;
        let rpcError: unknown = null;

        if (mode === 'immediate') {
          const [immediateResponse, reservationResponse] = await Promise.all([
            searchDrivers('immediate'),
            searchDrivers('reservation'),
          ]);

          if (immediateResponse.error && reservationResponse.error) {
            rpcError = immediateResponse.error;
          } else {
            const immediateDrivers = (immediateResponse.data ?? []) as NearbyDriverRpcRow[];
            const reservationDrivers = (reservationResponse.data ?? []) as NearbyDriverRpcRow[];
            const mergedDrivers = new Map<string, NearbyDriverRpcRow>();

            immediateDrivers.forEach((driver) => {
              mergedDrivers.set(driver.driver_id, {
                ...driver,
                is_live_location: true,
              });
            });

            reservationDrivers.forEach((driver) => {
              if (!mergedDrivers.has(driver.driver_id)) {
                mergedDrivers.set(driver.driver_id, driver);
              }
            });

            data = Array.from(mergedDrivers.values()).sort((a, b) => {
              const aLive = a.is_live_location ? 1 : 0;
              const bLive = b.is_live_location ? 1 : 0;
              if (aLive !== bLive) return bLive - aLive;
              return a.distance_meters - b.distance_meters;
            });

            if (reservationDrivers.length > 0) {
              setFallbackToReservation(immediateDrivers.length === 0 || reservationDrivers.length > immediateDrivers.length);
            }
          }
        } else {
          const response = await searchDrivers(mode);
          data = (response.data ?? []) as NearbyDriverRpcRow[];
          rpcError = response.error;
        }

        if (rpcError) {
          console.error('RPC error:', rpcError);
          setError('Erreur lors de la recherche des chauffeurs');
          setDrivers([]);
          return;
        }

        if (!data || data.length === 0) {
          setNoDriversFound(true);
          setDrivers([]);
          setSearchRadius(maxSearchRadiusKm);
          return;
        }

        // Calculate estimated price for each driver using RPC for accurate surcharges
        // OPTIMISATION: Batch toutes les requêtes RPC en parallèle (max 10 drivers)
        const scheduledDateStr = scheduledDate ? scheduledDate.toISOString() : new Date().toISOString();
        
        const pricePromises = routeDistanceKm 
          ? data.map((driver: NearbyDriverRpcRow) => 
              supabase.rpc('calculate_course_price', {
                _driver_id: driver.driver_id,
                _distance_km: routeDistanceKm,
                _duration_minutes: Math.round(routeDurationMinutes || 0),
                _use_hourly_rate: false,
                _scheduled_date: scheduledDateStr,
                _pickup_address: pickupAddress || null,
                _destination_address: destinationAddress || null,
              }).then(res => ({ data: res.data, error: res.error, driver_id: driver.driver_id }))
            )
          : [];

        const priceResults = await Promise.all(pricePromises);
        const priceMap = new Map(priceResults.map(r => [r.driver_id, r]));

        const driversWithPrices = data.map((driver: NearbyDriverRpcRow) => {
          const distanceKm = driver.distance_meters / 1000;
          let estimatedPrice = driver.base_fare;
          let hasSurcharge = false;

          if (routeDistanceKm) {
            const priceResult = priceMap.get(driver.driver_id);
            if (priceResult && !priceResult.error && priceResult.data?.length > 0) {
              estimatedPrice = priceResult.data[0].total_price;
              hasSurcharge = (priceResult.data[0].surcharge_evening || 0) > 0 || 
                             (priceResult.data[0].surcharge_weekend || 0) > 0 ||
                             (priceResult.data[0].airport_fee || 0) > 0;
            } else {
              estimatedPrice = driver.base_fare + (driver.per_km_rate * routeDistanceKm);
              estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
            }
          } else {
            estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
          }

          return {
            ...driver,
            evening_surcharge: null,
            weekend_surcharge: null,
            distance_km: distanceKm,
            estimated_price: Math.round(estimatedPrice * 100) / 100,
            has_surcharge: hasSurcharge,
            accepted_payment_methods: driver.accepted_payment_methods || ['cash', 'card'],
            stripe_connect_charges_enabled: driver.stripe_connect_charges_enabled || false,
            vehicle_brand: driver.vehicle_brand || null,
            vehicle_model: driver.vehicle_model || null,
            vehicle_color: driver.vehicle_color || null,
          };
        });

        setDrivers(driversWithPrices);
        setSearchRadius(Math.max(...driversWithPrices.map((driver) => driver.search_radius_used || 5), 5));
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
    fallbackToReservation,
    searchNearbyDrivers,
  };
}
