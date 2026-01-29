import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Vérifier si c'est un chauffeur
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select("id, created_at, is_pioneer, free_access_end_date, subscription_status, trial_cancelled")
      .eq("user_id", user.id)
      .single();

    if (driverError || !driver) {
      // Vérifier si c'est un fleet manager
      const { data: fleetManager, error: fmError } = await supabaseClient
        .from("fleet_managers")
        .select("id, created_at, subscription_status, trial_cancelled")
        .eq("user_id", user.id)
        .single();

      if (fmError || !fleetManager) {
        throw new Error("User profile not found");
      }

      // Marquer l'essai comme annulé pour le fleet manager
      const { error: updateError } = await supabaseClient
        .from("fleet_managers")
        .update({
          trial_cancelled: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", fleetManager.id);

      if (updateError) {
        throw new Error(`Failed to cancel trial: ${updateError.message}`);
      }

      logStep("Fleet manager trial cancelled", { fleetManagerId: fleetManager.id });

      return new Response(JSON.stringify({ 
        success: true,
        message: "Votre essai a été annulé. Vous conservez l'accès jusqu'à la fin de la période."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Pour les pionniers, calculer la date de fin d'essai basée sur free_access_end_date
    // Pour les non-pionniers, calculer basé sur created_at + 14 jours
    let trialEndDate: Date;
    if (driver.is_pioneer && driver.free_access_end_date) {
      trialEndDate = new Date(driver.free_access_end_date);
    } else {
      const createdAt = new Date(driver.created_at);
      trialEndDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    }

    // Marquer l'essai comme annulé
    const { error: updateError } = await supabaseClient
      .from("drivers")
      .update({
        trial_cancelled: true,
        subscription_cancel_at_period_end: true,
        subscription_cancel_at: trialEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", driver.id);

    if (updateError) {
      throw new Error(`Failed to cancel trial: ${updateError.message}`);
    }

    logStep("Driver trial cancelled", { 
      driverId: driver.id, 
      trialEndDate: trialEndDate.toISOString() 
    });

    // Créer une notification
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: user.id,
        title: "Essai annulé",
        message: `Votre période d'essai a été annulée. Vous conservez l'accès complet à SoloCab jusqu'au ${trialEndDate.toLocaleDateString('fr-FR')}. Vous pouvez vous réabonner à tout moment.`,
        type: "subscription",
        action_url: "/driver-dashboard?tab=subscription"
      });

    return new Response(JSON.stringify({ 
      success: true,
      trial_end_date: trialEndDate.toISOString(),
      message: "Votre essai a été annulé. Vous conservez l'accès jusqu'à la fin de la période."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-trial", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
