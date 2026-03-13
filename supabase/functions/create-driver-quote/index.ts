import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { applyRateLimit } from '../_shared/rateLimitMiddleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResult = applyRateLimit(req, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate the driver
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      guest_client_name,
      guest_client_phone,
      guest_client_email,
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      destination_address,
      destination_latitude,
      destination_longitude,
      scheduled_date,
      passengers_count = 1,
      custom_price,
      notes,
    } = body;

    // Validation
    if (!guest_client_name || !pickup_address || !destination_address || !scheduled_date || !custom_price) {
      return new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (custom_price <= 0 || custom_price > 50000) {
      return new Response(JSON.stringify({ error: 'Prix invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get driver profile
    const { data: driver, error: driverError } = await supabaseClient
      .from('drivers')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driver) {
      return new Response(JSON.stringify({ error: 'Profil chauffeur introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate a unique quote token for shareable link
    const quoteToken = crypto.randomUUID();
    const guestTrackingToken = crypto.randomUUID();

    // 1. Create the course with origin_type = 'driver_quote'
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .insert({
        driver_id: driver.id,
        client_id: null,
        pickup_address,
        pickup_latitude: pickup_latitude || null,
        pickup_longitude: pickup_longitude || null,
        destination_address,
        destination_latitude: destination_latitude || null,
        destination_longitude: destination_longitude || null,
        scheduled_date,
        passengers_count: parseInt(passengers_count) || 1,
        notes: notes ? notes.trim().slice(0, 1000).replace(/[<>]/g, '') : null,
        status: 'accepted',
        origin_type: 'driver_quote',
        is_guest_booking: true,
        guest_name: guest_client_name.trim().slice(0, 200),
        guest_phone: guest_client_phone ? guest_client_phone.trim().slice(0, 20) : null,
        guest_email: guest_client_email ? guest_client_email.trim().slice(0, 255) : null,
        guest_tracking_token: guestTrackingToken,
        created_by_user_id: user.id,
        distance_km: body.distance_km || null,
        duration_minutes: body.duration_minutes || null,
      })
      .select()
      .single();

    if (courseError) {
      console.error('❌ Erreur création course:', courseError);
      return new Response(JSON.stringify({ error: 'Erreur création course', details: courseError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Generate reservation number
    const { data: reservationNumber, error: resError } = await supabaseClient
      .rpc('generate_reservation_number', { _driver_id: driver.id });

    if (resError) {
      console.error('❌ Erreur génération numéro:', resError);
      // Cleanup course
      await supabaseClient.from('courses').delete().eq('id', course.id);
      return new Response(JSON.stringify({ error: 'Erreur génération numéro réservation' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update course with the reservation number
    await supabaseClient
      .from('courses')
      .update({ course_number: reservationNumber })
      .eq('id', course.id);

    // 3. Create devis with driver's custom price
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30 days validity for driver quotes

    const SOLOCAB_FEE = 0.50;
    const estimatedStripeFee = Math.round((custom_price * 0.015 + 0.25) * 100) / 100;
    const estimatedNetToDriver = Math.round((custom_price - SOLOCAB_FEE - estimatedStripeFee) * 100) / 100;

    const { data: devis, error: devisError } = await supabaseClient
      .from('devis')
      .insert({
        course_id: course.id,
        driver_id: driver.id,
        client_id: null,
        quote_number: reservationNumber,
        base_price: custom_price,
        distance_price: 0,
        time_price: 0,
        amount: custom_price,
        discount_amount: 0,
        valid_until: validUntil.toISOString(),
        status: 'pending',
        origin_type: 'driver_quote',
        quote_token: quoteToken,
        guest_client_name: guest_client_name.trim().slice(0, 200),
        guest_client_phone: guest_client_phone ? guest_client_phone.trim().slice(0, 20) : null,
        guest_client_email: guest_client_email ? guest_client_email.trim().slice(0, 255) : null,
        is_custom_price: true,
        pricing_source: 'custom',
        notes: notes ? notes.trim().slice(0, 1000).replace(/[<>]/g, '') : null,
        distance_km: body.distance_km || null,
        solocab_fee_amount: SOLOCAB_FEE,
        estimated_stripe_fee: estimatedStripeFee,
        estimated_net_to_driver: estimatedNetToDriver,
      })
      .select()
      .single();

    if (devisError) {
      console.error('❌ Erreur création devis:', devisError);
      // Cleanup course
      await supabaseClient.from('courses').delete().eq('id', course.id);
      return new Response(JSON.stringify({ error: 'Erreur création devis', details: devisError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Driver quote créé:', { courseId: course.id, devisId: devis.id, quoteToken });

    return new Response(JSON.stringify({
      success: true,
      course,
      devis,
      quote_token: quoteToken,
      guest_tracking_token: guestTrackingToken,
      reservation_number: reservationNumber,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Exception:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
