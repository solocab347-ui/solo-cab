import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Non autorisé");
    }

    // Vérifier le rôle admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Accès non autorisé - admin uniquement");
    }

    const { driver_id, action } = await req.json();

    if (!driver_id || !action) {
      throw new Error("Paramètres manquants");
    }

    // Récupérer les informations du chauffeur
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("subscription_stripe_id")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver || !driver.subscription_stripe_id) {
      throw new Error("Chauffeur ou abonnement Stripe non trouvé");
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Effectuer l'action sur l'abonnement Stripe
    if (action === "pause") {
      // Mettre en pause l'abonnement (pause la collection des paiements)
      await stripe.subscriptions.update(driver.subscription_stripe_id, {
        pause_collection: {
          behavior: "void", // Ne pas facturer pendant la pause
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Abonnement Stripe mis en pause" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "resume") {
      // Reprendre l'abonnement
      await stripe.subscriptions.update(driver.subscription_stripe_id, {
        pause_collection: null, // Reprendre la facturation
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Abonnement Stripe réactivé" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Action non reconnue");
    }
  } catch (error: any) {
    console.error("Error managing subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
