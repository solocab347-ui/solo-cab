import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-FLEET-SUBSCRIPTION] ${step}${detailsStr}`);
};

const BASE_PRICE = 6999; // 69.99€ en centimes
const EXTRA_DRIVER_PRICE = 1000; // 10€ en centimes
const MAX_FREE_DRIVERS = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { fleet_manager_id, action } = await req.json();
    if (!fleet_manager_id) throw new Error("fleet_manager_id is required");

    // Get fleet manager
    const { data: fleetManager, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("id", fleet_manager_id)
      .eq("user_id", user.id)
      .single();

    if (fmError || !fleetManager) {
      throw new Error("Fleet manager not found or access denied");
    }

    logStep("Fleet manager found", { 
      id: fleetManager.id, 
      freeAccess: fleetManager.free_access_granted,
      stripeCustomerId: fleetManager.stripe_customer_id 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ========================================
    // ACTION: RECALCULATE (synchroniser le nombre de chauffeurs)
    // ========================================
    if (action === "recalculate" || !action) {
      // Compter les chauffeurs actifs
      const { count: driverCount } = await supabaseClient
        .from("fleet_manager_drivers")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleet_manager_id)
        .eq("status", "active");

      const totalDrivers = driverCount || 0;
      const maxFree = fleetManager.max_free_drivers || MAX_FREE_DRIVERS;
      const extraDriversNeeded = Math.max(0, totalDrivers - maxFree);

      logStep("Driver count calculated", { 
        totalDrivers, 
        maxFree, 
        extraDriversNeeded 
      });

      // Si accès gratuit, pas de modification Stripe
      if (fleetManager.free_access_granted) {
        logStep("Free access active - skipping Stripe update");
        
        await supabaseClient
          .from("fleet_managers")
          .update({
            total_drivers: totalDrivers,
            extra_drivers_count: extraDriversNeeded,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fleet_manager_id);

        return new Response(JSON.stringify({
          success: true,
          message: "Accès gratuit actif - compteurs mis à jour",
          drivers: {
            total: totalDrivers,
            free: Math.min(totalDrivers, maxFree),
            extra: extraDriversNeeded,
          },
          billing: {
            is_free: true,
            monthly_total: 0,
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Si pas d'abonnement Stripe actif, juste mettre à jour les compteurs
      if (!fleetManager.stripe_customer_id || fleetManager.subscription_status !== 'active') {
        await supabaseClient
          .from("fleet_managers")
          .update({
            total_drivers: totalDrivers,
            extra_drivers_count: extraDriversNeeded,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fleet_manager_id);

        return new Response(JSON.stringify({
          success: true,
          message: "Compteurs mis à jour (pas d'abonnement actif)",
          drivers: {
            total: totalDrivers,
            free: Math.min(totalDrivers, maxFree),
            extra: extraDriversNeeded,
          },
          requires_subscription: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Récupérer l'abonnement Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: fleetManager.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // Vérifier aussi les abonnements en trial
        const trialingSubs = await stripe.subscriptions.list({
          customer: fleetManager.stripe_customer_id,
          status: "trialing",
          limit: 1,
        });

        if (trialingSubs.data.length === 0) {
          throw new Error("Aucun abonnement actif trouvé");
        }
      }

      const subscription = subscriptions.data[0] || (await stripe.subscriptions.list({
        customer: fleetManager.stripe_customer_id,
        status: "trialing",
        limit: 1,
      })).data[0];

      // Trouver ou créer le produit/prix pour les chauffeurs supplémentaires
      let extraDriverPrice;
      const products = await stripe.products.list({ active: true, limit: 100 });
      const extraDriverProduct = products.data.find(
        (p: { metadata?: { type?: string } }) => p.metadata?.type === "fleet_extra_driver"
      );

      if (extraDriverProduct) {
        const prices = await stripe.prices.list({ product: extraDriverProduct.id, active: true, limit: 1 });
        extraDriverPrice = prices.data[0];
      }

      if (!extraDriverPrice && extraDriversNeeded > 0) {
        // Créer le produit et le prix
        const newProduct = await stripe.products.create({
          name: "Chauffeur Supplémentaire SoloCab",
          description: "Chauffeur supplémentaire par mois (au-delà des 10 inclus)",
          metadata: { type: "fleet_extra_driver" },
        });

        extraDriverPrice = await stripe.prices.create({
          product: newProduct.id,
          unit_amount: EXTRA_DRIVER_PRICE,
          currency: "eur",
          recurring: { interval: "month" },
          metadata: { type: "fleet_extra_driver" },
        });
      }

      // Trouver l'item existant pour les chauffeurs supplémentaires
      const existingExtraItem = subscription.items.data.find(
        (item: { price: { metadata?: { type?: string } }; quantity?: number; id: string }) => 
          item.price.metadata?.type === "fleet_extra_driver"
      );

      if (extraDriversNeeded > 0 && extraDriverPrice) {
        if (existingExtraItem) {
          if (existingExtraItem.quantity !== extraDriversNeeded) {
            // Mettre à jour la quantité
            await stripe.subscriptionItems.update(existingExtraItem.id, {
              quantity: extraDriversNeeded,
            });
            logStep("Updated extra driver quantity", { 
              oldQuantity: existingExtraItem.quantity, 
              newQuantity: extraDriversNeeded 
            });
          }
        } else {
          // Ajouter un nouvel item
          await stripe.subscriptionItems.create({
            subscription: subscription.id,
            price: extraDriverPrice.id,
            quantity: extraDriversNeeded,
          });
          logStep("Added extra drivers to subscription", { quantity: extraDriversNeeded });
        }
      } else if (existingExtraItem && extraDriversNeeded === 0) {
        // Supprimer l'item des chauffeurs supplémentaires
        await stripe.subscriptionItems.del(existingExtraItem.id);
        logStep("Removed extra drivers from subscription");
      }

      // Calculer le nouveau montant mensuel
      const monthlyTotal = (fleetManager.base_subscription_cost || 69.99) + (extraDriversNeeded * 10);

      // Mettre à jour la base de données
      await supabaseClient
        .from("fleet_managers")
        .update({
          total_drivers: totalDrivers,
          extra_drivers_count: extraDriversNeeded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fleet_manager_id);

      return new Response(JSON.stringify({
        success: true,
        message: `Abonnement synchronisé: ${totalDrivers} chauffeurs`,
        drivers: {
          total: totalDrivers,
          free: Math.min(totalDrivers, maxFree),
          extra: extraDriversNeeded,
        },
        billing: {
          base_cost: fleetManager.base_subscription_cost || 69.99,
          extra_drivers_cost: extraDriversNeeded * 10,
          monthly_total: monthlyTotal,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: PAUSE (mettre en pause pour gratuité)
    // ========================================
    if (action === "pause") {
      if (!fleetManager.stripe_customer_id || !fleetManager.subscription_stripe_id) {
        return new Response(JSON.stringify({
          success: true,
          message: "Pas d'abonnement Stripe à mettre en pause",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Mettre en pause l'abonnement Stripe
      await stripe.subscriptions.update(fleetManager.subscription_stripe_id, {
        pause_collection: {
          behavior: "void",
        },
      });

      await supabaseClient
        .from("fleet_managers")
        .update({
          stripe_subscription_paused: true,
          stripe_subscription_paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", fleet_manager_id);

      logStep("Subscription paused", { subscriptionId: fleetManager.subscription_stripe_id });

      return new Response(JSON.stringify({
        success: true,
        message: "Abonnement mis en pause",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========================================
    // ACTION: RESUME (reprendre après fin de gratuité)
    // ========================================
    if (action === "resume") {
      if (!fleetManager.stripe_customer_id || !fleetManager.subscription_stripe_id) {
        return new Response(JSON.stringify({
          success: false,
          message: "Pas d'abonnement Stripe à reprendre",
          requires_new_subscription: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Reprendre l'abonnement Stripe
      await stripe.subscriptions.update(fleetManager.subscription_stripe_id, {
        pause_collection: null,
      });

      await supabaseClient
        .from("fleet_managers")
        .update({
          stripe_subscription_paused: false,
          stripe_subscription_paused_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fleet_manager_id);

      logStep("Subscription resumed", { subscriptionId: fleetManager.subscription_stripe_id });

      return new Response(JSON.stringify({
        success: true,
        message: "Abonnement repris",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Action non reconnue: ${action}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
