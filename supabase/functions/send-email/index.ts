import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "driver_welcome" | "client_welcome" | "password_reset" | "driver_validation" | "driver_on_hold" | "course_notification" | "devis_notification";
  data?: {
    driverName?: string;
    clientName?: string;
    resetLink?: string;
    validationStatus?: "approved" | "rejected";
    courseName?: string;
    devisAmount?: number;
    [key: string]: any;
  };
}

const getEmailTemplate = (type: string, data: any) => {
  const templates = {
    driver_welcome: {
      subject: "Bienvenue sur SoloCab - Votre inscription est en cours de validation",
      html: `
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚗 Bienvenue sur SoloCab !</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.driverName || "Chauffeur"}</strong>,</p>
                
                <p>Félicitations ! Votre demande d'inscription en tant que chauffeur sur SoloCab a bien été reçue.</p>
                
                <p>📋 <strong>Prochaines étapes :</strong></p>
                <ul>
                  <li>Votre dossier est actuellement en cours de validation par notre équipe</li>
                  <li>Nous examinerons vos documents dans les plus brefs délais</li>
                  <li>Vous recevrez un email de confirmation dès que votre compte sera validé</li>
                </ul>
                
                <p>Une fois votre compte validé, vous pourrez :</p>
                <ul>
                  <li>✅ Accéder à votre tableau de bord chauffeur</li>
                  <li>✅ Recevoir des demandes de courses</li>
                  <li>✅ Gérer vos clients et factures</li>
                  <li>✅ Configurer votre profil public</li>
                </ul>
                
                <p>Merci de votre confiance !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    client_welcome: {
      subject: "Bienvenue sur SoloCab !",
      html: `
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Bienvenue sur SoloCab !</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.clientName || "Client"}</strong>,</p>
                
                <p>Nous sommes ravis de vous accueillir sur SoloCab !</p>
                
                <p>Votre compte a été créé avec succès. Vous pouvez maintenant profiter de tous nos services :</p>
                
                <ul>
                  <li>🚗 Réserver des courses avec votre chauffeur</li>
                  <li>📋 Consulter vos devis et factures</li>
                  <li>💬 Communiquer directement avec votre chauffeur</li>
                  <li>📊 Suivre l'historique de vos courses</li>
                </ul>
                
                <p>Pour toute question, n'hésitez pas à contacter votre chauffeur via la messagerie intégrée.</p>
                
                <p>Bonne route avec SoloCab !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    password_reset: {
      subject: "Réinitialisation de votre mot de passe SoloCab",
      html: `
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
              .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Réinitialisation de mot de passe</h1>
              </div>
              <div class="content">
                <p>Bonjour,</p>
                
                <p>Vous avez demandé la réinitialisation de votre mot de passe SoloCab.</p>
                
                <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
                
                <div style="text-align: center;">
                  <a href="${data.resetLink}" class="button">Réinitialiser mon mot de passe</a>
                </div>
                
                <div class="warning">
                  <p><strong>⚠️ Important :</strong></p>
                  <ul>
                    <li>Ce lien est valable pendant 1 heure</li>
                    <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                    <li>Ne partagez jamais ce lien avec qui que ce soit</li>
                  </ul>
                </div>
                
                <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; color: #667eea;">${data.resetLink}</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    driver_validation: {
      subject: data.validationStatus === "approved" 
        ? "✅ Votre compte SoloCab a été validé !" 
        : "❌ Votre demande d'inscription SoloCab",
      html: data.validationStatus === "approved" ? `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Félicitations ${data.driverName} !</h1>
              </div>
              <div class="content">
                <p>Excellente nouvelle !</p>
                
                <p>Votre compte chauffeur SoloCab a été <strong>validé avec succès</strong> ! ✅</p>
                
                <p>Vous pouvez dès maintenant :</p>
                <ul>
                  <li>🚗 Accéder à votre tableau de bord chauffeur</li>
                  <li>📱 Télécharger votre QR code pour vos clients exclusifs</li>
                  <li>🌐 Activer votre profil public pour recevoir des clients libres</li>
                  <li>📋 Créer des courses et générer des devis</li>
                  <li>💰 Gérer vos factures et paiements</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="${data.dashboardLink || "https://solocab.fr/driver-dashboard"}" class="button">Accéder à mon espace</a>
                </div>
                
                <p>Bienvenue dans la communauté SoloCab !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
              </div>
            </div>
          </body>
        </html>
      ` : `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Mise à jour de votre demande</h1>
              </div>
              <div class="content">
                <p>Bonjour ${data.driverName},</p>
                
                <p>Nous avons examiné votre demande d'inscription sur SoloCab.</p>
                
                <p>Malheureusement, nous ne pouvons pas valider votre compte pour le moment.</p>
                
                <p><strong>Raison :</strong> ${data.rejectionReason || "Documents incomplets ou non conformes"}</p>
                
                <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez compléter votre dossier, n'hésitez pas à nous contacter.</p>
                
                <p>Cordialement,<br>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },

    driver_on_hold: {
      subject: "⏳ Informations complémentaires requises - SoloCab",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              .info-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏳ Dossier en attente</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.driverName || "Chauffeur"}</strong>,</p>
                
                <p>Nous avons examiné votre demande d'inscription sur SoloCab.</p>
                
                <div class="info-box">
                  <p><strong>📋 Statut de votre dossier :</strong></p>
                  <p>Votre dossier nécessite des <strong>informations complémentaires</strong> avant validation.</p>
                </div>
                
                <p><strong>Prochaines étapes :</strong></p>
                <ul>
                  <li>Notre équipe vous contactera dans les <strong>24 à 48 heures</strong></li>
                  <li>Nous vous indiquerons les documents ou informations manquants</li>
                  <li>Une fois complété, votre dossier sera traité rapidement</li>
                </ul>
                
                <p>En attendant, votre compte reste en attente de validation. Vous recevrez un nouvel email dès que nous aurons toutes les informations nécessaires.</p>
                
                <p>Merci de votre patience et de votre compréhension !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  };

  return templates[type as keyof typeof templates] || templates.driver_welcome;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, data = {} }: EmailRequest = await req.json();

    console.log(`📧 Envoi d'email de type: ${type} à ${to}`);

    if (!to || !type) {
      throw new Error("Paramètres manquants: 'to' et 'type' sont requis");
    }

    const template = getEmailTemplate(type, data);

    const emailResponse = await resend.emails.send({
      from: "SoloCab <onboarding@resend.dev>",
      to: [to],
      subject: template.subject,
      html: template.html,
    });

    console.log("✅ Email envoyé avec succès:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
