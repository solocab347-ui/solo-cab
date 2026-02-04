import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-POST-TRIAL-CHECKOUT] ${step}${detailsStr}`);
};

// Prix Stripe pour chauffeurs (paiement immédiat après essai)
const SUBSCRIPTION_PRICES = {
  monthly: "price_1Sx4h4AdFPYTU4712RqnULhI",
  annual: "price_1Sx4iZAdFPYTU471ngc5wmR4",
};

// Prix NFC avec réduction -20% (pour achat avec abonnement)
const NFC_PRICES = {
  plastic: "price_1RUXvJAaegvT9LpCh1J4RHjy", // Plastique -20%
  wood: "price_1RUXtoAaegvT9LpCG4H2Z5Ll",    // Bois -20%
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const body = await req.json();
    const plan = body?.plan || "monthly";
    const includeNfcPlate = body?.includeNfcPlate || false;
    const nfcPlateType = body?.nfcPlateType || "plastic";
    
    logStep("Request body parsed", { plan, includeNfcPlate, nfcPlateType });

    const subscriptionPriceId = plan === "annual" ? SUBSCRIPTION_PRICES.annual : SUBSCRIPTION_PRICES.monthly;
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get driver data
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, stripe_customer_id, subscription_status, has_nfc_plate, nfc_tag_number, nfc_plate_order_id")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      throw new Error("No driver found for this user");
    }

    // Vérification intelligente: ne pas proposer NFC si déjà possédée
    const alreadyHasNfc = driver.has_nfc_plate || driver.nfc_tag_number || driver.nfc_plate_order_id;
    const shouldIncludeNfc = includeNfcPlate && !alreadyHasNfc;

    // Check if already has active subscription
    if (driver.subscription_status === "active") {
      throw new Error("Vous avez déjà un abonnement actif");
    }

    logStep("Driver found", { 
      driverId: driver.id, 
      hasCustomerId: !!driver.stripe_customer_id,
      alreadyHasNfc,
      shouldIncludeNfc
    });

    const origin = req.headers.get("origin") || "https://solocab.fr";

    // Préparer les items du checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: subscriptionPriceId, quantity: 1 }
    ];

    // Ajouter la plaque NFC si demandée et pas déjà possédée
    if (shouldIncludeNfc) {
      const nfcPriceId = nfcPlateType === "wood" ? NFC_PRICES.wood : NFC_PRICES.plastic;
      lineItems.push({ price: nfcPriceId, quantity: 1 });
    }

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "subscription",
      success_url: `${origin}/chauffeur?tab=subscription&subscribed=true${shouldIncludeNfc ? "&nfc_ordered=true" : ""}`,
      cancel_url: `${origin}/chauffeur/s-abonner?cancelled=true`,
      metadata: {
        driver_id: driver.id,
        type: "post_trial_subscription",
        subscription_type: plan,
        nfc_included: shouldIncludeNfc ? "true" : "false",
        nfc_type: shouldIncludeNfc ? nfcPlateType : "",
      },
      subscription_data: {
        metadata: {
          driver_id: driver.id,
          type: "driver_subscription",
          subscription_type: plan,
          is_post_trial: "true",
        },
      },
      allow_promotion_codes: true,
      // Personnalisation de l'expérience
      custom_text: {
        submit: {
          message: "Abonnement sans engagement - Résiliation possible à tout moment"
        }
      }
    };

    // Use existing customer or create new one
    if (driver.stripe_customer_id) {
      sessionConfig.customer = driver.stripe_customer_id;
    } else {
      sessionConfig.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      plan,
      nfcIncluded: shouldIncludeNfc
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-post-trial-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
