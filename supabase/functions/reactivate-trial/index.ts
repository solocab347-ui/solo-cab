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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    // Extraire le token JWT du header Authorization
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("No token provided");

    // Valider le token avec le client admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      logStep("Auth error details", { error: userError.message, code: userError.code });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Vérifier si c'est un chauffeur (utiliser le client admin pour les opérations DB)
    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id, created_at, is_pioneer, free_access_end_date, subscription_status, trial_cancelled")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      logStep("Driver not found, checking fleet manager", { error: driverError?.message });
      // Vérifier si c'est un fleet manager
      const { data: fleetManager, error: fmError } = await supabaseAdmin
        .from("fleet_managers")
        .select("id, created_at, subscription_status, trial_cancelled")
        .eq("user_id", user.id)
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
        user_id: user.id,
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
