import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-DRIVER-TRIAL] ${step}${detailsStr}`);
};

const TRIAL_DURATION_DAYS = 14;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { driver_id } = await req.json();
    
    if (!driver_id) {
      throw new Error("driver_id is required");
    }

    logStep("Activating trial for driver", { driver_id });

    // Check driver exists and is not already on trial or subscribed
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, trial_status, subscription_status, subscription_paid')
      .eq('id', driver_id)
      .single();

    if (driverError) {
      throw new Error(`Driver not found: ${driverError.message}`);
    }

    // Don't activate if already has active subscription
    if (driver.subscription_paid || driver.subscription_status === 'active') {
      logStep("Driver already has active subscription", { driver_id });
      return new Response(JSON.stringify({
        success: true,
        message: "Driver already has active subscription",
        already_subscribed: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Don't re-activate if already on active trial
    if (driver.trial_status === 'active') {
      logStep("Trial already active", { driver_id });
      return new Response(JSON.stringify({
        success: true,
        message: "Trial already active",
        already_active: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate trial dates
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    // Activate trial
    const { error: updateError } = await supabase
      .from('drivers')
      .update({
        trial_status: 'active',
        trial_start_date: now.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        trial_activated_at: now.toISOString(),
        subscription_status: 'trialing',
        subscription_paid: false, // Important: no payment yet
      })
      .eq('id', driver_id);

    if (updateError) {
      throw new Error(`Failed to activate trial: ${updateError.message}`);
    }

    // Schedule trial emails using the database function
    const { error: scheduleError } = await supabase
      .rpc('schedule_trial_emails', {
        p_driver_id: driver_id,
        p_trial_start: now.toISOString(),
      });

    if (scheduleError) {
      logStep("Warning: Failed to schedule trial emails", { error: scheduleError.message });
      // Don't fail the whole operation for this
    }

    logStep("Trial activated successfully", { 
      driver_id, 
      trial_end_date: trialEndDate.toISOString(),
      days: TRIAL_DURATION_DAYS 
    });

    // Send welcome email for trial
    try {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-driver-welcome-new`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ 
            driver_id,
            is_trial: true,
            trial_days: TRIAL_DURATION_DAYS,
          }),
        }
      );
    } catch (emailError) {
      logStep("Warning: Failed to send welcome email", { error: String(emailError) });
    }

    return new Response(JSON.stringify({
      success: true,
      trial_start_date: now.toISOString(),
      trial_end_date: trialEndDate.toISOString(),
      trial_days: TRIAL_DURATION_DAYS,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
