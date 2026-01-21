import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-DOCUMENTS-DEADLINE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started - checking expired document deadlines");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();

    // ========================================
    // 1. CHAUFFEURS - Bloquer ceux avec deadline expirée
    // ========================================
    const { data: expiredDrivers, error: driversError } = await supabaseClient
      .from("drivers")
      .select("id, user_id, documents_deadline, documents_status")
      .lt("documents_deadline", now.toISOString())
      .not("documents_status", "in", "(submitted,validated)")
      .eq("documents_access_blocked", false);

    if (driversError) {
      logStep("Error fetching expired drivers", { error: driversError.message });
    }

    let driversBlocked = 0;

    if (expiredDrivers && expiredDrivers.length > 0) {
      logStep("Found drivers with expired deadline", { count: expiredDrivers.length });

      for (const driver of expiredDrivers) {
        try {
          const { error } = await supabaseClient
            .from("drivers")
            .update({
              documents_access_blocked: true,
              documents_access_blocked_at: now.toISOString(),
            })
            .eq("id", driver.id);

          if (!error) {
            driversBlocked++;
            logStep("Driver blocked for expired documents", { driverId: driver.id });
          }
        } catch (err) {
          logStep("Error blocking driver", { driverId: driver.id, error: String(err) });
        }
      }
    }

    // ========================================
    // 2. FLEET MANAGERS - Bloquer ceux avec deadline expirée
    // ========================================
    const { data: expiredFMs, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("id, user_id, documents_deadline, documents_status")
      .lt("documents_deadline", now.toISOString())
      .not("documents_status", "in", "(submitted,validated)")
      .eq("documents_access_blocked", false);

    if (fmError) {
      logStep("Error fetching expired fleet managers", { error: fmError.message });
    }

    let fmBlocked = 0;

    if (expiredFMs && expiredFMs.length > 0) {
      logStep("Found fleet managers with expired deadline", { count: expiredFMs.length });

      for (const fm of expiredFMs) {
        try {
          const { error } = await supabaseClient
            .from("fleet_managers")
            .update({
              documents_access_blocked: true,
              documents_access_blocked_at: now.toISOString(),
            })
            .eq("id", fm.id);

          if (!error) {
            fmBlocked++;
            logStep("Fleet manager blocked for expired documents", { fmId: fm.id });
          }
        } catch (err) {
          logStep("Error blocking fleet manager", { fmId: fm.id, error: String(err) });
        }
      }
    }

    // ========================================
    // 3. ENVOYER LES RELANCES (J+2, J+4, J+6) pour délai de 7 jours
    // ========================================
    // Relance J+2 (5 jours restants)
    const { data: driversForReminders } = await supabaseClient
      .from("drivers")
      .select("id, created_at, documents_status")
      .not("documents_status", "in", "(submitted,validated)")
      .eq("documents_access_blocked", false);

    let remindersDay2 = 0;
    let remindersDay4 = 0;
    let remindersDay6 = 0;

    if (driversForReminders) {
      for (const driver of driversForReminders) {
        const createdAt = new Date(driver.created_at);
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        let daysRemaining = 7 - daysSinceCreation;
        let isFinalWarning = false;
        let shouldSendReminder = false;

        if (daysSinceCreation === 2) {
          // J+2 : 5 jours restants
          daysRemaining = 5;
          shouldSendReminder = true;
          remindersDay2++;
        } else if (daysSinceCreation === 4) {
          // J+4 : 3 jours restants
          daysRemaining = 3;
          shouldSendReminder = true;
          remindersDay4++;
        } else if (daysSinceCreation === 6) {
          // J+6 : 1 jour restant - FINAL WARNING
          daysRemaining = 1;
          isFinalWarning = true;
          shouldSendReminder = true;
          remindersDay6++;
        }

        if (shouldSendReminder) {
          try {
            await supabaseClient.functions.invoke("send-driver-document-reminder", {
              body: {
                driver_id: driver.id,
                days_remaining: daysRemaining,
                is_final_warning: isFinalWarning,
              },
            });
            logStep("Document reminder sent", { driverId: driver.id, daysRemaining, isFinalWarning });
          } catch (err) {
            logStep("Error sending reminder", { driverId: driver.id, error: String(err) });
          }
        }
      }
    }

    const summary = {
      driversBlocked,
      fleetManagersBlocked: fmBlocked,
      remindersDay2,
      remindersDay4,
      remindersDay6,
      timestamp: now.toISOString(),
      documentsDeadlineDays: 7,
    };

    logStep("Cron job completed", summary);

    return new Response(JSON.stringify({
      success: true,
      message: "Vérification des deadlines documents terminée",
      summary,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
