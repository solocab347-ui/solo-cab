import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// MODE PRODUCTION: Vrais prix activés
const TEST_MODE_ENABLED = false;
const TEST_PRICE_CENTS = 50; // Non utilisé en production

// Prix Stripe - Abonnements (nouveau compte Stripe)
const SUBSCRIPTION_MONTHLY_PRICE_ID = "price_1Sx4h4AdFPYTU4712RqnULhI"; // 29.99€/mois
const SUBSCRIPTION_ANNUAL_PRICE_ID = "price_1Sx4iZAdFPYTU471ngc5wmR4"; // 305.90€/an

// Prix Stripe - Plaques NFC (prix plein)
const NFC_PLATE_STANDARD_PRICE_ID = "price_1SuwqvAdFPYTU471lrv1hrEv"; // 14.99€ (bois)
const NFC_PLATE_PREMIUM_PRICE_ID = "price_1SuwrGAdFPYTU471r5jB69qs"; // 29.99€ (plastique)

// Prix Stripe - Plaques NFC avec réduction -20% (achat avec abonnement)
const NFC_PLATE_STANDARD_PROMO_PRICE_ID = "price_1SuwriAdFPYTU471oAt7e8OO"; // 11.99€ (bois -20%)
const NFC_PLATE_PREMIUM_PROMO_PRICE_ID = "price_1Suws3AdFPYTU471pguxBxve"; // 23.99€ (plastique -20%)

