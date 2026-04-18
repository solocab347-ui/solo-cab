import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  coordinates: Coordinates | null;
  success: boolean;
  error?: string;
}

/**
 * SYSTÈME RENFORCÉ: Geocoding centralisé et sécurisé
 * Cette fonction est le point unique d'entrée pour toute géolocalisation d'adresse.
 * Elle garantit la fiabilité du calcul des prix en assurant des coordonnées précises.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  // Validation de l'entrée
  if (!address || address.trim().length === 0) {
    console.error("❌ GEOCODING: Adresse vide");
    return { coordinates: null, success: false, error: "Adresse vide" };
  }

  try {
    console.log(`🗺️ GEOCODING: Début pour "${address}"`);

    // Récupération sécurisée du token Mapbox (avec cache localStorage 24h)
    const STORAGE_KEY = 'sc_mapbox_token_v1';
    const TTL_MS = 24 * 60 * 60 * 1000;
    let token: string | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.token && parsed?.ts && Date.now() - parsed.ts < TTL_MS) token = parsed.token;
      }
    } catch {}
    
    let tokenData: { token?: string } | null = token ? { token } : null;
    let tokenError: any = null;
    if (!token) {
      const resp = await supabase.functions.invoke("get-mapbox-token");
      tokenData = resp.data;
      tokenError = resp.error;
      if (tokenData?.token) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: tokenData.token, ts: Date.now() })); } catch {}
      }
    }
    
    if (tokenError || !tokenData?.token) {
      console.error("❌ GEOCODING: Token Mapbox non disponible", tokenError);
      toast.error("Service de localisation indisponible");
      return { coordinates: null, success: false, error: "Token Mapbox indisponible" };
    }

    // Appel API Mapbox avec paramètres optimisés
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address
      )}.json?access_token=${tokenData.token}&country=FR&language=fr&limit=1&types=address,place,locality`
    );

    if (!response.ok) {
      console.error("❌ GEOCODING: Erreur HTTP", response.status);
      toast.error("Erreur lors de la localisation de l'adresse");
      return { coordinates: null, success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    // Validation stricte de la réponse
    if (!data.features || data.features.length === 0) {
      console.warn("⚠️ GEOCODING: Aucun résultat trouvé pour", address);
      toast.warning("Adresse introuvable. Veuillez vérifier et réessayer.");
      return { coordinates: null, success: false, error: "Aucun résultat" };
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    // Validation des coordonnées
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || 
        isNaN(latitude) || isNaN(longitude)) {
      console.error("❌ GEOCODING: Coordonnées invalides", { latitude, longitude });
      return { coordinates: null, success: false, error: "Coordonnées invalides" };
    }

    // Validation géographique (France métropolitaine + Corse + DOM)
    const isValidFrance = 
      (latitude >= 41.0 && latitude <= 51.2 && longitude >= -5.5 && longitude <= 9.9) || // Métropole + Corse
      (latitude >= -21.5 && latitude <= 51.2 && longitude >= -63.2 && longitude <= 55.9); // DOM-TOM

    if (!isValidFrance) {
      console.warn("⚠️ GEOCODING: Coordonnées hors de France", { latitude, longitude });
      toast.warning("L'adresse doit être en France");
      return { coordinates: null, success: false, error: "Hors de France" };
    }

    const coordinates: Coordinates = { latitude, longitude };
    console.log(`✅ GEOCODING: Succès pour "${address}"`, coordinates);

    return { coordinates, success: true };

  } catch (error) {
    console.error("❌ GEOCODING: Exception", error);
    toast.error("Erreur lors de la localisation");
    return { 
      coordinates: null, 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur inconnue" 
    };
  }
};

/**
 * SYSTÈME RENFORCÉ: Calcul de distance via Edge Function
 * Garantit la précision du calcul de prix en utilisant les données Mapbox officielles
 */
export const calculateRoute = async (
  pickupCoords: Coordinates,
  destinationCoords: Coordinates
): Promise<{
  distance_km: number | null;
  duration_minutes: number | null;
  success: boolean;
  error?: string;
}> => {
  try {
    console.log("🗺️ CALCUL ITINÉRAIRE: Début");
    console.log("   Départ:", pickupCoords);
    console.log("   Arrivée:", destinationCoords);

    const { data: routeData, error: routeError } = await supabase.functions.invoke(
      'calculate-mapbox-route',
      {
        body: {
          pickup_latitude: pickupCoords.latitude,
          pickup_longitude: pickupCoords.longitude,
          destination_latitude: destinationCoords.latitude,
          destination_longitude: destinationCoords.longitude,
        },
      }
    );

    if (routeError) {
      console.error("❌ CALCUL ITINÉRAIRE: Erreur Edge Function", routeError);
      toast.error("Erreur lors du calcul de l'itinéraire");
      return { distance_km: null, duration_minutes: null, success: false, error: "Erreur Edge Function" };
    }

    if (!routeData?.success) {
      console.warn("⚠️ CALCUL ITINÉRAIRE: Aucun itinéraire trouvé");
      toast.warning("Impossible de calculer l'itinéraire");
      return { distance_km: null, duration_minutes: null, success: false, error: "Aucun itinéraire" };
    }

    // Validation des valeurs retournées
    const distanceKm = routeData.distance_km;
    const durationMinutes = routeData.duration_minutes;

    if (typeof distanceKm !== 'number' || typeof durationMinutes !== 'number' ||
        distanceKm <= 0 || durationMinutes <= 0) {
      console.error("❌ CALCUL ITINÉRAIRE: Valeurs invalides", { distanceKm, durationMinutes });
      return { distance_km: null, duration_minutes: null, success: false, error: "Valeurs invalides" };
    }

    console.log("✅ CALCUL ITINÉRAIRE: Succès");
    console.log(`   Distance: ${distanceKm} km`);
    console.log(`   Durée: ${durationMinutes} minutes`);

    return {
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      success: true
    };

  } catch (error) {
    console.error("❌ CALCUL ITINÉRAIRE: Exception", error);
    toast.error("Erreur lors du calcul de l'itinéraire");
    return {
      distance_km: null,
      duration_minutes: null,
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    };
  }
};

/**
 * Validation complète avant création de course
 * Retourne true si toutes les conditions sont remplies
 */
export const validateCourseData = (
  pickupAddress: string,
  destinationAddress: string,
  pickupCoords: Coordinates | null,
  destinationCoords: Coordinates | null,
  scheduledDate: string
): { valid: boolean; error?: string } => {
  if (!pickupAddress || pickupAddress.trim().length === 0) {
    return { valid: false, error: "Adresse de départ requise" };
  }

  if (!destinationAddress || destinationAddress.trim().length === 0) {
    return { valid: false, error: "Adresse d'arrivée requise" };
  }

  if (!pickupCoords) {
    return { valid: false, error: "Coordonnées de départ manquantes. Veuillez resélectionner l'adresse." };
  }

  if (!destinationCoords) {
    return { valid: false, error: "Coordonnées d'arrivée manquantes. Veuillez resélectionner l'adresse." };
  }

  if (!scheduledDate) {
    return { valid: false, error: "Date et heure requises" };
  }

  return { valid: true };
};
