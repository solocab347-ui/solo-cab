import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
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
    console.log("[EMPLOYEE-WELCOME] Function started");

    const { user_id, company_id } = await req.json();
    
    if (!user_id || !company_id) {
      throw new Error("user_id and company_id are required");
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user_id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error("Profile not found");

    // Fetch company info
    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("company_name, contact_name, contact_email")
      .eq("id", company_id)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error("Company not found");

    // Fetch employee info
    const { data: employee, error: employeeError } = await supabaseClient
      .from("company_employees")
      .select("department, job_title, can_create_courses, can_view_invoices")
      .eq("user_id", user_id)
      .eq("company_id", company_id)
      .single();

    if (employeeError) {
      console.error("[EMPLOYEE-WELCOME] Employee fetch error:", employeeError);
    }

    console.log("[EMPLOYEE-WELCOME] Sending to:", profile.email);

    const firstName = profile.full_name?.split(' ')[0] || 'Collaborateur';

    const subject = `🎉 Bienvenue chez ${company.company_name} sur SoloCab !`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; margin-bottom: 10px;">🚗 Bienvenue sur SoloCab</h1>
            <p style="color: #666; font-size: 14px;">Votre compte collaborateur est actif</p>
          </div>

          <h2 style="color: #1a1a2e;">Bonjour ${firstName} !</h2>
          
          <p>Votre compte collaborateur au sein de <strong>${company.company_name}</strong> est maintenant actif sur SoloCab.</p>

          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">✅ Votre espace est prêt</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Connectez-vous pour commencer à utiliser SoloCab</p>
          </div>

          <h3 style="color: #1a1a2e;">🚀 Ce que vous pouvez faire :</h3>
          <ul style="padding-left: 20px; margin-bottom: 25px;">
            ${employee?.can_create_courses !== false ? `
            <li style="margin-bottom: 12px;">
              <strong>📍 Réserver des courses</strong><br>
              <span style="color: #666; font-size: 14px;">Commandez un VTC pour vos déplacements professionnels en quelques clics</span>
            </li>
            ` : ''}
            <li style="margin-bottom: 12px;">
              <strong>📋 Suivre vos trajets</strong><br>
              <span style="color: #666; font-size: 14px;">Consultez l'historique de toutes vos courses et leur statut</span>
            </li>
            ${employee?.can_view_invoices !== false ? `
            <li style="margin-bottom: 12px;">
              <strong>📄 Accéder aux factures</strong><br>
              <span style="color: #666; font-size: 14px;">Téléchargez vos justificatifs pour vos notes de frais</span>
            </li>
            ` : ''}
            <li style="margin-bottom: 12px;">
              <strong>⭐ Noter vos chauffeurs</strong><br>
              <span style="color: #666; font-size: 14px;">Partagez votre expérience après chaque trajet</span>
            </li>
            <li style="margin-bottom: 12px;">
              <strong>💬 Contacter votre chauffeur</strong><br>
              <span style="color: #666; font-size: 14px;">Communiquez directement via la messagerie intégrée</span>
            </li>
          </ul>

          ${employee?.department || employee?.job_title ? `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 12px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1a1a2e;">📋 Vos informations</h4>
            <table style="width: 100%; font-size: 14px;">
              ${employee.department ? `
              <tr>
                <td style="padding: 5px 0; color: #666;">Service :</td>
                <td style="padding: 5px 0; font-weight: bold;">${employee.department}</td>
              </tr>
              ` : ''}
              ${employee.job_title ? `
              <tr>
                <td style="padding: 5px 0; color: #666;">Poste :</td>
                <td style="padding: 5px 0; font-weight: bold;">${employee.job_title}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://solocab.fr/login" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Se connecter à SoloCab →
            </a>
          </div>

          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>💡 Astuce :</strong><br>
              Ajoutez SoloCab à votre écran d'accueil pour un accès rapide ! Lors de votre première connexion, l'application vous proposera cette option.
            </p>
          </div>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>📱 Besoin d'aide ?</strong><br>
              Contactez le responsable de votre entreprise : <strong>${company.contact_name}</strong><br>
              ou écrivez-nous à support@solocab.fr
            </p>
          </div>
          
          <p style="margin-top: 30px;">Bonne route !<br><strong>L'équipe SoloCab</strong></p>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          SoloCab - Plateforme de gestion VTC<br>
          <a href="https://solocab.fr" style="color: #6366f1;">www.solocab.fr</a>
        </p>
      </body>
      </html>
    `;

    console.log("📧 [EMPLOYEE-WELCOME] Envoi avec retry à:", profile.email);
    
    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [profile.email],
        subject: subject,
        html: html,
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌ [EMPLOYEE-WELCOME] ÉCHEC DÉFINITIF après retry");
      
      await sendAdminAlert(resend, {
        emailType: "company_employee_welcome",
        recipient: profile.email,
        error: emailResult.error || "Erreur inconnue",
        context: `User ID: ${user_id}, Company: ${company.company_name}`
      });
      
      throw new Error(`Échec envoi email après retry: ${emailResult.error}`);
    }

    console.log("✅ [EMPLOYEE-WELCOME] Email envoyé avec succès, ID:", emailResult.emailId);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.emailId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌ [EMPLOYEE-WELCOME] ERREUR:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erreur lors de l'envoi de l'email de bienvenue collaborateur"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
