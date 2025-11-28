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

  // SÉCURITÉ: Rate limiting - 30 requêtes par minute
  const rateLimitResult = applyRateLimit(req, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
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

    // Get course details avec code promo
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*, clients!inner(user_id, id), promo_code, discount_amount')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
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
        _scheduled_date: course.scheduled_date, // Passer la date pour les augmentations soir/weekend
      });

    if (priceError || !priceData || priceData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Erreur calcul du prix' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pricing = priceData[0];
    
    // Validation et application du code promo
    let discountAmount = 0;
    let finalAmount = pricing.total_price;
    let promoCode = null;
    
    if (course.promo_code) {
      // Récupérer la promotion
      const { data: promo, error: promoError } = await supabaseClient
        .from('promotions')
        .select('*')
        .eq('code', course.promo_code)
        .eq('driver_id', driver_id)
        .eq('active', true)
        .maybeSingle();
      
      if (promo && !promoError) {
        // Valider la promotion
        const now = new Date();
        const isExpired = promo.valid_until && new Date(promo.valid_until) < now;
        const hasReachedMaxUses = promo.max_uses && promo.current_uses >= promo.max_uses;
        const meetsMinAmount = !promo.min_amount || pricing.total_price >= promo.min_amount;
        
        if (!isExpired && !hasReachedMaxUses && meetsMinAmount) {
          // Calculer la réduction
          if (promo.type === 'percentage') {
            discountAmount = (pricing.total_price * promo.value) / 100;
          } else {
            discountAmount = promo.value;
          }
          
          // S'assurer que la réduction ne dépasse pas le montant total
          discountAmount = Math.min(discountAmount, pricing.total_price);
          finalAmount = pricing.total_price - discountAmount;
          promoCode = course.promo_code;
          
          // Incrémenter le compteur d'utilisations
          await supabaseClient
            .from('promotions')
            .update({ current_uses: (promo.current_uses || 0) + 1 })
            .eq('id', promo.id);
        }
      }
    }

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
          throw new Error('Erreur génération numéro réservation');
        }

        // Try to create devis with unified reservation number and promo
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
            amount: finalAmount,
            discount_amount: discountAmount,
            promo_code: promoCode,
            evening_surcharge_amount: pricing.surcharge_evening || 0,
            weekend_surcharge_amount: pricing.surcharge_weekend || 0,
            valid_until: validUntil.toISOString(),
            status: 'pending',
          })
          .select()
          .single();

        if (devisError) {
          // Check if it's a duplicate key error
          if (devisError.code === '23505' && devisError.message?.includes('quote_number')) {
            lastError = devisError;
            continue; // Retry with a new number
          }
          // For other errors, throw immediately
          throw devisError;
        }

        // Success!
        devis = createdDevis;
        
        // COHÉRENCE: Mettre à jour la course avec le même numéro de réservation
        await supabaseClient
          .from('courses')
          .update({ course_number: reservationNumber })
          .eq('id', course_id);
        
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
