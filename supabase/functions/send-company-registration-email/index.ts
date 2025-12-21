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
    console.log("[COMPANY-REGISTRATION-EMAIL] Function started");

    const { company_id } = await req.json();
    if (!company_id) {
      throw new Error("company_id is required");
    }

    // Fetch company info
    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error("Company not found");

    console.log("[COMPANY-REGISTRATION-EMAIL] Company found:", company.contact_email);

    const subject = "🏢 Bienvenue sur SoloCab - Votre compte entreprise est activé !";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; margin-bottom: 10px;">🏢 Bienvenue sur SoloCab</h1>
          <p style="color: #666; font-size: 14px;">Votre compte entreprise est maintenant actif</p>
        </div>

        <h2 style="color: #1a1a2e;">Bonjour ${company.contact_name},</h2>
        
        <p>Nous sommes ravis de vous accueillir sur SoloCab ! Votre compte entreprise <strong>${company.company_name}</strong> a été créé avec succès.</p>

        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">✅ Votre compte est actif</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Vous pouvez dès maintenant accéder à votre espace entreprise</p>
        </div>

        <h3 style="color: #1a1a2e;">🚀 Ce que vous pouvez faire maintenant :</h3>
        <ul style="padding-left: 20px;">
          <li style="margin-bottom: 10px;"><strong>Rechercher des chauffeurs</strong> - Parcourez notre réseau de chauffeurs VTC professionnels</li>
          <li style="margin-bottom: 10px;"><strong>Réserver des courses</strong> - Organisez vos déplacements professionnels facilement</li>
          <li style="margin-bottom: 10px;"><strong>Gérer vos factures</strong> - Accédez à tous vos justificatifs en un clic</li>
          <li style="margin-bottom: 10px;"><strong>Ajouter des chauffeurs favoris</strong> - Pour des réservations encore plus rapides</li>
        </ul>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 25px 0;">
          <h4 style="margin: 0 0 15px 0; color: #1a1a2e;">📋 Récapitulatif de votre compte</h4>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #666;">Entreprise :</td>
              <td style="padding: 5px 0; font-weight: bold;">${company.company_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">SIRET :</td>
              <td style="padding: 5px 0;">${company.siret}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Contact :</td>
              <td style="padding: 5px 0;">${company.contact_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Email :</td>
              <td style="padding: 5px 0;">${company.contact_email}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://solocab.fr/login" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Accéder à mon espace entreprise →
          </a>
        </div>

        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>💡 Bon à savoir :</strong><br>
            L'inscription et l'utilisation de SoloCab sont <strong>entièrement gratuites</strong> pour les entreprises. Vous ne payez que les courses que vous réservez.
          </p>
        </div>

        <h3 style="color: #1a1a2e;">📞 Besoin d'aide ?</h3>
        <p>Notre équipe est à votre disposition pour répondre à toutes vos questions. N'hésitez pas à nous contacter !</p>
        
        <p style="margin-top: 30px;">À très bientôt sur SoloCab !<br><strong>L'équipe SoloCab</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          SoloCab - Plateforme de gestion VTC<br>
          <a href="https://solocab.fr" style="color: #6366f1;">www.solocab.fr</a>
        </p>
      </body>
      </html>
    `;

    console.log("📧 [COMPANY-REGISTRATION-EMAIL] Envoi avec retry à:", company.contact_email);
    
    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [company.contact_email],
        subject: subject,
        html: html,
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌❌❌ [COMPANY-REGISTRATION-EMAIL] ÉCHEC DÉFINITIF après retry");
      
      // Envoyer alerte admin
      await sendAdminAlert(resend, {
        emailType: "company_registration",
        recipient: company.contact_email,
        error: emailResult.error || "Erreur inconnue",
        context: `Company ID: ${company_id}, Company Name: ${company.company_name}`
      });
      
      throw new Error(`Échec envoi email après retry: ${emailResult.error}`);
    }

    console.log("✅✅✅ [COMPANY-REGISTRATION-EMAIL] Email envoyé avec succès, ID:", emailResult.emailId);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.emailId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌❌❌ [COMPANY-REGISTRATION-EMAIL] ERREUR CRITIQUE:", {
      error: error.message,
      stack: error.stack,
      resendApiKey: Deno.env.get("RESEND_API_KEY") ? "PRESENT" : "MISSING"
    });
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erreur lors de l'envoi de l'email d'inscription entreprise"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
