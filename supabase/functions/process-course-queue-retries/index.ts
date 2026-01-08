import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Processing course queue retries...");

    // Process driver queue retries
    const { data: queueResults, error: queueError } = await supabase.rpc(
      "process_course_queue_retries"
    );

    if (queueError) {
      console.error("Error processing queue retries:", queueError);
    } else {
      console.log("Queue retry results:", queueResults);
    }

    // Process fleet escalation retries
    const { data: escalationResults, error: escalationError } = await supabase.rpc(
      "process_fleet_escalation_retries"
    );

    if (escalationError) {
      console.error("Error processing escalation retries:", escalationError);
    } else {
      console.log("Escalation retry results:", escalationResults);
    }

    // Get counts for summary
    const { count: pendingQueue } = await supabase
      .from("course_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: pendingEscalations } = await supabase
      .from("fleet_course_escalations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const summary = {
      queue_processed: queueResults?.length || 0,
      escalations_processed: escalationResults?.length || 0,
      pending_queue: pendingQueue || 0,
      pending_escalations: pendingEscalations || 0,
      processed_at: new Date().toISOString(),
    };

    console.log("Processing summary:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-course-queue-retries:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
