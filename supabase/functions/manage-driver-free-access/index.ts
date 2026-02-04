import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-DRIVER-FREE-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Vérifier que l'utilisateur est admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Accès non autorisé - réservé aux administrateurs");
    }

    logStep("Admin authenticated", { userId: user.id });

    const { 
      driver_id, 
      action, 
      free_access_type,
      free_access_duration_days 
    } = await req.json();
    
    if (!driver_id) throw new Error("driver_id is required");

    // Get driver
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("*")
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error("Driver not found");
    }

    logStep("Driver found", { 
      id: driver.id, 
      displayName: driver.display_name,
      currentFreeAccess: driver.free_access_granted,
      currentType: driver.free_access_type
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ========================================
    // ACTION: GRANT (accorder la gratuité)
    // ========================================
    if (action === "grant") {
      const now = new Date();
      let endDate = null;
      
      // Déterminer le type d'accès normalisé
      // Types permanents: "unlimited", "administrative" - JAMAIS de paiement
      // Types temporaires: "time_limited" - avec date de fin
      let normalizedType = free_access_type || "unlimited";
      
      if (free_access_type === "time_limited" && free_access_duration_days) {
        endDate = new Date(now.getTime() + (free_access_duration_days * 24 * 60 * 60 * 1000));
        normalizedType = "time_limited";
      } else if (free_access_type !== "unlimited" && free_access_type !== "administrative") {
        // Si un type non reconnu est passé avec une durée, le traiter comme time_limited
        if (free_access_duration_days) {
          endDate = new Date(now.getTime() + (free_access_duration_days * 24 * 60 * 60 * 1000));
          normalizedType = "time_limited";
        } else {
          // Sinon, considérer comme illimité
          normalizedType = "unlimited";
        }
      }

      // Mettre en pause l'abonnement Stripe si existant
      if (driver.stripe_subscription_id && !driver.stripe_subscription_paused) {
        try {
          await stripe.subscriptions.update(driver.stripe_subscription_id, {
            pause_collection: {
              behavior: "void",
            },
          });
          logStep("Stripe subscription paused", { 
            subscriptionId: driver.stripe_subscription_id 
          });
        } catch (stripeError) {
          logStep("Failed to pause Stripe subscription (may not exist)", { 
            error: String(stripeError) 
          });
        }
      }

      // Mettre à jour la base de données
      await supabaseClient
        .from("drivers")
        .update({
          free_access_granted: true,
          free_access_start_date: now.toISOString(),
          free_access_end_date: endDate ? endDate.toISOString() : null,
          free_access_type: normalizedType,
          subscription_status: "active",
          subscription_paid: true,
          stripe_subscription_paused: !!driver.stripe_subscription_id,
          stripe_subscription_paused_at: driver.stripe_subscription_id ? now.toISOString() : null,
          updated_at: now.toISOString(),
        })
        .eq("id", driver_id);

      logStep("Free access granted", {
        type: normalizedType,
        endDate: endDate?.toISOString(),
        isPermanent: normalizedType === "unlimited" || normalizedType === "administrative",
      });

      return new Response(JSON.stringify({
        success: true,
        message: normalizedType === "unlimited" || normalizedType === "administrative"
          ? "Accès gratuit PERMANENT accordé (protégé)" 
          : `Accès gratuit accordé pour ${free_access_duration_days} jours`,
        free_access: {
          granted: true,
          type: normalizedType,
          start_date: now.toISOString(),
          end_date: endDate?.toISOString() || null,
          is_permanent: normalizedType === "unlimited" || normalizedType === "administrative",
        },
        subscription_paused: !!driver.stripe_subscription_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: REVOKE (révoquer la gratuité)
    // ========================================
    if (action === "revoke") {
      // Reprendre l'abonnement Stripe si en pause
      if (driver.stripe_subscription_id && driver.stripe_subscription_paused) {
        try {
          await stripe.subscriptions.update(driver.stripe_subscription_id, {
            pause_collection: null,
          });
          logStep("Stripe subscription resumed", { 
            subscriptionId: driver.stripe_subscription_id 
          });
        } catch (stripeError) {
          logStep("Failed to resume Stripe subscription", { 
            error: String(stripeError) 
          });
        }
      }

      // Déterminer le nouveau statut d'abonnement
      let newSubscriptionStatus = "inactive";
      let newSubscriptionPaid = false;

      if (driver.stripe_subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(driver.stripe_subscription_id);
          if (subscription.status === "active" || subscription.status === "trialing") {
            newSubscriptionStatus = subscription.status === "trialing" ? "trialing" : "active";
            newSubscriptionPaid = true;
          }
        } catch (e) {
          logStep("Could not retrieve Stripe subscription", { error: String(e) });
        }
      }

      // Mettre à jour la base de données
      await supabaseClient
        .from("drivers")
        .update({
          free_access_granted: false,
          free_access_start_date: null,
          free_access_end_date: null,
          free_access_type: null,
          subscription_status: newSubscriptionStatus,
          subscription_paid: newSubscriptionPaid,
          stripe_subscription_paused: false,
          stripe_subscription_paused_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver_id);

      logStep("Free access revoked", { newSubscriptionStatus });

      return new Response(JSON.stringify({
        success: true,
        message: "Accès gratuit révoqué",
        subscription_status: newSubscriptionStatus,
        subscription_paid: newSubscriptionPaid,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: EXTEND (prolonger la gratuité)
    // ========================================
    if (action === "extend") {
      if (!driver.free_access_granted) {
        throw new Error("Le chauffeur n'a pas d'accès gratuit actif");
      }

      if (!free_access_duration_days) {
        throw new Error("Durée de prolongation requise");
      }

      const currentEndDate = driver.free_access_end_date 
        ? new Date(driver.free_access_end_date) 
        : new Date();
      
      const newEndDate = new Date(currentEndDate.getTime() + (free_access_duration_days * 24 * 60 * 60 * 1000));

      await supabaseClient
        .from("drivers")
        .update({
          free_access_end_date: newEndDate.toISOString(),
          free_access_type: "time_limited",
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver_id);

      logStep("Free access extended", { newEndDate: newEndDate.toISOString() });

      return new Response(JSON.stringify({
        success: true,
        message: `Accès gratuit prolongé de ${free_access_duration_days} jours`,
        new_end_date: newEndDate.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: MAKE_UNLIMITED (convertir en illimité)
    // ========================================
    if (action === "make_unlimited") {
      await supabaseClient
        .from("drivers")
        .update({
          free_access_granted: true,
          free_access_type: "unlimited",
          free_access_end_date: null,
          subscription_status: "active",
          subscription_paid: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver_id);

      logStep("Free access made unlimited");

      return new Response(JSON.stringify({
        success: true,
        message: "Accès gratuit converti en illimité",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: CONVERT_PIONEER_TO_PAID (convertir pioneer en payant)
    // ========================================
    if (action === "convert_pioneer_to_paid") {
      // Révoquer le statut pioneer trial
      await supabaseClient
        .from("drivers")
        .update({
          free_access_granted: false,
          free_access_type: null,
          free_access_end_date: null,
          subscription_status: "inactive",
          subscription_paid: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driver_id);

      logStep("Pioneer converted to paid - subscription required");

      return new Response(JSON.stringify({
        success: true,
        message: "Statut pioneer révoqué - abonnement payant requis",
        requires_subscription: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Action non reconnue: ${action}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