// Prix en centimes pour la DB
const PLATE_PRICES = {
  standard: { full: 1499, promo: 1199 },
  premium: { full: 2999, promo: 2399 },
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
    console.log("[CREATE-DRIVER-SUBSCRIPTION] Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    
    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ User authenticated:", user.email);

    // Parse request body
    const body = await req.json();
    const driver_id = body?.driver_id;
    const with_plate = body?.with_plate === true;
    const plate_type = body?.plate_type || "premium"; // "standard" (bois) ou "premium" (plastique)
    const subscription_type = body?.subscription_type || "monthly";
    const shipping_address = body?.shipping_address;
    const shipping_city = body?.shipping_city;
    const shipping_postal_code = body?.shipping_postal_code;
    
    if (!driver_id || typeof driver_id !== "string") {
      throw new Error("driver_id is required");
    }
    
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Driver ID:", driver_id);
    console.log("[CREATE-DRIVER-SUBSCRIPTION] 📦 With plate:", with_plate, "Type:", plate_type);

    // Verify driver ownership
    const { data: driverCheck, error: driverCheckError } = await supabaseClient
      .from("drivers")
      .select("id, user_id, status")
      .eq("id", driver_id)
      .single();

    if (driverCheckError || !driverCheck) {
      throw new Error("Driver not found");
    }

    if (driverCheck.user_id !== user.id) {
      throw new Error("You don't have permission to access this driver");
    }

    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Driver ownership verified");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe configuration error");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          user_id: user.id,
          driver_id: driver_id,
        },
      });
      customerId = customer.id;
      console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ New customer created:", customerId);
    }

    // Determine subscription price and trial
    const priceId = subscription_type === "annual" ? SUBSCRIPTION_ANNUAL_PRICE_ID : SUBSCRIPTION_MONTHLY_PRICE_ID;
    const trialDays = subscription_type === "annual" ? 0 : 14;
    
    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Subscription:", priceId, "Trial:", trialDays);

    const origin = req.headers.get("origin");
    if (!origin) {
      throw new Error("Origin header required");
    }

    // Build line items - MODE TEST: utilise price_data avec 0.50€
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    
    if (TEST_MODE_ENABLED) {
      // Mode test: prix forcé à 0.50€
      lineItems = [
        {
          price_data: {
            currency: "eur",
            unit_amount: TEST_PRICE_CENTS, // 0.50€
            recurring: {
              interval: subscription_type === "annual" ? "year" : "month",
            },
            product_data: {
              name: subscription_type === "annual" 
                ? "Abonnement SoloCab Annuel (TEST)" 
                : "Abonnement SoloCab Mensuel (TEST)",
            },
          },
          quantity: 1,
        },
      ];
      console.log("[CREATE-DRIVER-SUBSCRIPTION] 🧪 TEST MODE: Subscription at", TEST_PRICE_CENTS, "cents");
    } else {
      // Mode production: vrais prix
      lineItems = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    }

    // Add plate if requested (avec prix promo -20%)
    let platePriceId = null;
    let plateAmountCents = 0;
    
    if (with_plate) {
      if (plate_type === "standard") {
        platePriceId = NFC_PLATE_STANDARD_PROMO_PRICE_ID; // 11.99€ (-20%)
        plateAmountCents = PLATE_PRICES.standard.promo;
      } else {
        platePriceId = NFC_PLATE_PREMIUM_PROMO_PRICE_ID; // 23.99€ (-20%)
        plateAmountCents = PLATE_PRICES.premium.promo;
      }
      
      if (TEST_MODE_ENABLED) {
        // Mode test: plaque aussi à 0.50€
        lineItems.push({
          price_data: {
            currency: "eur",
            unit_amount: TEST_PRICE_CENTS, // 0.50€
            product_data: {
              name: `Plaque NFC ${plate_type === "standard" ? "Bois" : "Premium"} (TEST)`,
            },
          },
          quantity: 1,
        });
        console.log("[CREATE-DRIVER-SUBSCRIPTION] 🧪 TEST MODE: Plate at", TEST_PRICE_CENTS, "cents");
      } else {
        lineItems.push({
          price: platePriceId,
          quantity: 1,
        });
      }
      console.log("[CREATE-DRIVER-SUBSCRIPTION] 📦 Added NFC plate:", plate_type, "Price:", plateAmountCents);
    }

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          driver_id: driver_id,
          user_id: user.id,
          type: "driver_subscription",
          subscription_type: subscription_type,
          with_plate: with_plate ? "true" : "false",
          plate_type: plate_type,
        },
      },
      success_url: `${origin}/driver-welcome?driver_id=${driver_id}&pioneer=false&plate=${with_plate}&plate_type=${plate_type}`,
      cancel_url: `${origin}/register-driver-promo?canceled=true`,
      metadata: {
        driver_id: driver_id,
        user_id: user.id,
        type: "driver_subscription",
        subscription_type: subscription_type,
        with_plate: with_plate ? "true" : "false",
        plate_type: plate_type,
        shipping_address: shipping_address || "",
        shipping_city: shipping_city || "",
        shipping_postal_code: shipping_postal_code || "",
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      payment_method_collection: "always",
    };
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      throw new Error("Failed to generate checkout URL");
    }

    console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ Checkout session created:", session.id);

    // If plate ordered, create nfc_plate_orders entry with complete driver info
    if (with_plate) {
      try {
        const orderNumber = `NFC-${Date.now().toString(36).toUpperCase()}`;
        
        // Get driver's QR code URL and complete profile info
        const { data: driverData } = await supabaseClient
          .from("drivers")
          .select("qr_code_url, user_id")
          .eq("id", driver_id)
          .single();

        // Get user profile for phone number
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .single();

        // Parse name from profile or user metadata
        const fullName = profileData?.full_name || user.user_metadata?.full_name || '';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const phone = profileData?.phone || null;

        // Générer le lien QR basé sur le driver_id
        const siteUrl = Deno.env.get("SITE_URL") || "https://solocab.fr";
        const qrCodeLink = driverData?.qr_code_url || `${siteUrl}/chauffeur/${driver_id}`;

        // Determine delivery status based on address completeness
        const hasValidAddress = shipping_address && shipping_address.trim().length > 0 
          && shipping_city && shipping_city.trim().length > 0
          && shipping_postal_code && shipping_postal_code.trim().length === 5;

        const { data: orderData, error: orderError } = await supabaseClient
          .from("nfc_plate_orders")
          .insert({
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            shipping_address: hasValidAddress ? shipping_address.trim() : 'À compléter',
            shipping_city: hasValidAddress ? shipping_city.trim() : 'À compléter',
            shipping_postal_code: hasValidAddress ? shipping_postal_code.trim() : '00000',
            shipping_country: "France",
            plate_type: plate_type,
            amount: plateAmountCents,
            driver_id: driver_id,
            qr_code_link: qrCodeLink,
            payment_status: "pending",
            delivery_status: hasValidAddress ? "pending" : "pending_address",
            stripe_checkout_session_id: session.id,
            order_number: orderNumber,
          })
          .select()
          .single();
        
        if (orderError) throw orderError;

        // Update driver with plate order reference and shipping info
        await supabaseClient
          .from("drivers")
          .update({ 
            nfc_plate_order_id: orderData.id,
            pending_wants_plate: true,
            pending_plate_type: plate_type,
            shipping_address: hasValidAddress ? shipping_address.trim() : null,
            shipping_city: hasValidAddress ? shipping_city.trim() : null,
            shipping_postal_code: hasValidAddress ? shipping_postal_code.trim() : null,
          })
          .eq("id", driver_id);
        
        console.log("[CREATE-DRIVER-SUBSCRIPTION] ✅ NFC plate order created:", {
          orderNumber,
          plateType: plate_type,
          orderId: orderData.id,
          hasValidAddress,
          firstName,
          lastName,
          phone: phone ? "✓" : "✗"
        });
      } catch (orderError) {
        console.error("[CREATE-DRIVER-SUBSCRIPTION] ⚠️ Failed to create plate order:", orderError);
        // Continue anyway - the webhook will handle it
      }
    }

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id,
        success: true
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CREATE-DRIVER-SUBSCRIPTION] 💥 ERROR:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
