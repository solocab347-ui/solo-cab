import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z, parseBody, jsonResponse, corsHeaders } from "../_shared/validation.ts";

const AcceptRideSchema = z.object({
  ride_request_id: z.string().uuid(),
});

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error(`User not authenticated: ${userError?.message || 'no user data'}`);

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

    // Use atomic RPC for race-condition-safe acceptance
    const { data: claimResult, error: rpcError } = await supabaseClient
      .rpc("atomic_accept_ride_request", {
        p_ride_request_id: ride_request_id,
        p_driver_id: driver.id,
      });

    if (rpcError) {
      logStep("RPC error", { rpcError });
      throw new Error("Erreur serveur lors de l'acceptation");
    }

    if (!claimResult?.success) {
      logStep("Ride request not available", { result: claimResult });
      return new Response(
        JSON.stringify({
          success: false,
          error: claimResult?.error || "Demande non disponible",
          already_taken: claimResult?.already_taken || false,
          expired: claimResult?.expired || false,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claimed = claimResult;
    logStep("Ride request claimed atomically", {
      driverId: driver.id,
      requestType: claimed.request_type,
      paymentMethod: claimed.payment_method,
    });

    // Create the course - recalculate price server-side for integrity
    const clientWantsCard = claimed.payment_method === "card";

    // Server-side price recalculation using RPC (source of truth)
    let serverPrice = claimed.estimated_price;
    let approachFee = Number(claimed.approach_fee) || 0;
    const approachDistanceKm = claimed.approach_distance_km != null ? Number(claimed.approach_distance_km) : null;
    const approachPerKmRate = claimed.approach_per_km_rate != null ? Number(claimed.approach_per_km_rate) : null;
    const isImmediate = !claimed.scheduled_date;
    try {
      const { data: priceData, error: priceError } = await supabaseClient.rpc("calculate_course_price", {
        _driver_id: driver.id,
        _distance_km: claimed.distance_km || 0,
        _duration_minutes: 0,
        _scheduled_date: claimed.scheduled_date || new Date().toISOString(),
        _pickup_address: claimed.pickup_address || null,
        _destination_address: claimed.destination_address || null,
        _use_hourly_rate: false,
        _approach_distance_km: approachDistanceKm,
        _is_immediate: isImmediate,
      });
      if (!priceError && priceData && priceData.length > 0) {
        serverPrice = priceData[0].total_price;
        if (priceData[0].approach_fee != null) {
          approachFee = Number(priceData[0].approach_fee) || 0;
        }
        logStep("Server-side price calculated", { clientPrice: claimed.estimated_price, serverPrice, approachFee });
      } else if (priceError) {
        logStep("Price RPC fallback to client price", { priceError: priceError.message });
      }
    } catch (priceCalcErr) {
      logStep("Price recalc error, using client price", { error: String(priceCalcErr) });
    }

    // Generate guest tracking token if guest booking
    const guestTrackingToken = !claimed.client_id ? crypto.randomUUID() : null;

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
      status: "driver_approaching",
      distance_km: claimed.distance_km,
      guest_estimated_price: serverPrice,
      approach_distance_km: approachDistanceKm,
      approach_per_km_rate: approachPerKmRate,
      approach_fee: approachFee,
      is_guest_booking: !claimed.client_id,
      guest_name: claimed.guest_name,
      guest_email: claimed.guest_email,
      guest_phone: claimed.guest_phone,
      payment_method: claimed.payment_method || "cash",
      guest_tracking_token: guestTrackingToken,
    };

    if (clientWantsCard && driverHasStripe) {
      courseData.payment_method = "stripe";
      courseData.payment_status = "bank_imprint_pending";
    } else if (clientWantsCard && !driverHasStripe) {
      courseData.payment_method = "card";
      courseData.payment_status = "pending";
    } else {
      courseData.payment_method = claimed.payment_method || "cash";
      courseData.payment_status = "pending";
    }

    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .insert(courseData)
      .select("id, final_payment_amount, guest_estimated_price")
      .single();

    if (courseError || !course) {
      logStep("Error creating course - REVERTING ride_request claim", { courseError });
      // CRITICAL: revert claim so client/other drivers can retry
      await supabaseClient
        .from("ride_requests")
        .update({ status: "pending", accepted_by_driver_id: null })
        .eq("id", ride_request_id);
      throw new Error(`Erreur lors de la création de la course: ${courseError?.message || 'unknown'}`);
    }

    // Link course to ride request - CRITICAL for client polling
    const { error: linkError } = await supabaseClient
      .from("ride_requests")
      .update({ final_course_id: course.id })
      .eq("id", ride_request_id);

    if (linkError) {
      logStep("Warning: failed to link course to ride_request", { linkError });
    } else {
      logStep("Course linked to ride_request", { courseId: course.id, rideRequestId: ride_request_id });
    }

    await supabaseClient
      .from("drivers")
      .update({
        driver_status: "assigned",
        is_available_now: false,
        last_location_update: new Date().toISOString(),
      })
      .eq("id", driver.id);

    logStep("Course created", { courseId: course.id });

    // Auto devis
    try {
      await supabaseClient.functions.invoke("create-devis-auto", {
        body: { course_id: course.id, driver_id: driver.id },
      });
    } catch (devisErr) {
      logStep("Warning: auto devis failed", { error: String(devisErr) });
    }

    // Auto card hold for Stripe drivers with saved cards
    let autoHoldResult: string | null = null;
    if (clientWantsCard && driverHasStripe) {
      try {
        let stripeCustomerId: string | null = null;
        let paymentMethodToUse: string | null = null;

        if (claimed.client_id) {
          // Registered client: look up from clients table
          const { data: clientRecord } = await supabaseClient
            .from("clients")
            .select("user_id, stripe_customer_id, default_payment_method_id")
            .eq("id", claimed.client_id)
            .single();

          stripeCustomerId = clientRecord?.stripe_customer_id || null;
          paymentMethodToUse = clientRecord?.default_payment_method_id || null;
        } else {
          // Guest: use Stripe info from ride_request
          stripeCustomerId = claimed.stripe_customer_id || null;
          paymentMethodToUse = claimed.stripe_payment_method_id || null;
        }

        if (stripeCustomerId) {
          // If no payment method stored, try to find one from Stripe
          if (!paymentMethodToUse) {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
            if (stripeKey) {
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
              const pms = await stripe.paymentMethods.list({
                customer: stripeCustomerId,
                type: "card",
                limit: 1,
              });
              if (pms.data.length > 0) {
                paymentMethodToUse = pms.data[0].id;
                // Update client record if registered
                if (claimed.client_id) {
                  await supabaseClient
                    .from("clients")
                    .update({ default_payment_method_id: paymentMethodToUse })
                    .eq("id", claimed.client_id);
                }
              }
            }
          }

          if (paymentMethodToUse) {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
            if (stripeKey) {
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
              const coursePrice = course.final_payment_amount || course.guest_estimated_price || 0;
              const holdAmountCents = Math.max(Math.round(coursePrice * 100), 100);
              const SOLOCAB_FEE_CENTS = 50;
              const applicationFeeCents = Math.min(SOLOCAB_FEE_CENTS, holdAmountCents);
              // DESTINATION CHARGES: Funds go directly to driver
              const paymentIntent = await stripe.paymentIntents.create({
                amount: holdAmountCents,
                currency: "eur",
                capture_method: "manual",
                customer: stripeCustomerId,
                payment_method: paymentMethodToUse,
                off_session: true,
                confirm: true,
                transfer_data: {
                  destination: driver.stripe_connect_account_id,
                },
                on_behalf_of: driver.stripe_connect_account_id,
                application_fee_amount: applicationFeeCents,
                metadata: {
                  driver_id: driver.id,
                  course_id: course.id,
                  client_id: claimed.client_id || "guest",
                  type: "course_hold",
                  auto_created: "true",
                  solocab_fee: (applicationFeeCents / 100).toFixed(2),
                },
                description: `Réservation VTC ${(holdAmountCents / 100).toFixed(2)}€ TTC`,
              } as any);

              if (paymentIntent.status === "requires_capture") {
                await supabaseClient
                  .from("courses")
                  .update({
                    stripe_hold_payment_intent_id: paymentIntent.id,
                    card_hold_status: "confirmed",
                    card_hold_amount: holdAmountCents / 100,
                    payment_status: "bank_imprint_confirmed",
                    stripe_payment_method_id: paymentMethodToUse,
                    stripe_customer_id: stripeCustomerId,
                  })
                  .eq("id", course.id);
                autoHoldResult = "auto_confirmed";
              } else {
                autoHoldResult = "pending_confirmation";
              }
            }
          } else {
            autoHoldResult = "no_saved_card";
          }
        } else {
          autoHoldResult = "no_stripe_customer";
        }
      } catch (holdErr) {
        logStep("Auto-hold failed (non-blocking)", { error: String(holdErr) });
        autoHoldResult = "failed";
      }
    }

    // Notifications
    if (claimed.client_id) {
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("user_id")
        .eq("id", claimed.client_id)
        .single();

      if (clientData?.user_id) {
        let paymentMessage: string;
        if (autoHoldResult === "auto_confirmed") {
          paymentMessage = "✅ Votre carte a été validée automatiquement.";
        } else if (clientWantsCard && driverHasStripe) {
          paymentMessage = "💳 Veuillez enregistrer votre carte bancaire.";
        } else if (clientWantsCard) {
          paymentMessage = "Le paiement se fera par carte avec le chauffeur.";
        } else {
          paymentMessage = "Le paiement en espèces se fera à la fin de la course.";
        }

        await supabaseClient.from("notifications").insert({
          user_id: clientData.user_id,
          title: "🎉 Un chauffeur a accepté votre course !",
          message: `${driver.company_name || 'Votre chauffeur'} a accepté votre demande. ${paymentMessage}`,
          type: autoHoldResult === "auto_confirmed" ? "success" : "info",
          link: `/suivi-course/${course.id}`,
        });
      }
    }

    await supabaseClient.from("notifications").insert({
      user_id: driver.user_id,
      title: "✅ Course acceptée",
      message: `Nouvelle course : ${claimed.pickup_address} → ${claimed.destination_address}`,
      type: "info",
      link: "/driver-dashboard?tab=courses",
    });

    // Send tracking email to guest
    if (!claimed.client_id && claimed.guest_email) {
      try {
        await supabaseClient.functions.invoke("send-guest-tracking-email", {
          body: { course_id: course.id },
          headers: { "x-internal-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "" },
        });
        logStep("Guest tracking email sent", { email: claimed.guest_email });
      } catch (emailErr) {
        logStep("Guest tracking email failed (non-blocking)", { error: String(emailErr) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        course_id: course.id,
        request_type: claimed.request_type,
        payment_flow: clientWantsCard && driverHasStripe ? "stripe_online" : clientWantsCard ? "tpe" : "cash",
        driver_has_stripe: driverHasStripe,
        auto_hold_result: autoHoldResult,
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
