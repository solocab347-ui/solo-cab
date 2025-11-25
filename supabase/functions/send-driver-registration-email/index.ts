import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

  try {
    console.log("[DRIVER-REGISTRATION-EMAIL] Function started");

    const { driver_id } = await req.json();
    if (!driver_id) {
      throw new Error("driver_id is required");
    }

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

    console.log("[DRIVER-REGISTRATION-EMAIL] Driver found:", driver.profiles.email);

    const subject = "📝 Dossier d'inscription SoloCab reçu";
    const html = `
      <h1>Bonjour ${driver.profiles.full_name},</h1>
      <p>Nous avons bien reçu votre dossier d'inscription en tant que chauffeur VTC sur la plateforme SoloCab.</p>
      
      <h2>✅ Votre paiement a été validé</h2>
      <p>Votre abonnement mensuel de 49,99€ est maintenant actif.</p>

      <h2>📋 Prochaines étapes</h2>
      <p>Notre équipe va maintenant examiner votre dossier. Vous recevrez une réponse sous <strong>24 à 48 heures maximum</strong>.</p>
      
      <h3>Documents reçus :</h3>
      <ul>
        <li>✓ Informations personnelles et professionnelles</li>
        <li>✓ Documents VTC (carte professionnelle)</li>
        <li>✓ Paiement abonnement validé</li>
      </ul>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          <strong>💡 Pendant l'examen de votre dossier :</strong><br>
          Votre accès au tableau de bord sera activé dès que votre profil sera validé par notre équipe.
        </p>
      </div>

      <h2>📞 Besoin d'aide ?</h2>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      
      <p style="margin-top: 30px;">À très bientôt sur SoloCab !<br>L'équipe SoloCab</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        SoloCab - Plateforme de gestion VTC<br>
        www.solocab.fr
      </p>
    `;

    await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [driver.profiles.email],
      subject: subject,
      html: html,
    });

    console.log("[DRIVER-REGISTRATION-EMAIL] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[DRIVER-REGISTRATION-EMAIL] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
