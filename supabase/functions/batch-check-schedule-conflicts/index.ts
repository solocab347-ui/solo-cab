import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUFFER_MINUTES = 90; // 1h30

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: pass driver_id to only re-check one driver's courses (when they update their schedule)
    let targetDriverId: string | null = null;
    try {
      const body = await req.json();
      targetDriverId = body?.driver_id || null;
    } catch { /* no body = batch all */ }

    const now = new Date().toISOString();

    // Build query
    let query = supabase
      .from("courses")
      .select("id, driver_id, scheduled_date, is_out_of_schedule")
      .gte("scheduled_date", now)
      .in("status", ["pending", "accepted"])
      .not("driver_id", "is", null)
      .limit(500);

    if (targetDriverId) {
      query = query.eq("driver_id", targetDriverId);
    }

    const { data: courses, error: coursesError } = await query;
    if (coursesError) throw coursesError;

    const driverIds = [...new Set(courses?.map(c => c.driver_id).filter(Boolean) || [])];
    
    if (driverIds.length === 0) {
      return new Response(
        JSON.stringify({ checked: 0, flagged: 0, cleared: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: allSlots } = await supabase
      .from("driver_availability_slots")
      .select("*")
      .in("driver_id", driverIds)
      .eq("slot_type", "recurring");

    // Group slots by driver_id + day_of_week
    const slotsMap: Record<string, any> = {};
    allSlots?.forEach(slot => {
      slotsMap[`${slot.driver_id}_${slot.day_of_week}`] = slot;
    });

    let flagged = 0;
    let cleared = 0;
    let checked = 0;

    for (const course of courses || []) {
      if (!course.driver_id || !course.scheduled_date) continue;
      checked++;

      const scheduledDate = new Date(course.scheduled_date);
      const dayOfWeek = scheduledDate.getDay();
      const courseHour = scheduledDate.getHours();
      const courseMinutes = scheduledDate.getMinutes();
      const courseTimeStr = `${String(courseHour).padStart(2, "0")}:${String(courseMinutes).padStart(2, "0")}`;

      const slot = slotsMap[`${course.driver_id}_${dayOfWeek}`];

      let shouldFlag = false;
      let conflictType = 'none';
      let driverStartTime = "08:00";
      let driverEndTime = "20:00";

      if (slot) {
        driverStartTime = slot.start_time;
        driverEndTime = slot.end_time;
        const courseMin = timeToMinutes(courseTimeStr);
        const startMin = timeToMinutes(driverStartTime);
        const endMin = timeToMinutes(driverEndTime);

        if (!slot.is_available) {
          shouldFlag = true;
          conflictType = 'day_off';
        } else if (courseMin < startMin || courseMin > endMin) {
          shouldFlag = true;
          conflictType = 'outside_hours';
        } else if (courseMin < startMin + BUFFER_MINUTES) {
          shouldFlag = true;
          conflictType = 'buffer_start';
        } else if (courseMin > endMin - BUFFER_MINUTES) {
          shouldFlag = true;
          conflictType = 'buffer_end';
        }
      }

      if (shouldFlag && !course.is_out_of_schedule) {
        await supabase
          .from("courses")
          .update({ is_out_of_schedule: true })
          .eq("id", course.id);

        await supabase
          .from("out_of_schedule_alerts")
          .upsert({
            course_id: course.id,
            driver_id: course.driver_id,
            scheduled_date: course.scheduled_date,
            day_of_week: dayOfWeek,
            course_time: courseTimeStr,
            driver_start_time: driverStartTime,
            driver_end_time: driverEndTime,
            action: "pending",
          }, { onConflict: "course_id,driver_id" });

        // Notify
        const { data: driver } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", course.driver_id)
          .single();

        if (driver) {
          const isBuffer = conflictType.startsWith('buffer');
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: isBuffer ? "⚡ Course en zone tampon" : "⏰ Course hors planning",
            message: isBuffer
              ? `Course à ${courseTimeStr} proche de vos limites horaires (${driverStartTime}-${driverEndTime}).`
              : `Course à ${courseTimeStr} hors de vos horaires (${driverStartTime}-${driverEndTime}).`,
            type: "schedule_conflict",
            action_url: "/driver-dashboard?tab=planning&alert=schedule",
            is_read: false,
          });
        }

        flagged++;
      } else if (!shouldFlag && course.is_out_of_schedule) {
        // Clear the flag - schedule may have changed
        await supabase
          .from("courses")
          .update({ is_out_of_schedule: false })
          .eq("id", course.id);

        // Remove resolved alert
        await supabase
          .from("out_of_schedule_alerts")
          .delete()
          .eq("course_id", course.id)
          .eq("driver_id", course.driver_id);

        cleared++;
      }
    }

    return new Response(
      JSON.stringify({ checked, flagged, cleared, total_drivers: driverIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Batch schedule check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
