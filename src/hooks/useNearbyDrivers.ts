import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedNearbyDrivers } from '@/lib/nearbyDriversCache';

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
  is_favorite?: boolean;
  // Payment info
  accepted_payment_methods?: string[] | null;
  stripe_connect_charges_enabled?: boolean;
  // Vehicle info
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  // Approach pricing
  approach_enabled?: boolean | null;
  approach_per_km_rate?: number | null;
  approach_distance_km?: number | null;
  approach_fee?: number;
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
  approach_enabled?: boolean | null;
  approach_per_km_rate?: number | null;
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
    mode?: SearchMode,
    favoriteDriverIds?: string[],
    exclusiveDriverId?: string | null
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
      mode: SearchMode = 'reservation',
      favoriteDriverIds?: string[],
      exclusiveDriverId?: string | null
    ) => {
      setIsLoading(true);
      setError(null);
      setNoDriversFound(false);
      setFallbackToReservation(false);

      const favIds = favoriteDriverIds?.filter(Boolean) || [];
      // Exclusive client: force reservation mode + bypass all online/GPS filters via the RPC param
      const effectiveMode: SearchMode = exclusiveDriverId ? 'reservation' : mode;

      try {
        const searchDrivers = async (searchMode: SearchMode) => {
          const params = {
            p_latitude: latitude,
            p_longitude: longitude,
            p_limit: 10,
            p_max_radius_km: maxSearchRadiusKm,
            p_mode: searchMode,
            p_favorite_driver_ids: favIds,
            p_exclusive_driver_id: exclusiveDriverId || null,
          };
          // 5s in-memory cache: deduplicates identical back-to-back searches
          // (mounts, re-renders) → cuts ~30-40% of redundant PostGIS queries.
          return getCachedNearbyDrivers<{ data: NearbyDriverRpcRow[] | null; error: any }>(
            params,
            async () => {
              const res = await supabase.rpc('find_nearby_drivers', params as any);
              return { data: res.data as NearbyDriverRpcRow[] | null, error: res.error };
            }
          );
        };

        let data: NearbyDriverRpcRow[] | null = null;
        let rpcError: unknown = null;

        // Exclusive client: single RPC call, no fallback dance
        if (exclusiveDriverId) {
          const response = await searchDrivers('reservation');
          data = (response.data ?? []) as NearbyDriverRpcRow[];
          rpcError = response.error;
        } else if (effectiveMode === 'immediate') {
          // ONLY search immediate — do NOT merge with reservation results
          // Offline drivers must NEVER appear in immediate mode
          const immediateResponse = await searchDrivers('immediate');
          
          if (immediateResponse.error) {
            rpcError = immediateResponse.error;
          } else {
            const immediateDrivers = (immediateResponse.data ?? []) as NearbyDriverRpcRow[];
            
            if (immediateDrivers.length === 0) {
              // No online drivers found — fallback: search reservation mode to show availability
              const reservationResponse = await searchDrivers('reservation');
              if (!reservationResponse.error && (reservationResponse.data ?? []).length > 0) {
                data = (reservationResponse.data ?? []) as NearbyDriverRpcRow[];
                setFallbackToReservation(true);
              } else {
                data = [];
              }
            } else {
              data = immediateDrivers;
              setFallbackToReservation(false);
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

        // PHASE 1: Show drivers IMMEDIATELY with basic estimated prices (no RPC delay)
        const quickDrivers = data.map((driver: NearbyDriverRpcRow) => {
          const distanceKm = driver.distance_meters / 1000;
          let estimatedPrice = driver.base_fare;
          if (routeDistanceKm) {
            estimatedPrice = driver.base_fare + (driver.per_km_rate * routeDistanceKm);
            estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
          } else {
            estimatedPrice = Math.max(estimatedPrice, driver.minimum_price);
          }
          return {
            ...driver,
            evening_surcharge: null,
            weekend_surcharge: null,
            distance_km: distanceKm,
            estimated_price: Math.round(estimatedPrice * 100) / 100,
            has_surcharge: false,
            is_favorite: favIds.includes(driver.driver_id),
            accepted_payment_methods: driver.accepted_payment_methods || ['cash', 'card'],
            stripe_connect_charges_enabled: driver.stripe_connect_charges_enabled || false,
            vehicle_brand: driver.vehicle_brand || null,
            vehicle_model: driver.vehicle_model || null,
            vehicle_color: driver.vehicle_color || null,
            approach_enabled: driver.approach_enabled ?? false,
            approach_per_km_rate: driver.approach_per_km_rate ?? 0,
            approach_distance_km: null,
            approach_fee: 0,
          };
        });

        const quickFiltered = quickDrivers.filter(d => d.estimated_price > 0 || d.base_fare > 0);
        setDrivers(quickFiltered);

        // PHASE 2: Refine prices in background with accurate RPC (surcharges, airport fees, approach)
        if (routeDistanceKm) {
          const scheduledDateStr = scheduledDate ? scheduledDate.toISOString() : new Date().toISOString();
          const isImmediate = effectiveMode === 'immediate';

          // ──────────────────────────────────────────────────────────────
          // APPROACH: compute real Mapbox driver→client distance for each
          // driver who has approach pricing enabled. Only in immediate mode.
          // Falls back to no fee if Mapbox call fails.
          // ──────────────────────────────────────────────────────────────
          const approachPromises = quickFiltered.map(async (d) => {
            if (
              !isImmediate ||
              !d.approach_enabled ||
              !d.approach_per_km_rate ||
              d.approach_per_km_rate <= 0 ||
              d.latitude == null ||
              d.longitude == null
            ) {
              return { driver_id: d.driver_id, approach_distance_km: null as number | null };
            }
            try {
              const { data: routeData, error } = await supabase.functions.invoke(
                'calculate-mapbox-route',
                {
                  body: {
                    pickup_latitude: d.latitude,
                    pickup_longitude: d.longitude,
                    destination_latitude: latitude,
                    destination_longitude: longitude,
                  },
                }
              );
              if (error || !routeData?.success) {
                return { driver_id: d.driver_id, approach_distance_km: null };
              }
              return {
                driver_id: d.driver_id,
                approach_distance_km: Number(routeData.distance_km) || null,
              };
            } catch {
              return { driver_id: d.driver_id, approach_distance_km: null };
            }
          });

          const approachResults = await Promise.all(approachPromises);
          const approachMap = new Map(
            approachResults.map((r) => [r.driver_id, r.approach_distance_km])
          );

          const pricePromises = data.map((driver: NearbyDriverRpcRow) => {
            const approachDistance = approachMap.get(driver.driver_id) ?? null;
            return supabase.rpc('calculate_course_price', {
              _driver_id: driver.driver_id,
              _distance_km: routeDistanceKm,
              _duration_minutes: Math.round(routeDurationMinutes || 0),
              _use_hourly_rate: false,
              _scheduled_date: scheduledDateStr,
              _pickup_address: pickupAddress || null,
              _destination_address: destinationAddress || null,
              _approach_distance_km: approachDistance,
              _is_immediate: isImmediate,
            } as any).then(res => ({ data: res.data, error: res.error, driver_id: driver.driver_id }));
          });

          Promise.all(pricePromises).then(priceResults => {
            const priceMap = new Map(priceResults.map(r => [r.driver_id, r]));
            const refinedDrivers = quickFiltered.map(driver => {
              const priceResult = priceMap.get(driver.driver_id);
              const approachDistance = approachMap.get(driver.driver_id) ?? null;
              if (priceResult && !priceResult.error && priceResult.data?.length > 0) {
                const row: any = priceResult.data[0];
                return {
                  ...driver,
                  estimated_price: Math.round(row.total_price * 100) / 100,
                  has_surcharge: (row.surcharge_evening || 0) > 0 ||
                                 (row.surcharge_weekend || 0) > 0 ||
                                 (row.airport_fee || 0) > 0 ||
                                 (row.approach_fee || 0) > 0,
                  approach_distance_km: approachDistance,
                  approach_fee: Number(row.approach_fee || 0),
                };
              }
              return { ...driver, approach_distance_km: approachDistance };
            });
            setDrivers(refinedDrivers);
          }).catch(() => { /* keep quick prices on error */ });
        }
        setSearchRadius(Math.max(...(quickFiltered.length > 0 ? quickFiltered : quickDrivers).map((driver) => driver.search_radius_used || 5), 5));
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
