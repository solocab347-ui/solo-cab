// Pré-vérifie la cohérence du prochain règlement (admin only).
// Retourne : solde Stripe, total à virer, alertes potentielles.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth admin
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Non authentifié");
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) throw new Error("Non authentifié");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Accès admin requis");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    // 1. Solde Stripe plateforme
    const balance = await stripe.balance.retrieve();
    const available = (balance.available.find((b: any) => b.currency === "eur")?.amount || 0) / 100;
    const pending = (balance.pending.find((b: any) => b.currency === "eur")?.amount || 0) / 100;

    // 2. Vue prévisionnelle
    const { data: previews } = await supabase
      .from("driver_settlement_preview").select("*")
      .or("card_courses.gt.0,cash_courses.gt.0");

    let totalToTransfer = 0;
    let totalCashDebt = 0;
    let driversWithoutStripe = 0;
    const issues: any[] = [];

    for (const p of previews || []) {
      totalToTransfer += Number(p.net_to_transfer_estimate || 0);
      totalCashDebt += Number(p.cash_debt_pending || 0) + Number(p.cash_fees_owed_this_week || 0);
      if (!p.stripe_connect_charges_enabled && p.card_courses > 0) {
        driversWithoutStripe++;
        issues.push({
          driver_id: p.driver_id, company: p.company_name, type: "no_stripe",
          message: `${p.card_to_transfer}€ carte en attente sans Stripe Connect`,
        });
      }
    }

    if (available < totalToTransfer) {
      issues.push({
        type: "insufficient_balance", severity: "critical",
        message: `Solde Stripe ${available.toFixed(2)}€ < ${totalToTransfer.toFixed(2)}€ requis`,
      });
    }

    return new Response(JSON.stringify({
      stripe_balance: { available, pending },
      total_to_transfer: totalToTransfer,
      total_cash_debt: totalCashDebt,
      drivers_count: previews?.length || 0,
      drivers_without_stripe: driversWithoutStripe,
      can_settle: available >= totalToTransfer && totalToTransfer > 0,
      issues,
      previews,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
