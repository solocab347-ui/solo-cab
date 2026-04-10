import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Non authentifié");

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token === "undefined" || token === "null") {
      throw new Error("Non authentifié");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user?.id) throw new Error("Non authentifié");
    const userId = userData.user.id;

    // Get driver
    const { data: driver, error: driverError } = await adminClient
      .from("drivers")
      .select("id, stripe_connect_account_id, stripe_connect_charges_enabled, company_name")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) throw new Error("Profil chauffeur introuvable");
    if (!driver.stripe_connect_account_id || !driver.stripe_connect_charges_enabled) {
      throw new Error("Stripe Connect non configuré. Activez-le dans vos paramètres d'encaissement.");
    }

    // Parse body
    const { amount, description, date } = await req.json();
    if (!amount || typeof amount !== "number" || amount < 1) {
      throw new Error("Montant invalide (minimum 1€)");
    }
    if (amount > 10000) {
      throw new Error("Montant maximum : 10 000€");
    }
    if (!description || typeof description !== "string" || description.trim().length < 2) {
      throw new Error("Motif requis");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const amountCents = Math.round(amount * 100);
    const platformFeeCents = 80; // 0.80€ SoloCab fee

    const driverName = driver.display_name || driver.company_name || "Chauffeur VTC";

    // Create a Stripe Checkout session in payment mode with destination charge
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: `Paiement - ${driverName}`,
              description: description.trim().slice(0, 200),
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        // WEEKLY SETTLEMENT: No transfer_data — funds stay on platform
        metadata: {
          driver_id: driver.id,
          type: "spontaneous_payment",
          solocab_fee: "0.80",
          description: description.trim().slice(0, 200),
          date: date || new Date().toISOString(),
        },
      },
      success_url: `${req.headers.get("origin")}/driver-dashboard?tab=finances&payment=success`,
      cancel_url: `${req.headers.get("origin")}/driver-dashboard?tab=finances&payment=cancelled`,
      metadata: {
        driver_id: driver.id,
        type: "spontaneous_payment",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Spontaneous payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
