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

    // Verify user owns this course (either as driver or client)
    const { data: courseCheck, error: courseCheckError } = await supabase
      .from("courses")
      .select(`
        driver_id,
        client_id,
        clients(user_id),
        drivers(user_id)
      `)
      .eq("id", course_id)
      .maybeSingle();

    if (courseCheckError || !courseCheck) {
      console.log("[CREATE-FACTURE-AUTO] ❌ Course not found:", courseCheckError?.message);
      return new Response(
        JSON.stringify({ error: "Course introuvable ou accès refusé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if authenticated user is either the driver or the client
    // Handle both array and object formats from Supabase joins
    const driverUserId = Array.isArray(courseCheck.drivers) 
      ? courseCheck.drivers[0]?.user_id 
      : (courseCheck.drivers as any)?.user_id;
    const clientUserId = Array.isArray(courseCheck.clients) 
      ? courseCheck.clients[0]?.user_id 
      : (courseCheck.clients as any)?.user_id;

    const isDriver = driverUserId === user.id;
    const isClient = clientUserId === user.id;

    console.log("[CREATE-FACTURE-AUTO] Authorization check:", { 
      driverUserId, 
      clientUserId, 
      currentUser: user.id,
      isDriver, 
      isClient 
    });

    if (!isDriver && !isClient) {
      console.log("[CREATE-FACTURE-AUTO] ❌ User not authorized for this course");
      return new Response(
        JSON.stringify({ error: "Non autorisé pour cette course" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[CREATE-FACTURE-AUTO] ✅ User authorized:", { isDriver, isClient });

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

    // Get course details with devis and client user_id
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        devis(id, amount, base_price, distance_price, time_price, status, quote_number, discount_amount, promo_code, created_at),
        clients!inner(user_id)
      `)
      .eq("id", course_id)
      .single();

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
    
    if (!acceptedDevis) {
      throw new Error("Aucun devis trouvé pour cette course. Veuillez d'abord créer un devis.");
    }

    // Use the SAME reservation number as the devis for the invoice
    // This ensures: Course RES-001 → Devis RES-001 → Facture RES-001 (logical sequence)
    const invoiceNumber = acceptedDevis.quote_number;
    
    if (!invoiceNumber) {
      throw new Error("Devis has no quote_number, cannot generate invoice");
    }

    console.log("[CREATE-FACTURE-AUTO] Using reservation number:", invoiceNumber, "from devis:", acceptedDevis.quote_number);

    // Create facture with promo code and discount
    const { data: facture, error: insertError } = await supabase
      .from("factures")
      .insert({
        driver_id: course.driver_id,
        client_id: course.client_id,
        course_id: course.id,
        devis_id: acceptedDevis.id,
        invoice_number: invoiceNumber,
        amount: acceptedDevis.amount,
        discount_amount: acceptedDevis.discount_amount || 0,
        promo_code: acceptedDevis.promo_code || null,
        payment_method: payment_method,
        payment_status: "paid",
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("[CREATE-FACTURE-AUTO] Facture created:", facture.id);

      // Create notification for client using their user_id
      await supabase.from("notifications").insert({
        user_id: course.clients.user_id,
        title: "Facture disponible",
        message: `Votre facture ${invoiceNumber} est maintenant disponible en téléchargement.`,
        type: "facture_generated",
        link: "/client-dashboard?tab=factures"
      });

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
