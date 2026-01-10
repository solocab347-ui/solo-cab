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

    // Check for free access first - INCLUDE created_at for grace period check
    const { data: driver } = await supabaseClient
      .from("drivers")
      .select("id, free_access_granted, free_access_end_date, free_access_type, is_pioneer, created_at, subscription_paid")
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
      subscriptionPaid: driver.subscription_paid
    });

    const now = new Date();
    const endDate = driver.free_access_end_date ? new Date(driver.free_access_end_date) : null;
    const createdAt = driver.created_at ? new Date(driver.created_at) : null;

    // NOUVEAU: Vérifier la période de grâce de 30 jours (tous les chauffeurs nouvellement inscrits)
    const gracePeriodEnd = createdAt ? new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
    const isInGracePeriod = gracePeriodEnd && now < gracePeriodEnd;

    if (isInGracePeriod) {
      logStep("Driver in 30-day grace period, granting access", { 
        createdAt: driver.created_at,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        daysLeft: Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
      
      // Ensure subscription_status is active during grace period
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
        subscription_end: gracePeriodEnd.toISOString(),
        is_free_access: true,
        is_grace_period: true,
        grace_period_days_left: Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
      // Check if free access is still valid (no end date = unlimited, or end date is in future)
      const isFreeAccessValid = !endDate || endDate > now;
      
      if (isFreeAccessValid) {
        logStep("Free access is valid, returning active status");
        
        // Update driver status to active in database
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
          is_free_access: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Free access expired
        logStep("Free access expired");
        
        // PROTECTION: Ne jamais retirer free_access_granted si type = "unlimited"
        // Les 50 premiers chauffeurs du test ont un accès illimité PERMANENT
        if (driver.free_access_type !== "unlimited") {
          // Seulement pour les accès temporaires (1/2/3 mois), on peut retirer
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
        } else {
          // Pour "unlimited", on garde free_access_granted à true même si end_date passée
          logStep("Unlimited free access - keeping it active permanently");
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
            is_permanent: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
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
