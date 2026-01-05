import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get driver user_id
    const { data: driverData } = await supabase
      .from("drivers")
      .select("user_id")
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

    // Get course details with devis - use LEFT JOIN for clients to support company courses
    let course: any;
    let courseError: any;

    if (isCompanyCourse) {
      // For company courses, don't require client
      const result = await supabase
        .from("courses")
        .select(`
          *,
          devis(id, amount, base_price, distance_price, time_price, status, quote_number, discount_amount, promo_code, created_at, company_id)
        `)
        .eq("id", course_id)
        .single();
      
      course = result.data;
      courseError = result.error;
    } else {
      // For regular courses, require client
      const result = await supabase
        .from("courses")
        .select(`
          *,
          devis(id, amount, base_price, distance_price, time_price, status, quote_number, discount_amount, promo_code, created_at),
          clients!inner(user_id)
        `)
        .eq("id", course_id)
        .single();
      
      course = result.data;
      courseError = result.error;
    }

    if (courseError) throw courseError;
    if (!course) throw new Error("Course not found");

    // Get accepted devis or the most recent one
    let acceptedDevis = course.devis?.find((d: any) => d.status === "accepted");
    
    // ROBUSTESSE: Si aucun devis n'est accepté, accepter automatiquement le plus récent
    if (!acceptedDevis && course.devis && course.devis.length > 0) {
      console.log("[CREATE-FACTURE-AUTO] ⚠️ No accepted devis, auto-accepting most recent");
      
      // Trier par date de création (le plus récent en premier)
      const sortedDevis = course.devis.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const mostRecentDevis = sortedDevis[0];
      
      // Accepter automatiquement le devis le plus récent
      const { error: updateError } = await supabase
        .from("devis")
        .update({ 
          status: "accepted", 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", mostRecentDevis.id);
      
      if (updateError) {
        console.error("[CREATE-FACTURE-AUTO] Error auto-accepting devis:", updateError);
        throw new Error("Impossible d'accepter le devis automatiquement");
      }
      
      // Utiliser ce devis
      acceptedDevis = { ...mostRecentDevis, status: "accepted" };
      console.log("[CREATE-FACTURE-AUTO] ✅ Auto-accepted devis:", acceptedDevis.id);
    }
    
    // For company courses without devis, create one from the company quote
    if (!acceptedDevis && isCompanyCourse) {
      console.log("[CREATE-FACTURE-AUTO] 🏢 No devis found for company course, checking company_course_quotes");
      
      // Get the company course request to find the quote
      const { data: request } = await supabase
        .from("company_course_requests")
        .select(`
          id,
          company_course_quotes(
            id, 
            total_price, 
            base_price, 
            distance_price, 
            time_price,
            driver_id,
            status
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
          console.log("[CREATE-FACTURE-AUTO] 🏢 Found company quote, creating devis:", acceptedQuote.id);
          
          // Generate quote number
          const quoteNumber = `ENT-${acceptedQuote.id.slice(0, 8).toUpperCase()}`;
          
          // Create a devis from the company quote
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
          
          if (devisError) {
            console.error("[CREATE-FACTURE-AUTO] Error creating devis from company quote:", devisError);
            throw new Error("Impossible de créer le devis à partir du quote entreprise");
          }
          
          acceptedDevis = newDevis;
          console.log("[CREATE-FACTURE-AUTO] ✅ Created devis from company quote:", newDevis.id);
        }
      }
    }
    
    if (!acceptedDevis) {
      throw new Error("Aucun devis trouvé pour cette course. Veuillez d'abord créer un devis.");
    }

    // Use the SAME reservation number as the devis for the invoice
    const invoiceNumber = acceptedDevis.quote_number;
    
    if (!invoiceNumber) {
      throw new Error("Devis has no quote_number, cannot generate invoice");
    }

    console.log("[CREATE-FACTURE-AUTO] Using reservation number:", invoiceNumber, "from devis:", acceptedDevis.quote_number);

    // Create facture with promo code and discount
    // For company courses, use company_id instead of client_id
    const factureData: any = {
      driver_id: course.driver_id,
      course_id: course.id,
      devis_id: acceptedDevis.id,
      invoice_number: invoiceNumber,
      amount: acceptedDevis.amount,
      discount_amount: acceptedDevis.discount_amount || 0,
      promo_code: acceptedDevis.promo_code || null,
      payment_method: payment_method,
      payment_status: "paid",
      paid_at: new Date().toISOString()
    };

    // Set client_id OR company_id (one must be present)
    if (isCompanyCourse && companyCourse?.company_id) {
      factureData.company_id = companyCourse.company_id;
      factureData.company_employee_id = companyCourse.employee_id;
      factureData.client_id = course.client_id; // May be null for guest bookings
      // For company invoices, set status to pending (company needs to pay later)
      factureData.payment_status = "pending";
      factureData.paid_at = null;
    } else {
      factureData.client_id = course.client_id;
    }

    console.log("[CREATE-FACTURE-AUTO] Creating facture:", factureData);

    const { data: facture, error: insertError } = await supabase
      .from("factures")
      .insert(factureData)
      .select()
      .single();

    if (insertError) throw insertError;

    // For company courses, notify the company
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

    // La notification pour le client est gérée par le trigger notify_new_facture
    // Ne pas envoyer de notification en double ici

    return new Response(
      JSON.stringify({ 
        facture,
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
