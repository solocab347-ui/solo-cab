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

    const { course_id, driver_id, use_hourly_rate = false } = await req.json();

    if (!course_id || !driver_id) {
      return new Response(
        JSON.stringify({ error: 'course_id et driver_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*, clients!inner(user_id)')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      console.error('Course fetch error:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate price using existing function
    const { data: priceData, error: priceError } = await supabaseClient
      .rpc('calculate_course_price', {
        _driver_id: driver_id,
        _distance_km: course.distance_km || 0,
        _duration_minutes: course.duration_minutes || 0,
        _use_hourly_rate: use_hourly_rate,
      });

    if (priceError || !priceData || priceData.length === 0) {
      console.error('Price calculation error:', priceError);
      return new Response(
        JSON.stringify({ error: 'Erreur calcul du prix' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pricing = priceData[0];

    // Generate quote number
    const { data: quoteNumber, error: quoteError } = await supabaseClient
      .rpc('generate_quote_number', { _driver_id: driver_id });

    if (quoteError) {
      console.error('Quote number generation error:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Erreur génération numéro devis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create devis
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days

    const { data: devis, error: devisError } = await supabaseClient
      .from('devis')
      .insert({
        course_id: course_id,
        driver_id: driver_id,
        client_id: course.client_id,
        quote_number: quoteNumber,
        base_price: pricing.base_price,
        distance_price: pricing.distance_price,
        time_price: pricing.time_price || 0,
        amount: pricing.total_price,
        valid_until: validUntil.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (devisError) {
      console.error('Devis creation error:', devisError);
      return new Response(
        JSON.stringify({ error: 'Erreur création devis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Devis created successfully:', devis);

    return new Response(
      JSON.stringify({ 
        success: true, 
        devis,
        pricing 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create Devis Auto Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
