import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[EXTENDED-SEARCH] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { request_group_id, radius_km = 5, search_phase = "nearby" } = await req.json();
    if (!request_group_id) throw new Error("request_group_id required");

    logStep("Starting extended search", { request_group_id, radius_km, search_phase });

    // Get original request(s) for this group
    const { data: originalRequests, error: origErr } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("request_group_id", request_group_id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (origErr || !originalRequests?.length) {
      throw new Error("Original request not found");
    }

    // Check if already accepted
    const alreadyAccepted = originalRequests.some(r => r.status === "accepted");
    if (alreadyAccepted) {
      logStep("Already accepted, skipping extended search");
      return new Response(
        JSON.stringify({ success: true, already_accepted: true, new_requests: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstReq = originalRequests[0];

    // Collect already-contacted driver IDs
    const excludeDriverIds = originalRequests
      .map(r => r.selected_driver_id)
      .filter(Boolean) as string[];

    logStep("Excluding already-contacted drivers", { count: excludeDriverIds.length });

    // Find nearby available drivers
    const { data: nearbyDrivers, error: nearbyErr } = await supabase
      .rpc("find_nearby_available_drivers", {
        p_pickup_lat: firstReq.pickup_latitude || 0,
        p_pickup_lon: firstReq.pickup_longitude || 0,
        p_radius_km: radius_km,
        p_exclude_driver_ids: excludeDriverIds,
        p_limit: 10,
      });

    if (nearbyErr) {
      logStep("Error finding nearby drivers", { error: nearbyErr.message });
      throw new Error("Erreur recherche chauffeurs");
    }

    if (!nearbyDrivers?.length) {
      logStep("No nearby drivers found", { radius_km });
      return new Response(
        JSON.stringify({ success: true, new_requests: 0, no_drivers: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found nearby drivers", { count: nearbyDrivers.length });

    // Create new ride requests for each nearby driver
    const timeout = new Date(Date.now() + 60 * 1000).toISOString();
    const maxAttempt = Math.max(...originalRequests.map(r => r.search_attempt || 1));

    const newRequests = nearbyDrivers.map((driver: any) => ({
      client_id: firstReq.client_id,
      guest_name: firstReq.guest_name,
      guest_phone: firstReq.guest_phone,
      guest_email: firstReq.guest_email,
      pickup_address: firstReq.pickup_address,
      pickup_latitude: firstReq.pickup_latitude,
      pickup_longitude: firstReq.pickup_longitude,
      destination_address: firstReq.destination_address,
      destination_latitude: firstReq.destination_latitude,
      destination_longitude: firstReq.destination_longitude,
      distance_km: firstReq.distance_km,
      ride_type: firstReq.ride_type || "immediate",
      status: "pending",
      selected_driver_id: driver.driver_id,
      estimated_price: firstReq.estimated_price,
      timeout_at: timeout,
      request_type: "extended",
      driver_count: nearbyDrivers.length,
      request_group_id: request_group_id,
      search_phase: search_phase,
      parent_request_id: firstReq.id,
      search_attempt: maxAttempt + 1,
      payment_method: firstReq.payment_method,
      search_radius_km: radius_km,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("ride_requests")
      .insert(newRequests)
      .select("id, selected_driver_id");

    if (insertErr) {
      logStep("Error inserting extended requests", { error: insertErr.message });
      throw new Error("Erreur création demandes étendues");
    }

    logStep("Extended requests created", { count: inserted?.length });

    // Notify each nearby driver
    for (const driver of nearbyDrivers) {
      await supabase.from("notifications").insert({
        user_id: driver.user_id,
        title: "🚗 Nouvelle course disponible !",
        message: `${firstReq.pickup_address} → ${firstReq.destination_address} (${driver.distance_km.toFixed(1)} km de vous)`,
        type: "info",
        link: "/driver-dashboard?tab=courses",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_requests: inserted?.length || 0,
        drivers_found: nearbyDrivers.length,
        radius_km,
        timeout_at: timeout,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
