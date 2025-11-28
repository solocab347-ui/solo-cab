/**
 * RATE LIMITER POUR EDGE FUNCTIONS - SOLOCAB
 * Protection contre abus et attaques DOS
 * Limite le nombre de requêtes par utilisateur/IP
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

/**
 * Rate limiter simple en mémoire
 * Pour production, utiliser Redis ou Supabase
 */
class RateLimiter {
  private records: Map<string, RequestRecord> = new Map();
  
  /**
   * Configuration par défaut: 20 requêtes / minute
   */
  private defaultConfig: RateLimitConfig = {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes de blocage
  };

  /**
   * Vérifie si une requête est autorisée
   */
  isAllowed(identifier: string, config?: Partial<RateLimitConfig>): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    blocked?: boolean;
  } {
    const cfg = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    let record = this.records.get(identifier);

    // Vérifier si bloqué
    if (record?.blocked && record.blockUntil && now < record.blockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: record.blockUntil - now,
        blocked: true
      };
    }

    // Créer ou réinitialiser le record si fenêtre expirée
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + cfg.windowMs,
        blocked: false
      };
      this.records.set(identifier, record);
    }

    // Incrémenter le compteur
    record.count++;

    // Vérifier la limite
    if (record.count > cfg.maxRequests) {
      // Bloquer si dépassement
      record.blocked = true;
      record.blockUntil = now + (cfg.blockDurationMs || 0);
      
      return {
        allowed: false,
        remaining: 0,
        resetIn: record.resetTime - now,
        blocked: true
      };
    }

    return {
      allowed: true,
      remaining: cfg.maxRequests - record.count,
      resetIn: record.resetTime - now
    };
  }

  /**
   * Nettoyer les anciens records (appel périodique)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime && (!record.blocked || (record.blockUntil && now >= record.blockUntil))) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Débloquer un identifier manuellement
   */
  unblock(identifier: string) {
    const record = this.records.get(identifier);
    if (record) {
      record.blocked = false;
      record.blockUntil = undefined;
    }
  }
}

// Singleton
export const rateLimiter = new RateLimiter();

// Nettoyer toutes les 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Middleware pour Supabase Edge Functions
 */
export function createRateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  return (req: Request): { allowed: boolean; response?: Response } => {
    // Obtenir identifier (user IP ou ID)
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    const identifier = ip;

    const result = rateLimiter.isAllowed(identifier, config);

    if (!result.allowed) {
      const headers = {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(config?.maxRequests || 20),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
        'Retry-After': String(Math.ceil(result.resetIn / 1000))
      };

      return {
        allowed: false,
        response: new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: result.blocked 
              ? 'Vous êtes temporairement bloqué. Veuillez réessayer plus tard.'
              : 'Trop de requêtes. Veuillez patienter.',
            retryAfter: Math.ceil(result.resetIn / 1000)
          }),
          { 
            status: 429, 
            headers 
          }
        )
      };
    }

    return { allowed: true };
  };
}
