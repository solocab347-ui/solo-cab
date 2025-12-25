import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface RemovalEmailRequest {
  driver_id: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("📧 send-driver-fleet-removal function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driver_id, reason }: RemovalEmailRequest = await req.json();

    if (!driver_id || !reason) {
      throw new Error("Missing required parameters: driver_id and reason");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get driver and profile info
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select(`
        id,
        user_id,
        company_name,
        profiles:user_id(
          full_name,
          email
        )
      `)
      .eq("id", driver_id)
      .single();

    if (driverError || !driver) {
      throw new Error(`Driver not found: ${driverError?.message}`);
    }

    const profile = driver.profiles as any;
    const driverName = profile?.full_name || "Chauffeur";
    const driverEmail = profile?.email;

    if (!driverEmail) {
      throw new Error("Driver email not found");
    }

    // Get fleet manager info
    const { data: removalInfo } = await supabase
      .from("fleet_manager_drivers")
      .select(`
        fleet_manager:fleet_managers(
          company_name,
          contact_email
        )
      `)
      .eq("driver_id", driver_id)
      .eq("removed_by_manager", true)
      .order("removed_at", { ascending: false })
      .limit(1)
      .single();

    const fleetName = (removalInfo?.fleet_manager as any)?.company_name || "Le gestionnaire de flotte";

    console.log(`📧 Sending removal email to ${driverEmail}`);

    if (!RESEND_API_KEY) {
      console.log("⚠️ RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Notification de retrait - SoloCab</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #F59E0B; margin: 0;">⚠️ Notification importante</h1>
          </div>
          
          <p>Bonjour ${driverName},</p>
          
          <p>Nous vous informons que <strong>${fleetName}</strong> vous a retiré de son équipe de chauffeurs.</p>
          
          <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
            <strong>Motif indiqué :</strong><br>
            ${reason}
          </div>
          
          <h3 style="color: #1F2937;">Que se passe-t-il maintenant ?</h3>
          
          <p>Votre compte SoloCab reste actif. Vous avez plusieurs options :</p>
          
          <ul style="padding-left: 20px;">
            <li><strong>Continuer en indépendant</strong> : Souscrivez à l'abonnement chauffeur (9,99€/mois) pour gérer votre activité en toute autonomie.</li>
            <li><strong>Rejoindre un autre gestionnaire</strong> : Utilisez un lien d'invitation d'un autre gestionnaire de flotte.</li>
          </ul>
          
          <div style="background-color: #DBEAFE; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📱 Connectez-vous à votre espace</strong></p>
            <p style="margin: 10px 0 0 0;">Rendez-vous sur SoloCab pour découvrir vos options et continuer votre activité.</p>
          </div>
          
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
          
          <p style="margin-top: 30px;">
            Cordialement,<br>
            <strong>L'équipe SoloCab</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="font-size: 12px; color: #6B7280; text-align: center;">
            Cet email a été envoyé automatiquement par SoloCab.<br>
            © ${new Date().getFullYear()} SoloCab - Tous droits réservés
          </p>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SoloCab <noreply@solocab.fr>",
        to: [driverEmail],
        subject: `⚠️ Notification : Vous avez été retiré de ${fleetName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("❌ Email send error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("✅ Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error in send-driver-fleet-removal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
