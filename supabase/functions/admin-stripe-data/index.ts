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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid token");

    const { data: role } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) throw new Error("Not admin");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

    const { action, params } = await req.json();

    let result: any;

    switch (action) {
      case "list_payment_intents": {
        const baseParams: any = {
          limit: params?.limit || 25,
          starting_after: params?.starting_after || undefined,
          created: params?.created || undefined,
          expand: ["data.latest_charge.balance_transaction"],
        };
        // If account_id is provided, scope the request to that connected account
        const requestOptions = params?.account_id
          ? { stripeAccount: params.account_id as string }
          : undefined;
        const pis = await stripe.paymentIntents.list(baseParams, requestOptions);

        // Re-shape: expose `charges.data[0].balance_transaction.fee` for the admin UI
        // (Stripe's new API returns `latest_charge` instead of `charges`)
        const enriched = {
          ...pis,
          data: pis.data.map((pi: any) => {
            const lc = pi?.latest_charge;
            if (lc && typeof lc === "object") {
              return {
                ...pi,
                charges: { data: [lc] },
              };
            }
            return pi;
          }),
        };
        result = enriched;
        break;
      }

      case "get_payment_intent": {
        const pi = await stripe.paymentIntents.retrieve(params.id, {
          expand: ["charges", "latest_charge"],
        });
        result = pi;
        break;
      }

      case "list_payouts": {
        if (!params?.account_id) throw new Error("account_id required");
        const payouts = await stripe.payouts.list(
          { limit: params?.limit || 10 },
          { stripeAccount: params.account_id }
        );
        result = payouts;
        break;
      }

      case "get_balance": {
        if (!params?.account_id) throw new Error("account_id required");
        const balance = await stripe.balance.retrieve({
          stripeAccount: params.account_id,
        });
        result = balance;
        break;
      }

      case "get_account": {
        if (!params?.account_id) throw new Error("account_id required");
        const account = await stripe.accounts.retrieve(params.account_id);
        result = {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          email: account.email,
          business_profile: account.business_profile,
          settings: account.settings,
        };
        break;
      }

      case "list_transfers": {
        const transfers = await stripe.transfers.list({
          limit: params?.limit || 25,
          destination: params?.destination || undefined,
        });
        result = transfers;
        break;
      }

      case "search_payment_intents": {
        const query = params?.query;
        if (!query) throw new Error("query required");
        const searchResult = await stripe.paymentIntents.search({
          query,
          limit: params?.limit || 25,
        });
        result = searchResult;
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
    console.error("admin-stripe-data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
