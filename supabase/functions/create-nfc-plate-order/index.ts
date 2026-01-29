import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-NFC-PLATE-ORDER] ${step}${detailsStr}`);
};

// Prix des plaques NFC (prix plein, hors promo inscription)
const NFC_PLATE_PRICES = {
  small: {
    priceId: "price_1Sqdz534nJZKnmmItg1y3Nck",
    name: "Plaque NFC Bois (Standard)",
    amount: 14.99,
  },
  standard: {
    priceId: "price_1Sqdz534nJZKnmmItg1y3Nck",
    name: "Plaque NFC Bois (Standard)",
    amount: 14.99,
  },
  large: {
    priceId: "price_1SqaCu34nJZKnmmIbgUaYK8K",
    name: "Plaque NFC Plastique (Premium)",
    amount: 29.99,
  },
  premium: {
    priceId: "price_1SqaCu34nJZKnmmIbgUaYK8K",
    name: "Plaque NFC Plastique (Premium)",
    amount: 29.99,
  },
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.json();
    
    logStep("Received body", body);

    const {
      email: providedEmail,
      first_name: providedFirstName,
      last_name: providedLastName,
      phone: providedPhone,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country = "France",
      driver_id,
      with_subscription = false,
      plate_type = "large", // "large" ou "small"
    } = body;

    // Si driver_id est fourni, récupérer les infos du chauffeur
    let email = providedEmail;
    let firstName = providedFirstName;
    let lastName = providedLastName;
    let phone = providedPhone;
    let qrCodeLink = null;

    if (driver_id) {
      logStep("Fetching driver info", { driver_id });
      
      // Récupérer le chauffeur et son profil
      const { data: driver, error: driverError } = await supabaseClient
        .from("drivers")
        .select(`
          id,
          qr_code_url,
          contact_phone,
          contact_email,
          user_id
        `)
        .eq("id", driver_id)
        .single();

      if (driverError) {
        logStep("Driver fetch error", { error: driverError.message });
      } else if (driver) {
        qrCodeLink = driver.qr_code_url || `${Deno.env.get("SITE_URL") || "https://solocab.fr"}/chauffeur/${driver.id}`;
        
        // Récupérer le profil pour le nom complet
        if (driver.user_id) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", driver.user_id)
            .single();
          
          if (profile) {
            // Utiliser les infos du profil si non fournies
            if (!email) email = driver.contact_email || profile.email;
            if (!firstName && profile.full_name) {
              const nameParts = profile.full_name.split(" ");
              firstName = nameParts[0] || "Chauffeur";
              lastName = nameParts.slice(1).join(" ") || "";
            }
            if (!phone) phone = driver.contact_phone || profile.phone;
          }
        }
        logStep("Driver info found", { email, firstName, qrCodeLink });
      }
    }

    // Validation après récupération des infos
    if (!email || !firstName || !shipping_address || !shipping_city || !shipping_postal_code) {
      throw new Error("Tous les champs obligatoires doivent être remplis (email, prénom, adresse, ville, code postal)");
    }

    // Récupérer le bon prix selon le type de plaque
    const plateConfig = NFC_PLATE_PRICES[plate_type as keyof typeof NFC_PLATE_PRICES] || NFC_PLATE_PRICES.large;
    logStep("Plate type selected", { plate_type, plateConfig });

    // Générer un numéro de commande unique
    const orderNumber = `NFC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logStep("Order number generated", { orderNumber });

    // Créer la commande en base
    const { data: order, error: orderError } = await supabaseClient
      .from("nfc_plate_orders")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName || "",
        phone,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        order_number: orderNumber,
        driver_id: driver_id || null,
        qr_code_link: qrCodeLink,
        with_subscription,
        plate_type,
        amount: plateConfig.amount,
        payment_status: "pending",
        delivery_status: "pending",
        estimated_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (orderError) {
      logStep("Order creation error", { error: orderError.message });
      throw new Error(`Erreur création commande: ${orderError.message}`);
    }

    logStep("Order created", { orderId: order.id, plate_type });

    // Chercher ou créer le customer Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        phone,
        shipping: {
          name: `${firstName} ${lastName}`,
          address: {
            line1: shipping_address,
            city: shipping_city,
            postal_code: shipping_postal_code,
            country: "FR",
          },
        },
      });
      customerId = customer.id;
      logStep("Customer created", { customerId });
    }

    // Créer la session Stripe Checkout
    const origin = req.headers.get("origin") || "https://solocab.fr";
    
    // MODE TEST: Prix forcé à 0.50€ pour les tests
    const TEST_MODE_ENABLED = true;
    const testPriceData = TEST_MODE_ENABLED ? {
      price_data: {
        currency: "eur",
        unit_amount: 50, // 0.50€ en centimes
        product_data: {
          name: plateConfig.name + " (TEST)",
        },
      },
      quantity: 1,
    } : {
      price: plateConfig.priceId,
      quantity: 1,
    };
    
    const sessionParams: any = {
      customer: customerId,
      line_items: [testPriceData],
      mode: "payment",
      success_url: `${origin}/plaque-nfc/success?order=${orderNumber}&token=${order.tracking_token}`,
      cancel_url: `${origin}/plaque-nfc?canceled=true`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        type: "nfc_plate_order",
        plate_type: plate_type,
        test_mode: TEST_MODE_ENABLED ? "true" : "false",
      },
      shipping_address_collection: {
        allowed_countries: ["FR"],
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // Mettre à jour la commande avec l'ID de session
    await supabaseClient
      .from("nfc_plate_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        order_number: orderNumber,
        tracking_token: order.tracking_token,
        success: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
