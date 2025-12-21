import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-FLEET-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get fleet manager
    const { data: fleetManager, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fmError || !fleetManager) {
      return new Response(JSON.stringify({ 
        subscribed: false,
        fleet_manager: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!fleetManager.stripe_customer_id) {
      return new Response(JSON.stringify({ 
        subscribed: false,
        fleet_manager: fleetManager,
        message: "Abonnement requis"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check subscription status
    const subscriptions = await stripe.subscriptions.list({
      customer: fleetManager.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    const hasActiveSubscription = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let extraDriversCount = 0;
    let monthlyTotal = fleetManager.base_subscription_cost || 69.99;

    if (hasActiveSubscription) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Count extra drivers from subscription items
      const extraDriverItem = subscription.items.data.find(
        (item: { price: { metadata?: { type?: string } }; quantity?: number }) => item.price.metadata?.type === "fleet_extra_driver"
      );
      if (extraDriverItem) {
        extraDriversCount = extraDriverItem.quantity || 0;
        monthlyTotal += extraDriversCount * 10;
      }

      // Update fleet manager status
      await supabaseClient
        .from("fleet_managers")
        .update({
          subscription_status: "active",
          subscription_paid: true,
          subscription_end_date: subscriptionEnd,
          extra_drivers_count: extraDriversCount,
        })
        .eq("id", fleetManager.id);

      logStep("Subscription active", { 
        endDate: subscriptionEnd, 
        extraDrivers: extraDriversCount,
        monthlyTotal 
      });
    } else {
      // Update to inactive
      await supabaseClient
        .from("fleet_managers")
        .update({
          subscription_status: "inactive",
          subscription_paid: false,
        })
        .eq("id", fleetManager.id);
    }

    // Count current drivers
    const { count: driverCount } = await supabaseClient
      .from("fleet_manager_drivers")
      .select("*", { count: "exact", head: true })
      .eq("fleet_manager_id", fleetManager.id)
      .eq("status", "active");

    const freeDriversUsed = Math.min(driverCount || 0, fleetManager.max_free_drivers || 10);
    const paidDriversNeeded = Math.max(0, (driverCount || 0) - (fleetManager.max_free_drivers || 10));

    return new Response(JSON.stringify({ 
      subscribed: hasActiveSubscription,
      subscription_end: subscriptionEnd,
      fleet_manager: {
        ...fleetManager,
        subscription_status: hasActiveSubscription ? "active" : "inactive",
      },
      billing: {
        base_cost: fleetManager.base_subscription_cost || 69.99,
        extra_drivers_count: extraDriversCount,
        extra_drivers_cost: extraDriversCount * 10,
        total_monthly: monthlyTotal,
      },
      drivers: {
        total: driverCount || 0,
        free_used: freeDriversUsed,
        free_remaining: (fleetManager.max_free_drivers || 10) - freeDriversUsed,
        paid_count: paidDriversNeeded,
      }
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
