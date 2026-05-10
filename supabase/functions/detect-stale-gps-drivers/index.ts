// Cron de diagnostic GPS : trace les chauffeurs online dont le GPS date de plus de 2 min.
// IMPORTANT : ne force jamais offline. Seul le bouton ON/OFF déconnecte le chauffeur.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("detect_and_fix_stale_gps_drivers", {
      p_max_age_seconds: 120,
    });

    if (error) {
      console.error("[STALE-GPS] RPC error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = data as { fixed_count: number; drivers: unknown[] };
    if (result.fixed_count > 0) {
      console.log(`[STALE-GPS] Unexpected fixed_count=${result.fixed_count}; manual ON/OFF policy should keep this at 0`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[STALE-GPS] Fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
