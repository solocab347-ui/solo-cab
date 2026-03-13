import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Batch check: scans all upcoming courses for schedule conflicts.
 * Called by cron or manually.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Get all upcoming courses that haven't been checked yet
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("id, driver_id, scheduled_date, is_out_of_schedule")
      .gte("scheduled_date", now)
      .in("status", ["pending", "accepted"])
      .not("driver_id", "is", null)
      .limit(500);

    if (coursesError) throw coursesError;

    let flagged = 0;
    let checked = 0;

    // Get all availability slots at once for efficiency
    const driverIds = [...new Set(courses?.map(c => c.driver_id).filter(Boolean) || [])];
    
    if (driverIds.length === 0) {
      return new Response(
        JSON.stringify({ checked: 0, flagged: 0 }),
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
      const key = `${slot.driver_id}_${slot.day_of_week}`;
      slotsMap[key] = slot;
    });

    for (const course of courses || []) {
      if (!course.driver_id || !course.scheduled_date) continue;
      checked++;

      const scheduledDate = new Date(course.scheduled_date);
      const dayOfWeek = scheduledDate.getDay();
      const courseHour = scheduledDate.getHours();
      const courseMinutes = scheduledDate.getMinutes();
      const courseTimeStr = `${String(courseHour).padStart(2, "0")}:${String(courseMinutes).padStart(2, "0")}`;

      const slotKey = `${course.driver_id}_${dayOfWeek}`;
      const slot = slotsMap[slotKey];

      let isOutOfSchedule = false;
      let driverStartTime = "08:00";
      let driverEndTime = "20:00";

      if (slot) {
        driverStartTime = slot.start_time;
        driverEndTime = slot.end_time;

        if (!slot.is_available) {
          isOutOfSchedule = true;
        } else if (courseTimeStr < slot.start_time || courseTimeStr > slot.end_time) {
          isOutOfSchedule = true;
        }
      }

      if (isOutOfSchedule && !course.is_out_of_schedule) {
        // Flag course
        await supabase
          .from("courses")
          .update({ is_out_of_schedule: true })
          .eq("id", course.id);

        // Create alert
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

        // Notify driver
        const { data: driver } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", course.driver_id)
          .single();

        if (driver) {
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "⏰ Course hors planning",
            message: `Course prévue à ${courseTimeStr} hors de vos horaires (${driverStartTime}-${driverEndTime}). Conservez-la ou proposez-la à un partenaire.`,
            type: "schedule_conflict",
            action_url: "/driver-dashboard?tab=planning&alert=schedule",
            is_read: false,
          });
        }

        flagged++;
      } else if (!isOutOfSchedule && course.is_out_of_schedule) {
        // Unflag (driver may have changed their schedule)
        await supabase
          .from("courses")
          .update({ is_out_of_schedule: false })
          .eq("id", course.id);
      }
    }

    return new Response(
      JSON.stringify({ checked, flagged, total_drivers: driverIds.length }),
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
