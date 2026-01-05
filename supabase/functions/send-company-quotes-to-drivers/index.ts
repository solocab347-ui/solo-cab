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

    const { request_id, quote_ids } = await req.json();

    if (!request_id || !quote_ids || !Array.isArray(quote_ids) || quote_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'request_id et quote_ids requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Sending quotes to drivers:', quote_ids);

    // Get request with company info
    const { data: request, error: requestError } = await supabaseClient
      .from('company_course_requests')
      .select(`
        *,
        company:companies(company_name, contact_name)
      `)
      .eq('id', request_id)
      .maybeSingle();

    if (requestError) {
      console.error('❌ Request query error:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request query failed', details: requestError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!request) {
      console.error('❌ Request not found:', request_id);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyName = request.company?.company_name || 'Une entreprise';
    
    // Get employee name - handle both registered and guest employees
    let employeeName = request.guest_employee_name;
    if (!request.is_guest_employee && request.employee_id) {
      const { data: employee } = await supabaseClient
        .from('company_employees')
        .select('user_id')
        .eq('id', request.employee_id)
        .maybeSingle();
      
      if (employee?.user_id) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', employee.user_id)
          .maybeSingle();
        employeeName = profile?.full_name;
      }
    }

    // Update quotes to 'sent' status
    const { data: quotes, error: updateError } = await supabaseClient
      .from('company_course_quotes')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', quote_ids)
      .eq('request_id', request_id)
      .select('*, driver:drivers(user_id)');

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update quotes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update request status
    await supabaseClient
      .from('company_course_requests')
      .update({ 
        status: 'sent_to_drivers',
        sent_to_drivers_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id);

    // Send notifications to drivers
    const notifications = [];
    for (const quote of quotes || []) {
      if (quote.driver?.user_id) {
        notifications.push({
          user_id: quote.driver.user_id,
          title: 'Nouvelle demande entreprise',
          message: `${companyName} vous propose une course${employeeName ? ` pour ${employeeName}` : ''}`,
          type: 'company_course_request',
          link: '/driver-dashboard?tab=courses',
        });
      }
    }

    if (notifications.length > 0) {
      await supabaseClient.from('notifications').insert(notifications);
    }

    console.log('✅ Quotes sent successfully, notifications created:', notifications.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: quotes?.length || 0,
        notifications_sent: notifications.length
      }),
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
