import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EXPIRED-FREE-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cron job started - checking expired free access");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const now = new Date();

    // ========================================
    // 1. CHAUFFEURS - Vérifier les accès expirés
    // IMPORTANT: Ne JAMAIS toucher aux accès "unlimited" ou "administrative"
    // ========================================
    const { data: expiredDrivers, error: driversError } = await supabaseClient
      .from("drivers")
      .select("*")
      .eq("free_access_granted", true)
      .not("free_access_type", "in", '("unlimited","administrative")') // PROTECTION: exclure les accès permanents
      .not("free_access_end_date", "is", null)
      .lt("free_access_end_date", now.toISOString());

    if (driversError) {
      logStep("Error fetching expired drivers", { error: driversError.message });
    }

    let driversProcessed = 0;
    let driversResumed = 0;

    if (expiredDrivers && expiredDrivers.length > 0) {
      logStep("Found expired driver free access", { count: expiredDrivers.length });

      for (const driver of expiredDrivers) {
        try {
          // SÉCURITÉ SUPPLÉMENTAIRE: Double vérification du type
          if (driver.free_access_type === "unlimited" || driver.free_access_type === "administrative") {
            logStep("SKIP - Permanent access protected", { driverId: driver.id, type: driver.free_access_type });
            continue;
          }

          let newStatus = "expired";
          let subscriptionResumed = false;

          // Tenter de reprendre l'abonnement Stripe si en pause
          if (driver.subscription_stripe_id && driver.stripe_subscription_paused) {
            try {
              await stripe.subscriptions.update(driver.subscription_stripe_id, {
                pause_collection: null,
              });
              
              const subscription = await stripe.subscriptions.retrieve(driver.subscription_stripe_id);
              if (subscription.status === "active") {
                newStatus = "active";
                subscriptionResumed = true;
                driversResumed++;
              }
              
              logStep("Driver Stripe subscription resumed", { 
                driverId: driver.id,
                stripeStatus: subscription.status
              });
            } catch (stripeError) {
              logStep("Failed to resume driver Stripe subscription", { 
                driverId: driver.id,
                error: String(stripeError) 
              });
            }
          }

          // Mettre à jour la base de données
          await supabaseClient
            .from("drivers")
            .update({
              free_access_granted: false,
              free_access_type: null,
              subscription_status: newStatus,
              subscription_paid: subscriptionResumed,
              stripe_subscription_paused: false,
              stripe_subscription_paused_at: null,
              updated_at: now.toISOString(),
            })
            .eq("id", driver.id);

          driversProcessed++;
          logStep("Driver free access expired", { 
            driverId: driver.id, 
            previousType: driver.free_access_type,
            newStatus,
            subscriptionResumed
          });

        } catch (driverError) {
          logStep("Error processing driver", { 
            driverId: driver.id, 
            error: String(driverError) 
          });
        }
      }
    }

    // ========================================
    // 2. GESTIONNAIRES FLOTTE - Vérifier les accès expirés
    // ========================================
    const { data: expiredFleetManagers, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("free_access_granted", true)
      .eq("free_access_type", "time_limited")
      .not("free_access_end_date", "is", null)
      .lt("free_access_end_date", now.toISOString());

    if (fmError) {
      logStep("Error fetching expired fleet managers", { error: fmError.message });
    }

    let fleetManagersProcessed = 0;
    let fleetManagersResumed = 0;

    if (expiredFleetManagers && expiredFleetManagers.length > 0) {
      logStep("Found expired fleet manager free access", { count: expiredFleetManagers.length });

      for (const fm of expiredFleetManagers) {
        try {
          let newStatus = "expired";
          let subscriptionResumed = false;

          // Tenter de reprendre l'abonnement Stripe si en pause
          if (fm.subscription_stripe_id && fm.stripe_subscription_paused) {
            try {
              await stripe.subscriptions.update(fm.subscription_stripe_id, {
                pause_collection: null,
              });
              
              const subscription = await stripe.subscriptions.retrieve(fm.subscription_stripe_id);
              if (subscription.status === "active") {
                newStatus = "active";
                subscriptionResumed = true;
                fleetManagersResumed++;
              }
              
              logStep("Fleet manager Stripe subscription resumed", { 
                fleetManagerId: fm.id,
                stripeStatus: subscription.status
              });
            } catch (stripeError) {
              logStep("Failed to resume fleet manager Stripe subscription", { 
                fleetManagerId: fm.id,
                error: String(stripeError) 
              });
            }
          }

          // Mettre à jour la base de données
          await supabaseClient
            .from("fleet_managers")
            .update({
              free_access_granted: false,
              free_access_type: null,
              subscription_status: newStatus,
              subscription_paid: subscriptionResumed,
              stripe_subscription_paused: false,
              stripe_subscription_paused_at: null,
              updated_at: now.toISOString(),
            })
            .eq("id", fm.id);

          fleetManagersProcessed++;
          logStep("Fleet manager free access expired", { 
            fleetManagerId: fm.id, 
            newStatus,
            subscriptionResumed
          });

        } catch (fmProcessError) {
          logStep("Error processing fleet manager", { 
            fleetManagerId: fm.id, 
            error: String(fmProcessError) 
          });
        }
      }
    }

    // ========================================
    // 3. CHAUFFEURS PIONEER - Vérifier les trials expirés
    // IMPORTANT: Protéger les accès "unlimited" et "administrative"
    // ========================================
    const { data: expiredPioneers, error: pioneerError } = await supabaseClient
      .from("drivers")
      .select("*")
      .eq("free_access_granted", true)
      .eq("free_access_type", "trial") // Uniquement les vrais trials, pas unlimited/administrative
      .not("free_access_end_date", "is", null)
      .lt("free_access_end_date", now.toISOString());

    if (pioneerError) {
      logStep("Error fetching expired pioneers", { error: pioneerError.message });
    }

    let pioneersProcessed = 0;

    if (expiredPioneers && expiredPioneers.length > 0) {
      logStep("Found expired pioneer trials", { count: expiredPioneers.length });

      for (const pioneer of expiredPioneers) {
        try {
          // SÉCURITÉ: Ne jamais toucher aux accès permanents même si marqués pioneer
          if (pioneer.free_access_type === "unlimited" || pioneer.free_access_type === "administrative") {
            logStep("SKIP - Pioneer with permanent access protected", { driverId: pioneer.id });
            continue;
          }

          await supabaseClient
            .from("drivers")
            .update({
              free_access_granted: false,
              free_access_type: null,
              subscription_status: "expired",
              subscription_paid: false,
              updated_at: now.toISOString(),
            })
            .eq("id", pioneer.id);

          pioneersProcessed++;
          logStep("Pioneer trial expired", { driverId: pioneer.id });

        } catch (pioneerProcessError) {
          logStep("Error processing pioneer", { 
            driverId: pioneer.id, 
            error: String(pioneerProcessError) 
          });
        }
      }
    }

    // ========================================
    // 4. GESTIONNAIRES - Vérifier les trials Stripe expirés
    // ========================================
    const { data: trialingFleetManagers, error: trialFmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("subscription_status", "trialing")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", now.toISOString());

    if (trialFmError) {
      logStep("Error fetching trialing fleet managers", { error: trialFmError.message });
    }

    let trialFmProcessed = 0;

    if (trialingFleetManagers && trialingFleetManagers.length > 0) {
      logStep("Found expired fleet manager trials", { count: trialingFleetManagers.length });

      for (const fm of trialingFleetManagers) {
        try {
          // Vérifier le statut réel sur Stripe
          if (fm.subscription_stripe_id) {
            const subscription = await stripe.subscriptions.retrieve(fm.subscription_stripe_id);
            
            if (subscription.status === "active") {
              await supabaseClient
                .from("fleet_managers")
                .update({
                  subscription_status: "active",
                  subscription_paid: true,
                  updated_at: now.toISOString(),
                })
                .eq("id", fm.id);

              logStep("Fleet manager trial converted to active", { fleetManagerId: fm.id });
            } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
              await supabaseClient
                .from("fleet_managers")
                .update({
                  subscription_status: "past_due",
                  subscription_paid: false,
                  updated_at: now.toISOString(),
                })
                .eq("id", fm.id);

              logStep("Fleet manager subscription past due", { fleetManagerId: fm.id });
            }

            trialFmProcessed++;
          }

        } catch (trialFmProcessError) {
          logStep("Error processing trialing fleet manager", { 
            fleetManagerId: fm.id, 
            error: String(trialFmProcessError) 
          });
        }
      }
    }

    const summary = {
      drivers: { processed: driversProcessed, resumed: driversResumed },
      fleetManagers: { processed: fleetManagersProcessed, resumed: fleetManagersResumed },
      pioneers: { processed: pioneersProcessed },
      trialFleetManagers: { processed: trialFmProcessed },
      timestamp: now.toISOString(),
    };

    logStep("Cron job completed", summary);

    return new Response(JSON.stringify({
      success: true,
      message: "Vérification des accès expirés terminée",
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
