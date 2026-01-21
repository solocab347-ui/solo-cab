import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCUMENTS_DEADLINE_DAYS = 7; // Nombre de jours pour soumettre les documents

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
    console.log("[DRIVER-WELCOME-NEW] Function started");

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

    console.log("[DRIVER-WELCOME-NEW] Driver found:", driver.profiles.email);

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + DOCUMENTS_DEADLINE_DAYS);
    const formattedDeadline = deadlineDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const subject = "🎉 Bienvenue sur SoloCab - Finalisez votre inscription";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .step { display: flex; align-items: flex-start; margin: 15px 0; }
            .step-number { background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue sur SoloCab !</h1>
              <p>Félicitations ${driver.profiles.full_name} !</p>
            </div>
            <div class="content">
              <p>Votre compte chauffeur a été créé avec succès ! Vous avez maintenant accès à votre espace personnel.</p>
              
              <div class="success-box">
                <p><strong>✅ Ce que vous pouvez faire dès maintenant :</strong></p>
                <ul>
                  <li>Explorer votre tableau de bord</li>
                  <li>Configurer votre profil et vos tarifs</li>
                  <li>Découvrir toutes les fonctionnalités</li>
                </ul>
              </div>
              
              <div class="warning-box">
                <p><strong>⚠️ IMPORTANT : Action requise sous ${DOCUMENTS_DEADLINE_DAYS} jours</strong></p>
                <p>Pour conserver votre accès et commencer à recevoir des courses, vous devez soumettre vos documents professionnels <strong>avant le ${formattedDeadline}</strong>.</p>
              </div>
              
              <h3>📋 Comment finaliser votre inscription ?</h3>
              
              <div class="step">
                <div class="step-number">1</div>
                <div>
                  <strong>Connectez-vous à votre espace</strong><br>
                  Accédez à votre tableau de bord chauffeur
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">2</div>
                <div>
                  <strong>Allez dans "Mes documents"</strong><br>
                  Cette section se trouve dans le menu principal
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">3</div>
                <div>
                  <strong>Téléchargez vos documents</strong><br>
                  Carte professionnelle VTC, assurance, permis de conduire, etc.
                </div>
              </div>
              
              <div class="step">
                <div class="step-number">4</div>
                <div>
                  <strong>Attendez la validation</strong><br>
                  Notre équipe examine votre dossier sous 24-48h
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://solocab.fr/driver-dashboard" class="button">
                  Accéder à mon espace chauffeur
                </a>
              </div>
              
              <p><strong>💡 Conseil :</strong> Plus vite vous soumettez vos documents, plus vite vous pourrez commencer à recevoir des courses !</p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p>Vous avez des questions ? N'hésitez pas à nous contacter via votre espace personnel.</p>
              
              <p>Bienvenue dans la communauté SoloCab !</p>
              
              <p>L'équipe SoloCab</p>
            </div>
            <div class="footer">
              <p>SoloCab - Plateforme de gestion VTC<br>www.solocab.fr</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("📧 [DRIVER-WELCOME-NEW] Envoi avec retry à:", driver.profiles.email);
    
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
      console.error("❌❌❌ [DRIVER-WELCOME-NEW] ÉCHEC DÉFINITIF après retry");
      
      await sendAdminAlert(resend, {
        emailType: "driver_welcome_new",
        recipient: driver.profiles.email,
        error: emailResult.error || "Erreur inconnue",
        context: `Driver ID: ${driver_id}`
      });
      
      throw new Error(`Échec envoi email après retry: ${emailResult.error}`);
    }

    console.log("✅✅✅ [DRIVER-WELCOME-NEW] Email envoyé avec succès, ID:", emailResult.emailId);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.emailId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌❌❌ [DRIVER-WELCOME-NEW] ERREUR CRITIQUE:", {
      error: error.message,
      stack: error.stack,
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erreur lors de l'envoi de l'email de bienvenue chauffeur"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
