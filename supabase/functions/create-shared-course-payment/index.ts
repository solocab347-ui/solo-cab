import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SHARED-COURSE-PAYMENT] ${step}${detailsStr}`);
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

    // Authenticate user (receiver driver completing the course)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const { shared_course_id } = await req.json();
    if (!shared_course_id) throw new Error("shared_course_id required");

    logStep("Processing shared course payment", { shared_course_id });

    // Get shared course details
    const { data: sharedCourse, error: scError } = await supabaseClient
      .from("shared_courses")
      .select(`
        *,
        course:courses(*),
        sender_driver:drivers!shared_courses_sender_driver_id_fkey(
          id, stripe_connect_account_id, stripe_connect_charges_enabled, user_id
        ),
        receiver_driver:drivers!shared_courses_receiver_driver_id_fkey(
          id, stripe_connect_account_id, stripe_connect_charges_enabled, user_id
        )
      `)
      .eq("id", shared_course_id)
      .single();

    if (scError || !sharedCourse) {
      throw new Error("Shared course not found");
    }

    // Verify the user is the receiver driver
    if (sharedCourse.receiver_driver.user_id !== userData.user.id) {
      throw new Error("Unauthorized: only receiver driver can create payment");
    }

    // Check both drivers have Stripe Connect enabled
    if (!sharedCourse.sender_driver.stripe_connect_account_id || 
        !sharedCourse.sender_driver.stripe_connect_charges_enabled) {
      throw new Error("Le chauffeur partenaire n'a pas configuré Stripe Connect");
    }

    if (!sharedCourse.receiver_driver.stripe_connect_account_id ||
        !sharedCourse.receiver_driver.stripe_connect_charges_enabled) {
      throw new Error("Vous devez configurer Stripe Connect pour encaisser les paiements");
    }

    const courseAmount = sharedCourse.course_amount;
    const commissionPercentage = sharedCourse.commission_percentage;
    const commissionAmount = sharedCourse.commission_amount;
    
    // Calculate split:
    // - Receiver keeps: courseAmount - commissionAmount
    // - Sender gets: commissionAmount (transferred after payment)
    const receiverKeeps = courseAmount - commissionAmount;
    const senderGets = commissionAmount;

    logStep("Payment split calculated", {
      courseAmount,
      commissionPercentage,
      commissionAmount,
      receiverKeeps,
      senderGets,
    });

    // Get client info for the checkout
    const { data: clientData } = await supabaseClient
      .from("clients")
      .select("user_id, profiles:user_id(email, full_name)")
      .eq("id", sharedCourse.course.client_id)
      .single();

    const origin = req.headers.get("origin") || "https://solocab.fr";

    // Create a Stripe Checkout session with payment going to receiver's Connect account
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: (clientData?.profiles as any)?.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Course VTC - ${sharedCourse.course.pickup_address} → ${sharedCourse.course.destination_address}`,
              description: `Course du ${new Date(sharedCourse.course.scheduled_date).toLocaleDateString('fr-FR')}`,
            },
            unit_amount: Math.round(courseAmount * 100), // In cents
          },
          quantity: 1,
        },
      ],
      // Payment goes to receiver's Stripe Connect account
      payment_intent_data: {
        // Use destination charge: full amount to receiver
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
          sender_stripe_account: sharedCourse.sender_driver.stripe_connect_account_id,
          type: "shared_course_payment",
        },
      },
      metadata: {
        shared_course_id,
        course_id: sharedCourse.course_id,
        type: "shared_course_payment",
      },
      success_url: `${origin}/driver-dashboard?payment=success&shared_course_id=${shared_course_id}`,
      cancel_url: `${origin}/driver-dashboard?payment=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    // Create payment record
    const { data: paymentRecord, error: paymentError } = await supabaseClient
      .from("shared_course_payments")
      .insert({
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
      })
      .select()
      .single();

    if (paymentError) {
      logStep("Error creating payment record", { error: paymentError.message });
    } else {
      // Update shared course with payment reference
      await supabaseClient
        .from("shared_courses")
        .update({
          payment_id: paymentRecord.id,
          payment_status: "awaiting_payment",
        })
        .eq("id", shared_course_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
