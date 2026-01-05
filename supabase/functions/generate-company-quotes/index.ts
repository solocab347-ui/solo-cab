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

    const { request_id, driver_ids: rawDriverIds } = await req.json();

    if (!request_id || !rawDriverIds || !Array.isArray(rawDriverIds) || rawDriverIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'request_id et driver_ids requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate driver IDs
    const driver_ids = [...new Set(rawDriverIds)];

    console.log('🔍 Generating quotes for request:', request_id, 'drivers:', driver_ids);

    // Get request details
    const { data: request, error: requestError } = await supabaseClient
      .from('company_course_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      console.error('❌ Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate distance and duration using Mapbox
    let distanceKm = 0;
    let durationMinutes = 0;

    if (request.pickup_latitude && request.pickup_longitude && 
        request.destination_latitude && request.destination_longitude) {
      
      const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
      if (mapboxToken) {
        try {
          const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${request.pickup_longitude},${request.pickup_latitude};${request.destination_longitude},${request.destination_latitude}?access_token=${mapboxToken}`;
          const response = await fetch(directionsUrl);
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            distanceKm = data.routes[0].distance / 1000;
            durationMinutes = Math.round(data.routes[0].duration / 60);
            console.log('📍 Route calculated:', { distanceKm, durationMinutes });
          }
        } catch (e) {
          console.warn('⚠️ Mapbox error, using defaults:', e);
          distanceKm = 10; // Default
          durationMinutes = 20;
        }
      }
    }

    const quotes = [];
    const errors = [];

    // Generate quote for each driver
    for (const driverId of driver_ids) {
      try {
        console.log('💰 Calculating price for driver:', driverId);

        // Get driver pricing
        const { data: priceData, error: priceError } = await supabaseClient
          .rpc('calculate_course_price', {
            _driver_id: driverId,
            _distance_km: distanceKm,
            _duration_minutes: durationMinutes,
            _use_hourly_rate: false,
            _scheduled_date: request.scheduled_date,
            _pickup_address: request.pickup_address || null,
            _destination_address: request.destination_address || null,
          });

        if (priceError || !priceData || priceData.length === 0) {
          console.error('❌ Price calculation failed for driver:', driverId, priceError);
          errors.push({ driver_id: driverId, error: 'Price calculation failed' });
          continue;
        }

        const pricing = priceData[0];
        console.log('💰 Price calculated:', pricing);

        // Check if quote already exists
        const { data: existingQuote } = await supabaseClient
          .from('company_course_quotes')
          .select('id')
          .eq('request_id', request_id)
          .eq('driver_id', driverId)
          .maybeSingle();

        if (existingQuote) {
          // Update existing quote
          const { data: updatedQuote, error: updateError } = await supabaseClient
            .from('company_course_quotes')
            .update({
              base_price: pricing.base_price,
              distance_price: pricing.distance_price,
              time_price: pricing.time_price || 0,
              evening_surcharge: pricing.surcharge_evening || 0,
              weekend_surcharge: pricing.surcharge_weekend || 0,
              total_price: pricing.total_price,
              distance_km: distanceKm,
              duration_minutes: durationMinutes,
              status: 'generated',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingQuote.id)
            .select()
            .single();

          if (!updateError) {
            quotes.push(updatedQuote);
          }
        } else {
          // Create new quote
          const { data: quote, error: quoteError } = await supabaseClient
            .from('company_course_quotes')
            .insert({
              request_id: request_id,
              driver_id: driverId,
              base_price: pricing.base_price,
              distance_price: pricing.distance_price,
              time_price: pricing.time_price || 0,
              evening_surcharge: pricing.surcharge_evening || 0,
              weekend_surcharge: pricing.surcharge_weekend || 0,
              total_price: pricing.total_price,
              distance_km: distanceKm,
              duration_minutes: durationMinutes,
              status: 'generated',
            })
            .select()
            .single();

          if (quoteError) {
            console.error('❌ Quote creation failed:', quoteError);
            errors.push({ driver_id: driverId, error: quoteError.message });
          } else {
            quotes.push(quote);
          }
        }
      } catch (e) {
        console.error('❌ Error processing driver:', driverId, e);
        errors.push({ driver_id: driverId, error: String(e) });
      }
    }

    // Update request status
    if (quotes.length > 0) {
      await supabaseClient
        .from('company_course_requests')
        .update({ 
          status: 'quotes_generated', 
          quotes_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', request_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        quotes,
        errors,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
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
