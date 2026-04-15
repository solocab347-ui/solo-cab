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

    // Get quote with request and company info
    const { data: quote } = await supabaseClient
      .from('company_course_quotes')
      .select(`
        *,
        request:company_course_requests(
          *,
          company:companies(user_id, company_name)
        )
      `)
      .eq('id', quote_id)
      .single();

    if (!quote) {
      return new Response(
        JSON.stringify({ error: 'Quote not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get driver profile for notifications
    const { data: driverProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const driverName = driverProfile?.full_name || 'Un chauffeur';

    console.log(`🎯 Driver ${driver.id} (${driverName}) ${action}ing quote ${quote_id}`);

    if (action === 'refuse') {
      // Update quote status to refused
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

      // Notify company that driver refused
      if (quote.request?.company?.user_id) {
        await supabaseClient.from('notifications').insert({
          user_id: quote.request.company.user_id,
          title: 'Chauffeur a refusé la course',
          message: `${driverName} a refusé votre demande de course`,
          type: 'company_course_refused',
          link: '/company-dashboard?tab=reservations',
        });
      }

      // Check if all quotes are refused - if so, update request status
      const { data: allQuotes } = await supabaseClient
        .from('company_course_quotes')
        .select('status')
        .eq('request_id', quote.request_id);

      const allRefused = allQuotes?.every(q => q.status === 'refused');
      if (allRefused) {
        await supabaseClient
          .from('company_course_requests')
          .update({ status: 'all_refused' })
          .eq('id', quote.request_id);

        // Notify company that all drivers refused
        if (quote.request?.company?.user_id) {
          await supabaseClient.from('notifications').insert({
            user_id: quote.request.company.user_id,
            title: 'Tous les chauffeurs ont refusé',
            message: 'Aucun chauffeur n\'a accepté votre demande. Vous pouvez la renvoyer à d\'autres chauffeurs.',
            type: 'company_course_all_refused',
            link: '/company-dashboard?tab=reservations',
          });
        }
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

    // Mark other pending quotes as "taken_by_other" and notify their drivers
    const { data: otherQuotes } = await supabaseClient
      .from('company_course_quotes')
      .select('id, driver_id, driver:drivers(user_id)')
      .eq('request_id', quote.request_id)
      .neq('id', quote_id)
      .eq('status', 'sent');

    if (otherQuotes && otherQuotes.length > 0) {
      // Update status to taken_by_other
      await supabaseClient
        .from('company_course_quotes')
        .update({ 
          status: 'taken_by_other',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', quote.request_id)
        .neq('id', quote_id)
        .eq('status', 'sent');

      // Notify each driver that the course was taken by another
      for (const otherQuote of otherQuotes) {
        const otherDriverUserId = (otherQuote.driver as any)?.user_id;
        if (otherDriverUserId) {
          await supabaseClient.from('notifications').insert({
            user_id: otherDriverUserId,
            title: 'Course attribuée à un autre chauffeur',
            message: `La demande de ${quote.request?.company?.company_name || 'l\'entreprise'} a été prise par un autre chauffeur`,
            type: 'company_course_taken_by_other',
            link: '/driver-dashboard?tab=courses',
          });
        }
      }
    }

    // Create actual course from request
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
        status: 'driver_approaching',
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

    if (courseError) {
      console.error('❌ Course creation error:', courseError);
      return new Response(
        JSON.stringify({ error: 'Failed to create course', details: courseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Course created:', course.id);

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

    // Update request with final course and accepted driver
    await supabaseClient
      .from('company_course_requests')
      .update({ 
        final_course_id: course.id,
        accepted_driver_id: driver.id,
        accepted_at: new Date().toISOString(),
        status: 'accepted'
      })
      .eq('id', request.id);

    // Create devis directly from the company quote (more reliable than calling create-devis-auto)
    try {
      const quoteNumber = `ENT-${quote_id.slice(0, 8).toUpperCase()}`;
      
      await supabaseClient
        .from('devis')
        .insert({
          course_id: course.id,
          driver_id: driver.id,
          company_id: request.company_id,
          company_employee_id: request.employee_id,
          amount: quote.total_price,
          base_price: quote.base_price || 0,
          distance_price: quote.distance_price || 0,
          time_price: quote.time_price || 0,
          evening_surcharge_amount: quote.evening_surcharge || 0,
          weekend_surcharge_amount: quote.weekend_surcharge || 0,
          discount_amount: 0,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          quote_number: quoteNumber
        });
      
      console.log('✅ Devis created for company course:', quoteNumber);
    } catch (e) {
      console.warn('⚠️ Devis creation failed:', e);
    }

    // Notify company
    if (request.company?.user_id) {
      await supabaseClient.from('notifications').insert({
        user_id: request.company.user_id,
        title: 'Course acceptée',
        message: `${driverName} a accepté votre demande de course`,
        type: 'course_accepted',
        link: '/company-dashboard?tab=reservations',
      });
    }

    // Update guest employee invitation with course_id if exists
    if (request.is_guest_employee && request.guest_employee_name) {
      await supabaseClient
        .from('company_employee_course_invitations')
        .update({ 
          course_id: course.id 
        })
        .eq('request_id', request.id);
    }

    return new Response(
      JSON.stringify({ success: true, action: 'accepted', course_id: course.id }),
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
