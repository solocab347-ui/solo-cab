import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SHARED-COURSE-PAYMENT-LINK] ${step}${d}`);
};

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

    const { shared_course_id, force_recreate } = await req.json();
    if (!shared_course_id) throw new Error("shared_course_id required");

    const { data: sharedCourse, error: scErr } = await supabaseClient
      .from("shared_courses")
      .select(`
        *,
        course:courses(*),
        sender_driver:drivers!shared_courses_sender_driver_id_fkey(
          id, user_id, stripe_connect_account_id, stripe_connect_charges_enabled
        ),
        receiver_driver:drivers!shared_courses_receiver_driver_id_fkey(
          id, user_id, stripe_connect_account_id, stripe_connect_charges_enabled
        )
      `)
      .eq("id", shared_course_id)
      .single();

    if (scErr || !sharedCourse) throw new Error("Shared course not found");

    // Authorize: caller must be sender OR receiver
    const callerUserId = userData.user.id;
    const isSender = sharedCourse.sender_driver?.user_id === callerUserId;
    const isReceiver = sharedCourse.receiver_driver?.user_id === callerUserId;
    if (!isSender && !isReceiver) {
      throw new Error("Unauthorized: only sender or receiver driver");
    }

    // Already paid?
    const ps = String(sharedCourse.payment_status || "");
    if (ps.startsWith("paid")) {
      return new Response(
        JSON.stringify({
          success: true,
          already_paid: true,
          payment_status: ps,
          checkout_url: sharedCourse.client_payment_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Reuse existing link if still active
    if (
      !force_recreate && sharedCourse.client_payment_url &&
      sharedCourse.stripe_checkout_session_id
    ) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(
          sharedCourse.stripe_checkout_session_id,
        );
        if (existing.status === "open") {
          log("Reusing existing checkout session", {
            session_id: existing.id,
          });
          return new Response(
            JSON.stringify({
              success: true,
              reused: true,
              checkout_url: sharedCourse.client_payment_url,
              session_id: existing.id,
            }),
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
              status: 200,
            },
          );
        }
      } catch (_) {
        // Session not retrievable: continue to create a new one
      }
    }

    // Both Stripe Connect accounts must be enabled (commission split target)
    if (
      !sharedCourse.sender_driver.stripe_connect_account_id ||
      !sharedCourse.sender_driver.stripe_connect_charges_enabled
    ) {
      throw new Error("Le chauffeur émetteur n'a pas configuré Stripe Connect");
    }
    if (
      !sharedCourse.receiver_driver.stripe_connect_account_id ||
      !sharedCourse.receiver_driver.stripe_connect_charges_enabled
    ) {
      throw new Error("Le chauffeur receveur n'a pas configuré Stripe Connect");
    }

    const courseAmount = Number(sharedCourse.course_amount || 0);
    const commissionPercentage = Number(
      sharedCourse.commission_percentage || 0,
    );
    const commissionAmount = Number(sharedCourse.commission_amount || 0);
    if (courseAmount <= 0) throw new Error("Montant de la course invalide");

    const receiverKeeps = courseAmount - commissionAmount;
    const senderGets = commissionAmount;

    // Try to find a customer email (registered client OR guest course)
    let clientEmail: string | undefined;
    if (sharedCourse.course?.client_id) {
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("user_id")
        .eq("id", sharedCourse.course.client_id)
        .single();
      if (clientData?.user_id) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email")
          .eq("id", clientData.user_id)
          .single();
        clientEmail = profile?.email || undefined;
      }
    }
    if (!clientEmail && sharedCourse.course?.guest_email) {
      clientEmail = sharedCourse.course.guest_email;
    }

    const origin = req.headers.get("origin") || "https://solocab.fr";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: clientEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Course VTC partagée`,
              description:
                `${sharedCourse.course.pickup_address} → ${sharedCourse.course.destination_address}`,
            },
            unit_amount: Math.round(courseAmount * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: sharedCourse.receiver_driver.stripe_connect_account_id,
        },
        on_behalf_of: sharedCourse.receiver_driver.stripe_connect_account_id,
        metadata: {
          shared_course_id,
          course_id: sharedCourse.course_id,
          sender_driver_id: sharedCourse.sender_driver_id,
          receiver_driver_id: sharedCourse.receiver_driver_id,
          commission_amount: String(commissionAmount),
          sender_stripe_account:
            sharedCourse.sender_driver.stripe_connect_account_id,
          solocab_fee: "0.25",
          type: "shared_course_payment",
        },
      },
      metadata: {
        shared_course_id,
        course_id: sharedCourse.course_id,
        type: "shared_course_payment",
      },
      success_url:
        `${origin}/driver-dashboard?payment=success&shared_course_id=${shared_course_id}`,
      cancel_url: `${origin}/driver-dashboard?payment=cancelled`,
    });

    log("Checkout session created", { session_id: session.id });

    // Upsert payment record
    const { data: existingPayment } = await supabaseClient
      .from("shared_course_payments")
      .select("id")
      .eq("shared_course_id", shared_course_id)
      .maybeSingle();

    if (existingPayment) {
      await supabaseClient
        .from("shared_course_payments")
        .update({
          stripe_checkout_session_id: session.id,
          status: "payment_processing",
          course_amount: courseAmount,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          receiver_payout_amount: receiverKeeps,
          sender_commission_amount: senderGets,
        })
        .eq("id", existingPayment.id);
    } else {
      await supabaseClient.from("shared_course_payments").insert({
        shared_course_id,
        course_id: sharedCourse.course_id,
        sender_driver_id: sharedCourse.sender_driver_id,
        receiver_driver_id: sharedCourse.receiver_driver_id,
        course_amount: courseAmount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        receiver_payout_amount: receiverKeeps,
        sender_commission_amount: senderGets,
        stripe_checkout_session_id: session.id,
        status: "payment_processing",
      });
    }

    // Persist the link on shared_courses for both drivers to read
    await supabaseClient
      .from("shared_courses")
      .update({
        client_payment_url: session.url,
        stripe_checkout_session_id: session.id,
        payment_status: "awaiting_payment",
        payment_link_created_at: new Date().toISOString(),
        payment_link_created_by: callerUserId,
      })
      .eq("id", shared_course_id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        amount_ttc: courseAmount,
        created_by: isSender ? "sender" : "receiver",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
