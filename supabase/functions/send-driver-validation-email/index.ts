import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

  try {
    console.log("[DRIVER-VALIDATION-EMAIL] Function started");

    const { driver_id, action } = await req.json();
    if (!driver_id || !action) {
      throw new Error("driver_id and action are required");
    }

    console.log("[DRIVER-VALIDATION-EMAIL] Processing:", driver_id, action);

    // Fetch driver and profile info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select(`
        *,
        profiles:user_id(email, full_name)
      `)
      .eq("id", driver_id)
      .single();

    if (driverError) throw driverError;
    if (!driver) throw new Error("Driver not found");

    console.log("[DRIVER-VALIDATION-EMAIL] Driver found:", driver.profiles.email);

    let subject: string;
    let html: string;

    if (action === "validated") {
      subject = "✅ Votre compte chauffeur SoloCab est validé !";
      html = `
        <h1>Félicitations ${driver.profiles.full_name} !</h1>
        <p>Votre compte chauffeur SoloCab a été validé par notre équipe.</p>
        
        <h2>Vos informations :</h2>
        <ul>
          <li><strong>Licence :</strong> ${driver.license_number}</li>
          <li><strong>Véhicule :</strong> ${driver.vehicle_model}</li>
          ${driver.company_name ? `<li><strong>Société :</strong> ${driver.company_name}</li>` : ""}
        </ul>

        <h2>Prochaines étapes :</h2>
        <ol>
          <li>Connectez-vous à votre tableau de bord</li>
          <li>Complétez votre profil public si souhaité</li>
          <li>Générez vos QR codes pour vos clients exclusifs</li>
          <li>Commencez à recevoir des réservations !</li>
        </ol>

        <p>Bienvenue dans la communauté SoloCab !</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          SoloCab - Plateforme de gestion VTC
        </p>
      `;
    } else {
      subject = "❌ Votre demande de compte chauffeur SoloCab";
      html = `
        <h1>Bonjour ${driver.profiles.full_name},</h1>
        <p>Nous avons examiné votre demande de compte chauffeur SoloCab.</p>
        
        <p>Malheureusement, nous ne pouvons pas valider votre compte pour le moment.</p>

        <h2>Raisons possibles :</h2>
        <ul>
          <li>Documents incomplets ou non conformes</li>
          <li>Licence professionnelle invalide</li>
          <li>Informations de véhicule incorrectes</li>
        </ul>

        <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez plus d'informations, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>L'équipe SoloCab</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          SoloCab - Plateforme de gestion VTC
        </p>
      `;
    }

    await resend.emails.send({
      from: "SoloCab <onboarding@resend.dev>",
      to: [driver.profiles.email],
      subject: subject,
      html: html,
    });

    console.log("[DRIVER-VALIDATION-EMAIL] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[DRIVER-VALIDATION-EMAIL] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
