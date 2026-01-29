import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function de geocoding avec cache en base de données
 * Évite le rate limiting Mapbox en réutilisant les résultats cachés
 */

interface GeocodingRequest {
  query: string;
  type: 'city' | 'address';
}

// Génère un hash simple pour la clé de cache
function hashQuery(query: string, type: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  // Simple hash pour éviter les collisions
  let hash = 0;
  const str = `${type}:${normalized}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${type}_${Math.abs(hash).toString(36)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'address' }: GeocodingRequest = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ features: [], cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN");

    if (!mapboxToken) {
      throw new Error("MAPBOX_PUBLIC_TOKEN not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Générer le hash pour la requête
    const queryHash = hashQuery(query, type);

    // Vérifier le cache d'abord
    const { data: cachedResult } = await supabase
      .from("geocoding_cache")
      .select("result, expires_at")
      .eq("query_hash", queryHash)
      .single();

    if (cachedResult && new Date(cachedResult.expires_at) > new Date()) {
      console.log(`📍 Cache HIT pour "${query}" (type: ${type})`);
      return new Response(
        JSON.stringify({ ...cachedResult.result, cached: true }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Cache": "HIT"
          } 
        }
      );
    }

    console.log(`🔍 Cache MISS pour "${query}" (type: ${type}), appel Mapbox...`);

    // Appel Mapbox avec les bons types selon le mode
    const types = type === 'city' 
      ? 'place,locality' 
      : 'address,place,locality';
    
    const limit = type === 'city' ? 8 : 5;

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxToken}&country=FR&language=fr&limit=${limit}&types=${types}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mapbox error: ${response.status}`, errorText);
      
      // Si rate limited, retourner une erreur explicite
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded", 
            message: "Trop de requêtes, veuillez patienter",
            retryAfter: 60 
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 429
          }
        );
      }
      
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    // Sauvegarder dans le cache (7 jours pour les villes, 24h pour les adresses)
    const cacheExpiry = type === 'city' 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    await supabase
      .from("geocoding_cache")
      .upsert({
        query_hash: queryHash,
        query_text: query,
        query_type: type,
        result: { features: data.features || [] },
        expires_at: cacheExpiry.toISOString(),
        created_at: new Date().toISOString()
      }, { onConflict: 'query_hash' });

    return new Response(
      JSON.stringify({ features: data.features || [], cached: false }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Cache": "MISS"
        } 
      }
    );
  } catch (error) {
    console.error("Error in geocode-cached:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage, features: [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
