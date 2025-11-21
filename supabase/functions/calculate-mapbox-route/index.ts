import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pickup_latitude, pickup_longitude, destination_latitude, destination_longitude } = await req.json();

    // Validation des paramètres
    if (!pickup_latitude || !pickup_longitude || !destination_latitude || !destination_longitude) {
      console.error('❌ Paramètres manquants:', { pickup_latitude, pickup_longitude, destination_latitude, destination_longitude });
      return new Response(
        JSON.stringify({ error: 'Coordonnées de départ et d\'arrivée requises' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le token Mapbox
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      console.error('❌ MAPBOX_PUBLIC_TOKEN non configuré');
      return new Response(
        JSON.stringify({ error: 'Configuration Mapbox manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🗺️ Calcul itinéraire Mapbox:', {
      from: `${pickup_latitude}, ${pickup_longitude}`,
      to: `${destination_latitude}, ${destination_longitude}`
    });

    // Appel à l'API Mapbox Directions
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup_longitude},${pickup_latitude};${destination_longitude},${destination_latitude}?access_token=${mapboxToken}&geometries=geojson`;
    
    const directionsResponse = await fetch(directionsUrl);
    
    if (!directionsResponse.ok) {
      console.error('❌ Erreur API Mapbox:', directionsResponse.status, directionsResponse.statusText);
      const errorText = await directionsResponse.text();
      console.error('Détails erreur:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du calcul de l\'itinéraire' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const directionsData = await directionsResponse.json();

    if (!directionsData.routes || directionsData.routes.length === 0) {
      console.error('❌ Aucun itinéraire trouvé');
      return new Response(
        JSON.stringify({ error: 'Aucun itinéraire trouvé pour ces coordonnées' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = directionsData.routes[0];
    
    // Calcul de la distance en km (arrondi à 2 décimales)
    const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
    
    // Calcul de la durée en minutes (arrondi)
    const durationMinutes = Math.round(route.duration / 60);

    console.log('✅ Itinéraire calculé avec succès:', {
      distance_km: distanceKm,
      duration_minutes: durationMinutes
    });

    return new Response(
      JSON.stringify({
        success: true,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        route_geometry: route.geometry
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur Calculate Mapbox Route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
