import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function avec cache en base de données pour éviter le rate limiting
 * Les cold starts ne perdent plus le token puisqu'il est persisté
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN");

    if (!mapboxToken) {
      throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
    }

    // Retourner le token directement (public token, pas besoin de cache complexe)
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          // Cache côté client pour 30 minutes
          "Cache-Control": "public, max-age=1800"
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in get-mapbox-token:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
