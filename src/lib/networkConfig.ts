/**
 * CONFIGURATION RÉSEAU CENTRALISÉE ET UNIFIÉE
 * Source unique de vérité pour tous les timeouts, retries et paramètres de connexion
 * 
 * Optimisée pour réseaux mobiles variés (3G/4G/5G/Wifi instable)
 */

/**
 * Configuration des timeouts par contexte
 * Valeurs généreuses pour éviter les faux-positifs sur réseaux lents
 */
export const TIMEOUTS = {
  /** Authentification et refresh token */
  AUTH: 15000,
  /** Requêtes de lecture standard */
  QUERY: 12000,
  /** Requêtes critiques (création, paiements) */
  CRITICAL: 25000,
  /** Health check / ping */
  PING: 5000,
  /** Edge functions */
  EDGE_FUNCTION: 30000,
  /** Géocodage et calcul d'itinéraire */
  GEOCODING: 10000,
} as const;

/**
 * Configuration des retries avec backoff exponentiel
 */
export const RETRY = {
  /** Nombre maximum de tentatives pour requêtes standards */
  MAX_ATTEMPTS: 5,
  /** Nombre maximum pour opérations critiques */
  MAX_ATTEMPTS_CRITICAL: 7,
  /** Délai initial entre retries (ms) */
  BASE_DELAY: 500,
  /** Délai maximum entre retries (ms) */
  MAX_DELAY: 10000,
  /** Multiplicateur backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Configuration du cache
 */
export const CACHE = {
  /** Durée standard de validité du cache (5 min) */
  STANDARD_TTL: 5 * 60 * 1000,
  /** Durée pour données critiques (2 min) */
  CRITICAL_TTL: 2 * 60 * 1000,
  /** Durée pour données statiques (30 min) */
  STATIC_TTL: 30 * 60 * 1000,
  /** Durée session auth en cache local (24h) */
  AUTH_SESSION_TTL: 24 * 60 * 60 * 1000,
} as const;

/**
 * Configuration realtime / subscriptions
 */
export const REALTIME = {
  /** Nombre maximum de channels simultanés */
  MAX_CHANNELS: 10,
  /** Debounce par défaut pour les callbacks (ms) */
  DEFAULT_DEBOUNCE: 500,
  /** Intervalle de ping santé connexion (ms) */
  HEALTH_CHECK_INTERVAL: 30000,
} as const;

/**
 * Protection anti-double-soumission
 */
export const SUBMIT_PROTECTION = {
  /** Délai minimum entre deux soumissions identiques (ms) */
  DEBOUNCE_MS: 5000,
  /** Délai pour opérations critiques (paiements) */
  CRITICAL_DEBOUNCE_MS: 10000,
} as const;

/**
 * Codes d'erreur non-retryables
 * Ces erreurs indiquent un problème permanent, pas de connexion
 */
export const NON_RETRYABLE_ERRORS = [
  'PGRST301', // Auth required
  'PGRST116', // Invalid request
  '401',      // Unauthorized
  '403',      // Forbidden
  '404',      // Not found
  '422',      // Unprocessable entity (validation)
] as const;

/**
 * Calcule le délai de retry avec backoff exponentiel + jitter
 */
export function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY.BASE_DELAY * Math.pow(RETRY.BACKOFF_MULTIPLIER, attempt);
  const jitter = Math.random() * RETRY.BASE_DELAY;
  return Math.min(exponentialDelay + jitter, RETRY.MAX_DELAY);
}

/**
 * Calcule le timeout progressif selon le nombre de tentatives
 */
export function calculateProgressiveTimeout(attempt: number, baseTimeout: number): number {
  return Math.min(baseTimeout * (1 + attempt * 0.3), baseTimeout * 2);
}

/**
 * Vérifie si une erreur est retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorString = String(error?.code || error?.status || error?.message || '');
  
  return !NON_RETRYABLE_ERRORS.some(code => 
    errorString.includes(code)
  );
}

/**
 * Catégorise une erreur pour logging et UI
 */
export function categorizeError(error: any): 'network' | 'auth' | 'validation' | 'database' | 'timeout' | 'unknown' {
  if (!error) return 'unknown';
  
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  const status = error?.status;
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  
  if (status === 401 || status === 403 || message.includes('jwt') || message.includes('auth')) {
    return 'auth';
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  if (code.startsWith('PGRST') || code.startsWith('23') || message.includes('violates')) {
    return 'database';
  }
  
  if (status === 422 || code === 'PGRST116' || message.includes('validation')) {
    return 'validation';
  }
  
  return 'unknown';
}

/**
 * Messages d'erreur utilisateur par catégorie
 */
export const ERROR_MESSAGES: Record<ReturnType<typeof categorizeError>, string> = {
  network: 'Problème de connexion. Vérifiez votre réseau.',
  auth: 'Session expirée. Veuillez vous reconnecter.',
  validation: 'Données invalides. Veuillez vérifier les informations.',
  database: 'Erreur serveur. Réessayez dans quelques instants.',
  timeout: 'La requête a pris trop de temps. Réessayez.',
  unknown: 'Une erreur inattendue est survenue.',
};
