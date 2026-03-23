import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-DRIVER] ${step}${detailsStr}`);
};

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

    logStep("Activating account for driver", { driver_id });

    // Check driver exists
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, trial_status, subscription_status, subscription_paid, subscription_tier')
      .eq('id', driver_id)
      .single();

    if (driverError) {
      throw new Error(`Driver not found: ${driverError.message}`);
    }

    // Already active
    if (driver.subscription_status === 'active') {
      logStep("Driver already active", { driver_id });
      return new Response(JSON.stringify({
        success: true,
        message: "Driver already active",
        already_active: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Already subscribed (premium)
    if (driver.subscription_paid) {
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

    const now = new Date();

    // Activate free account - no trial limit, permanent free access
    const { error: updateError } = await supabase
      .from('drivers')
      .update({
        trial_status: 'active',
        trial_start_date: now.toISOString(),
        trial_activated_at: now.toISOString(),
        subscription_status: 'active',
        subscription_tier: 'free',
        subscription_paid: false,
        status: 'active',
      })
      .eq('id', driver_id);

    if (updateError) {
      throw new Error(`Failed to activate account: ${updateError.message}`);
    }

    logStep("Account activated successfully (free tier)", { driver_id });

    // Send welcome email
    try {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ 
            driver_id,
            type: "driver_welcome_new",
          }),
        }
      );
    } catch (emailError) {
      logStep("Warning: Failed to send welcome email", { error: String(emailError) });
    }

    return new Response(JSON.stringify({
      success: true,
      activated_at: now.toISOString(),
      tier: 'free',
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
