import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[create-company-course] Auth error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('[create-company-course] User authenticated:', user.id);

    const body = await req.json();
    const {
      company_id,
      driver_id,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      destination_address,
      destination_latitude,
      destination_longitude,
      scheduled_date,
      passengers_count,
      notes
    } = body;

    console.log('[create-company-course] Request body:', { company_id, driver_id, pickup_address, destination_address });

    if (!company_id || !driver_id || !pickup_address || !destination_address || !scheduled_date) {
      throw new Error('Missing required fields');
    }

    // Create admin client for validation and insertion
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is employee or admin of the company
    const { data: employee, error: empError } = await supabaseAdmin
      .from('company_employees')
      .select('id, company_id, is_active, is_suspended')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('company_administrators')
      .select('id, company_id, is_active')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[create-company-course] Employee check:', { employee, empError });
    console.log('[create-company-course] Admin check:', { admin, adminError });

    const isEmployee = employee && !employee.is_suspended;
    const isAdmin = !!admin;

    if (!isEmployee && !isAdmin) {
      throw new Error('User is not an employee or admin of this company');
    }

    // Verify driver has accepted agreement with company
    const { data: agreement, error: agreementError } = await supabaseAdmin
      .from('company_driver_agreements')
      .select('id, status')
      .eq('company_id', company_id)
      .eq('driver_id', driver_id)
      .eq('status', 'accepted')
      .maybeSingle();

    console.log('[create-company-course] Agreement check:', { agreement, agreementError });

    if (!agreement) {
      throw new Error('No active agreement with this driver');
    }

    // Calculate distance and duration using coordinates
    let distance_km = null;
    let duration_minutes = null;
    
    if (pickup_latitude && pickup_longitude && destination_latitude && destination_longitude) {
      try {
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (destination_latitude - pickup_latitude) * Math.PI / 180;
        const dLon = (destination_longitude - pickup_longitude) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pickup_latitude * Math.PI / 180) * Math.cos(destination_latitude * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const straightLineDistance = R * c;
        
        // Apply a road factor (roads are typically 1.3-1.4 times longer than straight line)
        distance_km = Math.round(straightLineDistance * 1.35 * 10) / 10;
        
        // Estimate duration: average 40 km/h in urban areas
        duration_minutes = Math.round((distance_km / 40) * 60);
        
        console.log('[create-company-course] Calculated distance:', distance_km, 'km, duration:', duration_minutes, 'min');
      } catch (e) {
        console.warn('[create-company-course] Distance calculation failed:', e);
      }
    }

    // Create the course with service role (bypasses RLS)
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .insert({
        driver_id,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        destination_address,
        destination_latitude,
        destination_longitude,
        scheduled_date,
        passengers_count: passengers_count || 1,
        notes,
        status: 'pending',
        created_by_user_id: user.id,
        distance_km,
        duration_minutes,
      })
      .select()
      .single();

    if (courseError) {
      console.error('[create-company-course] Course insert error:', courseError);
      throw new Error(`Failed to create course: ${courseError.message}`);
    }

    console.log('[create-company-course] Course created:', course.id, 'with distance:', distance_km);

    // Link to company with employee_id
    const { error: linkError } = await supabaseAdmin
      .from('company_courses')
      .insert({
        company_id,
        course_id: course.id,
        invoice_to_company: true,
        employee_id: isEmployee ? employee.id : null, // Link to employee for filtering
      });

    if (linkError) {
      console.error('[create-company-course] Link error:', linkError);
      // Rollback: delete the course
      await supabaseAdmin.from('courses').delete().eq('id', course.id);
      throw new Error(`Failed to link course to company: ${linkError.message}`);
    }

    console.log('[create-company-course] Course linked to company');

    // IMPORTANT: Ne PAS notifier le chauffeur ici
    // Le flux correct est :
    // 1. Course créée + devis généré automatiquement
    // 2. Collaborateur voit le devis et peut l'accepter/refuser
    // 3. Quand le collaborateur accepte le devis → on notifie le chauffeur
    // 4. Le chauffeur accepte → course confirmée
    console.log('[create-company-course] Course created, waiting for employee to accept quote before notifying driver');

    return new Response(JSON.stringify({ success: true, course }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[create-company-course] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
