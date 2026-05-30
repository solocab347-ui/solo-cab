import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReassignRequest {
  course_id: string;
  driver_id: string;
  fleet_manager_id: string;
  scheduled_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: vérifier le JWT et que l'appelant est bien le fleet_manager visé
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { course_id, driver_id, fleet_manager_id, scheduled_date }: ReassignRequest = await req.json();

    // Le fleet_manager_id fourni doit correspondre à un fleet_manager appartenant au user
    // OU le caller doit être admin.
    const [{ data: fm }, { data: isAdmin }] = await Promise.all([
      supabase.from("fleet_managers").select("id, user_id").eq("id", fleet_manager_id).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
    ]);
    if (!isAdmin && (!fm || fm.user_id !== userData.user.id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Auto-reassign request:", { course_id, driver_id, fleet_manager_id, scheduled_date });

    // Check if the selected driver is available
    const scheduledTime = new Date(scheduled_date);
    const oneHourBefore = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
    const oneHourAfter = new Date(scheduledTime.getTime() + 60 * 60 * 1000);
    const dateOnly = scheduled_date.split("T")[0];

    // Check for conflicting schedules
    const { data: conflicts, error: conflictsError } = await supabase
      .from("driver_schedules")
      .select("*")
      .eq("driver_id", driver_id)
      .eq("date", dateOnly)
      .eq("is_available", false);

    if (conflictsError) {
      console.error("Error checking conflicts:", conflictsError);
      throw conflictsError;
    }

    let isAvailable = true;
    const scheduledHour = scheduledTime.getHours();
    const scheduledMinutes = scheduledTime.getMinutes();
    const scheduledTimeStr = `${String(scheduledHour).padStart(2, "0")}:${String(scheduledMinutes).padStart(2, "0")}:00`;

    for (const schedule of conflicts || []) {
      const startTime = schedule.start_time;
      const endTime = schedule.end_time;
      
      // Check if scheduled time falls within any blocked period
      if (scheduledTimeStr >= startTime && scheduledTimeStr <= endTime) {
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) {
      // Driver is available, assign the course
      console.log("Driver is available, assigning course");
      
      return new Response(
        JSON.stringify({
          success: true,
          reassigned: false,
          driver_id,
          message: "Chauffeur disponible",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("Driver not available, finding alternative");

    // Find another available driver from the same fleet
    const { data: fleetDrivers, error: fleetError } = await supabase
      .from("fleet_manager_drivers")
      .select("driver_id")
      .eq("fleet_manager_id", fleet_manager_id)
      .eq("status", "active");

    if (fleetError) {
      console.error("Error fetching fleet drivers:", fleetError);
      throw fleetError;
    }

    let alternativeDriverId: string | null = null;
    let alternativeDriverName: string | null = null;

    for (const fd of fleetDrivers || []) {
      if (fd.driver_id === driver_id) continue; // Skip the original driver

      // Get driver info
      const { data: driverInfo, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, user_id")
        .eq("id", fd.driver_id)
        .single();

      if (driverError || !driverInfo || driverInfo.status !== "validated") continue;

      // Check availability of this driver
      const { data: driverConflicts } = await supabase
        .from("driver_schedules")
        .select("*")
        .eq("driver_id", fd.driver_id)
        .eq("date", dateOnly)
        .eq("is_available", false);

      let driverAvailable = true;
      for (const schedule of driverConflicts || []) {
        if (scheduledTimeStr >= schedule.start_time && scheduledTimeStr <= schedule.end_time) {
          driverAvailable = false;
          break;
        }
      }

      if (driverAvailable) {
        alternativeDriverId = fd.driver_id;
        
        // Get driver's name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", driverInfo.user_id)
          .single();
        
        alternativeDriverName = profile?.full_name || "Chauffeur disponible";
        break;
      }
    }

    if (alternativeDriverId) {
      console.log("Found alternative driver:", alternativeDriverId);
      
      return new Response(
        JSON.stringify({
          success: true,
          reassigned: true,
          original_driver_id: driver_id,
          new_driver_id: alternativeDriverId,
          new_driver_name: alternativeDriverName,
          message: `Le chauffeur choisi n'est pas disponible. ${alternativeDriverName} a été assigné à votre place.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // No available driver found
    console.log("No available driver found");
    
    return new Response(
      JSON.stringify({
        success: false,
        reassigned: false,
        message: "Aucun chauffeur n'est disponible à cette date et heure. Veuillez choisir un autre créneau.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Auto-reassign error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
