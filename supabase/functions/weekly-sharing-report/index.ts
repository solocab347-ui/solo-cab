import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    // Calculate week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - mondayOffset);
    weekEnd.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);

    const weekStartStr = weekStart.toISOString();
    const weekEndStr = weekEnd.toISOString();

    // Get all completed shared courses for this week
    const { data: sharedCourses, error } = await supabase
      .from("shared_courses")
      .select("id, course_amount, commission_percentage, commission_amount, solocab_fee_cents, sender_driver_id, receiver_driver_id, completed_at, sharing_scope")
      .eq("status", "completed")
      .gte("completed_at", weekStartStr)
      .lt("completed_at", weekEndStr);

    if (error) throw error;

    const totalShares = sharedCourses?.length || 0;
    const totalSolocabFees = sharedCourses?.reduce((acc, c) => acc + (c.solocab_fee_cents || 20), 0) || 0;
    const totalCommission = sharedCourses?.reduce((acc, c) => acc + Math.round((c.commission_amount || 0) * 100), 0) || 0;
    const totalCourseAmount = sharedCourses?.reduce((acc, c) => acc + Math.round((c.course_amount || 0) * 100), 0) || 0;

    // Build detailed report
    const reportData = {
      generated_at: now.toISOString(),
      courses: sharedCourses?.map(c => ({
        id: c.id,
        amount: c.course_amount,
        commission_pct: c.commission_percentage,
        commission: c.commission_amount,
        solocab_fee: (c.solocab_fee_cents || 20) / 100,
        sender: c.sender_driver_id,
        receiver: c.receiver_driver_id,
        scope: c.sharing_scope,
      })) || [],
    };

    // Upsert weekly report
    const { error: upsertError } = await supabase
      .from("sharing_weekly_reports")
      .upsert({
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        total_shares: totalShares,
        total_solocab_fees_cents: totalSolocabFees,
        total_commission_cents: totalCommission,
        total_course_amount_cents: totalCourseAmount,
        report_data: reportData,
      }, { onConflict: "week_start" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      success: true,
      week: `${weekStart.toISOString().split("T")[0]} → ${weekEnd.toISOString().split("T")[0]}`,
      total_shares: totalShares,
      total_solocab_fees: `${(totalSolocabFees / 100).toFixed(2)}€`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
