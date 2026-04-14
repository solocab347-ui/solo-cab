import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_IDS = {
  monthly: "prod_UIyvxaQ5c7vZSH",
  yearly: "prod_UIyvQp5D4JWxP5",
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function unauthenticatedResponse(error: string) {
  return jsonResponse({
    error,
    subscribed: false,
    plan: null,
    subscription_end: null,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");

  // Admin client for DB writes
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    if (!authHeader?.startsWith("Bearer ")) {
      return unauthenticatedResponse("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return unauthenticatedResponse("Invalid or expired token");
    }

    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return unauthenticatedResponse("No email in token");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      return jsonResponse({ subscribed: false, plan: null, subscription_end: null });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // Find SoloCab Premium subscription
    let isPremium = false;
    let plan = null;
    let subscriptionEnd = null;
    let subscriptionId = null;

    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product;
      if (productId === PRODUCT_IDS.monthly || productId === PRODUCT_IDS.yearly) {
        isPremium = true;
        plan = productId === PRODUCT_IDS.yearly ? "yearly" : "monthly";
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
        subscriptionId = sub.id;
        break;
      }
    }

    // Sync to database
    if (isPremium) {
      const { data: driver } = await adminClient
        .from("drivers")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (driver) {
        await adminClient
          .from("driver_subscriptions")
          .upsert({
            driver_id: driver.id,
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            plan: plan,
            status: "active",
            current_period_end: subscriptionEnd,
            updated_at: new Date().toISOString(),
          }, { onConflict: "driver_id" });
      }
    }

    return jsonResponse({
      subscribed: isPremium,
      plan,
      subscription_end: subscriptionEnd,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});
