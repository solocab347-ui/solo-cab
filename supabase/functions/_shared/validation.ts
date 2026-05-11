/**
 * Shared Zod validation schemas + helpers for edge functions.
 * Wave Sécu-C — Standardise les validations sur les fonctions critiques.
 *
 * Usage:
 *   import { z, parseBody, jsonResponse, corsHeaders } from "../_shared/validation.ts";
 *   const Body = z.object({ ride_request_id: z.string().uuid() });
 *   const parsed = await parseBody(req, Body);
 *   if (!parsed.ok) return parsed.response;
 */
import { z } from "https://esm.sh/zod@3.23.8";
export { z };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-internal-secret",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonResponse({ error: "Invalid JSON body" }, 400),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "Validation failed", details: parsed.error.flatten() },
        400,
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

// ─── Common reusable schemas ────────────────────────────────────────────────
export const UUID = z.string().uuid();
export const Email = z.string().trim().toLowerCase().email().max(255);
export const Password = z.string().min(1).max(128);
export const Latitude = z.number().gte(-90).lte(90);
export const Longitude = z.number().gte(-180).lte(180);
export const PositiveAmount = z.number().positive().max(100000);

// Generic safe error for 5xx — never leak internals to clients
export function internalError(): Response {
  return jsonResponse({ error: "Internal server error" }, 500);
}
