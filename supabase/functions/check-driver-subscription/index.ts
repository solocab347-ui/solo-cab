import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-DRIVER-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for driver with trial and subscription info
    const { data: driver } = await supabaseClient
      .from("drivers")
      .select("id, free_access_granted, free_access_end_date, free_access_type, is_pioneer, created_at, subscription_paid, trial_status, trial_start_date, trial_end_date, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (!driver) {
      logStep("No driver found");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: "inactive",
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Driver data retrieved", { 
      driverId: driver.id, 
      hasFreeAccess: driver.free_access_granted,
      isPioneer: driver.is_pioneer,
      freeAccessType: driver.free_access_type,
      createdAt: driver.created_at,
      subscriptionPaid: driver.subscription_paid,
      trialStatus: driver.trial_status,
      trialEndDate: driver.trial_end_date
    });

    const now = new Date();

    // NOUVEAU SYSTÈME: Vérifier l'essai gratuit de 14 jours
    if (driver.trial_status === 'active' && driver.trial_end_date) {
      const trialEnd = new Date(driver.trial_end_date);
      
      if (now < trialEnd) {
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        logStep("Driver in 14-day trial period", { 
          trialEnd: driver.trial_end_date,
          daysLeft 
        });
        
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_status: "trialing",
          subscription_end: driver.trial_end_date,
          is_trial: true,
          trial_days_left: daysLeft,
          is_free_access: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Trial expired - update status
        logStep("Trial expired, updating status");
        await supabaseClient
          .from("drivers")
          .update({
            trial_status: "expired",
            subscription_status: "expired",
          })
          .eq("id", driver.id);
        
        return new Response(JSON.stringify({
          subscribed: false,
          subscription_status: "expired",
          subscription_end: driver.trial_end_date,
          is_trial_expired: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Check for expired trial (already marked as expired)
    if (driver.trial_status === 'expired' && !driver.subscription_paid) {
      logStep("Trial already expired, user needs to subscribe");
      return new Response(JSON.stringify({
        subscribed: false,
        subscription_status: "expired",
        subscription_end: driver.trial_end_date,
        is_trial_expired: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const endDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
    const createdAt = driver.created_at ? new Date(driver.created_at) : null;

    // Check if this is a pioneer with active trial
    const isPioneerTrialActive = driver.is_pioneer && 
      driver.free_access_type === "trial" && 
      endDate && 
      endDate > now;

    // If pioneer with active trial, grant access
    if (isPioneerTrialActive) {
      logStep("Pioneer trial active, granting access", { 
        trialEnds: driver.free_access_end_date,
        daysLeft: Math.ceil((endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
      
      // Ensure subscription_status is active
      await supabaseClient
        .from("drivers")
        .update({
          subscription_status: "active",
          subscription_end_date: driver.free_access_end_date,
          subscription_paid: true,
        })
        .eq("id", driver.id);
      
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_status: "active",
        subscription_end: driver.free_access_end_date,
        is_free_access: true,
        is_pioneer_trial: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If driver has free access granted (admin granted)
    if (driver.free_access_granted) {
      // Types permanents: TOUJOURS accès, même si end_date passée par erreur
      const isPermanentAccess = driver.free_access_type === "unlimited" || driver.free_access_type === "administrative";
      
      if (isPermanentAccess) {
        logStep("PERMANENT free access - always valid", { 
          type: driver.free_access_type,
          driverId: driver.id 
        });
        
        await supabaseClient
          .from("drivers")
          .update({
            subscription_status: "active",
            subscription_paid: true,
          })
          .eq("id", driver.id);
        
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_status: "active",
          subscription_end: null,
          is_free_access: true,
          is_permanent: true,
          free_access_type: driver.free_access_type,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Pour les accès temporaires, vérifier la date de fin
      const isFreeAccessValid = !endDate || endDate > now;
      
      if (isFreeAccessValid) {
        logStep("Time-limited free access is valid", {
          endDate: driver.free_access_end_date,
          type: driver.free_access_type
        });
        
        await supabaseClient
          .from("drivers")
          .update({
            subscription_status: "active",
            subscription_end_date: driver.free_access_end_date,
            subscription_paid: true,
          })
          .eq("id", driver.id);
        
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_status: "active",
          subscription_end: driver.free_access_end_date,
          is_free_access: true,
          is_permanent: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Free access temporaire expiré
        logStep("Time-limited free access expired", {
          endDate: driver.free_access_end_date,
          type: driver.free_access_type
        });
        
        // Révoquer l'accès temporaire expiré
        await supabaseClient
          .from("drivers")
          .update({
            free_access_granted: false,
            free_access_end_date: null,
            free_access_start_date: null,
            free_access_type: null,
            subscription_status: "inactive",
            subscription_paid: false,
          })
          .eq("id", driver.id);
      }
    }

    // If no valid free access, check Stripe subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning inactive status");
      
      // Update to inactive
      await supabaseClient
        .from("drivers")
        .update({
          subscription_status: "inactive",
          subscription_paid: false,
        })
        .eq("id", driver.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: "inactive",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active OR trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    
    // Find any active or trialing subscription
    const validSubscription = subscriptions.data.find(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );
    
    const hasActiveSub = !!validSubscription;
    let subscriptionId = null;
    let subscriptionEnd = null;
    let subscriptionStatus = "inactive";

    if (hasActiveSub && validSubscription) {
      subscriptionId = validSubscription.id;
      subscriptionEnd = new Date(validSubscription.current_period_end * 1000).toISOString();
      subscriptionStatus = validSubscription.status;
      logStep("Active/trialing subscription found", { subscriptionId, endDate: subscriptionEnd, status: subscriptionStatus });

      // Update driver subscription status in database - active for both "active" and "trialing"
      await supabaseClient
        .from("drivers")
        .update({
          subscription_status: "active",
          subscription_stripe_id: subscriptionId,
          subscription_end_date: subscriptionEnd,
          subscription_paid: true,
        })
        .eq("id", driver.id);
      logStep("Driver subscription status updated in database");
    } else {
      logStep("No active subscription found, updating status to inactive");
      // Update driver to inactive if no Stripe subscription
      await supabaseClient
        .from("drivers")
        .update({
          subscription_status: "inactive",
          subscription_paid: false,
        })
        .eq("id", driver.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_status: hasActiveSub ? "active" : "inactive",
      subscription_id: subscriptionId,
      subscription_end: subscriptionEnd,
      is_free_access: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
