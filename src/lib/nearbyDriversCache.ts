/**
 * In-memory cache for `find_nearby_drivers` RPC calls.
 * 
 * Coalesces identical back-to-back searches (same lat/lon rounded to ~100m,
 * same mode, same radius) within a short window. This dramatically reduces
 * load on the PostGIS query when multiple components mount in parallel
 * or when the client re-renders quickly.
 */
const TTL_MS = 5_000;
const COORD_ROUNDING = 1000; // ~110m precision

interface CacheEntry {
  ts: number;
  promise: Promise<any>;
}

const cache = new Map<string, CacheEntry>();

function buildKey(params: Record<string, any>): string {
  const lat = Math.round((params.p_latitude ?? 0) * COORD_ROUNDING) / COORD_ROUNDING;
  const lon = Math.round((params.p_longitude ?? 0) * COORD_ROUNDING) / COORD_ROUNDING;
  const mode = params.p_mode ?? 'reservation';
  const radius = params.p_max_radius_km ?? 20;
  const limit = params.p_limit ?? 10;
  const fav = (params.p_favorite_driver_ids ?? []).slice().sort().join(',');
  const exc = params.p_exclusive_driver_id ?? '';
  return `${lat}|${lon}|${mode}|${radius}|${limit}|${fav}|${exc}`;
}

export function getCachedNearbyDrivers<T>(
  params: Record<string, any>,
  fetcher: () => Promise<T>
): Promise<T> {
  // Prune expired entries opportunistically
  const now = Date.now();
  if (cache.size > 50) {
    for (const [k, v] of cache) {
      if (now - v.ts > TTL_MS) cache.delete(k);
    }
  }

  const key = buildKey(params);
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL_MS) {
    return hit.promise as Promise<T>;
  }

  const promise = fetcher().catch((err) => {
    cache.delete(key); // don't cache errors
    throw err;
  });
  cache.set(key, { ts: now, promise });
  return promise;
}
