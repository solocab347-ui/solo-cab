import { z, parseBody, jsonResponse, corsHeaders, Latitude, Longitude } from '../_shared/validation.ts';

const RouteSchema = z.object({
  pickup_latitude: Latitude,
  pickup_longitude: Longitude,
  destination_latitude: Latitude,
  destination_longitude: Longitude,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = await parseBody(req, RouteSchema);
    if (!parsed.ok) return parsed.response;
    const { pickup_latitude, pickup_longitude, destination_latitude, destination_longitude } = parsed.data;

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
    // R11: never leak internals to clients
    return jsonResponse({ error: 'Erreur lors du calcul de l\'itinéraire' }, 500);
  }
});
