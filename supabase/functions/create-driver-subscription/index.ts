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

  // Utiliser SERVICE_ROLE_KEY pour bypasser RLS lors de la vérification de sécurité
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[CREATE-DRIVER-SUBSCRIPTION] Function started");

    // Authenticate user avec validation rigoureuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ No authorization header");
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // Créer un client temporaire avec anon key pour vérifier le token
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Auth error:", userError.message);
      throw new Error(`Auth error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ User not authenticated");
      throw new Error("User not authenticated");
    }
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ User authenticated:", user.email);

    // Get and validate driver_id from request body
    const body = await req.json();
    const driver_id = body?.driver_id;
    
    if (!driver_id || typeof driver_id !== "string") {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Invalid driver_id:", driver_id);
      throw new Error("driver_id is required and must be a valid UUID");
    }
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Driver ID:", driver_id);

    // SÉCURITÉ CRITIQUE: Vérifier que le driver appartient bien à l'utilisateur
    // Utilisation du service role key pour bypasser RLS et garantir la vérification
    const { data: driverCheck, error: driverCheckError } = await supabaseClient
      .from("drivers")
      .select("id, user_id, status")
      .eq("id", driver_id)
      .single();

    if (driverCheckError) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Database error:", driverCheckError.message);
      throw new Error("Database error verifying driver");
    }

    if (!driverCheck) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Driver not found:", driver_id);
      throw new Error("Driver not found");
    }

    // Vérification de sécurité: le driver doit appartenir à l'utilisateur authentifié
    if (driverCheck.user_id !== user.id) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Unauthorized: driver belongs to different user");
      throw new Error("You don't have permission to access this driver");
    }

    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Driver ownership verified, status:", driverCheck.status);

    // Initialize Stripe avec validation
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe configuration error");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Stripe initialized");

    // Check if Stripe customer exists
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 🔍 Checking for existing customer...");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Existing customer:", customerId);
    } else {
      // Create new customer
      console.log("[CREATE-DRIVER-SUBSCRIPTION] 📝 Creating new customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          user_id: user.id,
          driver_id: driver_id,
        },
      });
      customerId = customer.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ New customer created:", customerId);
    }

    // Create Stripe recurring subscription product and price
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 🔍 Creating/fetching recurring price...");
    
    // Check if product already exists
    const products = await stripe.products.list({ 
      limit: 10,
      active: true 
    });
    
    let productId: string;
    const existingProduct = products.data.find((p: any) => p.name === "Abonnement SoloCab - Chauffeur VTC");
    
    if (existingProduct) {
      productId = existingProduct.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Using existing product:", productId);
    } else {
      // Create product
      console.log("[CREATE-DRIVER-SUBSCRIPTION] 📝 Creating new product...");
      const product = await stripe.products.create({
        name: "Abonnement SoloCab - Chauffeur VTC",
        description: "Abonnement mensuel à la plateforme SoloCab pour chauffeurs VTC",
        metadata: {
          platform: "solocab",
          type: "driver_subscription"
        }
      });
      productId = product.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ New product created:", productId);
    }
    
    // Check if recurring price exists for this product
    const prices = await stripe.prices.list({ 
      product: productId, 
      limit: 10,
      active: true
    });
    
    let priceId: string | undefined = prices.data.find(
      (p: any) => p.recurring?.interval === "month" && p.unit_amount === 4999
    )?.id;
    
    if (!priceId) {
      // Create recurring monthly price
      console.log("[CREATE-DRIVER-SUBSCRIPTION] 📝 Creating new recurring price...");
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: 4999, // 49.99€
        currency: "eur",
        recurring: {
          interval: "month",
        },
        metadata: {
          platform: "solocab"
        }
      });
      priceId = price.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ New recurring price created:", priceId);
    } else {
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Using existing recurring price:", priceId);
    }

    // Get origin for redirect URLs avec validation
    const origin = req.headers.get("origin");
    if (!origin) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Origin header missing");
      throw new Error("Origin header required");
    }
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 🌐 Origin:", origin);

    // Create checkout session for SUBSCRIPTION with 1 MONTH FREE TRIAL
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 💳 Creating checkout session with 30-day free trial...");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30, // 1 mois gratuit
        metadata: {
          driver_id: driver_id,
          user_id: user.id,
          type: "driver_subscription",
        },
      },
      success_url: `${origin}/driver-welcome?driver_id=${driver_id}&pioneer=false`,
      cancel_url: `${origin}/register-driver-promo`,
      metadata: {
        driver_id: driver_id,
        user_id: user.id,
        type: "driver_subscription",
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    if (!session.url) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ No checkout URL generated");
      throw new Error("Failed to generate checkout URL");
    }

    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Checkout session created:", session.id);
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 🔗 URL:", session.url.substring(0, 50) + "...");

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id,
        success: true
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CREATE-DRIVER-SUBSCRIPTION] 💥 FATAL ERROR:", error.message);
    console.error("[CREATE-DRIVER-SUBSCRIPTION] Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        details: "Une erreur est survenue lors de la création de la session de paiement"
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
