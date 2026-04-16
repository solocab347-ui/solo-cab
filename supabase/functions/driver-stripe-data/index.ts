import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Invalid token");
    }

    // Use service role client for DB queries
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get driver for this user
    const { data: driver } = await serviceClient
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("user_id", user.id)
      .single();

    if (!driver) throw new Error("Driver not found");
    if (!driver.stripe_connect_account_id) {
      return new Response(JSON.stringify({ error: "No Stripe Connect account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });
    const accountId = driver.stripe_connect_account_id;

    const { action } = await req.json();
    let result: any;

    switch (action) {
      case "get_balance": {
        const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
        result = balance;
        break;
      }

      case "list_payouts": {
        const payouts = await stripe.payouts.list(
          { limit: 10 },
          { stripeAccount: accountId }
        );
        result = payouts;
        break;
      }

      case "get_account_status": {
        const account = await stripe.accounts.retrieve(accountId);
        result = {
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          payout_schedule: account.settings?.payouts?.schedule,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("driver-stripe-data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
