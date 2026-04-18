/**
 * Cache mémoire ultra-court (5s) pour supabase.auth.getUser().
 *
 * Pourquoi : au boot du dashboard, plusieurs composants appellent en parallèle
 * supabase.auth.getUser() — chaque appel = un round-trip réseau vers
 * l'endpoint /auth/v1/user. Visible dans les logs réseau : 4 appels identiques
 * en moins d'1s lors du chargement du ClientDashboard.
 *
 * Solution : déduplication mémoire avec TTL très court (5s).
 * Aucune incidence sécurité : la session JWT est toujours validée par Supabase
 * côté serveur sur chaque requête PostgREST. On évite juste les /auth/v1/user
 * redondants qui ne servent qu'à lire le user du JWT.
 *
 * Usage :
 *   import { getCachedUser } from '@/lib/cachedAuth';
 *   const { data: { user } } = await getCachedUser();
 */
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface CachedUserResult {
  data: { user: User | null };
  error: any;
}

let cachedResult: CachedUserResult | null = null;
let cachedAt = 0;
let inflight: Promise<CachedUserResult> | null = null;

const TTL_MS = 5_000;

export async function getCachedUser(): Promise<CachedUserResult> {
  const now = Date.now();

  // Cache hit
  if (cachedResult && now - cachedAt < TTL_MS) {
    return cachedResult;
  }

  // Inflight dedup : si plusieurs composants appellent en parallèle,
  // ils partagent la même promesse au lieu de déclencher N requêtes.
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const result = await supabase.auth.getUser();
      cachedResult = result as CachedUserResult;
      cachedAt = Date.now();
      return cachedResult;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Invalide le cache (à appeler sur sign-in / sign-out).
 */
export function invalidateCachedUser() {
  cachedResult = null;
  cachedAt = 0;
  inflight = null;
}

// Auto-invalidation lors des changements de session
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    invalidateCachedUser();
  }
});
