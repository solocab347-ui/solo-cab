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

    const { course_id, driver_id, use_hourly_rate = false, company_id: passedCompanyId } = await req.json();

    if (!course_id || !driver_id) {
      return new Response(
        JSON.stringify({ error: 'course_id et driver_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SÉCURITÉ CRITIQUE: Vérifier si un devis existe déjà pour cette course
    // Cela évite les doublons en cas de retries du frontend
    const { data: existingDevis, error: existingDevisError } = await supabaseClient
      .from('devis')
      .select('id, quote_number, amount, status')
      .eq('course_id', course_id)
      .eq('driver_id', driver_id)
      .limit(1)
      .maybeSingle();

    if (existingDevis) {
      console.log('⚠️ Devis existant trouvé, retour immédiat:', existingDevis);
      return new Response(
        JSON.stringify({ 
          success: true, 
          devis: existingDevis,
          already_exists: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course details avec code promo - utiliser LEFT JOIN pour supporter les guest bookings
    console.log('🔍 Récupération de la course:', course_id);
    
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*, clients(user_id, id), promo_code, discount_amount, is_guest_booking, guest_estimated_price, payment_method')
      .eq('id', course_id)
      .single();

    // Vérifier si le chauffeur utilise Stripe Connect
    const { data: driverStripeInfo } = await supabaseClient
      .from('drivers')
      .select('stripe_connect_account_id, stripe_connect_charges_enabled')
      .eq('id', driver_id)
      .single();
    
    const driverUsesStripe = !!driverStripeInfo?.stripe_connect_account_id && 
      driverStripeInfo?.stripe_connect_charges_enabled === true;
    
    // Déterminer si c'est un paiement Stripe (driver Stripe + client paie en ligne par carte)
    const isStripePayment = driverUsesStripe && (
      course?.payment_method === 'stripe' || course?.payment_method_requested === 'card'
    );
    console.log('💳 Stripe payment:', {
      driverUsesStripe,
      paymentMethod: course?.payment_method,
      paymentMethodRequested: course?.payment_method_requested,
      isStripePayment,
    });

    if (courseError || !course) {
      console.error('❌ Course introuvable:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course introuvable', details: courseError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LOGIQUE MÉTIER: Les guest bookings NE sont PAS auto-acceptés.
    // Le chauffeur doit explicitement accepter la course depuis l'onglet "En attente".
    // Le client a vu le prix estimé mais le chauffeur doit valider la disponibilité.
    const isGuestBooking = course.is_guest_booking === true;
    const autoAcceptDevis = false; // Toujours pending, le chauffeur décide
    
    if (isGuestBooking) {
      console.log('👤 Guest booking détecté - le devis restera en attente de validation chauffeur');
    }

    // Vérifier si c'est une course d'entreprise (company_courses)
    // Récupérer company_id ET employee_id pour lier le devis à l'employé
    let companyId = passedCompanyId || null;
    let companyEmployeeId = null;
    
    // Toujours récupérer le lien company_courses pour avoir l'employee_id
    const { data: companyCourse } = await supabaseClient
      .from('company_courses')
      .select('company_id, employee_id')
      .eq('course_id', course_id)
      .maybeSingle();
    
    if (companyCourse) {
      // Utiliser le company_id passé en priorité, sinon celui de la table
      if (!companyId && companyCourse.company_id) {
        companyId = companyCourse.company_id;
      }
      // IMPORTANT: Toujours récupérer l'employee_id pour le devis
      if (companyCourse.employee_id) {
        companyEmployeeId = companyCourse.employee_id;
        console.log('👤 Employé détecté:', companyEmployeeId);
      }
    }
    
    if (companyId) {
      console.log('🏢 Company ID utilisé:', companyId);
    }

    console.log('✅ Course trouvée:', { 
      id: course.id, 
      client_id: course.client_id, 
      company_id: companyId,
      driver_id: course.driver_id,
      distance_km: course.distance_km,
      duration_minutes: course.duration_minutes,
      pickup_address: course.pickup_address,
      destination_address: course.destination_address,
      is_guest_booking: isGuestBooking
    });

    // Déterminer quel type de tarification appliquer (ville ou classique)
    let pricing = null;
    let pricingType = 'classic';
    let cityPricingName: string | null = null;
    
    // Vérifier si une tarification par ville s'applique
    const { data: applicablePricing, error: applicablePricingError } = await supabaseClient
      .rpc('get_applicable_pricing', {
        p_driver_id: driver_id,
        p_pickup_address: course.pickup_address || '',
        p_destination_address: course.destination_address || ''
      });

    console.log('🔍 Tarification applicable:', { applicablePricing, error: applicablePricingError });

    if (!applicablePricingError && applicablePricing && applicablePricing.length > 0) {
      const pricingInfo = applicablePricing[0];
      pricingType = pricingInfo.pricing_type;
      cityPricingName = pricingInfo.city_name || null;
      
      if (pricingType === 'city' && pricingInfo.city_pricing_id) {
        console.log('🏙️ Utilisation de la tarification par ville:', pricingInfo.city_pricing_id, cityPricingName);
        
        // Calculer avec la tarification par ville
        const { data: cityPriceData, error: cityPriceError } = await supabaseClient
          .rpc('calculate_city_course_price', {
            p_city_pricing_id: pricingInfo.city_pricing_id,
            p_distance_km: course.distance_km || 0,
            p_duration_minutes: course.duration_minutes || 0,
            p_scheduled_date: course.scheduled_date
          });

        if (!cityPriceError && cityPriceData && cityPriceData.length > 0) {
          pricing = cityPriceData[0];
          console.log('💰 Prix ville calculé:', pricing);
        } else {
          console.warn('⚠️ Erreur calcul prix ville, fallback sur classique:', cityPriceError);
          pricingType = 'classic';
          cityPricingName = null;
        }
      }
    }

    // Fallback sur la tarification classique
    if (!pricing) {
      console.log('📊 Utilisation de la tarification classique');
      
      const { data: priceData, error: priceError } = await supabaseClient
        .rpc('calculate_course_price', {
          _driver_id: driver_id,
          _distance_km: course.distance_km || 0,
          _duration_minutes: course.duration_minutes || 0,
          _use_hourly_rate: use_hourly_rate,
          _scheduled_date: course.scheduled_date,
          _pickup_address: course.pickup_address || null,
          _destination_address: course.destination_address || null,
        });

      if (priceError || !priceData || priceData.length === 0) {
        console.error('❌ Erreur calcul prix classique:', priceError);
        return new Response(
          JSON.stringify({ error: 'Erreur calcul du prix' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      pricing = priceData[0];
    }

    console.log('💰 Prix final utilisé:', { pricingType, pricing });
    
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

    // Synchroniser le compteur avec les numéros existants avant de créer le devis
    console.log('🔍 Vérification de la synchronisation du compteur...');
    
    // Récupérer le numéro le plus élevé existant pour ce driver
    const { data: maxDevis } = await supabaseClient
      .from('devis')
      .select('quote_number')
      .eq('driver_id', driver_id)
      .like('quote_number', 'RES-%')
      .order('quote_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let maxNumber = 0;
    if (maxDevis?.quote_number) {
      const match = maxDevis.quote_number.match(/RES-(\d+)/);
      if (match) {
        maxNumber = parseInt(match[1]);
        console.log(`📊 Numéro le plus élevé existant: ${maxNumber}`);
      }
    }
    
    // Récupérer le compteur actuel du driver
    const { data: driverData } = await supabaseClient
      .from('drivers')
      .select('reservation_counter')
      .eq('id', driver_id)
      .single();
    
    const currentCounter = driverData?.reservation_counter || 0;
    console.log(`📊 Compteur actuel: ${currentCounter}`);
    
    // Si le compteur est inférieur au max existant, le synchroniser
    if (currentCounter < maxNumber) {
      console.log(`⚠️ Compteur désynchronisé! Mise à jour de ${currentCounter} vers ${maxNumber}`);
      await supabaseClient
        .from('drivers')
        .update({ reservation_counter: maxNumber })
        .eq('id', driver_id);
    }

    // Retry mechanism for duplicate quote numbers
    let devis = null;
    let lastError = null;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative ${attempt + 1}/${maxRetries} de création de devis`);
        
        // Generate unified reservation number (same for course, devis, facture)
        const { data: reservationNumber, error: reservationError } = await supabaseClient
          .rpc('generate_reservation_number', { _driver_id: driver_id });

        if (reservationError) {
          console.error('❌ Erreur génération numéro réservation:', reservationError);
          throw new Error(`Erreur génération numéro réservation: ${reservationError.message}`);
        }

        console.log(`📋 Numéro de réservation généré: ${reservationNumber}`);

        // Déterminer le statut du devis: auto-accepté pour les guests, pending sinon
        const devisStatus = autoAcceptDevis ? 'accepted' : 'pending';
        console.log(`📋 Statut du devis: ${devisStatus} (autoAccept: ${autoAcceptDevis})`);

        // Calculer les frais estimés pour information
        const SOLOCAB_FEE = 0.50;
        const estimatedStripeFee = Math.round((finalAmount * 0.015 + 0.25) * 100) / 100;
        const estimatedNetToDriver = Math.round((finalAmount - SOLOCAB_FEE - estimatedStripeFee) * 100) / 100;

        // Try to create devis with unified reservation number and promo
        const { data: createdDevis, error: devisError } = await supabaseClient
          .from('devis')
          .insert({
            course_id: course_id,
            driver_id: driver_id,
            client_id: course.client_id || null,
            company_id: companyId || null,
            company_employee_id: companyEmployeeId || null,
            quote_number: reservationNumber,
            base_price: pricing.base_price,
            distance_price: pricing.distance_price,
            time_price: pricing.time_price || 0,
            amount: finalAmount,
            discount_amount: discountAmount,
            promo_code: promoCode,
            evening_surcharge_amount: pricing.surcharge_evening || 0,
            weekend_surcharge_amount: pricing.surcharge_weekend || 0,
            peak_hours_surcharge_amount: pricing.peak_adjustment || 0,
            valid_until: validUntil.toISOString(),
            status: devisStatus,
            pricing_source: pricingType,
            city_pricing_name: cityPricingName,
            distance_km: course.distance_km || 0,
            // NOUVEAUX: Frais estimés pour traçabilité
            solocab_fee_amount: SOLOCAB_FEE,
            estimated_stripe_fee: estimatedStripeFee,
            estimated_net_to_driver: estimatedNetToDriver,
            is_stripe_payment: isStripePayment,
          })
          .select()
          .single();

        if (devisError) {
          console.error('❌ Erreur création devis:', {
            code: devisError.code,
            message: devisError.message,
            details: devisError.details,
            hint: devisError.hint
          });
          
          // Check if it's a duplicate key error
          if (devisError.code === '23505' && devisError.message?.includes('quote_number')) {
            console.log('⚠️ Duplicate quote_number détecté, nouvelle tentative...');
            lastError = devisError;
            continue; // Retry with a new number
          }
          // For other errors, throw immediately
          throw devisError;
        }

        // Success!
        console.log('✅ Devis créé avec succès:', createdDevis);
        devis = createdDevis;
        
        // COHÉRENCE: Mettre à jour la course avec le même numéro de réservation
        await supabaseClient
          .from('courses')
          .update({ course_number: reservationNumber })
          .eq('id', course_id);
        
        break;

      } catch (error: any) {
        console.error(`❌ Erreur tentative ${attempt + 1}:`, {
          message: error.message,
          code: error.code,
          details: error.details
        });
        lastError = error;
        // For non-duplicate errors, don't retry
        if (!(error.code === '23505' && error.message?.includes('quote_number'))) {
          console.error('⛔ Erreur non-duplicate, arrêt des tentatives');
          break;
        }
      }
    }

    // If we exhausted all retries
    if (!devis) {
      const errorDetails = lastError ? {
        message: lastError.message,
        code: lastError.code,
        details: lastError.details,
        hint: lastError.hint
      } : 'Aucun détail disponible';
      
      console.error('❌ Échec création devis après toutes les tentatives:', errorDetails);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur création devis',
          details: lastError?.message || 'Erreur inconnue',
          errorCode: lastError?.code,
          errorHint: lastError?.hint
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        devis,
        pricing,
        pricingType // Indiquer quel type de tarification a été utilisé
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
