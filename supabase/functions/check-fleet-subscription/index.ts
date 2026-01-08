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

    // Get fleet manager with free access fields
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

    const now = new Date();
    
    // ========================================
    // CHECK 1: Admin-granted free access
    // ========================================
    if (fleetManager.free_access_granted) {
      const freeAccessEnd = fleetManager.free_access_end_date 
        ? new Date(fleetManager.free_access_end_date) 
        : null;
      
      // Unlimited access or valid time-limited access
      const isFreeAccessValid = fleetManager.free_access_type === "unlimited" || 
        !freeAccessEnd || freeAccessEnd > now;
      
      if (isFreeAccessValid) {
        logStep("Admin-granted free access is valid", { 
          type: fleetManager.free_access_type,
          endsAt: fleetManager.free_access_end_date 
        });
        
        // Update status
        await supabaseClient
          .from("fleet_managers")
          .update({
            subscription_status: "active",
            subscription_paid: true,
            subscription_end_date: fleetManager.free_access_end_date,
          })
          .eq("id", fleetManager.id);
        
        // Count drivers
        const { count: driverCount } = await supabaseClient
          .from("fleet_manager_drivers")
          .select("*", { count: "exact", head: true })
          .eq("fleet_manager_id", fleetManager.id)
          .eq("status", "active");
        
        return new Response(JSON.stringify({ 
          subscribed: true,
          subscription_status: "active",
          subscription_end: fleetManager.free_access_end_date,
          is_free_access: true,
          free_access_type: fleetManager.free_access_type,
          fleet_manager: {
            ...fleetManager,
            subscription_status: "active",
            subscription_paid: true,
          },
          billing: {
            base_cost: 0,
            extra_drivers_count: 0,
            extra_drivers_cost: 0,
            total_monthly: 0,
            is_free: true,
          },
          drivers: {
            total: driverCount || 0,
            free_used: Math.min(driverCount || 0, fleetManager.max_free_drivers || 10),
            free_remaining: Math.max(0, (fleetManager.max_free_drivers || 10) - (driverCount || 0)),
            paid_count: 0,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Free access expired - only remove if not unlimited
        if (fleetManager.free_access_type !== "unlimited") {
          logStep("Free access expired, removing");
          await supabaseClient
            .from("fleet_managers")
            .update({
              free_access_granted: false,
              free_access_end_date: null,
              free_access_start_date: null,
              free_access_type: null,
            })
            .eq("id", fleetManager.id);
        }
      }
    }

    // ========================================
    // CHECK 2: Trial period (first month free)
    // ========================================
    if (fleetManager.trial_ends_at) {
      const trialEnd = new Date(fleetManager.trial_ends_at);
      if (trialEnd > now) {
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        logStep("Trial period active", { daysLeft, endsAt: fleetManager.trial_ends_at });
        
        // Update status to active during trial
        await supabaseClient
          .from("fleet_managers")
          .update({
            subscription_status: "trialing",
            subscription_paid: true,
            subscription_end_date: fleetManager.trial_ends_at,
          })
          .eq("id", fleetManager.id);
        
        // Count drivers
        const { count: driverCount } = await supabaseClient
          .from("fleet_manager_drivers")
          .select("*", { count: "exact", head: true })
          .eq("fleet_manager_id", fleetManager.id)
          .eq("status", "active");
        
        return new Response(JSON.stringify({ 
          subscribed: true,
          subscription_status: "trialing",
          subscription_end: fleetManager.trial_ends_at,
          is_trial: true,
          trial_days_left: daysLeft,
          fleet_manager: {
            ...fleetManager,
            subscription_status: "trialing",
            subscription_paid: true,
          },
          billing: {
            base_cost: 0,
            extra_drivers_count: 0,
            extra_drivers_cost: 0,
            total_monthly: 0,
            is_trial: true,
            next_billing_amount: fleetManager.base_subscription_cost || 69.99,
            next_billing_date: fleetManager.trial_ends_at,
          },
          drivers: {
            total: driverCount || 0,
            free_used: Math.min(driverCount || 0, fleetManager.max_free_drivers || 10),
            free_remaining: Math.max(0, (fleetManager.max_free_drivers || 10) - (driverCount || 0)),
            paid_count: Math.max(0, (driverCount || 0) - (fleetManager.max_free_drivers || 10)),
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // ========================================
    // CHECK 3: No Stripe customer = not subscribed
    // ========================================
    if (!fleetManager.stripe_customer_id) {
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: "inactive",
        fleet_manager: fleetManager,
        message: "Abonnement requis"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // CHECK 4: Stripe subscription status
    // ========================================
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check for trialing OR active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: fleetManager.stripe_customer_id,
      limit: 10,
    });

    // Find active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    const hasActiveSubscription = !!activeSubscription;
    let subscriptionEnd = null;
    let extraDriversCount = 0;
    let monthlyTotal = fleetManager.base_subscription_cost || 69.99;
    let isTrialing = false;

    if (hasActiveSubscription) {
      isTrialing = activeSubscription.status === "trialing";
      subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
      
      // Count extra drivers from subscription items
      const extraDriverItem = activeSubscription.items.data.find(
        (item: { price: { metadata?: { type?: string } }; quantity?: number }) => 
          item.price.metadata?.type === "fleet_extra_driver"
      );
      if (extraDriverItem) {
        extraDriversCount = extraDriverItem.quantity || 0;
        monthlyTotal += extraDriversCount * 10;
      }

      // Update fleet manager status
      await supabaseClient
        .from("fleet_managers")
        .update({
          subscription_status: isTrialing ? "trialing" : "active",
          subscription_paid: true,
          subscription_end_date: subscriptionEnd,
          extra_drivers_count: extraDriversCount,
        })
        .eq("id", fleetManager.id);

      logStep("Subscription found", { 
        status: activeSubscription.status,
        endDate: subscriptionEnd, 
        extraDrivers: extraDriversCount,
        monthlyTotal,
        isTrialing
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
      
      logStep("No active subscription found");
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
      subscription_status: hasActiveSubscription ? (isTrialing ? "trialing" : "active") : "inactive",
      subscription_end: subscriptionEnd,
      is_trial: isTrialing,
      fleet_manager: {
        ...fleetManager,
        subscription_status: hasActiveSubscription ? (isTrialing ? "trialing" : "active") : "inactive",
      },
      billing: {
        base_cost: isTrialing ? 0 : (fleetManager.base_subscription_cost || 69.99),
        extra_drivers_count: extraDriversCount,
        extra_drivers_cost: extraDriversCount * 10,
        total_monthly: isTrialing ? 0 : monthlyTotal,
        is_trial: isTrialing,
        next_billing_amount: isTrialing ? (fleetManager.base_subscription_cost || 69.99) + (extraDriversCount * 10) : null,
        next_billing_date: isTrialing ? subscriptionEnd : null,
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
