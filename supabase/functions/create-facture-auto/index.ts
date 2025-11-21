import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { course_id, payment_method } = await req.json();

    console.log("[CREATE-FACTURE-AUTO] Processing:", { course_id, payment_method });

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
        devis!inner(id, amount, base_price, distance_price, time_price, status, quote_number),
        clients!inner(user_id)
      `)
      .eq("id", course_id)
      .single();

    if (courseError) throw courseError;
    if (!course) throw new Error("Course not found");

    // Get accepted devis
    const acceptedDevis = course.devis.find((d: any) => d.status === "accepted");
    if (!acceptedDevis) throw new Error("No accepted devis found for this course");

    // ALWAYS generate a unique invoice number using the driver's counter
    // This prevents duplicate invoice numbers even if multiple courses share the same devis
    const { data: invoiceNumber, error: invoiceError } = await supabase
      .rpc("generate_invoice_number", { _driver_id: course.driver_id });
    
    if (invoiceError) throw invoiceError;
    if (!invoiceNumber) throw new Error("Failed to generate invoice number");

    console.log("[CREATE-FACTURE-AUTO] Invoice number generated:", invoiceNumber, "for quote:", acceptedDevis.quote_number);

    // Create facture
    const { data: facture, error: insertError } = await supabase
      .from("factures")
      .insert({
        driver_id: course.driver_id,
        client_id: course.client_id,
        course_id: course.id,
        devis_id: acceptedDevis.id,
        invoice_number: invoiceNumber,
        amount: acceptedDevis.amount,
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
