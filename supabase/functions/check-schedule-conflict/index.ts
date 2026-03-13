import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    // JS: 0=Sunday, 1=Monday... matches our DAYS_OF_WEEK convention
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

    let isOutOfSchedule = false;
    let driverStartTime = "08:00";
    let driverEndTime = "20:00";

    if (slots && slots.length > 0) {
      const slot = slots[0];
      driverStartTime = slot.start_time;
      driverEndTime = slot.end_time;

      if (!slot.is_available) {
        // Driver marked this day as not available
        isOutOfSchedule = true;
      } else {
        // Check if course time is within working hours
        if (courseTimeStr < slot.start_time || courseTimeStr > slot.end_time) {
          isOutOfSchedule = true;
        }
      }
    }
    // If no slots defined, we assume driver is always available (no restriction)

    if (isOutOfSchedule) {
      // Flag the course
      await supabase
        .from("courses")
        .update({ is_out_of_schedule: true })
        .eq("id", course_id);

      // Create alert (upsert to avoid duplicates)
      const { error: alertError } = await supabase
        .from("out_of_schedule_alerts")
        .upsert({
          course_id,
          driver_id,
          scheduled_date: course.scheduled_date,
          day_of_week: dayOfWeek,
          course_time: courseTimeStr,
          driver_start_time: driverStartTime,
          driver_end_time: driverEndTime,
          action: "pending",
          notified_at: new Date().toISOString(),
        }, {
          onConflict: "course_id,driver_id"
        });

      if (alertError) console.error("Alert upsert error:", alertError);

      // Send notification to driver
      const { data: driver } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", driver_id)
        .single();

      if (driver) {
        await supabase.from("notifications").insert({
          user_id: driver.user_id,
          title: "⏰ Course hors planning",
          message: `Une course est prévue à ${courseTimeStr} alors que vos horaires sont ${driverStartTime}-${driverEndTime}. Vous pouvez la conserver ou la proposer à un partenaire.`,
          type: "schedule_conflict",
          action_url: "/driver-dashboard?tab=planning&alert=schedule",
          is_read: false,
        });
      }

      return new Response(
        JSON.stringify({
          is_out_of_schedule: true,
          course_time: courseTimeStr,
          driver_start_time: driverStartTime,
          driver_end_time: driverEndTime,
          day_of_week: dayOfWeek,
          message: `Course à ${courseTimeStr} hors de vos horaires (${driverStartTime}-${driverEndTime})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Course is within schedule
    await supabase
      .from("courses")
      .update({ is_out_of_schedule: false })
      .eq("id", course_id);

    return new Response(
      JSON.stringify({
        is_out_of_schedule: false,
        course_time: courseTimeStr,
        driver_start_time: driverStartTime,
        driver_end_time: driverEndTime,
      }),
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
