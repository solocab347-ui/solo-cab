import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-SETTLEMENT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate week range (previous Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() - dayOfWeek - 6); // Previous Monday
    lastMonday.setUTCHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
    lastSunday.setUTCHours(23, 59, 59, 999);

    const weekStart = lastMonday.toISOString().split('T')[0];
    const weekEnd = lastSunday.toISOString().split('T')[0];

    log("Processing settlement", { weekStart, weekEnd });

    // Check if already processed
    const { data: existing } = await supabase
      .from("weekly_settlements")
      .select("id, status")
      .eq("week_start", weekStart)
      .eq("week_end", weekEnd)
      .single();

    if (existing?.status === 'completed') {
      return new Response(JSON.stringify({ message: "Already processed", settlement_id: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update settlement record
    const settlementId = existing?.id;
    let settlement: { id: string };

    if (settlementId) {
      await supabase.from("weekly_settlements").update({ status: "processing" }).eq("id", settlementId);
      settlement = { id: settlementId };
    } else {
      const { data, error } = await supabase
        .from("weekly_settlements")
        .insert({ week_start: weekStart, week_end: weekEnd, status: "processing" })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create settlement: ${error.message}`);
      settlement = data;
    }

    log("Settlement record", { id: settlement.id });

    // 1. Fetch all completed shared course payments NOT yet settled for this period
    const { data: sharedPayments, error: spErr } = await supabase
      .from("shared_course_payments")
      .select("*")
      .eq("status", "completed")
      .is("settlement_id", null)
      .gte("payment_captured_at", lastMonday.toISOString())
      .lte("payment_captured_at", lastSunday.toISOString());

    if (spErr) throw new Error(`Failed to fetch payments: ${spErr.message}`);

    log("Shared payments found", { count: sharedPayments?.length || 0 });

    // 2. Fetch all completed standard courses for this period (for SoloCab 0.50€ fees)
    const { data: standardCourses, error: scErr } = await supabase
      .from("courses")
      .select("id, driver_id, payment_method, final_payment_amount")
      .in("status", ["completed", "paid"])
      .gte("completed_at", lastMonday.toISOString())
      .lte("completed_at", lastSunday.toISOString())
      .not("payment_method", "in", "(cash,especes)"); // Only online payments have SoloCab fees

    if (scErr) throw new Error(`Failed to fetch courses: ${scErr.message}`);

    log("Standard courses found", { count: standardCourses?.length || 0 });

    // 3. Aggregate per driver
    const driverBalances: Record<string, {
      commissions_earned: number;
      solocab_fees: number;
      shared_as_sender: number;
      shared_as_receiver: number;
      standard_count: number;
    }> = {};

    const ensureDriver = (driverId: string) => {
      if (!driverBalances[driverId]) {
        driverBalances[driverId] = {
          commissions_earned: 0,
          solocab_fees: 0,
          shared_as_sender: 0,
          shared_as_receiver: 0,
          standard_count: 0,
        };
      }
    };

    // Process shared course commissions
    let totalCommissionVolume = 0;
    let totalPlatformFees = 0;

    for (const payment of (sharedPayments || [])) {
      // Sender earns the commission
      ensureDriver(payment.sender_driver_id);
      driverBalances[payment.sender_driver_id].commissions_earned += payment.sender_commission_amount;
      driverBalances[payment.sender_driver_id].shared_as_sender += 1;

      // Both pay 0.10€ platform fee for the sharing
      ensureDriver(payment.sender_driver_id);
      ensureDriver(payment.receiver_driver_id);
      driverBalances[payment.receiver_driver_id].solocab_fees += 0.10;
      driverBalances[payment.receiver_driver_id].shared_as_receiver += 1;

      totalCommissionVolume += payment.commission_amount;
      totalPlatformFees += 0.10;
    }

    // Process standard course SoloCab fees (0.50€ per online course)
    let totalSolocabStandardFees = 0;

    for (const course of (standardCourses || [])) {
      if (course.driver_id) {
        ensureDriver(course.driver_id);
        driverBalances[course.driver_id].solocab_fees += 0.50;
        driverBalances[course.driver_id].standard_count += 1;
        totalSolocabStandardFees += 0.50;
      }
    }

    // 4. Calculate net and create balance records
    const balanceInserts = [];
    let totalTransferAmount = 0;
    let transfersCount = 0;

    for (const [driverId, bal] of Object.entries(driverBalances)) {
      const net = bal.commissions_earned - bal.solocab_fees;
      balanceInserts.push({
        settlement_id: settlement.id,
        driver_id: driverId,
        total_commissions_earned: bal.commissions_earned,
        total_solocab_fees: bal.solocab_fees,
        net_amount: net,
        shared_courses_as_sender: bal.shared_as_sender,
        shared_courses_as_receiver: bal.shared_as_receiver,
        standard_courses_count: bal.standard_count,
        transfer_status: "pending",
      });

      if (net > 0) {
        totalTransferAmount += net;
        transfersCount++;
      }
    }

    if (balanceInserts.length > 0) {
      const { error: insErr } = await supabase
        .from("driver_weekly_balances")
        .insert(balanceInserts);
      if (insErr) throw new Error(`Failed to insert balances: ${insErr.message}`);
    }

    log("Balances created", { count: balanceInserts.length });

    // 5. Execute Stripe transfers for drivers with positive net
    const { data: balancesToPay } = await supabase
      .from("driver_weekly_balances")
      .select("*, drivers:driver_id(stripe_connect_account_id, stripe_connect_charges_enabled)")
      .eq("settlement_id", settlement.id)
      .gt("net_amount", 0)
      .eq("transfer_status", "pending");

    let executedTransfers = 0;
    const feesPerTransfer = 0.25; // Approximate Stripe transfer fee
    const estimatedSavings = ((sharedPayments?.length || 0) - 1) * feesPerTransfer; // N transactions → 1

    for (const balance of (balancesToPay || [])) {
      const driver = balance.drivers as any;
      if (!driver?.stripe_connect_account_id || !driver?.stripe_connect_charges_enabled) {
        await supabase.from("driver_weekly_balances")
          .update({ transfer_status: "skipped", transfer_error: "Stripe Connect non actif" })
          .eq("id", balance.id);
        continue;
      }

      try {
        const amountCents = Math.round(balance.net_amount * 100);
        if (amountCents < 100) { // Min 1€ transfer
          await supabase.from("driver_weekly_balances")
            .update({ transfer_status: "skipped", transfer_error: "Montant inférieur au minimum (1€)" })
            .eq("id", balance.id);
          continue;
        }

        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: "eur",
          destination: driver.stripe_connect_account_id,
          description: `Règlement hebdo SoloCab ${weekStart} - ${weekEnd}`,
          metadata: {
            settlement_id: settlement.id,
            balance_id: balance.id,
            type: "weekly_settlement",
          },
        });

        await supabase.from("driver_weekly_balances")
          .update({
            stripe_transfer_id: transfer.id,
            transfer_status: "completed",
            transfer_executed_at: new Date().toISOString(),
          })
          .eq("id", balance.id);

        executedTransfers++;
        log("Transfer completed", { driver_id: balance.driver_id, amount: balance.net_amount, transfer_id: transfer.id });
      } catch (err: any) {
        log("Transfer failed", { driver_id: balance.driver_id, error: err.message });
        await supabase.from("driver_weekly_balances")
          .update({ transfer_status: "failed", transfer_error: err.message })
          .eq("id", balance.id);
      }
    }

    // 6. Mark shared payments as settled
    if (sharedPayments && sharedPayments.length > 0) {
      const paymentIds = sharedPayments.map(p => p.id);
      await supabase
        .from("shared_course_payments")
        .update({ settlement_id: settlement.id, settled_at: new Date().toISOString() })
        .in("id", paymentIds);
    }

    // 7. Finalize settlement record
    await supabase.from("weekly_settlements")
      .update({
        status: "completed",
        total_shared_courses: sharedPayments?.length || 0,
        total_commission_volume: totalCommissionVolume,
        total_platform_fees: totalPlatformFees,
        total_solocab_standard_fees: totalSolocabStandardFees,
        total_transfers_executed: executedTransfers,
        total_transfer_amount: totalTransferAmount,
        stripe_fees_saved_estimate: estimatedSavings > 0 ? estimatedSavings : 0,
        processed_at: new Date().toISOString(),
      })
      .eq("id", settlement.id);

    const summary = {
      settlement_id: settlement.id,
      week: `${weekStart} → ${weekEnd}`,
      shared_courses_processed: sharedPayments?.length || 0,
      standard_courses_processed: standardCourses?.length || 0,
      drivers_with_balances: balanceInserts.length,
      transfers_executed: executedTransfers,
      total_transfer_amount: totalTransferAmount,
      solocab_fees_collected: totalPlatformFees + totalSolocabStandardFees,
      estimated_stripe_fees_saved: estimatedSavings > 0 ? estimatedSavings : 0,
    };

    log("Settlement completed", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
