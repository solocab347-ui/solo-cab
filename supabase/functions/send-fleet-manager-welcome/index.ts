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
    console.log("[FLEET-MANAGER-WELCOME] Function started");

    const { fleet_manager_id } = await req.json();
    if (!fleet_manager_id) {
      throw new Error("fleet_manager_id is required");
    }

    // Fetch fleet manager info
    const { data: fleetManager, error: fmError } = await supabaseClient
      .from("fleet_managers")
      .select("*")
      .eq("id", fleet_manager_id)
      .single();

    if (fmError) throw fmError;
    if (!fleetManager) throw new Error("Fleet manager not found");

    console.log("[FLEET-MANAGER-WELCOME] Fleet manager found:", fleetManager.contact_email);

    const deadlineDate = fleetManager.documents_deadline 
      ? new Date(fleetManager.documents_deadline).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "7 jours après l'inscription";

    const subject = "🚗 Bienvenue sur SoloCab - Votre compte gestionnaire de flotte est créé !";
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; margin-bottom: 10px;">🚗 Bienvenue sur SoloCab</h1>
          <p style="color: #666; font-size: 14px;">Votre compte gestionnaire de flotte est créé</p>
        </div>

        <h2 style="color: #1a1a2e;">Bonjour ${fleetManager.contact_name},</h2>
        
        <p>Nous sommes ravis de vous accueillir sur SoloCab ! Votre compte gestionnaire de flotte <strong>${fleetManager.company_name}</strong> a été créé avec succès.</p>

        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <h3 style="margin: 0 0 10px 0; font-size: 18px;">🎉 Félicitations !</h3>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Votre compte est créé. Finalisez votre inscription en soumettant vos documents.</p>
        </div>

        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Action requise sous 7 jours</h4>
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            Pour activer pleinement votre compte, vous devez soumettre vos documents professionnels avant le <strong>${deadlineDate}</strong>.
          </p>
        </div>

        <h3 style="color: #1a1a2e;">📋 Documents requis :</h3>
        <ul style="padding-left: 20px; background: #f8fafc; padding: 20px 20px 20px 40px; border-radius: 8px;">
          <li style="margin-bottom: 10px;"><strong>Extrait Kbis</strong> - Moins de 3 mois</li>
          <li style="margin-bottom: 10px;"><strong>Attestation de capacité de transport</strong> - Transport de personnes</li>
          <li style="margin-bottom: 10px;"><strong>Attestation d'assurance</strong> - Responsabilité civile professionnelle</li>
        </ul>

        <h3 style="color: #1a1a2e;">🚀 Ce que vous pourrez faire une fois validé :</h3>
        <ul style="padding-left: 20px;">
          <li style="margin-bottom: 10px;"><strong>Gérer vos chauffeurs</strong> - Ajoutez et suivez votre flotte</li>
          <li style="margin-bottom: 10px;"><strong>Suivre les courses</strong> - Tableau de bord en temps réel</li>
          <li style="margin-bottom: 10px;"><strong>Gérer les commissions</strong> - Suivi financier détaillé</li>
          <li style="margin-bottom: 10px;"><strong>Profil public</strong> - Visibilité pour vos clients</li>
        </ul>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 25px 0;">
          <h4 style="margin: 0 0 15px 0; color: #1a1a2e;">📋 Récapitulatif de votre compte</h4>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #666;">Entreprise :</td>
              <td style="padding: 5px 0; font-weight: bold;">${fleetManager.company_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">SIRET :</td>
              <td style="padding: 5px 0;">${fleetManager.siret || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Contact :</td>
              <td style="padding: 5px 0;">${fleetManager.contact_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Email :</td>
              <td style="padding: 5px 0;">${fleetManager.contact_email}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666;">Abonnement :</td>
              <td style="padding: 5px 0;">69,99€/mois (10 chauffeurs inclus)</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://solocab.fr/fleet-manager?tab=documents" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            📁 Soumettre mes documents →
          </a>
        </div>

        <h3 style="color: #1a1a2e;">📞 Besoin d'aide ?</h3>
        <p>Notre équipe est à votre disposition pour répondre à toutes vos questions concernant votre inscription.</p>
        
        <p style="margin-top: 30px;">À très bientôt sur SoloCab !<br><strong>L'équipe SoloCab</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          SoloCab - Plateforme de gestion VTC<br>
          <a href="https://solocab.fr" style="color: #3b82f6;">www.solocab.fr</a>
        </p>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [fleetManager.contact_email],
      subject: subject,
      html: html,
    });

    console.log("✅ [FLEET-MANAGER-WELCOME] Email envoyé avec succès:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: (emailResponse as any)?.id || 'sent'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌ [FLEET-MANAGER-WELCOME] ERREUR:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Erreur lors de l'envoi de l'email de bienvenue gestionnaire"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
