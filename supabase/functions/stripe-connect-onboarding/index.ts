import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARDING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get driver record
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_status, company_name")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    logStep("Driver found", { driverId: driver.id, existingAccount: driver.stripe_connect_account_id });

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", userId)
      .single();

    const productionUrl = "https://solocab.fr";
    let accountId = driver.stripe_connect_account_id;

    // Create Stripe Connect account if not exists
    if (!accountId) {
      logStep("Creating new Stripe Connect Express account");

      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: profile?.email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: driver.company_name || profile?.full_name || "Chauffeur VTC",
          mcc: "4121",
          url: `${productionUrl}/driver/${driver.id}`,
        },
        metadata: {
          driver_id: driver.id,
          platform: "solocab",
        },
      });

      accountId = account.id;
      logStep("Stripe Connect account created", { accountId });

      // Configure payout schedule: weekly on Monday — Stripe handles everything
      try {
        await stripe.accounts.update(accountId, {
          settings: {
            payouts: {
              schedule: {
                interval: "weekly",
                weekly_anchor: "monday",
              },
            },
          },
        });
        logStep("Payout schedule set to weekly/monday", { accountId });
      } catch (payoutErr) {
        logStep("Warning: payout schedule config failed (will default)", { error: String(payoutErr) });
      }

      // Save account ID to driver
      await supabaseClient
        .from("drivers")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "pending",
          stripe_connect_created_at: new Date().toISOString(),
        })
        .eq("id", driver.id);
    }

    // Create onboarding link - IMPORTANT: Return to driver-welcome (onboarding page)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/driver-welcome?stripe_connect=refresh`,
      return_url: `${origin}/driver-welcome?stripe_connect=success`,
      type: "account_onboarding",
    });

    logStep("Onboarding link created", { url: accountLink.url });

    return new Response(
      JSON.stringify({
        success: true,
        url: accountLink.url,
        account_id: accountId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
