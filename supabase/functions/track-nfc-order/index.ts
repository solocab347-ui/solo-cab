import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { tracking_token, order_number } = await req.json();
    
    if (!tracking_token && !order_number) {
      throw new Error("tracking_token ou order_number requis");
    }

    let query = supabaseClient
      .from("nfc_plate_orders")
      .select(`
        id,
        order_number,
        first_name,
        last_name,
        email,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        payment_status,
        delivery_status,
        tracking_number,
        shipped_at,
        delivered_at,
        estimated_delivery_date,
        created_at,
        qr_code_link
      `);

    if (tracking_token) {
      query = query.eq("tracking_token", tracking_token);
    } else {
      query = query.eq("order_number", order_number);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      throw new Error("Commande non trouvée");
    }

    // Calculer les étapes du suivi
    const steps = [
      {
        id: "created",
        label: "Commande reçue",
        status: "completed",
        date: order.created_at,
      },
      {
        id: "paid",
        label: "Paiement confirmé",
        status: order.payment_status === "paid" ? "completed" : "pending",
        date: order.payment_status === "paid" ? order.created_at : null,
      },
      {
        id: "preparing",
        label: "Préparation en cours",
        status: order.delivery_status === "preparing" || order.delivery_status === "shipped" || order.delivery_status === "delivered" ? "completed" : "pending",
        date: null,
      },
      {
        id: "shipped",
        label: "Expédié",
        status: order.delivery_status === "shipped" || order.delivery_status === "delivered" ? "completed" : "pending",
        date: order.shipped_at,
      },
      {
        id: "delivered",
        label: "Livré",
        status: order.delivery_status === "delivered" ? "completed" : "pending",
        date: order.delivered_at,
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          ...order,
          steps,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
