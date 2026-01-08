import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-FLEET-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { fleet_manager_id } = await req.json();
    if (!fleet_manager_id) throw new Error("fleet_manager_id is required");

    // Get fleet manager data
    const { data: fleetManager, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("id", fleet_manager_id)
      .eq("user_id", user.id)
      .single();

    if (fmError || !fleetManager) {
      throw new Error("Fleet manager not found or access denied");
    }
    logStep("Fleet manager found", { id: fleetManager.id, company: fleetManager.company_name });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    let customerId = fleetManager.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: fleetManager.company_name,
          metadata: {
            fleet_manager_id: fleet_manager_id,
            user_id: user.id,
            type: "fleet_manager",
          },
        });
        customerId = customer.id;
      }
      
      // Save customer ID
      await supabaseClient
        .from("fleet_managers")
        .update({ stripe_customer_id: customerId })
        .eq("id", fleet_manager_id);
      
      logStep("Stripe customer created/found", { customerId });
    }

    // Get or create Fleet Manager subscription product
    let product;
    const products = await stripe.products.list({ active: true, limit: 100 });
    product = products.data.find((p: { metadata?: { type?: string } }) => p.metadata?.type === "fleet_manager_subscription");
    
    if (!product) {
      product = await stripe.products.create({
        name: "Abonnement Gestionnaire de Flotte SoloCab",
        description: "Abonnement mensuel avec 10 chauffeurs inclus - 1er mois GRATUIT",
        metadata: { type: "fleet_manager_subscription" },
      });
      logStep("Product created", { productId: product.id });
    }

    // Get or create price (69.99€/month)
    let price;
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    if (prices.data.length > 0) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 6999, // 69.99€
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { type: "fleet_manager_base_subscription" },
      });
      logStep("Price created", { priceId: price.id });
    }

    // Create checkout session with 30-day FREE TRIAL (empreinte bancaire de 0€)
    const origin = req.headers.get("origin") || "https://solocab.fr";
    const trialEndDate = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/fleet-dashboard?payment=success`,
      cancel_url: `${origin}/fleet-dashboard?payment=cancelled`,
      metadata: {
        fleet_manager_id: fleet_manager_id,
        type: "fleet_manager_subscription",
      },
      subscription_data: {
        trial_period_days: 30, // 1 MOIS GRATUIT
        metadata: {
          fleet_manager_id: fleet_manager_id,
          type: "fleet_manager_subscription",
        },
      },
      // Collect payment method for future charges (0€ today)
      payment_method_collection: "always",
    });

    logStep("Checkout session created with 30-day trial", { 
      sessionId: session.id, 
      url: session.url,
      trialDays: 30 
    });

    // Update fleet manager with trial dates
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    await supabaseClient
      .from("fleet_managers")
      .update({
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })
      .eq("id", fleet_manager_id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
