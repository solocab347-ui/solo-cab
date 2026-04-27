import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: Record<string, unknown>) =>
  console.log(`[VERIFY-SHARED-COURSE-PAYMENT] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth
      .getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { shared_course_id } = await req.json();
    if (!shared_course_id) throw new Error("shared_course_id required");

    const { data: sc, error } = await supabaseClient
      .from("shared_courses")
      .select(`
        id, payment_status, stripe_checkout_session_id, client_payment_url,
        course_amount,
        sender_driver:drivers!shared_courses_sender_driver_id_fkey(user_id),
        receiver_driver:drivers!shared_courses_receiver_driver_id_fkey(user_id)
      `)
      .eq("id", shared_course_id)
      .single();

    if (error || !sc) throw new Error("Shared course not found");

    const callerId = userData.user.id;
    const allowed = sc.sender_driver?.user_id === callerId ||
      sc.receiver_driver?.user_id === callerId;
    if (!allowed) throw new Error("Unauthorized");

    // Already marked paid in DB
    if (String(sc.payment_status || "").startsWith("paid")) {
      return new Response(
        JSON.stringify({ success: true, paid: true, payment_status: sc.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!sc.stripe_checkout_session_id) {
      return new Response(
        JSON.stringify({ success: true, paid: false, reason: "no_session" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Re-check with Stripe
    const session = await stripe.checkout.sessions.retrieve(
      sc.stripe_checkout_session_id,
    );
    log("Stripe session", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });

    const paid = session.payment_status === "paid";

    if (paid) {
      // Trigger DB update (mirrors webhook logic for safety)
      await supabaseClient
        .from("shared_courses")
        .update({
          payment_status: "paid",
          payment_settled: true,
          payment_settled_at: new Date().toISOString(),
        })
        .eq("id", sc.id)
        .like("payment_status", "%awaiting%"); // only if still awaiting
    }

    return new Response(
      JSON.stringify({
        success: true,
        paid,
        payment_status: paid ? "paid" : sc.payment_status,
        stripe_status: session.payment_status,
        amount_total: session.amount_total
          ? session.amount_total / 100
          : sc.course_amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
