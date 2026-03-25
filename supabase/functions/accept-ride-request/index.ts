import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACCEPT-RIDE-REQUEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Authenticate the driver
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { ride_request_id } = await req.json();
    if (!ride_request_id) throw new Error("ride_request_id required");

    logStep("Driver accepting ride request", { ride_request_id, userId: userData.user.id });

    // Get driver info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, user_id, company_name, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("user_id", userData.user.id)
      .single();

    if (driverError || !driver) throw new Error("Driver not found");

    const driverHasStripe = !!driver.stripe_connect_account_id && driver.stripe_connect_charges_enabled === true;

    // Atomically claim the ride request (first-come-first-served)
    // Use update with status='pending' check to prevent race conditions
    const { data: claimed, error: claimError } = await supabaseClient
      .from("ride_requests")
      .update({
        status: "accepted",
        accepted_by_driver_id: driver.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ride_request_id)
      .eq("selected_driver_id", driver.id)
      .eq("status", "pending")
      .select()
      .single();

    if (claimError || !claimed) {
      logStep("Ride request already taken or not found", { claimError });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Cette demande a déjà été prise par un autre chauffeur ou n'est plus disponible.",
          already_taken: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Ride request claimed successfully", { 
      driverId: driver.id, 
      paymentMethod: claimed.payment_method,
      driverHasStripe,
    });

    // Cancel all other pending ride_requests for the same group
    // (same client + same pickup + same destination + same scheduled_date created within 1 second)
    const { error: cancelError } = await supabaseClient
      .from("ride_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .neq("id", ride_request_id)
      .eq("status", "pending")
      .eq("pickup_address", claimed.pickup_address)
      .eq("destination_address", claimed.destination_address)
      .or(
        claimed.client_id 
          ? `client_id.eq.${claimed.client_id}` 
          : `guest_phone.eq.${claimed.guest_phone}`
      );

    if (cancelError) {
      logStep("Warning: failed to cancel other requests", { cancelError });
    }

    // Create the course
    const courseData: Record<string, unknown> = {
      driver_id: driver.id,
      client_id: claimed.client_id || null,
      pickup_address: claimed.pickup_address,
      destination_address: claimed.destination_address,
      pickup_latitude: claimed.pickup_latitude,
      pickup_longitude: claimed.pickup_longitude,
      destination_latitude: claimed.destination_latitude,
      destination_longitude: claimed.destination_longitude,
      scheduled_date: claimed.scheduled_date || new Date().toISOString(),
      status: "accepted",
      distance_km: claimed.distance_km,
      guest_estimated_price: claimed.estimated_price,
      is_guest_booking: !claimed.client_id,
      guest_name: claimed.guest_name,
      guest_email: claimed.guest_email,
      guest_phone: claimed.guest_phone,
      payment_method: claimed.payment_method || "cash",
    };

    // Determine payment flow based on driver Stripe status and payment method
    const clientWantsCard = claimed.payment_method === "card";

    if (clientWantsCard && driverHasStripe) {
      // Stripe driver + card payment → online payment flow
      courseData.payment_method = "stripe";
      courseData.payment_status = "bank_imprint_pending";
      logStep("Online card payment flow: bank hold will be required");
    } else if (clientWantsCard && !driverHasStripe) {
      // Non-Stripe driver + card payment → TPE (physical terminal)
      courseData.payment_method = "card";
      courseData.payment_status = "pending";
      logStep("TPE card payment flow: driver will collect via terminal");
    } else {
      // Cash or other
      courseData.payment_method = claimed.payment_method || "cash";
      courseData.payment_status = "pending";
      logStep("Cash/other payment flow");
    }

    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .insert(courseData)
      .select("id, tracking_token")
      .single();

    if (courseError || !course) {
      logStep("Error creating course", { courseError });
      throw new Error("Erreur lors de la création de la course");
    }

    // Link the course to the ride request
    await supabaseClient
      .from("ride_requests")
      .update({ final_course_id: course.id })
      .eq("id", ride_request_id);

    logStep("Course created", { courseId: course.id });

    // Create auto devis
    try {
      await supabaseClient.functions.invoke("create-devis-auto", {
        body: { course_id: course.id },
      });
      logStep("Auto devis created");
    } catch (devisErr) {
      logStep("Warning: auto devis creation failed", { error: String(devisErr) });
    }

    // Notify the client
    if (claimed.client_id) {
      // Get client user_id for notification
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("user_id")
        .eq("id", claimed.client_id)
        .single();

      if (clientData?.user_id) {
        const paymentMessage = clientWantsCard && driverHasStripe
          ? "Une empreinte bancaire sera nécessaire pour confirmer."
          : clientWantsCard
            ? "Le paiement se fera par carte directement avec le chauffeur."
            : "Le paiement en espèces se fera à la fin de la course.";

        await supabaseClient.from("notifications").insert({
          user_id: clientData.user_id,
          title: "🎉 Un chauffeur a accepté votre course !",
          message: `${driver.company_name || 'Votre chauffeur'} a accepté votre demande de course. ${paymentMessage}`,
          type: "success",
          link: `/reservation-tracking/${course.tracking_token}`,
        });
      }
    }

    // Notify the driver  
    await supabaseClient.from("notifications").insert({
      user_id: driver.user_id,
      title: "✅ Course acceptée",
      message: `Nouvelle course : ${claimed.pickup_address} → ${claimed.destination_address}`,
      type: "info",
      link: "/driver-dashboard?tab=courses",
    });

    return new Response(
      JSON.stringify({
        success: true,
        course_id: course.id,
        tracking_token: course.tracking_token,
        payment_flow: clientWantsCard && driverHasStripe ? "stripe_online" : clientWantsCard ? "tpe" : "cash",
        driver_has_stripe: driverHasStripe,
        message: "Course créée avec succès",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
