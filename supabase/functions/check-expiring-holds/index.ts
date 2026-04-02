import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EXPIRING-HOLDS] ${step}${detailsStr}`);
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find courses with confirmed holds older than 5 days (2 days before 7-day Stripe limit)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiringCourses, error } = await supabaseClient
      .from("courses")
      .select(`
        id, card_hold_status, card_hold_confirmed_at, 
        stripe_payment_intent_id, stripe_hold_payment_intent_id,
        driver_id, client_id, pickup_address, destination_address,
        final_payment_amount, guest_estimated_price, status,
        driver:drivers!courses_driver_id_fkey(user_id, company_name, stripe_connect_account_id, stripe_connect_charges_enabled)
      `)
      .eq("card_hold_status", "confirmed")
      .not("status", "in", '("completed","cancelled")')
      .lt("card_hold_confirmed_at", fiveDaysAgo);

    if (error) throw error;

    logStep("Found expiring holds", { count: expiringCourses?.length || 0 });

    const results = {
      warned: 0,
      auto_captured: 0,
      cancelled: 0,
      errors: 0,
    };

    for (const course of expiringCourses || []) {
      try {
        const holdDate = new Date(course.card_hold_confirmed_at!);
        const ageMs = Date.now() - holdDate.getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        const piId = course.stripe_hold_payment_intent_id || course.stripe_payment_intent_id;

        if (!piId) {
          logStep("No PaymentIntent ID found", { courseId: course.id });
          continue;
        }

        // Check actual Stripe status
        let paymentIntent: Stripe.PaymentIntent;
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(piId);
        } catch {
          logStep("PaymentIntent not found on Stripe", { piId, courseId: course.id });
          await supabaseClient
            .from("courses")
            .update({ card_hold_status: "expired", payment_status: "hold_expired" })
            .eq("id", course.id);
          results.cancelled++;
          continue;
        }

        // Already captured or cancelled on Stripe side
        if (paymentIntent.status !== "requires_capture") {
          logStep("Hold no longer capturable", { 
            courseId: course.id, 
            status: paymentIntent.status 
          });
          await supabaseClient
            .from("courses")
            .update({ 
              card_hold_status: paymentIntent.status === "canceled" ? "expired" : paymentIntent.status,
              payment_status: paymentIntent.status === "canceled" ? "hold_expired" : paymentIntent.status,
            })
            .eq("id", course.id);
          results.cancelled++;
          continue;
        }

        // > 6.5 days: AUTO-CAPTURE to avoid losing the hold
        if (ageDays >= 6.5) {
          logStep("🚨 Emergency auto-capture", { courseId: course.id, ageDays: ageDays.toFixed(1) });

          try {
            await stripe.paymentIntents.capture(piId);

            await supabaseClient
              .from("courses")
              .update({
                card_hold_status: "captured",
                payment_status: "paid",
                payment_captured_at: new Date().toISOString(),
              })
              .eq("id", course.id);

            // Notify driver
            if (course.driver?.user_id) {
              await supabaseClient.from("notifications").insert({
                user_id: course.driver.user_id,
                title: "⚠️ Empreinte capturée automatiquement",
                message: `L'empreinte bancaire de la course ${course.pickup_address} → ${course.destination_address} a été capturée automatiquement pour éviter son expiration. Veuillez finaliser cette course.`,
                type: "warning",
                link: "/driver-dashboard?tab=courses",
              });
            }

            results.auto_captured++;
          } catch (captureErr: any) {
            logStep("Auto-capture failed", { courseId: course.id, error: captureErr.message });
            results.errors++;
          }
          continue;
        }

        // 5-6.5 days: WARN the driver
        logStep("⚠️ Warning driver about expiring hold", { courseId: course.id, ageDays: ageDays.toFixed(1) });

        if (course.driver?.user_id) {
          // Check if we already warned today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const { data: existingNotif } = await supabaseClient
            .from("notifications")
            .select("id")
            .eq("user_id", course.driver.user_id)
            .eq("type", "warning")
            .ilike("title", "%empreinte expire%")
            .gte("created_at", todayStart.toISOString())
            .limit(1);

          if (!existingNotif?.length) {
            const daysLeft = Math.ceil(7 - ageDays);
            await supabaseClient.from("notifications").insert({
              user_id: course.driver.user_id,
              title: `⏰ Empreinte expire dans ${daysLeft}j`,
              message: `L'empreinte bancaire de la course ${course.pickup_address} → ${course.destination_address} expire dans ${daysLeft} jour(s). Finalisez la course pour encaisser le paiement.`,
              type: "warning",
              link: "/driver-dashboard?tab=courses",
            });
            results.warned++;
          }
        }
      } catch (courseErr: any) {
        logStep("Error processing course", { courseId: course.id, error: courseErr.message });
        results.errors++;
      }
    }

    logStep("Processing complete", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
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
