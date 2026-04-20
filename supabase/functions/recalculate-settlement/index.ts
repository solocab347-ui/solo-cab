// Recalcul "à blanc" (dry-run) du dernier règlement avec la nouvelle logique cash/carte.
// Ne modifie RIEN — retourne uniquement ce qui aurait dû être viré.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Non authentifié");
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) throw new Error("Non authentifié");
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Accès admin requis");

    const body = await req.json().catch(() => ({}));
    const settlementId = body.settlement_id as string | undefined;

    // Settlement cible (le plus récent par défaut)
    let settlement;
    if (settlementId) {
      const { data } = await supabase.from("weekly_settlements").select("*").eq("id", settlementId).single();
      settlement = data;
    } else {
      const { data } = await supabase.from("weekly_settlements")
        .select("*").order("created_at", { ascending: false }).limit(1).single();
      settlement = data;
    }
    if (!settlement) throw new Error("Aucun règlement trouvé");

    // Charger TOUS les driver_balance_pending de cette semaine (settled + pending) pour reconstituer
    const weekStart = settlement.week_start;
    const weekEnd = settlement.week_end;

    const { data: balances } = await supabase
      .from("driver_balance_pending")
      .select("*")
      .gte("created_at", `${weekStart}T00:00:00Z`)
      .lte("created_at", `${weekEnd}T23:59:59Z`);

    // Agréger cash vs carte par chauffeur
    const totals: Record<string, any> = {};
    for (const bal of balances || []) {
      if (!totals[bal.driver_id]) {
        totals[bal.driver_id] = {
          card_gross: 0, card_net: 0, card_fees: 0, card_courses: 0,
          cash_gross: 0, cash_fees_owed: 0, cash_courses: 0,
        };
      }
      const t = totals[bal.driver_id];
      if (bal.payment_type === "cash") {
        t.cash_gross += Number(bal.gross_amount || 0);
        t.cash_fees_owed += Number(bal.solocab_fee || 0);
        t.cash_courses++;
      } else {
        t.card_gross += Number(bal.gross_amount || 0);
        t.card_net += Number(bal.net_amount || 0);
        t.card_fees += Number(bal.solocab_fee || 0);
        t.card_courses++;
      }
    }

    // Enrichir avec dette cash existante + nom chauffeur
    const driverIds = Object.keys(totals);
    const { data: drivers } = await supabase
      .from("drivers").select("id, company_name, cash_debt_pending, stripe_connect_charges_enabled")
      .in("id", driverIds);

    const result = (drivers || []).map((d: any) => {
      const t = totals[d.id];
      const totalCashDebt = Number(d.cash_debt_pending || 0) + t.cash_fees_owed;
      const realNet = t.card_net - totalCashDebt;
      return {
        driver_id: d.id,
        company: d.company_name,
        stripe_ok: d.stripe_connect_charges_enabled,
        card_courses: t.card_courses,
        card_net: Number(t.card_net.toFixed(2)),
        cash_courses: t.cash_courses,
        cash_collected_by_driver: Number(t.cash_gross.toFixed(2)),
        cash_fees_owed_to_solocab: Number(t.cash_fees_owed.toFixed(2)),
        previous_cash_debt: Number(d.cash_debt_pending || 0),
        total_cash_debt: Number(totalCashDebt.toFixed(2)),
        real_net_should_transfer: Number(realNet.toFixed(2)),
        action: realNet >= 1
          ? "✅ Aurait viré"
          : realNet > 0
            ? "⚠️ Sous le minimum 1€ — compensation"
            : "❌ Net négatif — dette reportée",
      };
    });

    const totalShouldTransfer = result.reduce((s, r) => s + Math.max(0, r.real_net_should_transfer), 0);
    const totalCashDebtNet = result.reduce((s, r) => s + r.total_cash_debt, 0);

    return new Response(JSON.stringify({
      settlement: { id: settlement.id, week_start: weekStart, week_end: weekEnd, status: settlement.status },
      summary: {
        drivers_count: result.length,
        total_should_transfer: Number(totalShouldTransfer.toFixed(2)),
        total_cash_debt_to_recover: Number(totalCashDebtNet.toFixed(2)),
      },
      drivers: result.sort((a, b) => b.real_net_should_transfer - a.real_net_should_transfer),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
