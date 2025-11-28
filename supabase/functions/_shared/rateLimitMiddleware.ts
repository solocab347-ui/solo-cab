/**
 * RATE LIMITING MIDDLEWARE POUR EDGE FUNCTIONS
 * Protection contre abus et attaques DOS
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

// Store en mémoire (remplacer par Redis en production si nécessaire)
const rateLimitStore = new Map<string, RequestRecord>();

/**
 * Configuration par défaut: 20 requêtes / minute
 */
const defaultConfig: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes de blocage
};

/**
 * Extrait l'identifiant de la requête (IP ou user ID)
 */
function getIdentifier(req: Request): string {
  // Priorité: Authorization header > IP address
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // Extraire user ID si JWT présent
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.sub) return `user:${payload.sub}`;
    } catch (e) {
      // Ignorer erreur parsing JWT
    }
  }

  // Fallback sur IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ip:${ip}`;
}

/**
 * Vérifie si une requête est autorisée
 */
function isAllowed(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  blocked?: boolean;
} {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  // Vérifier si bloqué
  if (record?.blocked && record.blockUntil && now < record.blockUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.blockUntil - now,
      blocked: true,
    };
  }

  // Créer ou réinitialiser le record si fenêtre expirée
  if (!record || now >= record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
      blocked: false,
    };
    rateLimitStore.set(identifier, record);
  }

  // Incrémenter le compteur
  record.count++;

  // Vérifier la limite
  if (record.count > config.maxRequests) {
    // Bloquer si dépassement
    record.blocked = true;
    record.blockUntil = now + (config.blockDurationMs || 0);

    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
      blocked: true,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

/**
 * Middleware de rate limiting pour edge functions
 */
export function applyRateLimit(
  req: Request,
  config?: Partial<RateLimitConfig>
): { allowed: boolean; response?: Response } {
  const cfg = { ...defaultConfig, ...config };
  const identifier = getIdentifier(req);
  const result = isAllowed(identifier, cfg);

  if (!result.allowed) {
    const headers = {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(cfg.maxRequests),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
      'Retry-After': String(Math.ceil(result.resetIn / 1000)),
    };

    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: result.blocked
            ? 'Vous êtes temporairement bloqué. Veuillez réessayer plus tard.'
            : 'Trop de requêtes. Veuillez patienter.',
          retryAfter: Math.ceil(result.resetIn / 1000),
        }),
        {
          status: 429,
          headers,
        }
      ),
    };
  }

  return { allowed: true };
}

/**
 * Nettoyer les anciens records (appel périodique recommandé)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (
      now >= record.resetTime &&
      (!record.blocked || (record.blockUntil && now >= record.blockUntil))
    ) {
      rateLimitStore.delete(key);
    }
  }
}
