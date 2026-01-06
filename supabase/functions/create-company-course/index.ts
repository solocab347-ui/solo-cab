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
      })
      .select()
      .single();

    if (courseError) {
      console.error('[create-company-course] Course insert error:', courseError);
      throw new Error(`Failed to create course: ${courseError.message}`);
    }

    console.log('[create-company-course] Course created:', course.id);

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

    // Try to create devis (non-blocking)
    try {
      const { data: driver } = await supabaseAdmin
        .from('drivers')
        .select('user_id')
        .eq('id', driver_id)
        .single();

      if (driver?.user_id) {
        const { data: companyData } = await supabaseAdmin
          .from('companies')
          .select('company_name')
          .eq('id', company_id)
          .single();

        await supabaseAdmin.from('notifications').insert({
          user_id: driver.user_id,
          title: 'Nouvelle demande entreprise',
          message: `${companyData?.company_name || 'Une entreprise'} demande une course`,
          type: 'course_request',
          link: '/driver-dashboard?tab=courses',
        });

        console.log('[create-company-course] Driver notified');
      }
    } catch (e) {
      console.warn('[create-company-course] Notification failed:', e);
    }

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
