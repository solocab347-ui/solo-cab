import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES = {
  monthly: "price_1TKMxCAdFPYTU471ZinaFMmJ",
  yearly: "price_1TKMy1AdFPYTU471bWDDdN2T",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Utilisateur non authentifié");
    
    const user = userData.user;

    const { data: driver } = await supabaseClient
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!driver) throw new Error("Profil chauffeur non trouvé");

    const body = await req.json().catch(() => ({}));
    const plan = body.plan === "yearly" ? "yearly" : "monthly";
    const priceId = PRICES[plan];

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Configuration Stripe manquante");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: { user_id: user.id, driver_id: driver.id },
      });
      customerId = customer.id;
    }

    const origin = req.headers.get("origin") || "https://solo-cab-to-lovable.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/driver-dashboard?premium=success`,
      cancel_url: `${origin}/driver-dashboard?premium=cancel`,
      metadata: { driver_id: driver.id, user_id: user.id, plan },
      subscription_data: {
        metadata: { driver_id: driver.id, user_id: user.id, plan },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[CREATE-PREMIUM-CHECKOUT] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
