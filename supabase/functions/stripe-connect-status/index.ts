import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Backend configuration error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }

  const supabaseClient = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) throw new Error("User not authenticated");

    let userId: string | null = null;

    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (!claimsError && claimsData?.claims?.sub) {
      userId = claimsData.claims.sub;
    } else {
      logStep("JWT claims validation failed, trying auth fallback", {
        error: claimsError?.message ?? null,
      });

      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData?.user?.id) {
        logStep("JWT auth fallback failed", {
          error: userError?.message ?? null,
        });
        throw new Error("User not authenticated");
      }

      userId = userData.user.id;
    }

    // Get driver record
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_status")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    if (!driver.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({
          connected: false,
          status: "not_connected",
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(driver.stripe_connect_account_id);
    
    logStep("Account status retrieved", {
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });

    // Determine status
    let status = "pending";
    if (account.charges_enabled && account.payouts_enabled) {
      status = "active";
      
      // Ensure payout schedule is weekly/monday for all active accounts
      try {
        await stripe.accounts.update(driver.stripe_connect_account_id, {
          settings: {
            payouts: {
              schedule: {
                interval: "weekly",
                weekly_anchor: "monday",
              },
            },
          },
        });
        logStep("Payout schedule confirmed weekly/monday");
      } catch (schedErr) {
        logStep("Payout schedule update failed (non-blocking)", { error: String(schedErr) });
      }
    } else if (account.details_submitted) {
      status = "pending_verification";
    }

    // Update driver record
    await supabaseClient
      .from("drivers")
      .update({
        stripe_connect_status: status,
        stripe_connect_onboarding_completed: account.details_submitted,
        stripe_connect_details_submitted: account.details_submitted,
        stripe_connect_charges_enabled: account.charges_enabled,
        stripe_connect_payouts_enabled: account.payouts_enabled,
        stripe_connect_updated_at: new Date().toISOString(),
      })
      .eq("id", driver.id);

    return new Response(
      JSON.stringify({
        connected: true,
        status,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        account_id: account.id,
        email: account.email || null,
        business_profile_name: account.business_profile?.name || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const status = errorMessage === "User not authenticated" || errorMessage === "No authorization header"
      ? 401
      : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      }
    );
  }
});
