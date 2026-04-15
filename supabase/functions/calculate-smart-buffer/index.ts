import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartBufferRequest {
  driver_id: string;
  fleet_manager_id: string;
  new_course_pickup_lat: number;
  new_course_pickup_lon: number;
  new_course_scheduled_date: string;
  new_course_duration_minutes: number;
}

interface CourseWithLocation {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  destination_latitude: number;
  destination_longitude: number;
  pickup_latitude: number;
  pickup_longitude: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SmartBufferRequest = await req.json();
    const {
      driver_id,
      fleet_manager_id,
      new_course_pickup_lat,
      new_course_pickup_lon,
      new_course_scheduled_date,
      new_course_duration_minutes,
    } = body;

    console.log(`[SmartBuffer] Calculating for driver ${driver_id}, pickup: ${new_course_pickup_lat},${new_course_pickup_lon}`);

    // Get fleet manager settings
    const { data: fleetSettings, error: settingsError } = await supabase
      .from('fleet_managers')
      .select('smart_buffer_enabled, smart_buffer_min_minutes, smart_buffer_fallback_action, course_buffer_minutes')
      .eq('id', fleet_manager_id)
      .single();

    if (settingsError) {
      console.error('[SmartBuffer] Error fetching fleet settings:', settingsError);
      throw new Error('Fleet manager not found');
    }

