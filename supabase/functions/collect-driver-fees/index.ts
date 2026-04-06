import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOLOCAB_FEE_CENTS = 50; // 0.50€ par course (espèces)
const SOLOCAB_FEE_SHARED_CENTS = 25; // 0.25€ par chauffeur en partage

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COLLECT-DRIVER-FEES] ${step}${detailsStr}`);
};

/**
 * Records a fee in the driver_fees_ledger and updates driver balance.
 * If driver has Stripe balance available, attempts immediate collection.
 */
async function recordFee(
  supabase: any,
  stripe: Stripe | null,
  driverId: string,
  courseId: string,
  amountCents: number,
  feeType: string,
  description: string
) {
  logStep("Recording fee", { driverId, courseId, amountCents, feeType });

  // Insert ledger entry
  const { data: ledgerEntry, error: insertError } = await supabase
    .from("driver_fees_ledger")
    .insert({
      driver_id: driverId,
      course_id: courseId,
      fee_type: feeType,
      amount_cents: amountCents,
      status: "pending",
      description,
    })
    .select("id")
    .single();

  if (insertError) {
    logStep("Failed to insert ledger entry", { error: insertError.message });
    return { success: false, error: insertError.message };
  }

  // Update driver balance (increase debt)
  await supabase.rpc("increment_driver_fees_balance", {
    p_driver_id: driverId,
    p_amount: amountCents,
  }).then(({ error }: any) => {
    if (error) {
      // Fallback: direct update
      logStep("RPC failed, using direct update", { error: error.message });
      return supabase
        .from("drivers")
        .update({ fees_balance_cents: amountCents }) // Will be fixed by collect
        .eq("id", driverId);
    }
  });

  // Try immediate collection if Stripe is available
  if (stripe) {
    const collected = await tryCollectFromStripe(supabase, stripe, driverId, ledgerEntry.id, amountCents);
    if (collected) {
      return { success: true, collected: true };
    }
  }

  return { success: true, collected: false, ledger_id: ledgerEntry.id };
}

/**
 * Attempts to collect pending fees from driver's Stripe Connect balance.
 */
async function tryCollectFromStripe(
  supabase: any,
  stripe: Stripe,
  driverId: string,
  ledgerEntryId: string,
  amountCents: number
): Promise<boolean> {
  try {
    // Get driver's Stripe account
    const { data: driver } = await supabase
      .from("drivers")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", driverId)
      .single();

    if (!driver?.stripe_connect_account_id || !driver?.stripe_connect_charges_enabled) {
      logStep("Driver has no active Stripe Connect", { driverId });
      return false;
    }

    // Check balance on connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: driver.stripe_connect_account_id,
    });

    const availableEur = balance.available.find((b: any) => b.currency === "eur");
    const availableCents = availableEur?.amount || 0;

    logStep("Stripe balance check", { availableCents, requiredCents: amountCents });

    if (availableCents < amountCents) {
      logStep("Insufficient Stripe balance — fee stays pending");
      return false;
    }

    // Create a transfer FROM connected account TO platform
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "eur",
      destination: await getPlatformAccountId(stripe),
      description: `Commission SoloCab - Frais course`,
      metadata: {
        driver_id: driverId,
        ledger_entry_id: ledgerEntryId,
        type: "fee_collection",
      },
    }, {
      stripeAccount: driver.stripe_connect_account_id,
    });

    logStep("Fee collected via Stripe transfer", { transferId: transfer.id });

    // Mark ledger entry as collected
    await supabase
      .from("driver_fees_ledger")
      .update({
        status: "collected",
        collected_at: new Date().toISOString(),
        collection_method: "stripe_debit",
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ledgerEntryId);

    // Decrease driver balance
    await supabase.rpc("increment_driver_fees_balance", {
      p_driver_id: driverId,
      p_amount: -amountCents,
    });

    return true;
  } catch (err: any) {
    logStep("Stripe collection failed", { error: err.message });
    return false;
  }
}

async function getPlatformAccountId(stripe: Stripe): Promise<string> {
  const account = await stripe.accounts.retrieve();
  return account.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const { action, driver_id, course_id, amount_cents, fee_type } = body;

    // Action 1: Record a new fee (called from finalize/capture functions)
    if (action === "record_fee") {
      if (!driver_id || !course_id || !amount_cents) {
        throw new Error("driver_id, course_id, and amount_cents required");
      }

      const result = await recordFee(
        supabaseClient,
        stripe,
        driver_id,
        course_id,
        amount_cents,
        fee_type || "platform_commission",
        body.description || "Commission SoloCab"
      );

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Action 2: Collect all pending fees for a driver
    if (action === "collect_pending") {
      if (!driver_id) throw new Error("driver_id required");

      const { data: pendingFees, error: fetchError } = await supabaseClient
        .from("driver_fees_ledger")
        .select("id, amount_cents")
        .eq("driver_id", driver_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      if (!pendingFees || pendingFees.length === 0) {
        return new Response(
          JSON.stringify({ success: true, collected: 0, message: "Aucun frais en attente" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      let collectedCount = 0;
      let collectedAmount = 0;

      for (const fee of pendingFees) {
        const collected = await tryCollectFromStripe(
          supabaseClient, stripe, driver_id, fee.id, fee.amount_cents
        );
        if (collected) {
          collectedCount++;
          collectedAmount += fee.amount_cents;
        } else {
          break; // Stop if balance insufficient
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          collected: collectedCount,
          collected_amount_cents: collectedAmount,
          remaining: pendingFees.length - collectedCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Action 3: Batch collect for all drivers (cron job)
    if (action === "collect_all_pending") {
      const { data: driversWithDebt } = await supabaseClient
        .from("drivers")
        .select("id")
        .gt("fees_balance_cents", 0);

      let totalCollected = 0;

      for (const driver of (driversWithDebt || [])) {
        const { data: pendingFees } = await supabaseClient
          .from("driver_fees_ledger")
          .select("id, amount_cents")
          .eq("driver_id", driver.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        for (const fee of (pendingFees || [])) {
          const collected = await tryCollectFromStripe(
            supabaseClient, stripe, driver.id, fee.id, fee.amount_cents
          );
          if (collected) {
            totalCollected++;
          } else {
            break;
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, total_collected: totalCollected }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error("Invalid action. Use: record_fee, collect_pending, collect_all_pending");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
