import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[DETECT-FRAUD] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // SECURITY: réservé aux admins OU au scheduler/cron (via x-internal-secret)
  const internalSecret = Deno.env.get("INTERNAL_CRON_SECRET");
  const providedSecret = req.headers.get("x-internal-secret");
  const hasValidSecret = !!internalSecret && providedSecret === internalSecret;

  if (!hasValidSecret) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const results = { excessive_cancellations: 0, multiple_cards: 0, flagged: 0 };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Excessive cancellations (>5 in 30 days)
    const { data: clients } = await supabaseClient
      .from("clients")
      .select("id, user_id");

    for (const client of clients || []) {
      // Count recent cancellations
      const { count: cancelCount } = await supabaseClient
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "cancelled")
        .eq("cancelled_by", "client")
        .gte("cancelled_at", thirtyDaysAgo);

      if ((cancelCount || 0) >= 5) {
        // Check if already flagged recently
        const { data: existingFlag } = await supabaseClient
          .from("client_fraud_flags")
          .select("id")
          .eq("client_id", client.id)
          .eq("flag_type", "excessive_cancellations")
          .eq("is_resolved", false)
          .limit(1);

        if (!existingFlag?.length) {
          await supabaseClient.from("client_fraud_flags").insert({
            client_id: client.id,
            flag_type: "excessive_cancellations",
            severity: (cancelCount || 0) >= 10 ? "critical" : "high",
            details: { cancel_count: cancelCount, period: "30_days" },
          });
          results.excessive_cancellations++;
          results.flagged++;
          logStep("Flagged excessive cancellations", { clientId: client.id, count: cancelCount });
        }
      }

      // 2. Multiple different cards used (>3 different payment methods)
      const { data: payments } = await supabaseClient
        .from("payments")
        .select("stripe_payment_intent_id")
        .eq("client_id", client.id)
        .gte("created_at", thirtyDaysAgo);

      // Check saved_cards in client record
      const { data: clientData } = await supabaseClient
        .from("clients")
        .select("saved_cards")
        .eq("id", client.id)
        .single();

      const savedCards = Array.isArray(clientData?.saved_cards) ? clientData.saved_cards : [];
      if (savedCards.length > 3) {
        const { data: existingFlag } = await supabaseClient
          .from("client_fraud_flags")
          .select("id")
          .eq("client_id", client.id)
          .eq("flag_type", "multiple_cards")
          .eq("is_resolved", false)
          .limit(1);

        if (!existingFlag?.length) {
          await supabaseClient.from("client_fraud_flags").insert({
            client_id: client.id,
            flag_type: "multiple_cards",
            severity: savedCards.length > 5 ? "high" : "medium",
            details: { card_count: savedCards.length, period: "30_days" },
          });
          results.multiple_cards++;
          results.flagged++;
          logStep("Flagged multiple cards", { clientId: client.id, count: savedCards.length });
        }
      }

      // 3. Recalculate risk score for all active clients
      await supabaseClient.rpc("update_client_risk_score", { p_client_id: client.id });
    }

    logStep("Fraud detection complete", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