    // If smart buffer is disabled, use fixed buffer
    if (!fleetSettings.smart_buffer_enabled) {
      console.log('[SmartBuffer] Smart buffer disabled, using fixed buffer');
      return new Response(
        JSON.stringify({
          can_accept: true,
          buffer_type: 'fixed',
          buffer_minutes: fleetSettings.course_buffer_minutes || 60,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newCourseDate = new Date(new_course_scheduled_date);
    const newCourseEnd = new Date(newCourseDate.getTime() + (new_course_duration_minutes || 60) * 60 * 1000);

    // Get driver's existing courses for the same day
    const dayStart = new Date(newCourseDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(newCourseDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existingCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, scheduled_date, duration_minutes, destination_latitude, destination_longitude, pickup_latitude, pickup_longitude')
      .eq('driver_id', driver_id)
      .in('status', ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress'])
      .gte('scheduled_date', dayStart.toISOString())
      .lte('scheduled_date', dayEnd.toISOString())
      .order('scheduled_date', { ascending: true });

    if (coursesError) {
      console.error('[SmartBuffer] Error fetching courses:', coursesError);
      throw coursesError;
    }

    console.log(`[SmartBuffer] Found ${existingCourses?.length || 0} existing courses`);

    // If no existing courses, the driver is available
    if (!existingCourses || existingCourses.length === 0) {
      return new Response(
        JSON.stringify({
          can_accept: true,
          buffer_type: 'smart',
          buffer_minutes: fleetSettings.smart_buffer_min_minutes,
          message: 'Aucune course existante, chauffeur disponible',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the course that ends just before the new course
    let previousCourse: CourseWithLocation | null = null;
    let nextCourse: CourseWithLocation | null = null;

    for (const course of existingCourses) {
      const courseStart = new Date(course.scheduled_date);
      const courseEnd = new Date(courseStart.getTime() + (course.duration_minutes || 60) * 60 * 1000);

      if (courseEnd <= newCourseDate) {
        // This course ends before the new one starts
        const prevEndTime = previousCourse ? new Date(previousCourse.scheduled_date).getTime() + (previousCourse.duration_minutes || 60) * 60 * 1000 : 0;
        if (!previousCourse || courseEnd.getTime() > prevEndTime) {
          previousCourse = course;
        }
      } else if (courseStart >= newCourseEnd) {
        // This course starts after the new one ends
        if (!nextCourse || courseStart < new Date(nextCourse.scheduled_date)) {
          nextCourse = course;
        }
      } else {
        // Overlap detected
        console.log('[SmartBuffer] Course overlap detected');
        return new Response(
          JSON.stringify({
            can_accept: false,
            buffer_type: 'smart',
            reason: 'overlap',
            message: 'La nouvelle course chevauche une course existante',
            fallback_action: fleetSettings.smart_buffer_fallback_action,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate travel time from previous course destination to new course pickup
    let travelTimeMinutes = fleetSettings.smart_buffer_min_minutes;
    let calculatedWithMapbox = false;

    if (previousCourse && previousCourse.destination_latitude && previousCourse.destination_longitude && mapboxToken) {
      try {
        const origin = `${previousCourse.destination_longitude},${previousCourse.destination_latitude}`;
        const destination = `${new_course_pickup_lon},${new_course_pickup_lat}`;
        
        const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}?access_token=${mapboxToken}`;
        
        const response = await fetch(mapboxUrl);
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          // Mapbox returns duration in seconds
          const durationSeconds = data.routes[0].duration;
          travelTimeMinutes = Math.ceil(durationSeconds / 60);
          calculatedWithMapbox = true;
          console.log(`[SmartBuffer] Mapbox travel time: ${travelTimeMinutes} minutes`);
        }
      } catch (mapboxError) {
        console.error('[SmartBuffer] Mapbox API error:', mapboxError);
        // Use haversine distance as fallback
        travelTimeMinutes = calculateHaversineTime(
          previousCourse.destination_latitude,
          previousCourse.destination_longitude,
          new_course_pickup_lat,
          new_course_pickup_lon
        );
      }
    } else if (previousCourse && previousCourse.destination_latitude && previousCourse.destination_longitude) {
      // No Mapbox token, use haversine
      travelTimeMinutes = calculateHaversineTime(
        previousCourse.destination_latitude,
        previousCourse.destination_longitude,
        new_course_pickup_lat,
        new_course_pickup_lon
      );
    }

    // Add minimum buffer to travel time
    const totalBufferNeeded = travelTimeMinutes + fleetSettings.smart_buffer_min_minutes;

    // Check if there's enough time
    if (previousCourse) {
      const previousCourseEnd = new Date(previousCourse.scheduled_date);
      previousCourseEnd.setMinutes(previousCourseEnd.getMinutes() + (previousCourse.duration_minutes || 60));
      
      const availableTime = (newCourseDate.getTime() - previousCourseEnd.getTime()) / 60000; // in minutes

      console.log(`[SmartBuffer] Available time: ${availableTime}min, needed: ${totalBufferNeeded}min`);

      if (availableTime < totalBufferNeeded) {
        return new Response(
          JSON.stringify({
            can_accept: false,
            buffer_type: 'smart',
            reason: 'insufficient_time',
            available_minutes: Math.round(availableTime),
            required_minutes: Math.round(totalBufferNeeded),
            travel_time_minutes: Math.round(travelTimeMinutes),
            calculated_with_mapbox: calculatedWithMapbox,
            message: `Temps insuffisant: ${Math.round(availableTime)}min disponibles, ${Math.round(totalBufferNeeded)}min nécessaires`,
            fallback_action: fleetSettings.smart_buffer_fallback_action,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Also check if new course end doesn't conflict with next course
    if (nextCourse) {
      const nextCourseStart = new Date(nextCourse.scheduled_date);
      const timeUntilNext = (nextCourseStart.getTime() - newCourseEnd.getTime()) / 60000;

      // Calculate travel time to next course if needed
      let travelToNextMinutes = fleetSettings.smart_buffer_min_minutes;
      
      if (nextCourse.pickup_latitude && nextCourse.pickup_longitude && mapboxToken) {
        try {
          // Assuming new course destination is roughly same as pickup (for estimation)
          const origin = `${new_course_pickup_lon},${new_course_pickup_lat}`;
          const destination = `${nextCourse.pickup_longitude},${nextCourse.pickup_latitude}`;
          
          const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin};${destination}?access_token=${mapboxToken}`;
          
          const response = await fetch(mapboxUrl);
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            travelToNextMinutes = Math.ceil(data.routes[0].duration / 60);
          }
        } catch (e) {
          console.error('[SmartBuffer] Error calculating travel to next course:', e);
        }
      }

      const neededForNext = travelToNextMinutes + fleetSettings.smart_buffer_min_minutes;

      if (timeUntilNext < neededForNext) {
        return new Response(
          JSON.stringify({
            can_accept: false,
            buffer_type: 'smart',
            reason: 'conflicts_with_next',
            available_minutes: Math.round(timeUntilNext),
            required_minutes: Math.round(neededForNext),
            message: `Conflit avec la course suivante: ${Math.round(timeUntilNext)}min disponibles, ${Math.round(neededForNext)}min nécessaires`,
            fallback_action: fleetSettings.smart_buffer_fallback_action,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // All checks passed
    return new Response(
      JSON.stringify({
        can_accept: true,
        buffer_type: 'smart',
        buffer_minutes: Math.round(totalBufferNeeded),
        travel_time_minutes: Math.round(travelTimeMinutes),
        calculated_with_mapbox: calculatedWithMapbox,
        message: 'Chauffeur disponible avec buffer intelligent',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[SmartBuffer] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        can_accept: false,
        fallback_action: 'notify_manager'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to estimate travel time using Haversine distance
function calculateHaversineTime(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  // Estimate time: assume average speed of 40 km/h in urban areas
  const estimatedMinutes = (distance / 40) * 60;
  
  // Minimum 10 minutes, add 20% buffer for traffic
  return Math.max(10, Math.ceil(estimatedMinutes * 1.2));
}