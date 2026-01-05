import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { quote_id, action } = await req.json();

    if (!quote_id || !action || !['accept', 'refuse'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'quote_id et action (accept/refuse) requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get driver ID
    const { data: driver } = await supabaseClient
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      return new Response(
        JSON.stringify({ error: 'Driver not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Driver ${driver.id} ${action}ing quote ${quote_id}`);

    if (action === 'refuse') {
      // Simple refusal
      const { error: refuseError } = await supabaseClient
        .from('company_course_quotes')
        .update({ 
          status: 'refused',
          driver_response_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', quote_id)
        .eq('driver_id', driver.id);

      if (refuseError) {
        return new Response(
          JSON.stringify({ error: 'Failed to refuse quote' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: 'refused' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Accept with race condition handling
    const { data: claimResult, error: claimError } = await supabaseClient
      .rpc('claim_company_course_quote', {
        p_quote_id: quote_id,
        p_driver_id: driver.id
      });

    if (claimError) {
      console.error('❌ Claim error:', claimError);
      return new Response(
        JSON.stringify({ error: 'Failed to claim quote', details: claimError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Claim result:', claimResult);

    if (!claimResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: claimResult.error,
          already_taken: claimResult.error?.includes('taken') || claimResult.error?.includes('already')
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create actual course from request
    const { data: quote } = await supabaseClient
      .from('company_course_quotes')
      .select('*, request:company_course_requests(*)')
      .eq('id', quote_id)
      .single();

    if (quote?.request) {
      const request = quote.request;
      
      // Create the course
      const { data: course, error: courseError } = await supabaseClient
        .from('courses')
        .insert({
          driver_id: driver.id,
          pickup_address: request.pickup_address,
          pickup_latitude: request.pickup_latitude,
          pickup_longitude: request.pickup_longitude,
          destination_address: request.destination_address,
          destination_latitude: request.destination_latitude,
          destination_longitude: request.destination_longitude,
          scheduled_date: request.scheduled_date,
          passengers_count: request.passengers_count,
          notes: request.notes,
          status: 'accepted',
          distance_km: quote.distance_km,
          duration_minutes: quote.duration_minutes,
          is_guest_booking: request.is_guest_employee,
          guest_name: request.guest_employee_name,
          guest_phone: request.guest_employee_phone,
          guest_email: request.guest_employee_email,
          payment_method_requested: request.payment_method_requested,
        })
        .select()
        .single();

      if (!courseError && course) {
        // Link course to company
        await supabaseClient
          .from('company_courses')
          .insert({
            company_id: request.company_id,
            course_id: course.id,
            employee_id: request.employee_id,
            invoice_to_company: true,
            created_by_employee: !!request.employee_id,
          });

        // Update request with final course
        await supabaseClient
          .from('company_course_requests')
          .update({ final_course_id: course.id })
          .eq('id', request.id);

        // Create devis for the course
        try {
          await supabaseClient.functions.invoke('create-devis-auto', {
            body: { course_id: course.id, driver_id: driver.id }
          });
        } catch (e) {
          console.warn('⚠️ Devis auto creation failed:', e);
        }

        // Notify company
        const { data: company } = await supabaseClient
          .from('companies')
          .select('user_id, company_name')
          .eq('id', request.company_id)
          .single();

        if (company?.user_id) {
          const { data: driverProfile } = await supabaseClient
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          await supabaseClient.from('notifications').insert({
            user_id: company.user_id,
            title: 'Course acceptée',
            message: `${driverProfile?.full_name || 'Un chauffeur'} a accepté votre demande de course`,
            type: 'course_accepted',
            link: '/company-dashboard?tab=reservations',
          });
        }

        // Create guest employee invitation if needed
        if (request.is_guest_employee && request.guest_employee_name) {
          await supabaseClient
            .from('company_employee_course_invitations')
            .insert({
              company_id: request.company_id,
              request_id: request.id,
              course_id: course.id,
              guest_name: request.guest_employee_name,
              guest_phone: request.guest_employee_phone,
              guest_email: request.guest_employee_email,
              pickup_address: request.pickup_address,
              destination_address: request.destination_address,
              scheduled_date: request.scheduled_date,
            });
        }

        console.log('✅ Course created:', course.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, action: 'accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
