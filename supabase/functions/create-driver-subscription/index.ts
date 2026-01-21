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

    // Récupérer le type d'abonnement depuis le body (monthly ou annual)
    const subscriptionType = body?.subscription_type || "monthly";
    
    // Prix mensuel: 9.99€/mois avec 14 jours d'essai
    // Prix annuel: 101.90€/an (15% de réduction, non remboursable)
    const monthlyPriceId = "price_1SqaBl34nJZKnmmIKC7vYZy5"; // 9.99€/mois
    const annualPriceId = "price_1Srytp34nJZKnmmIcUnFX9DV"; // 101.90€/an
    
    const priceId = subscriptionType === "annual" ? annualPriceId : monthlyPriceId;
    const trialDays = subscriptionType === "annual" ? 0 : 14; // Pas d'essai pour l'annuel
    
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Using price:", priceId, "Type:", subscriptionType, "Trial:", trialDays);

    // Get origin for redirect URLs avec validation
    const origin = req.headers.get("origin");
    if (!origin) {
      console.error("[CREATE-DRIVER-SUBSCRIPTION] ❌ Origin header missing");
      throw new Error("Origin header required");
    }
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 🌐 Origin:", origin);

    // Create checkout session for SUBSCRIPTION with 14-DAY FREE TRIAL (mensuel uniquement)
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 💳 Creating checkout session...");
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          driver_id: driver_id,
          user_id: user.id,
          type: "driver_subscription",
          subscription_type: subscriptionType,
        },
      },
      success_url: `${origin}/driver-welcome?driver_id=${driver_id}&pioneer=false`,
      cancel_url: `${origin}/register-driver-promo`,
      metadata: {
        driver_id: driver_id,
        user_id: user.id,
        type: "driver_subscription",
        subscription_type: subscriptionType,
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      // Empreinte bancaire obligatoire même pour l'essai gratuit
      payment_method_collection: "always",
    };
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

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
