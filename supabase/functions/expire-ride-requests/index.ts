import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    // 1. Expirer les ride requests timeout
    const { data, error } = await supabase.rpc("expire_timed_out_ride_requests");
    if (error) throw error;

    console.log(`[EXPIRE-RIDE-REQUESTS] Expired ${data} ride requests`);

    // 2. Libérer les empreintes bancaires des courses sans chauffeur accepté
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Trouver les courses expirées avec des holds actifs non capturés
      const { data: ghostHolds } = await supabase
        .from("courses")
        .select("id, stripe_hold_payment_intent_id, stripe_payment_intent_id, card_hold_status")
        .in("status", ["cancelled", "expired"])
        .eq("card_hold_status", "confirmed")
        .is("payment_captured_at", null)
        .not("stripe_hold_payment_intent_id", "is", null)
        .limit(50);

      let cancelledCount = 0;
      if (ghostHolds && ghostHolds.length > 0) {
        for (const course of ghostHolds) {
          const piId = course.stripe_hold_payment_intent_id || course.stripe_payment_intent_id;
          if (!piId) continue;

          try {
            await stripe.paymentIntents.cancel(piId);
            await supabase
              .from("courses")
              .update({ card_hold_status: "released", payment_status: "cancelled" })
              .eq("id", course.id);
            cancelledCount++;
            console.log(`[EXPIRE-RIDE-REQUESTS] Cancelled ghost hold ${piId} for course ${course.id}`);
          } catch (cancelErr: any) {
            // Already cancelled/captured — just update DB
            if (cancelErr.code === "payment_intent_unexpected_state") {
              await supabase
                .from("courses")
                .update({ card_hold_status: "released" })
                .eq("id", course.id);
            }
            console.log(`[EXPIRE-RIDE-REQUESTS] Hold cancel skip: ${cancelErr.message}`);
          }
        }
      }

      console.log(`[EXPIRE-RIDE-REQUESTS] Cancelled ${cancelledCount} ghost holds`);
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("[EXPIRE-RIDE-REQUESTS] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
