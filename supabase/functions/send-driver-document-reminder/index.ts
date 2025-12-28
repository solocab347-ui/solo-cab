import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';

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
    console.log("[DRIVER-DOCUMENT-REMINDER] Function started");

    const { driver_id, days_remaining, is_final_warning } = await req.json();
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

    console.log("[DRIVER-DOCUMENT-REMINDER] Driver found:", driver.profiles.email);

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + (days_remaining || 3));
    const formattedDeadline = deadlineDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const subject = is_final_warning 
      ? "🚨 URGENT : Dernier rappel - Vos documents sont attendus"
      : "⏰ Rappel : Finalisez votre inscription SoloCab";

    const urgencyColor = is_final_warning ? "#ef4444" : "#f59e0b";
    const urgencyText = is_final_warning 
      ? "C'est votre dernier rappel avant la suspension de votre accès !"
      : "Il vous reste peu de temps pour soumettre vos documents.";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${urgencyColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            .warning-box { background: #fef2f2; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .countdown { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
            .countdown-number { font-size: 48px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${is_final_warning ? "🚨 DERNIER RAPPEL" : "⏰ Rappel important"}</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${driver.profiles.full_name}</strong>,</p>
              
              <p>${urgencyText}</p>
              
              <div class="countdown">
                <div class="countdown-number">${days_remaining || 3}</div>
                <p style="margin: 0;">jour${(days_remaining || 3) > 1 ? 's' : ''} restant${(days_remaining || 3) > 1 ? 's' : ''}</p>
              </div>
              
              <div class="warning-box">
                <p><strong>⚠️ Attention :</strong></p>
                <p>Vous avez jusqu'au <strong>${formattedDeadline}</strong> pour soumettre vos documents professionnels.</p>
                ${is_final_warning ? '<p style="color: #ef4444;"><strong>Passé ce délai, votre accès à SoloCab sera suspendu.</strong></p>' : ''}
              </div>
              
              <h3>📋 Documents requis :</h3>
              <ul>
                <li>✓ Carte professionnelle VTC valide</li>
                <li>✓ Permis de conduire</li>
                <li>✓ Attestation d'assurance professionnelle</li>
                <li>✓ Carte grise du véhicule</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://solocab.fr/driver-dashboard?tab=documents" class="button">
                  Soumettre mes documents maintenant
                </a>
              </div>
              
              <p><strong>Pourquoi c'est important ?</strong></p>
              <ul>
                <li>Sans documents validés, vous ne pourrez pas recevoir de courses</li>
                <li>Votre profil ne sera pas visible par les clients potentiels</li>
                <li>Votre accès à l'application sera suspendu après le délai</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p>Besoin d'aide ? Contactez-nous via votre espace personnel.</p>
              
              <p>L'équipe SoloCab</p>
            </div>
            <div class="footer">
              <p>SoloCab - Plateforme de gestion VTC<br>www.solocab.fr</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("📧 [DRIVER-DOCUMENT-REMINDER] Envoi avec retry à:", driver.profiles.email);
    
    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [driver.profiles.email],
        subject: subject,
        html: html,
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌❌❌ [DRIVER-DOCUMENT-REMINDER] ÉCHEC DÉFINITIF après retry");
      
      await sendAdminAlert(resend, {
        emailType: "driver_document_reminder",
        recipient: driver.profiles.email,
        error: emailResult.error || "Erreur inconnue",
        context: `Driver ID: ${driver_id}, Days remaining: ${days_remaining}`
      });
      
      throw new Error(`Échec envoi email après retry: ${emailResult.error}`);
    }

    console.log("✅✅✅ [DRIVER-DOCUMENT-REMINDER] Email envoyé avec succès, ID:", emailResult.emailId);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.emailId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌❌❌ [DRIVER-DOCUMENT-REMINDER] ERREUR CRITIQUE:", {
      error: error.message,
      stack: error.stack,
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erreur lors de l'envoi de l'email de rappel documents"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
