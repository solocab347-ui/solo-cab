/**
 * EDGE FUNCTION: VALIDATION BACKEND DES PRIX
 * Valide les calculs de prix côté serveur pour garantir l'intégrité financière
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ValidationRequest {
  driver_id: string;
  distance_km?: number;
  duration_minutes?: number;
  use_hourly_rate: boolean;
  scheduled_date?: string;
}

interface PriceCalculation {
  base_price: number;
  distance_price: number;
  time_price: number;
  subtotal: number;
  tva_amount: number;
  total_price: number;
  surcharge_evening: number;
  surcharge_weekend: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: ValidationRequest = await req.json();
    const { driver_id, distance_km, duration_minutes, use_hourly_rate, scheduled_date } = body;

    console.log("🔍 Validating price for driver:", driver_id);

    // Récupérer les paramètres du chauffeur
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("base_fare, per_km_rate, hourly_rate, tva_rate, tva_included, evening_surcharge, weekend_surcharge, minimum_price")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found or parameters missing");
    }

    console.log("📊 Driver parameters:", driver);

    let calculation: PriceCalculation;

    if (use_hourly_rate) {
      // Mise à disposition (horaire) - PAS de prix minimum
      if (!duration_minutes) {
        throw new Error("Duration required for hourly rate");
      }

      const hours = duration_minutes / 60;
      const hourlyRate = driver.hourly_rate || 0;
      const tvaRate = 20; // TVA 20% pour mise à disposition

      let subtotal: number;
      let time_price: number;

      if (driver.tva_included) {
        // TVA comprise : calculer HT puis recalculer TTC
        const timeHT = (hours * hourlyRate) / (1 + tvaRate / 100);
        time_price = timeHT;
        subtotal = timeHT;
      } else {
        // TVA non comprise : ajouter TVA
        time_price = hours * hourlyRate;
        subtotal = time_price;
      }

      // Augmentations soirée/weekend
      let surcharge_evening = 0;
      let surcharge_weekend = 0;

      if (scheduled_date) {
        const date = new Date(scheduled_date);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();

        // Soirée: 20h-6h
        if (hour >= 20 || hour < 6) {
          surcharge_evening = subtotal * ((driver.evening_surcharge || 0) / 100);
          subtotal += surcharge_evening;
        }

        // Weekend: samedi (6) ou dimanche (0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          surcharge_weekend = subtotal * ((driver.weekend_surcharge || 0) / 100);
          subtotal += surcharge_weekend;
        }
      }

      const tva_amount = subtotal * (tvaRate / 100);
      const total_price = driver.tva_included ? subtotal : subtotal + tva_amount;

      calculation = {
        base_price: 0,
        distance_price: 0,
        time_price,
        subtotal,
        tva_amount,
        total_price,
        surcharge_evening,
        surcharge_weekend,
      };
    } else {
      // Course classique (au kilomètre)
      if (!distance_km) {
        throw new Error("Distance required for distance-based pricing");
      }

      const baseFare = driver.base_fare || 0;
      const perKmRate = driver.per_km_rate || 0;
      const minimumPrice = driver.minimum_price || 0;
      const tvaRate = 10; // TVA 10% pour facturation au km

      let subtotal: number;
      let base_price: number;
      let distance_price: number;

      if (driver.tva_included) {
        // TVA comprise : calculer HT puis recalculer TTC
        const baseFareHT = baseFare / (1 + tvaRate / 100);
        const perKmRateHT = perKmRate / (1 + tvaRate / 100);
        base_price = baseFareHT;
        distance_price = distance_km * perKmRateHT;
        subtotal = base_price + distance_price;
      } else {
        // TVA non comprise
        base_price = baseFare;
        distance_price = distance_km * perKmRate;
        subtotal = base_price + distance_price;
      }

      // APPLIQUER LE PRIX MINIMUM (uniquement pour courses au km)
      if (minimumPrice > 0 && subtotal < minimumPrice) {
        // Ajuster pour atteindre le prix minimum
        distance_price = minimumPrice - base_price;
        if (distance_price < 0) {
          distance_price = 0;
          base_price = minimumPrice;
        }
        subtotal = minimumPrice;
      }

      // Augmentations soirée/weekend
      let surcharge_evening = 0;
      let surcharge_weekend = 0;

      if (scheduled_date) {
        const date = new Date(scheduled_date);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();

        if (hour >= 20 || hour < 6) {
          surcharge_evening = subtotal * ((driver.evening_surcharge || 0) / 100);
          subtotal += surcharge_evening;
        }

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          surcharge_weekend = subtotal * ((driver.weekend_surcharge || 0) / 100);
          subtotal += surcharge_weekend;
        }
      }

      const tva_amount = subtotal * (tvaRate / 100);
      const total_price = driver.tva_included ? subtotal : subtotal + tva_amount;

      calculation = {
        base_price,
        distance_price,
        time_price: 0,
        subtotal,
        tva_amount,
        total_price,
        surcharge_evening,
        surcharge_weekend,
      };
    }

    console.log("✅ Price calculation validated:", calculation);

    // ⚠️ SÉCURITÉ: Ne pas exposer les paramètres du chauffeur
    // Retourner seulement le calcul final pour éviter la divulgation d'informations sensibles
    return new Response(
      JSON.stringify({
        success: true,
        calculation,
        // Les paramètres du driver sont supprimés pour protéger les informations commerciales sensibles
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Price validation error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Price validation failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
