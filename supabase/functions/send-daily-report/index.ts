import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get all active drivers (status 'validated' = active in our system)
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, user_id, business_name')
      .eq('status', 'validated');

    if (driversError) throw driversError;

    const reports = [];

    for (const driver of drivers || []) {
      // Get yesterday's courses for this driver
      const { data: courses } = await supabase
        .from('courses')
        .select('id, final_payment_amount, guest_estimated_price, status')
        .or(`driver_id.eq.${driver.id},driver_ids.cs.{${driver.id}}`)
        .gte('scheduled_date', `${yesterdayStr}T00:00:00`)
        .lte('scheduled_date', `${yesterdayStr}T23:59:59`);

      // Get new clients from yesterday
      const { data: newClients } = await supabase
        .from('clients')
        .select('id')
        .or(`driver_id.eq.${driver.id},driver_ids.cs.{${driver.id}}`)
        .gte('created_at', `${yesterdayStr}T00:00:00`)
        .lte('created_at', `${yesterdayStr}T23:59:59`);

      // Get daily entries from external platforms
      const { data: externalEntries } = await supabase
        .from('driver_daily_entries')
        .select('revenue, courses_count')
        .eq('driver_id', driver.id)
        .eq('entry_date', yesterdayStr)
        .eq('is_solocab', false);

      // Calculate SoloCab stats
      const completedCourses = courses?.filter((c: any) => c.status === 'completed') || [];
      const soloCabRevenue = completedCourses.reduce((sum: number, c: any) => sum + (c.final_payment_amount || c.guest_estimated_price || 0), 0);
      const soloCabCourses = completedCourses.length;

      // Calculate external platform stats
      const externalRevenue = externalEntries?.reduce((sum, e) => sum + (e.revenue || 0), 0) || 0;
      const externalCourses = externalEntries?.reduce((sum, e) => sum + (e.courses_count || 0), 0) || 0;

      // Total stats
      const totalRevenue = soloCabRevenue + externalRevenue;
      const totalCourses = soloCabCourses + externalCourses;
      const newClientsCount = newClients?.length || 0;

      // Only send report if there was activity
      if (totalRevenue > 0 || totalCourses > 0 || newClientsCount > 0) {
        // Get driver's objectives
        const { data: objectives } = await supabase
          .from('driver_objectives')
          .select('revenue_target')
          .eq('driver_id', driver.id)
          .eq('period_type', 'daily')
          .single();

        const dailyTarget = objectives?.revenue_target || 0;
        const progressPercentage = dailyTarget > 0 ? Math.round((totalRevenue / dailyTarget) * 100) : 0;

        // Create notification message
        let title = '📊 Rapport d\'hier';
        let content = ``;

        if (progressPercentage >= 100) {
          title = '🏆 Objectif atteint hier !';
          content = `Bravo ! Tu as réalisé ${totalRevenue.toFixed(0)}€ (${progressPercentage}% de ton objectif). `;
        } else if (progressPercentage >= 75) {
          title = '💪 Belle journée hier !';
          content = `Tu as réalisé ${totalRevenue.toFixed(0)}€ (${progressPercentage}% de ton objectif). `;
        } else if (totalRevenue > 0) {
          content = `Hier, tu as réalisé ${totalRevenue.toFixed(0)}€`;
          if (dailyTarget > 0) {
            content += ` (${progressPercentage}% de ton objectif)`;
          }
          content += '. ';
        }

        // Add details
        const details = [];
        if (soloCabRevenue > 0) {
          details.push(`SoloCab: ${soloCabRevenue.toFixed(0)}€ (${soloCabCourses} courses)`);
        }
        if (externalRevenue > 0) {
          details.push(`Autres: ${externalRevenue.toFixed(0)}€ (${externalCourses} courses)`);
        }
        if (newClientsCount > 0) {
          details.push(`+${newClientsCount} nouveau${newClientsCount > 1 ? 'x' : ''} client${newClientsCount > 1 ? 's' : ''}`);
        }

        if (details.length > 0) {
          content += details.join(' • ');
        }

        // Insert notification
        await supabase
          .from('notifications')
          .insert({
            user_id: driver.user_id,
            type: 'daily_report',
            title,
            message: content,
            data: {
              date: yesterdayStr,
              total_revenue: totalRevenue,
              solocab_revenue: soloCabRevenue,
              external_revenue: externalRevenue,
              total_courses: totalCourses,
              new_clients: newClientsCount,
              progress_percentage: progressPercentage,
            }
          });

        // Also create a coaching message for the driver
        await supabase
          .from('driver_coaching_messages')
          .insert({
            driver_id: driver.id,
            message_type: progressPercentage >= 100 ? 'milestone' : 'tip',
            title,
            content,
            is_read: false,
            related_kpi: 'daily_report',
          });

        reports.push({
          driver_id: driver.id,
          revenue: totalRevenue,
          courses: totalCourses,
          new_clients: newClientsCount,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reports_sent: reports.length,
        date: yesterdayStr 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending daily reports:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
