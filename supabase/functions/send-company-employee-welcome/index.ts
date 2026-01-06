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

    const { user_id, company_id, is_test } = await req.json();
    
    // Mode test : envoyer à contact@solocab.fr
    if (is_test) {
      console.log("[EMPLOYEE-WELCOME] Mode test activé");
      
      const testHtml = generateCollaboratorWelcomeEmail({
        employeeName: "Marie Martin",
        companyName: "Entreprise Test SARL",
        canCreateCourses: true,
        canViewInvoices: false,
        loginUrl: "https://solocab.fr/login"
      });

      const emailResult = await sendEmailWithRetry(
        resend,
        {
          from: "SoloCab <noreply@solocab.fr>",
          to: ["contact@solocab.fr"],
          subject: "[TEST] 🚗 Bienvenue sur SoloCab - Votre guide collaborateur entreprise",
          html: testHtml,
        },
        { maxAttempts: 3 }
      );

      return new Response(JSON.stringify({ 
        success: true,
        test: true,
        emailId: emailResult.emailId
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
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
    const { data: employee } = await supabaseClient
      .from("company_employees")
      .select("department, job_title, can_create_courses, can_view_invoices")
      .eq("user_id", user_id)
      .eq("company_id", company_id)
      .single();

    console.log("[EMPLOYEE-WELCOME] Sending to:", profile.email);

    const html = generateCollaboratorWelcomeEmail({
      employeeName: profile.full_name || "Collaborateur",
      companyName: company.company_name,
      canCreateCourses: employee?.can_create_courses || false,
      canViewInvoices: employee?.can_view_invoices || false,
      loginUrl: "https://solocab.fr/login"
    });

    const subject = `🚗 Bienvenue sur SoloCab - Votre accès collaborateur ${company.company_name}`;

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

function generateCollaboratorWelcomeEmail({ employeeName, companyName, canCreateCourses, canViewInvoices, loginUrl }: {
  employeeName: string;
  companyName: string;
  canCreateCourses: boolean;
  canViewInvoices: boolean;
  loginUrl: string;
}): string {
  
  // Déterminer le niveau d'accès
  let accessLevel = "Suivi de vos courses";
  let accessDescription = "Vous pouvez suivre les courses réservées pour vous et confirmer leur réalisation.";
  
  if (canCreateCourses && canViewInvoices) {
    accessLevel = "Accès complet";
    accessDescription = "Vous pouvez réserver des courses et consulter les factures de l'entreprise.";
  } else if (canCreateCourses) {
    accessLevel = "Réservation de courses";
    accessDescription = "Vous pouvez réserver des courses pour vous-même ou d'autres collaborateurs.";
  } else if (canViewInvoices) {
    accessLevel = "Consultation des factures";
    accessDescription = "Vous pouvez consulter les factures et suivre vos courses.";
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur SoloCab</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a2e; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">🚗 Bienvenue sur SoloCab !</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Collaborateur - ${companyName}</p>
    </div>

    <div style="padding: 40px 30px;">
      
      <!-- Greeting -->
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">Bonjour ${employeeName},</h2>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        Votre entreprise <strong>${companyName}</strong> vous a donné accès à SoloCab, la plateforme qui simplifie vos déplacements professionnels. 
        Fini le stress des réservations de taxi, tout est à portée de clic !
      </p>

      <!-- Access Level Badge -->
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center; border: 2px solid #10b981;">
        <p style="margin: 0 0 5px 0; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Votre niveau d'accès</p>
        <h3 style="margin: 0 0 10px 0; color: #047857; font-size: 22px;">${accessLevel}</h3>
        <p style="margin: 0; color: #059669; font-size: 14px;">${accessDescription}</p>
      </div>

      <!-- What SoloCab offers -->
      <div style="background: #faf5ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
        <h3 style="color: #6b21a8; margin: 0 0 15px 0; font-size: 18px;">✨ Ce que SoloCab vous apporte</h3>
        <ul style="margin: 0; padding-left: 20px; color: #7c3aed;">
          <li style="margin-bottom: 10px;"><strong>Des chauffeurs VTC professionnels</strong> - Véhicules confortables, chauffeurs ponctuels</li>
          <li style="margin-bottom: 10px;"><strong>Prix transparents</strong> - Vous connaissez le tarif avant de réserver</li>
          <li style="margin-bottom: 10px;"><strong>Suivi en temps réel</strong> - Suivez votre chauffeur sur la carte</li>
          <li style="margin-bottom: 10px;"><strong>Pas d'avance de frais</strong> - L'entreprise gère la facturation</li>
          <li style="margin-bottom: 0;"><strong>Simple et rapide</strong> - Réservez en quelques clics</li>
        </ul>
      </div>

      <!-- What you can do -->
      <h3 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 18px;">🎯 Ce que vous pouvez faire :</h3>
      
      <div style="margin-bottom: 30px;">
        <!-- Always available -->
        <div style="background: #f0fdf4; border-radius: 10px; padding: 18px; border: 1px solid #bbf7d0; margin-bottom: 15px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="52" valign="top">
                <div style="background: #22c55e; color: white; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">📍</div>
              </td>
              <td valign="top">
                <strong style="color: #166534;">Suivre vos courses</strong>
                <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">Visualisez le trajet, le chauffeur et l'heure d'arrivée en temps réel</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="background: #f0fdf4; border-radius: 10px; padding: 18px; border: 1px solid #bbf7d0; margin-bottom: 15px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="52" valign="top">
                <div style="background: #22c55e; color: white; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">✅</div>
              </td>
              <td valign="top">
                <strong style="color: #166534;">Confirmer vos courses</strong>
                <p style="margin: 5px 0 0 0; color: #15803d; font-size: 14px;">Validez que la course a bien été effectuée et indiquez le mode de paiement</p>
              </td>
            </tr>
          </table>
        </div>

        ${canCreateCourses ? `
        <div style="background: #eff6ff; border-radius: 10px; padding: 18px; border: 1px solid #bfdbfe; margin-bottom: 15px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="52" valign="top">
                <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">🚗</div>
              </td>
              <td valign="top">
                <strong style="color: #1e40af;">Réserver des courses</strong>
                <p style="margin: 5px 0 0 0; color: #2563eb; font-size: 14px;">Créez des demandes de course pour vous ou vos collègues</p>
              </td>
            </tr>
          </table>
        </div>
        ` : ''}

        ${canViewInvoices ? `
        <div style="background: #fef3c7; border-radius: 10px; padding: 18px; border: 1px solid #fde68a; margin-bottom: 15px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="52" valign="top">
                <div style="background: #f59e0b; color: white; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">📄</div>
              </td>
              <td valign="top">
                <strong style="color: #92400e;">Consulter les factures</strong>
                <p style="margin: 5px 0 0 0; color: #b45309; font-size: 14px;">Accédez aux factures de l'entreprise pour votre comptabilité</p>
              </td>
            </tr>
          </table>
        </div>
        ` : ''}
      </div>

      <!-- How it works for employees -->
      <div style="background: #f0f9ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 18px;">📱 Comment ça marche pour vous ?</h3>
        
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom: 15px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="43" valign="top">
                    <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold;">1</div>
                  </td>
                  <td valign="top">
                    <strong style="color: #0369a1;">Une course est réservée pour vous</strong>
                    <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Par vous-même ou par un administrateur de votre entreprise</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 15px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="43" valign="top">
                    <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold;">2</div>
                  </td>
                  <td valign="top">
                    <strong style="color: #0369a1;">Vous recevez les informations</strong>
                    <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Nom du chauffeur, véhicule, heure de prise en charge</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 15px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="43" valign="top">
                    <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold;">3</div>
                  </td>
                  <td valign="top">
                    <strong style="color: #0369a1;">Suivez en temps réel</strong>
                    <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Depuis votre espace, voyez où en est votre chauffeur</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="43" valign="top">
                    <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; font-weight: bold;">4</div>
                  </td>
                  <td valign="top">
                    <strong style="color: #0369a1;">Confirmez après la course</strong>
                    <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Indiquez si tout s'est bien passé et le mode de paiement utilisé</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
          Accéder à mon espace collaborateur →
        </a>
      </div>

      <!-- Tip -->
      <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>💡 Astuce :</strong> Ajoutez SoloCab à vos favoris pour un accès rapide lors de vos déplacements professionnels !
        </p>
      </div>

      <!-- Support -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #475569; font-weight: 600;">💬 Une question ?</p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          Contactez l'administrateur de votre entreprise ou écrivez-nous à<br>
          <a href="mailto:contact@solocab.fr" style="color: #10b981; font-weight: 600;">contact@solocab.fr</a>
        </p>
      </div>

      <!-- Signature -->
      <p style="margin-top: 30px; color: #374151;">
        Bons trajets sur SoloCab !<br>
        <strong style="color: #10b981;">L'équipe SoloCab</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a2e; padding: 25px 30px; text-align: center;">
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.6); font-size: 12px;">
        SoloCab - Vos déplacements professionnels simplifiés
      </p>
      <a href="https://solocab.fr" style="color: #6ee7b7; font-size: 14px;">www.solocab.fr</a>
    </div>
  </div>
</body>
</html>
  `;
}