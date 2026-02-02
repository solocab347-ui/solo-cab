import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EXPIRED-TRIALS] ${step}${detailsStr}`);
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

    const now = new Date();

    // Find drivers with expired trials
    const { data: expiredTrials, error: fetchError } = await supabase
      .from('drivers')
      .select('id, user_id, trial_end_date')
      .eq('trial_status', 'active')
      .eq('subscription_paid', false)
      .lt('trial_end_date', now.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch expired trials: ${fetchError.message}`);
    }

    logStep("Found expired trials", { count: expiredTrials?.length || 0 });

    const results: { driverId: string; success: boolean; error?: string }[] = [];

    for (const driver of expiredTrials || []) {
      try {
        // Update driver status to expired
        const { error: updateError } = await supabase
          .from('drivers')
          .update({
            trial_status: 'expired',
            subscription_status: 'expired',
          })
          .eq('id', driver.id);

        if (updateError) {
          throw updateError;
        }

        results.push({ driverId: driver.id, success: true });
        logStep("Trial expired", { driverId: driver.id });

      } catch (driverError) {
        const errorMessage = driverError instanceof Error ? driverError.message : String(driverError);
        results.push({ driverId: driver.id, success: false, error: errorMessage });
        logStep("Failed to expire trial", { driverId: driver.id, error: errorMessage });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      expired_count: results.filter(r => r.success).length,
      results,
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
