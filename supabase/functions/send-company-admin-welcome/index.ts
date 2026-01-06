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
    console.log("[COMPANY-ADMIN-WELCOME] Function started");

    const { company_id, admin_user_id, is_test } = await req.json();
    
    // Mode test : envoyer à contact@solocab.fr
    if (is_test) {
      console.log("[COMPANY-ADMIN-WELCOME] Mode test activé");
      
      const testHtml = generateAdminWelcomeEmail({
        adminName: "Jean Dupont",
        companyName: "Entreprise Test SARL",
        isOwner: true,
        loginUrl: "https://solocab.fr/login"
      });

      const emailResult = await sendEmailWithRetry(
        resend,
        {
          from: "SoloCab <noreply@solocab.fr>",
          to: ["contact@solocab.fr"],
          subject: "[TEST] 🎉 Bienvenue sur SoloCab - Votre guide complet Administrateur Entreprise",
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

    // Fetch admin info
    let adminEmail = company.contact_email;
    let adminName = company.contact_name;
    let isOwner = true;

    if (admin_user_id && admin_user_id !== company.user_id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", admin_user_id)
        .single();
      
      if (profile) {
        adminEmail = profile.email;
        adminName = profile.full_name || "Administrateur";
        isOwner = false;
      }
    }

    console.log("[COMPANY-ADMIN-WELCOME] Sending to:", adminEmail);

    const html = generateAdminWelcomeEmail({
      adminName,
      companyName: company.company_name,
      isOwner,
      loginUrl: "https://solocab.fr/login"
    });

    const subject = isOwner 
      ? `🎉 Bienvenue sur SoloCab - Votre espace entreprise ${company.company_name} est prêt !`
      : `🎉 Bienvenue sur SoloCab - Vous êtes administrateur de ${company.company_name}`;

    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [adminEmail],
        subject: subject,
        html: html,
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌ [COMPANY-ADMIN-WELCOME] Échec envoi email");
      await sendAdminAlert(resend, {
        emailType: "company_admin_welcome",
        recipient: adminEmail,
        error: emailResult.error || "Erreur inconnue",
        context: `Company: ${company.company_name}, Admin: ${adminName}`
      });
      throw new Error(`Échec envoi email: ${emailResult.error}`);
    }

    console.log("✅ [COMPANY-ADMIN-WELCOME] Email envoyé:", emailResult.emailId);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.emailId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌ [COMPANY-ADMIN-WELCOME] ERREUR:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateAdminWelcomeEmail({ adminName, companyName, isOwner, loginUrl }: {
  adminName: string;
  companyName: string;
  isOwner: boolean;
  loginUrl: string;
}): string {
  const roleTitle = isOwner ? "Administrateur Principal" : "Administrateur";
  
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
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">🎉 Bienvenue sur SoloCab !</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${roleTitle} - ${companyName}</p>
    </div>

    <div style="padding: 40px 30px;">
      
      <!-- Greeting -->
      <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">Bonjour ${adminName},</h2>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        ${isOwner 
          ? `Félicitations ! Votre espace entreprise <strong>${companyName}</strong> est maintenant actif sur SoloCab. Vous avez fait le bon choix en nous rejoignant !`
          : `Vous avez été nommé administrateur de l'entreprise <strong>${companyName}</strong> sur SoloCab. Bienvenue dans l'équipe !`
        }
      </p>

      <!-- Why SoloCab -->
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #10b981;">
        <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">✨ Pourquoi SoloCab va vous simplifier la vie ?</h3>
        <ul style="margin: 0; padding-left: 20px; color: #047857;">
          <li style="margin-bottom: 8px;"><strong>Fini les appels interminables</strong> - Réservez vos courses en quelques clics</li>
          <li style="margin-bottom: 8px;"><strong>Transparence totale</strong> - Devis instantanés, prix fixés à l'avance</li>
          <li style="margin-bottom: 8px;"><strong>Suivi en temps réel</strong> - Suivez chaque course de vos collaborateurs</li>
          <li style="margin-bottom: 8px;"><strong>Facturation simplifiée</strong> - Toutes vos factures au même endroit</li>
          <li style="margin-bottom: 0;"><strong>100% gratuit</strong> - Aucun abonnement, vous payez uniquement vos courses</li>
        </ul>
      </div>

      <!-- Features for Admin -->
      <h3 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 18px;">🚀 Ce que vous pouvez faire en tant qu'${roleTitle.toLowerCase()} :</h3>
      
      <div style="display: grid; gap: 15px; margin-bottom: 30px;">
        <!-- Feature 1 -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #6366f1; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">👥</div>
            <div>
              <strong style="color: #1a1a2e;">Gérer vos collaborateurs</strong>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Invitez vos employés et définissez leurs permissions (créer des courses, voir les factures...)</p>
            </div>
          </div>
        </div>

        <!-- Feature 2 -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🚗</div>
            <div>
              <strong style="color: #1a1a2e;">Commander des courses</strong>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Réservez pour vous ou pour un collaborateur (enregistré ou invité ponctuel)</p>
            </div>
          </div>
        </div>

        <!-- Feature 3 -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #f59e0b; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🤝</div>
            <div>
              <strong style="color: #1a1a2e;">Créer des partenariats avec des chauffeurs</strong>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Négociez des tarifs préférentiels et des conditions de paiement flexibles</p>
            </div>
          </div>
        </div>

        <!-- Feature 4 -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #8b5cf6; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📊</div>
            <div>
              <strong style="color: #1a1a2e;">Suivre toutes les courses</strong>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Tableau de bord complet avec statut en temps réel de chaque déplacement</p>
            </div>
          </div>
        </div>

        <!-- Feature 5 -->
        <div style="background: #f8fafc; border-radius: 10px; padding: 18px; border: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #ec4899; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📄</div>
            <div>
              <strong style="color: #1a1a2e;">Gérer la facturation</strong>
              <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Accédez à toutes les factures, validez les paiements, exportez pour votre comptabilité</p>
            </div>
          </div>
        </div>

        ${isOwner ? `
        <!-- Feature 6 - Owner only -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 18px; border: 1px solid #fbbf24;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: #d97706; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;">👑</div>
            <div>
              <strong style="color: #92400e;">Ajouter d'autres administrateurs</strong>
              <p style="margin: 5px 0 0 0; color: #a16207; font-size: 14px;">En tant que propriétaire, déléguez la gestion à d'autres personnes de confiance</p>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- How it works -->
      <div style="background: #f0f9ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #bae6fd;">
        <h3 style="color: #0369a1; margin: 0 0 20px 0; font-size: 18px;">📱 Comment ça fonctionne ?</h3>
        
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; gap: 15px; align-items: flex-start;">
            <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; flex-shrink: 0;">1</div>
            <div>
              <strong style="color: #0369a1;">Connectez-vous</strong>
              <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Accédez à votre espace entreprise sur solocab.fr</p>
            </div>
          </div>
          
          <div style="display: flex; gap: 15px; align-items: flex-start;">
            <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; flex-shrink: 0;">2</div>
            <div>
              <strong style="color: #0369a1;">Créez une demande de course</strong>
              <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Indiquez le départ, la destination, la date et le collaborateur concerné</p>
            </div>
          </div>
          
          <div style="display: flex; gap: 15px; align-items: flex-start;">
            <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; flex-shrink: 0;">3</div>
            <div>
              <strong style="color: #0369a1;">Recevez des devis instantanés</strong>
              <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Nos chauffeurs partenaires vous proposent leurs tarifs</p>
            </div>
          </div>
          
          <div style="display: flex; gap: 15px; align-items: flex-start;">
            <div style="background: #0ea5e9; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; flex-shrink: 0;">4</div>
            <div>
              <strong style="color: #0369a1;">Choisissez et c'est réservé !</strong>
              <p style="margin: 5px 0 0 0; color: #0284c7; font-size: 14px;">Le collaborateur reçoit un lien de suivi, vous suivez tout depuis votre tableau de bord</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(99,102,241,0.4);">
          Accéder à mon espace entreprise →
        </a>
      </div>

      <!-- Support -->
      <div style="background: #faf5ff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e9d5ff;">
        <p style="margin: 0 0 10px 0; color: #7c3aed; font-weight: 600;">💬 Une question ? Besoin d'aide ?</p>
        <p style="margin: 0; color: #8b5cf6; font-size: 14px;">
          Notre équipe est là pour vous accompagner<br>
          <a href="mailto:contact@solocab.fr" style="color: #6366f1; font-weight: 600;">contact@solocab.fr</a>
        </p>
      </div>

      <!-- Signature -->
      <p style="margin-top: 30px; color: #374151;">
        À très bientôt sur SoloCab !<br>
        <strong style="color: #6366f1;">L'équipe SoloCab</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a2e; padding: 25px 30px; text-align: center;">
      <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.6); font-size: 12px;">
        SoloCab - La plateforme qui connecte entreprises et chauffeurs VTC
      </p>
      <a href="https://solocab.fr" style="color: #a5b4fc; font-size: 14px;">www.solocab.fr</a>
    </div>
  </div>
</body>
</html>
  `;
}
