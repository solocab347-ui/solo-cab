import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REACTIVATE-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - No valid authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    // Créer le client avec le header d'auth pour getClaims
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Extraire et valider le token avec getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("Claims error", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized - No user ID in token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated via getClaims", { userId });

    // Client admin pour les opérations DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Vérifier si c'est un chauffeur
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id, created_at, is_pioneer, free_access_end_date, subscription_status, trial_cancelled")
      .eq("user_id", userId)
      .single();

    if (driverError || !driver) {
      logStep("Driver not found, checking fleet manager", { error: driverError?.message });
      // Vérifier si c'est un fleet manager
      const { data: fleetManager, error: fmError } = await supabaseAdmin
        .from("fleet_managers")
        .select("id, created_at, subscription_status, trial_cancelled")
        .eq("user_id", userId)
        .single();

      if (fmError || !fleetManager) {
        throw new Error("User profile not found");
      }

      if (!fleetManager.trial_cancelled) {
        throw new Error("Trial is not cancelled");
      }

      // Réactiver l'essai pour le fleet manager
      const { error: updateError } = await supabaseAdmin
        .from("fleet_managers")
        .update({
          trial_cancelled: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", fleetManager.id);

      if (updateError) {
        throw new Error(`Failed to reactivate trial: ${updateError.message}`);
      }

      logStep("Fleet manager trial reactivated", { fleetManagerId: fleetManager.id });

      return new Response(JSON.stringify({ 
        success: true,
        message: "Votre essai a été réactivé. Vous continuerez à bénéficier de l'accès complet."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!driver.trial_cancelled) {
      throw new Error("Trial is not cancelled");
    }

    // Réactiver l'essai pour le chauffeur
    const { error: updateError } = await supabaseAdmin
      .from("drivers")
      .update({
        trial_cancelled: false,
        subscription_cancel_at_period_end: false,
        subscription_cancel_at: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", driver.id);

    if (updateError) {
      throw new Error(`Failed to reactivate trial: ${updateError.message}`);
    }

    logStep("Driver trial reactivated", { driverId: driver.id });

    // Créer une notification
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        title: "Essai réactivé",
        message: "Votre période d'essai a été réactivée ! Vous conservez l'accès complet à SoloCab.",
        type: "subscription",
        action_url: "/driver-dashboard?tab=subscription"
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Votre essai a été réactivé. Vous continuerez à bénéficier de l'accès complet."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in reactivate-trial", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
