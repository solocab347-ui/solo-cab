import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOLOCAB_FEE = 0.80; // 0.80€ par course
const STRIPE_PERCENTAGE = 0.015; // 1.5%
const STRIPE_FIXED_FEE = 0.25; // 0.25€

// Helper to calculate Stripe fees
function calculateStripeFee(amount: number): number {
  return Math.round((amount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
}

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; response?: Response } {
  const now = Date.now();
  const limit = rateLimiter.get(ip);
  
  if (limit && now < limit.resetTime) {
    if (limit.count >= 30) {
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        ),
      };
    }
    limit.count++;
  } else {
    rateLimiter.set(ip, { count: 1, resetTime: now + 60000 });
  }
  
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    console.log('[CREATE-FACTURE-AUTO] 🚫 Rate limit exceeded');
    return rateLimitResult.response!;
  }

  try {
    // Initialize auth client to verify JWT
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[CREATE-FACTURE-AUTO] ❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "Non autorisé: Authentification requise" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      console.log("[CREATE-FACTURE-AUTO] ❌ Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Non autorisé: Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CREATE-FACTURE-AUTO] ✅ User authenticated:", user.id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { course_id, payment_method } = await req.json();

    console.log("[CREATE-FACTURE-AUTO] Processing:", { course_id, payment_method });

    // Get course with potential company link
    const { data: courseCheck, error: courseCheckError } = await supabase
      .from("courses")
      .select("driver_id, client_id")
      .eq("id", course_id)
      .maybeSingle();

    if (courseCheckError || !courseCheck) {
      console.log("[CREATE-FACTURE-AUTO] ❌ Course not found:", courseCheckError?.message);
      return new Response(
        JSON.stringify({ error: "Course introuvable ou accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is a company course
    const { data: companyCourse } = await supabase
      .from("company_courses")
      .select("company_id, employee_id")
      .eq("course_id", course_id)
      .maybeSingle();

    const isCompanyCourse = !!companyCourse;
    console.log("[CREATE-FACTURE-AUTO] Company course:", isCompanyCourse, companyCourse);

    // Get driver user_id and billing type
    const { data: driverData } = await supabase
      .from("drivers")
      .select("user_id, billing_type, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", courseCheck.driver_id)
      .maybeSingle();

    // Get client user_id (if client exists)
    let clientData = null;
    if (courseCheck.client_id) {
      const { data: cd } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", courseCheck.client_id)
        .maybeSingle();
      clientData = cd;
    }

    // For company courses without client, also check company authorization
    let isCompanyUser = false;
    if (isCompanyCourse && companyCourse?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", companyCourse.company_id)
        .maybeSingle();
      isCompanyUser = companyData?.user_id === user.id;
    }

    const driverUserId = driverData?.user_id;
    const clientUserId = clientData?.user_id;

    const isDriver = driverUserId === user.id;
    const isClient = clientUserId === user.id;

    console.log("[CREATE-FACTURE-AUTO] Authorization check:", { 
      courseDriverId: courseCheck.driver_id,
      courseClientId: courseCheck.client_id,
      driverUserId, 
      clientUserId, 
      currentUser: user.id,
      isDriver, 
      isClient,
      isCompanyUser,
      isCompanyCourse
    });

    // Authorize: driver, client, or company user for company courses
    if (!isDriver && !isClient && !isCompanyUser) {
      console.log("[CREATE-FACTURE-AUTO] ❌ User not authorized for this course");
      return new Response(
        JSON.stringify({ error: "Non autorisé pour cette course" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CREATE-FACTURE-AUTO] ✅ User authorized:", { isDriver, isClient, isCompanyUser });

    // Check if facture already exists for this course
    const { data: existingFacture } = await supabase
      .from("factures")
      .select("*")
      .eq("course_id", course_id)
      .maybeSingle();

    if (existingFacture) {
      console.log("[CREATE-FACTURE-AUTO] Facture already exists:", existingFacture.id);
      return new Response(
        JSON.stringify({ 
          facture: existingFacture,
          message: "Facture already exists"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Get full course details with devis and payment info
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        devis(
          id, amount, base_price, distance_price, time_price, 
          status, quote_number, discount_amount, promo_code, 
          created_at, company_id, evening_surcharge_amount, 
          weekend_surcharge_amount, peak_hours_surcharge_amount,
          pricing_source, city_pricing_name, distance_km,
          deposit_required, deposit_percentage, deposit_amount
        )
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    // Get accepted devis or the most recent one
    let acceptedDevis = course.devis?.find((d: any) => d.status === "accepted");
    
    // ROBUSTESSE: Si aucun devis n'est accepté, accepter automatiquement le plus récent
    if (!acceptedDevis && course.devis && course.devis.length > 0) {
      console.log("[CREATE-FACTURE-AUTO] ⚠️ No accepted devis, auto-accepting most recent");
      
      const sortedDevis = course.devis.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const mostRecentDevis = sortedDevis[0];
      
      await supabase
        .from("devis")
        .update({ 
          status: "accepted", 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", mostRecentDevis.id);
      
      acceptedDevis = { ...mostRecentDevis, status: "accepted" };
      console.log("[CREATE-FACTURE-AUTO] ✅ Auto-accepted devis:", acceptedDevis.id);
    }
    
    // For company courses without devis, create one from the company quote
    if (!acceptedDevis && isCompanyCourse) {
      console.log("[CREATE-FACTURE-AUTO] 🏢 No devis found for company course");
      
      const { data: request } = await supabase
        .from("company_course_requests")
        .select(`
          id,
          company_course_quotes(
            id, total_price, base_price, distance_price, time_price, driver_id, status
          )
        `)
        .eq("final_course_id", course_id)
        .single();

      if (request?.company_course_quotes) {
        const quotes = Array.isArray(request.company_course_quotes) 
          ? request.company_course_quotes 
          : [request.company_course_quotes];
        const acceptedQuote = quotes.find((q: any) => q.status === 'accepted' && q.driver_id === course.driver_id);
        
        if (acceptedQuote) {
          const quoteNumber = `ENT-${acceptedQuote.id.slice(0, 8).toUpperCase()}`;
          
          const { data: newDevis, error: devisError } = await supabase
            .from("devis")
            .insert({
              course_id: course_id,
              driver_id: course.driver_id,
              company_id: companyCourse.company_id,
              company_employee_id: companyCourse.employee_id,
              amount: acceptedQuote.total_price,
              base_price: acceptedQuote.base_price || 0,
              distance_price: acceptedQuote.distance_price || 0,
              time_price: acceptedQuote.time_price || 0,
              discount_amount: 0,
              status: "accepted",
              accepted_at: new Date().toISOString(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              quote_number: quoteNumber
            })
            .select()
            .single();
          
          if (!devisError && newDevis) {
            acceptedDevis = newDevis;
          }
        }
      }
    }
    
    // Emergency devis creation if still none
    if (!acceptedDevis) {
      console.log("[CREATE-FACTURE-AUTO] ⚠️ No devis found, creating emergency");
      
      const { data: driverInfo } = await supabase
        .from("drivers")
        .select("rate_per_km, base_rate, hourly_rate, tva_rate, reservation_counter")
        .eq("id", course.driver_id)
        .single();
      
      if (driverInfo) {
        const distanceKm = course.distance_km || 0;
        const basePrice = driverInfo.base_rate || 5;
        const distancePrice = distanceKm * (driverInfo.rate_per_km || 2.5);
        const totalPrice = course.guest_estimated_price || (basePrice + distancePrice);
        
        const counter = (driverInfo.reservation_counter || 0) + 1;
        const quoteNumber = `RES-${String(counter).padStart(3, '0')}`;
        
        await supabase
          .from("drivers")
          .update({ reservation_counter: counter })
          .eq("id", course.driver_id);
        
        const { data: emergencyDevis, error: emergencyDevisError } = await supabase
          .from("devis")
          .insert({
            course_id: course_id,
            driver_id: course.driver_id,
            client_id: course.client_id || null,
            amount: totalPrice,
            base_price: basePrice,
            distance_price: distancePrice,
            time_price: 0,
            discount_amount: 0,
            status: "accepted",
            accepted_at: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            quote_number: quoteNumber
          })
          .select()
          .single();
        
        if (!emergencyDevisError && emergencyDevis) {
          await supabase
            .from("courses")
            .update({ course_number: quoteNumber })
            .eq("id", course_id);
          
          acceptedDevis = emergencyDevis;
        }
      }
    }

    if (!acceptedDevis) {
      throw new Error("Aucun devis trouvé pour cette course");
    }

    const invoiceNumber = acceptedDevis.quote_number;
    if (!invoiceNumber) {
      throw new Error("Devis has no quote_number");
    }

    // ===== CALCUL DES FRAIS DÉTAILLÉS =====
    const isStripePayment = !!driverData?.stripe_connect_account_id && 
                            driverData?.stripe_connect_charges_enabled === true;
    
    const grossAmount = acceptedDevis.amount || 0;
    const depositAmount = course.deposit_amount || 0;
    const finalPaymentAmount = grossAmount - depositAmount;
    
    // Frais SoloCab: 0.50€ par course (pour Stripe Connect uniquement)
    const solocabFee = isStripePayment ? SOLOCAB_FEE : 0;
    
    // Frais Stripe estimés (~1.5% + 0.25€ sur le montant brut)
    const stripeFee = isStripePayment ? calculateStripeFee(grossAmount) : 0;
    
    // Total des frais
    const totalFees = solocabFee + stripeFee;
    
    // Montant net pour le chauffeur
    const netToDriver = Math.round((grossAmount - totalFees) * 100) / 100;

    console.log("[CREATE-FACTURE-AUTO] 💰 Fee breakdown:", {
      grossAmount,
      depositAmount,
      finalPaymentAmount,
      isStripePayment,
      solocabFee,
      stripeFee,
      totalFees,
      netToDriver
    });

    // ===== DÉTERMINER LE MODE DE PAIEMENT CORRECT =====
    // Logique: stripe > card (TPE) > cash
    let resolvedPaymentMethod = payment_method || course.payment_method || "cash";
    let resolvedPaymentStatus = "pending";
    let paidAt: string | null = null;

    if (isStripePayment && (resolvedPaymentMethod === "stripe" || resolvedPaymentMethod === "card")) {
      // Chauffeur avec Stripe Connect + paiement en ligne → auto-encaissé
      resolvedPaymentMethod = "stripe";
      resolvedPaymentStatus = "paid";
      paidAt = new Date().toISOString();
    } else if (resolvedPaymentMethod === "card") {
      // Chauffeur SANS Stripe → il encaisse avec son propre TPE
      resolvedPaymentMethod = "card";
      resolvedPaymentStatus = "pending"; // Marqué en attente jusqu'à confirmation
    } else if (resolvedPaymentMethod === "cash") {
      // Espèces → le chauffeur encaisse directement
      resolvedPaymentMethod = "cash";
      resolvedPaymentStatus = "pending";
    } else {
      // Fallback
      resolvedPaymentMethod = "cash";
      resolvedPaymentStatus = "pending";
    }

    console.log("[CREATE-FACTURE-AUTO] Payment resolution:", {
      input: payment_method,
      courseMethod: course.payment_method,
      isStripePayment,
      resolved: resolvedPaymentMethod,
      status: resolvedPaymentStatus
    });

    // Create facture with complete fee breakdown
    const factureData: any = {
      driver_id: course.driver_id,
      course_id: course.id,
      devis_id: acceptedDevis.id,
      invoice_number: invoiceNumber,
      amount: grossAmount,
      discount_amount: acceptedDevis.discount_amount || 0,
      promo_code: acceptedDevis.promo_code || null,
      payment_method: resolvedPaymentMethod,
      payment_status: resolvedPaymentStatus,
      paid_at: paidAt,
      
      // Détails prix
      base_price: acceptedDevis.base_price || 0,
      distance_price: acceptedDevis.distance_price || 0,
      time_price: acceptedDevis.time_price || 0,
      evening_surcharge_amount: acceptedDevis.evening_surcharge_amount || 0,
      weekend_surcharge_amount: acceptedDevis.weekend_surcharge_amount || 0,
      peak_hours_surcharge_amount: acceptedDevis.peak_hours_surcharge_amount || 0,
      pricing_source: acceptedDevis.pricing_source,
      city_pricing_name: acceptedDevis.city_pricing_name,
      distance_km: acceptedDevis.distance_km || course.distance_km,
      
      // ===== CHAMPS FRAIS =====
      is_stripe_payment: isStripePayment,
      solocab_fee_amount: solocabFee,
      stripe_fee_amount: stripeFee,
      total_fees_amount: totalFees,
      net_amount_to_driver: netToDriver,
      deposit_amount: depositAmount,
      deposit_status: course.deposit_status || null,
      final_payment_amount: finalPaymentAmount,
    };

    // Set client_id OR company_id
    if (isCompanyCourse && companyCourse?.company_id) {
      factureData.company_id = companyCourse.company_id;
      factureData.company_employee_id = companyCourse.employee_id;
      factureData.client_id = course.client_id;
      factureData.payment_status = "pending";
      factureData.paid_at = null;
    } else {
      factureData.client_id = course.client_id;
    }

    console.log("[CREATE-FACTURE-AUTO] Creating facture with fees:", factureData);

    const { data: facture, error: insertError } = await supabase
      .from("factures")
      .insert(factureData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Update course with fee info
    await supabase
      .from("courses")
      .update({
        solocab_fee_amount: solocabFee,
        stripe_fee_amount: stripeFee,
        total_fees_amount: totalFees,
        net_amount_to_driver: netToDriver,
      })
      .eq("id", course_id);

    // Notify company if applicable
    if (isCompanyCourse && companyCourse?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id, company_name")
        .eq("id", companyCourse.company_id)
        .single();

      if (companyData?.user_id) {
        await supabase.from("notifications").insert({
          user_id: companyData.user_id,
          title: "📄 Nouvelle facture",
          message: `Facture ${invoiceNumber} de ${factureData.amount}€ à régler`,
          type: "invoice",
          link: "/company-dashboard?tab=invoices"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        facture,
        fees: {
          solocab_fee: solocabFee,
          stripe_fee: stripeFee,
          total_fees: totalFees,
          net_to_driver: netToDriver,
        },
        message: "Facture créée avec succès"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    console.error("[CREATE-FACTURE-AUTO] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
