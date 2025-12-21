import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADD-FLEET-EXTRA-DRIVER] ${step}${detailsStr}`);
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { fleet_manager_id, quantity = 1 } = await req.json();
    if (!fleet_manager_id) throw new Error("fleet_manager_id is required");

    // Get fleet manager
    const { data: fleetManager, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("id", fleet_manager_id)
      .eq("user_id", user.id)
      .single();

    if (fmError || !fleetManager) {
      throw new Error("Fleet manager not found");
    }

    if (!fleetManager.stripe_customer_id || fleetManager.subscription_status !== 'active') {
      throw new Error("Abonnement actif requis pour ajouter des chauffeurs supplémentaires");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create extra driver product/price
    let product;
    const products = await stripe.products.list({ active: true, limit: 100 });
    product = products.data.find((p: { metadata?: { type?: string } }) => p.metadata?.type === "fleet_extra_driver");
    
    if (!product) {
      product = await stripe.products.create({
        name: "Chauffeur Supplémentaire SoloCab",
        description: "Chauffeur supplémentaire par mois (au-delà des 10 inclus)",
        metadata: { type: "fleet_extra_driver" },
      });
    }

    let price;
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    if (prices.data.length > 0) {
      price = prices.data[0];
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: 1000, // 10€
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { type: "fleet_extra_driver" },
      });
    }

    // Get existing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: fleetManager.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];

    // Check if extra driver price already exists in subscription
    const existingItem = subscription.items.data.find(
      (item: { price: { metadata?: { type?: string } }; quantity?: number; id: string }) => item.price.metadata?.type === "fleet_extra_driver"
    );

    if (existingItem) {
      // Update quantity
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity: existingItem.quantity! + quantity,
      });
      logStep("Updated existing extra driver item", { 
        newQuantity: existingItem.quantity! + quantity 
      });
    } else {
      // Add new subscription item
      await stripe.subscriptionItems.create({
        subscription: subscription.id,
        price: price.id,
        quantity: quantity,
      });
      logStep("Added extra driver to subscription", { quantity });
    }

    // Update local count
    const newCount = (fleetManager.extra_drivers_count || 0) + quantity;
    await supabaseClient
      .from("fleet_managers")
      .update({ extra_drivers_count: newCount })
      .eq("id", fleet_manager_id);

    return new Response(JSON.stringify({ 
      success: true, 
      extra_drivers_count: newCount,
      message: `${quantity} chauffeur(s) supplémentaire(s) ajouté(s) à votre abonnement`
    }), {
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
