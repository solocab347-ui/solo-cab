// Watchdog: tourne toutes les heures.
// Envoie une alerte email UNIQUEMENT s'il y a des anomalies (warning ou critical)
// ET si l'état a changé depuis le dernier check (pour éviter le spam).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lance la santé en mode silencieux (pas d'email automatique du health-check)
    const { data: healthResult, error: rpcError } = await supabase.rpc("run_platform_health_check", {
      p_triggered_by: "watchdog",
    });
    if (rpcError) throw rpcError;

    const result = healthResult as any;
    const status = result.status;
    const anomalies = result.anomalies || [];

    if (status === "ok" || anomalies.length === 0) {
      console.log("✅ Watchdog: aucune anomalie, pas d'alerte envoyée");
      return new Response(JSON.stringify({ alerted: false, status, anomalies: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Cherche le dernier log précédent pour comparer
    const { data: previousLogs } = await supabase
      .from("platform_health_logs")
      .select("anomalies, status, created_at")
      .order("created_at", { ascending: false })
      .limit(2);

    const previous = previousLogs && previousLogs.length > 1 ? previousLogs[1] : null;
    const previousAnomalyTypes = new Set(
      (previous?.anomalies as any[] || []).map((a: any) => a.type)
    );
    const currentAnomalyTypes = new Set(anomalies.map((a: any) => a.type));
    const newAnomalies = anomalies.filter((a: any) => !previousAnomalyTypes.has(a.type));

    // Alerte si : nouvelles anomalies, OU status passé à critical alors qu'il était ok/warning
    const statusEscalated = previous && previous.status !== "critical" && status === "critical";

    if (newAnomalies.length === 0 && !statusEscalated) {
      console.log(`ℹ️ Watchdog: ${anomalies.length} anomalies déjà signalées, pas de nouvelle alerte`);
      return new Response(JSON.stringify({ alerted: false, reason: "no_new_anomalies", status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Déclenche le rapport complet (qui enverra l'email enrichi avec prompts)
    const projectRef = supabaseUrl.split("//")[1].split(".")[0];
    await fetch(`https://${projectRef}.supabase.co/functions/v1/platform-health-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ source: "watchdog-alert", triggered_by_new_anomalies: newAnomalies.length }),
    });

    console.log(`🚨 Watchdog: ${newAnomalies.length} nouvelle(s) anomalie(s), rapport déclenché`);
    return new Response(JSON.stringify({
      alerted: true, status, total_anomalies: anomalies.length, new_anomalies: newAnomalies.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (error: any) {
    console.error("Watchdog error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
