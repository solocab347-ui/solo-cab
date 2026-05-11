/**
 * Centralized rate limiter (R1 / F2 — docs/security/SECURE_CODING_RULES.md)
 *
 * Thin wrapper around _shared/rateLimitMiddleware.ts that exposes named
 * presets so every public-facing edge function uses the same limits.
 *
 * Usage:
 *   import { enforceRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
 *
 *   const rl = enforceRateLimit(req, RATE_LIMITS.AUTH);
 *   if (!rl.allowed) return rl.response!;
 */

import { applyRateLimit } from './rateLimitMiddleware.ts';

export const RATE_LIMITS = {
  /** Login / signup / password reset — strict */
  AUTH:     { maxRequests: 8,   windowMs: 60_000,  blockDurationMs: 10 * 60_000 },
  /** Search / nearby drivers — moderate, bursty */
  SEARCH:   { maxRequests: 60,  windowMs: 60_000,  blockDurationMs:  2 * 60_000 },
  /** Booking / payment intent creation */
  BOOKING:  { maxRequests: 20,  windowMs: 60_000,  blockDurationMs:  5 * 60_000 },
  /** Public contact / support / share */
  CONTACT:  { maxRequests: 5,   windowMs: 60_000,  blockDurationMs: 15 * 60_000 },
  /** Webhook ingestion — high volume but per-IP capped */
  WEBHOOK:  { maxRequests: 300, windowMs: 60_000,  blockDurationMs:  1 * 60_000 },
  /** Default for any other public endpoint */
  DEFAULT:  { maxRequests: 30,  windowMs: 60_000,  blockDurationMs:  5 * 60_000 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMITS;

export function enforceRateLimit(
  req: Request,
  preset: typeof RATE_LIMITS[RateLimitPreset] = RATE_LIMITS.DEFAULT,
) {
  return applyRateLimit(req, preset);
}

export { applyRateLimit };
