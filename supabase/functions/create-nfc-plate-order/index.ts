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

// Prix de la plaque NFC Coutras
const NFC_PLATE_PRICE_ID = "price_1SqaCu34nJZKnmmIbgUaYK8K";

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
      email,
      first_name,
      last_name,
      phone,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_country = "France",
      driver_id,
      with_subscription = false,
    } = body;

    // Validation
    if (!email || !first_name || !last_name || !shipping_address || !shipping_city || !shipping_postal_code) {
      throw new Error("Tous les champs obligatoires doivent être remplis");
    }

    // Générer un numéro de commande unique
    const orderNumber = `NFC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logStep("Order number generated", { orderNumber });

    // Récupérer le QR code link si driver_id est fourni
    let qrCodeLink = null;
    if (driver_id) {
      const { data: driver } = await supabaseClient
        .from("drivers")
        .select("id, qr_code_url")
        .eq("id", driver_id)
        .single();
      
      if (driver?.qr_code_url) {
        qrCodeLink = driver.qr_code_url;
        logStep("QR code link found", { qrCodeLink });
      }
    }

    // Créer la commande en base
    const { data: order, error: orderError } = await supabaseClient
      .from("nfc_plate_orders")
      .insert({
        email,
        first_name,
        last_name,
        phone,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        order_number: orderNumber,
        driver_id: driver_id || null,
        qr_code_link: qrCodeLink,
        with_subscription,
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

    logStep("Order created", { orderId: order.id });

    // Chercher ou créer le customer Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        name: `${first_name} ${last_name}`,
        phone,
        shipping: {
          name: `${first_name} ${last_name}`,
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
    
    const sessionParams: any = {
      customer: customerId,
      line_items: [
        {
          price: NFC_PLATE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/nfc-plate-order-success?order=${orderNumber}&token=${order.tracking_token}`,
      cancel_url: `${origin}/plaque-nfc?canceled=true`,
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        type: "nfc_plate_order",
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
