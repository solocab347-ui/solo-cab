import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUFFER_MINUTES = 90; // 1h30 buffer before start and before end

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

interface ConflictResult {
  is_out_of_schedule: boolean;
  is_buffer_zone: boolean;
  conflict_type: 'none' | 'outside_hours' | 'day_off' | 'buffer_start' | 'buffer_end';
  course_time: string;
  driver_start_time: string;
  driver_end_time: string;
  message: string;
}

function checkConflict(
  courseTimeStr: string,
  slot: { is_available: boolean; start_time: string; end_time: string } | null
): ConflictResult {
  const driverStartTime = slot?.start_time || "08:00";
  const driverEndTime = slot?.end_time || "20:00";

  const base: Omit<ConflictResult, 'is_out_of_schedule' | 'is_buffer_zone' | 'conflict_type' | 'message'> = {
    course_time: courseTimeStr,
    driver_start_time: driverStartTime,
    driver_end_time: driverEndTime,
  };

  // No slot defined = no restrictions
  if (!slot) {
    return { ...base, is_out_of_schedule: false, is_buffer_zone: false, conflict_type: 'none', message: '' };
  }

  // Day marked as not available
  if (!slot.is_available) {
    return {
      ...base,
      is_out_of_schedule: true,
      is_buffer_zone: false,
      conflict_type: 'day_off',
      message: `Ce jour est marqué comme non travaillé`,
    };
  }

  const courseMin = timeToMinutes(courseTimeStr);
  const startMin = timeToMinutes(driverStartTime);
  const endMin = timeToMinutes(driverEndTime);

  // Completely outside work hours
  if (courseMin < startMin || courseMin > endMin) {
    return {
      ...base,
      is_out_of_schedule: true,
      is_buffer_zone: false,
      conflict_type: 'outside_hours',
      message: `Course à ${courseTimeStr} hors de vos horaires (${driverStartTime}-${driverEndTime})`,
    };
  }

  // Within 1h30 AFTER start (buffer start zone)
  if (courseMin >= startMin && courseMin < startMin + BUFFER_MINUTES) {
    return {
      ...base,
      is_out_of_schedule: false,
      is_buffer_zone: true,
      conflict_type: 'buffer_start',
      message: `Course à ${courseTimeStr} dans les 1h30 après le début de travail (${driverStartTime}). Vérifiez votre disponibilité.`,
    };
  }

  // Within 1h30 BEFORE end (buffer end zone)
  if (courseMin > endMin - BUFFER_MINUTES && courseMin <= endMin) {
    return {
      ...base,
      is_out_of_schedule: false,
      is_buffer_zone: true,
      conflict_type: 'buffer_end',
      message: `Course à ${courseTimeStr} dans les 1h30 avant la fin de travail (${driverEndTime}). Vérifiez votre disponibilité.`,
    };
  }

  // All clear
  return { ...base, is_out_of_schedule: false, is_buffer_zone: false, conflict_type: 'none', message: '' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { course_id, driver_id } = await req.json();

    if (!course_id || !driver_id) {
      return new Response(
        JSON.stringify({ error: "course_id and driver_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, scheduled_date, status")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const scheduledDate = new Date(course.scheduled_date);
    const dayOfWeek = scheduledDate.getDay();
    const courseHour = scheduledDate.getHours();
    const courseMinutes = scheduledDate.getMinutes();
    const courseTimeStr = `${String(courseHour).padStart(2, "0")}:${String(courseMinutes).padStart(2, "0")}`;

    // Get driver's recurring availability for that day
    const { data: slots } = await supabase
      .from("driver_availability_slots")
      .select("*")
      .eq("driver_id", driver_id)
      .eq("slot_type", "recurring")
      .eq("day_of_week", dayOfWeek);

    const slot = slots && slots.length > 0 ? slots[0] : null;
    const result = checkConflict(courseTimeStr, slot);

    if (result.is_out_of_schedule || result.is_buffer_zone) {
      // Flag the course
      await supabase
        .from("courses")
        .update({ is_out_of_schedule: result.is_out_of_schedule || result.is_buffer_zone })
        .eq("id", course_id);

      // Create alert
      await supabase
        .from("out_of_schedule_alerts")
        .upsert({
          course_id,
          driver_id,
          scheduled_date: course.scheduled_date,
          day_of_week: dayOfWeek,
          course_time: courseTimeStr,
          driver_start_time: result.driver_start_time,
          driver_end_time: result.driver_end_time,
          action: "pending",
          notified_at: new Date().toISOString(),
        }, { onConflict: "course_id,driver_id" });

      // Send notification
      const { data: driver } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", driver_id)
        .single();

      if (driver) {
        const icon = result.is_buffer_zone ? "⚡" : "⏰";
        const title = result.is_buffer_zone ? `${icon} Course en zone tampon` : `${icon} Course hors planning`;
        
        await supabase.from("notifications").insert({
          user_id: driver.user_id,
          title,
          message: result.message,
          type: "schedule_conflict",
          action_url: "/driver-dashboard?tab=planning&alert=schedule",
          is_read: false,
        });
      }

      return new Response(
        JSON.stringify({ ...result, day_of_week: dayOfWeek }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Course is within schedule - clear any previous flag
    await supabase
      .from("courses")
      .update({ is_out_of_schedule: false })
      .eq("id", course_id);

    // Remove any existing alert
    await supabase
      .from("out_of_schedule_alerts")
      .delete()
      .eq("course_id", course_id)
      .eq("driver_id", driver_id);

    return new Response(
      JSON.stringify({ ...result, day_of_week: dayOfWeek }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Schedule check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
