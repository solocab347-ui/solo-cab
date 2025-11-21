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

    // Valid until date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days

    // Retry mechanism for duplicate quote numbers
    let devis = null;
    let lastError = null;
    const maxRetries = 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate unified reservation number (same for course, devis, facture)
        const { data: reservationNumber, error: reservationError } = await supabaseClient
          .rpc('generate_reservation_number', { _driver_id: driver_id });

        if (reservationError) {
          console.error('Reservation number generation error:', reservationError);
          throw new Error('Erreur génération numéro réservation');
        }

        console.log(`Attempt ${attempt + 1}: Trying to create devis with number ${reservationNumber}`);

        // Try to create devis with unified reservation number
        const { data: createdDevis, error: devisError } = await supabaseClient
          .from('devis')
          .insert({
            course_id: course_id,
            driver_id: driver_id,
            client_id: course.client_id,
            quote_number: reservationNumber, // RES-001, RES-002, etc.
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
          // Check if it's a duplicate key error
          if (devisError.code === '23505' && devisError.message?.includes('quote_number')) {
            console.warn(`Reservation number ${reservationNumber} already exists, retrying...`);
            lastError = devisError;
            continue; // Retry with a new number
          }
          // For other errors, throw immediately
          throw devisError;
        }

        // Success!
        devis = createdDevis;
        console.log('Devis created successfully with reservation number:', reservationNumber);
        
        // COHÉRENCE: Mettre à jour la course avec le même numéro de réservation
        await supabaseClient
          .from('courses')
          .update({ course_number: reservationNumber })
          .eq('id', course_id);
        
        console.log('Course updated with reservation number:', reservationNumber);
        break;

      } catch (error: any) {
        lastError = error;
        // For non-duplicate errors, don't retry
        if (!(error.code === '23505' && error.message?.includes('quote_number'))) {
          break;
        }
      }
    }

    // If we exhausted all retries
    if (!devis) {
      console.error('Failed to create devis after all retries:', lastError);
      return new Response(
        JSON.stringify({ error: 'Erreur création devis après plusieurs tentatives' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
