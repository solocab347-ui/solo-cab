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

    // Get course details with devis
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        *,
        devis!inner(id, amount, base_price, distance_price, time_price, status, quote_number)
      `)
      .eq("id", course_id)
      .single();

    if (courseError) throw courseError;
    if (!course) throw new Error("Course not found");

    // Get accepted devis
    const acceptedDevis = course.devis.find((d: any) => d.status === "accepted");
    if (!acceptedDevis) throw new Error("No accepted devis found for this course");

    // Use the same reference number as the devis (REV-XXX becomes FAC-XXX with same number)
    let invoiceNumber = acceptedDevis.quote_number;
    if (invoiceNumber && invoiceNumber.startsWith("REV-")) {
      // Replace REV- with FAC- to keep the same reference number
      invoiceNumber = invoiceNumber.replace("REV-", "FAC-");
    } else {
      // Fallback: generate new invoice number if quote_number doesn't exist
      const { data: generatedNumber, error: invoiceError } = await supabase
        .rpc("generate_invoice_number", { _driver_id: course.driver_id });
      
      if (invoiceError) throw invoiceError;
      invoiceNumber = generatedNumber;
    }

    console.log("[CREATE-FACTURE-AUTO] Invoice number:", invoiceNumber, "from quote:", acceptedDevis.quote_number);

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

    // Create notification for client
    await supabase.from("notifications").insert({
      user_id: course.client_id,
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
