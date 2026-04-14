import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to?: string;
  driver_id?: string; // Auto-lookup driver email/name from DB
  type: "driver_welcome" | "client_welcome" | "password_reset" | "driver_validation" | "driver_on_hold" | "course_notification" | "devis_notification" | "driver_free_access" | "account_deletion_notice" | "driver_registration" | "driver_welcome_new" | "custom";
  data?: {
    driverName?: string;
    clientName?: string;
    resetLink?: string;
    validationStatus?: "approved" | "rejected";
    courseName?: string;
    devisAmount?: number;
    freeAccessDuration?: string;
    freeAccessStartDate?: string;
    freeAccessEndDate?: string;
    action?: string;
    document_type?: string;
    rejection_reason?: string;
    [key: string]: any;
  };
}

// Helper to lookup driver email and name from DB
async function resolveDriverEmail(driverId: string): Promise<{ email: string; fullName: string }> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  
  const { data: driver, error } = await supabaseAdmin
    .from("drivers")
    .select("profiles:user_id(email, full_name)")
    .eq("id", driverId)
    .single();
  
  if (error || !driver?.profiles) {
    throw new Error(`Driver not found: ${driverId}`);
  }
  
  return {
    email: (driver.profiles as any).email,
    fullName: (driver.profiles as any).full_name || "Chauffeur"
  };
}

const getEmailTemplate = (type: string, data: any) => {
  const templates = {
    driver_welcome: {
      subject: "Votre inscription est en cours de validation — SoloCab",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8B5E3C 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              .info-box { background: #FFF8F0; border-left: 4px solid #8B5E3C; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 Inscription en cours de validation</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.driverName || "Chauffeur"}</strong>,</p>
                
                <p>Votre dossier d'inscription a bien été finalisé. Notre équipe est en train de vérifier vos documents.</p>
                
                <div class="info-box">
                  <p><strong>⏳ Délai de traitement :</strong> 24 à 48 heures</p>
                  <p>Vous recevrez un email de confirmation dès que votre espace chauffeur sera activé.</p>
                </div>
                
                <p>Merci de votre patience et bienvenue dans la communauté SoloCab !</p>
                
                <p>L'équipe SoloCab</p>
              </div>
              <div class="footer">
                <p>SoloCab · www.solocab.fr</p>
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
              .info-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
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
                
                <div class="info-box">
                  <p><strong>📋 Comment réserver une course ?</strong></p>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Créez une demande de course depuis votre espace</li>
                    <li>Un devis sera automatiquement généré</li>
                    <li><strong>Acceptez le devis</strong> pour confirmer votre réservation</li>
                    <li>Votre chauffeur pourra alors valider la course</li>
                  </ol>
                </div>
                
                <div class="warning-box">
                  <p><strong>⚠️ Important :</strong></p>
                  <p>Lorsque vous faites une demande de course, <strong>pensez à accepter le devis</strong> dans votre espace client. Sans cette confirmation, le chauffeur ne peut pas valider votre course.</p>
                </div>
                
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
              .button { display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; margin: 15px 5px; font-weight: bold; font-size: 16px; }
              .button-app { display: inline-block; background: #3b82f6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; margin: 15px 5px; font-weight: bold; font-size: 16px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              .app-box { background: #eff6ff; border: 2px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 10px; text-align: center; }
              .app-box h3 { color: #1d4ed8; margin-top: 0; }
              .info-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
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

                <div class="app-box">
                  <h3>📲 Installez l'application SoloCab !</h3>
                  <p>Pour avoir SoloCab toujours à portée de main, <strong>installez l'application directement depuis notre site web</strong> sur votre téléphone :</p>
                  <ol style="text-align: left; margin: 15px auto; max-width: 400px;">
                    <li>Ouvrez <strong>solocab.fr</strong> dans votre navigateur (Chrome recommandé)</li>
                    <li>Connectez-vous à votre compte</li>
                    <li>Cliquez sur <strong>"Installer"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong></li>
                    <li>L'application sera disponible comme une app native ! 🎉</li>
                  </ol>
                  <a href="https://solocab.fr" class="button-app">📲 Installer l'application</a>
                </div>
                
                <div style="text-align: center;">
                  <a href="${data.dashboardLink || "https://solocab.fr/driver-dashboard"}" class="button">Accéder à mon espace</a>
                </div>

                <div class="info-box">
                  <p><strong>💡 Astuce :</strong> Installez l'application dès maintenant pour ne rien manquer ! Vous recevrez les notifications de courses et pourrez gérer votre activité en temps réel.</p>
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

    driver_free_access: {
      subject: "🎁 Accès gratuit accordé sur SoloCab !",
      html: `
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
              .highlight-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .info-list { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎁 Bonne nouvelle ${data.driverName} !</h1>
              </div>
              <div class="content">
                <p>Nous avons le plaisir de vous informer que vous bénéficiez d'un <strong>accès gratuit</strong> à SoloCab !</p>
                
                <div class="highlight-box">
                  <p><strong>🎯 Détails de votre accès gratuit :</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Durée :</strong> ${data.freeAccessDuration}</li>
                    ${data.freeAccessStartDate ? `<li><strong>Date de début :</strong> ${data.freeAccessStartDate}</li>` : ''}
                    ${data.freeAccessEndDate ? `<li><strong>Date de fin :</strong> ${data.freeAccessEndDate}</li>` : '<li><strong>Durée :</strong> Illimitée</li>'}
                  </ul>
                </div>
                
                <div class="info-list">
                  <p><strong>✨ Pendant cette période, vous profitez de :</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Accès complet à toutes les fonctionnalités de SoloCab</li>
                    <li>Gestion illimitée de vos clients et courses</li>
                    <li>Génération automatique de devis et factures</li>
                    <li>Profil public pour attirer de nouveaux clients</li>
                    <li>Système de messagerie intégré</li>
                    <li>Aucun frais d'abonnement pendant la période</li>
                  </ul>
                </div>
                
                <p><strong>💡 Important :</strong></p>
                <ul>
                  ${data.freeAccessEndDate ? `<li>Votre accès gratuit prendra fin automatiquement le <strong>${data.freeAccessEndDate}</strong></li>` : ''}
                  ${data.freeAccessEndDate ? '<li>Vous serez informé avant la fin de la période gratuite</li>' : '<li>Vous bénéficiez d\'un accès gratuit illimité</li>'}
                  <li>Votre abonnement Stripe est automatiquement suspendu pendant cette période</li>
                  <li>Vous pouvez continuer à utiliser toutes les fonctionnalités normalement</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/driver-dashboard" class="button">Accéder à mon tableau de bord</a>
                </div>
                
                <p>Profitez pleinement de cette période pour développer votre activité !</p>
                
                <p>Cordialement,<br><strong>L'équipe SoloCab</strong></p>
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

    account_deletion_notice: {
      subject: data.isImmediate 
        ? "⚠️ Votre compte SoloCab a été supprimé" 
        : "⚠️ Suppression programmée de votre compte SoloCab",
      html: data.isImmediate ? `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .info-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Compte supprimé</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.driverName || "Utilisateur"}</strong>,</p>
                
                <p>Nous vous informons que votre compte SoloCab a été <strong>supprimé</strong> par un administrateur.</p>
                
                <div class="reason-box">
                  <p><strong>📋 Motif de la suppression :</strong></p>
                  <p>${data.reason || "Non spécifié"}</p>
                </div>
                
                <div class="info-box">
                  <p><strong>📌 Informations importantes :</strong></p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Toutes vos données personnelles ont été supprimées conformément au RGPD</li>
                    <li>Si vous aviez un abonnement actif, il a été annulé automatiquement</li>
                    <li>Vous pouvez vous réinscrire à tout moment avec la même adresse email</li>
                  </ul>
                </div>
                
                <p>Si vous pensez qu'il s'agit d'une erreur ou si vous avez des questions, veuillez nous contacter à <a href="mailto:support@solocab.fr">support@solocab.fr</a>.</p>
                
                <p>Cordialement,<br><strong>L'équipe SoloCab</strong></p>
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
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
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              .reason-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .action-box { background: #e0f2fe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏳ Suppression de compte programmée</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${data.driverName || "Utilisateur"}</strong>,</p>
                
                <p>Nous vous informons que votre compte SoloCab sera <strong>supprimé ${data.deletionType}</strong>, soit le <strong>${data.deletionDate}</strong>.</p>
                
                <div class="reason-box">
                  <p><strong>📋 Motif de la suppression :</strong></p>
                  <p>${data.reason || "Non spécifié"}</p>
                </div>
                
                <div class="warning-box">
                  <p><strong>⚠️ IMPORTANT - Sauvegardez vos données !</strong></p>
                  <p>Conformément au RGPD, vous avez le droit de récupérer vos données avant la suppression de votre compte :</p>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Vos clients :</strong> Exportez la liste de vos clients fidèles</li>
                    <li><strong>Vos courses :</strong> Téléchargez l'historique de vos courses</li>
                    <li><strong>Vos factures :</strong> Conservez une copie de toutes vos factures</li>
                    <li><strong>Vos devis :</strong> Sauvegardez vos devis en attente</li>
                  </ul>
                </div>
                
                <div class="action-box">
                  <p><strong>📥 Comment récupérer vos données ?</strong></p>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Connectez-vous à votre espace chauffeur</li>
                    <li>Allez dans <strong>Paramètres > Export des données</strong></li>
                    <li>Cliquez sur <strong>"Télécharger mes données"</strong></li>
                    <li>Vous recevrez un fichier contenant toutes vos informations</li>
                  </ol>
                  <p style="text-align: center; margin-top: 15px;">
                    <a href="https://solocab.fr/driver-dashboard" class="button">Accéder à mon espace</a>
                  </p>
                </div>
                
                <p><strong>📌 Ce qui va se passer :</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Votre abonnement sera annulé à la fin de la période en cours</li>
                  <li>Le ${data.deletionDate}, toutes vos données seront définitivement supprimées</li>
                  <li>Vous pourrez vous réinscrire ultérieurement avec la même adresse email</li>
                </ul>
                
                <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez contester cette décision, veuillez nous contacter immédiatement à <a href="mailto:support@solocab.fr">support@solocab.fr</a>.</p>
                
                <p>Cordialement,<br><strong>L'équipe SoloCab</strong></p>
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

    driver_registration: {
      subject: "Dossier d'inscription reçu — SoloCab",
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5E3C 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .info-box { background: #FFF8F0; border-left: 4px solid #8B5E3C; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style></head><body>
          <div class="container">
            <div class="header"><h1>📋 Dossier reçu</h1></div>
            <div class="content">
              <p>Bonjour <strong>${data.driverName || "Chauffeur"}</strong>,</p>
              <p>Nous avons bien reçu votre dossier d'inscription complet.</p>
              
              <div class="success-box">
                <p><strong>✅ Éléments reçus :</strong></p>
                <ul>
                  <li>Informations personnelles et véhicule</li>
                  <li>Configuration tarifaire</li>
                  <li>Compte Stripe connecté</li>
                  <li>Documents professionnels</li>
                </ul>
              </div>
              
              <div class="info-box">
                <p><strong>⏳ Et maintenant ?</strong></p>
                <p>Notre équipe va examiner votre dossier sous <strong>24 à 48 heures</strong>.</p>
                <p>Vous recevrez un email dès que votre espace chauffeur sera activé.</p>
              </div>
              
              <p>Merci de votre confiance !<br>L'équipe SoloCab</p>
            </div>
            <div class="footer"><p>SoloCab · www.solocab.fr</p></div>
          </div>
        </body></html>
      `,
    },

    driver_welcome_new: {
      subject: "Bienvenue sur SoloCab — Continuez votre inscription",
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5E3C 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #8B5E3C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          .info-box { background: #FFF8F0; border-left: 4px solid #8B5E3C; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .step { display: flex; align-items: flex-start; margin: 10px 0; }
          .step-num { background: #8B5E3C; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold; flex-shrink: 0; }
        </style></head><body>
          <div class="container">
            <div class="header">
              <h1>Bienvenue sur SoloCab !</h1>
              <p>${data.driverName || "Chauffeur"}, votre compte a été créé.</p>
            </div>
            <div class="content">
              <p>Votre adresse email a bien été confirmée et votre compte chauffeur est créé.</p>
              
              <div class="info-box">
                <p><strong>📋 Pour finaliser votre inscription, il vous reste à :</strong></p>
                <div class="step"><span class="step-num">1</span><span>Compléter vos informations personnelles et véhicule</span></div>
                <div class="step"><span class="step-num">2</span><span>Configurer vos tarifs</span></div>
                <div class="step"><span class="step-num">3</span><span>Connecter votre compte Stripe pour recevoir vos paiements</span></div>
                <div class="step"><span class="step-num">4</span><span>Envoyer vos documents professionnels (carte VTC, assurance, etc.)</span></div>
              </div>
              
              <p>Une fois votre dossier complet, notre équipe le vérifiera sous <strong>24 à 48h</strong>. Vous recevrez un email de confirmation dès que votre espace sera activé.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://solocab.fr/driver-welcome" class="button">Continuer mon inscription</a>
              </div>
              <p>L'équipe SoloCab</p>
            </div>
            <div class="footer"><p>SoloCab · www.solocab.fr</p></div>
          </div>
        </body></html>
      `,
    },

    custom: {
      subject: data.subject || "Message de SoloCab",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${data.headerTitle || 'SoloCab'}</h1>
              </div>
              <div class="content">
                ${data.htmlBody || '<p>Message de SoloCab</p>'}
              </div>
              <div class="footer">
                <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
                <p>contact@solocab.fr</p>
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

  // Variables pour logging dans le catch (déclarées en dehors du try)
  let emailTo = "inconnu";
  let emailType = "inconnu";

  try {
    // ⚠️ SÉCURITÉ: Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    const internalSecret = req.headers.get('X-Internal-Secret');
    
    // Lire le body pour déterminer le type d'email
    const body = await req.json();
    const emailTypeFromBody = body?.type;
    
    // Types autorisés sans authentification (post-inscription, pas de session valide)
    const publicEmailTypes = ['driver_welcome_new', 'driver_registration'];
    const isPublicType = publicEmailTypes.includes(emailTypeFromBody);
    
    if (isPublicType) {
      // Pour les emails post-inscription, vérifier qu'un driver_id est fourni
      if (!body?.driver_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bad request: driver_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Pas besoin de JWT, continuer
    } else if (!authHeader && !internalSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (internalSecret) {
      const expectedSecret = Deno.env.get('LOVABLE_API_KEY');
      if (internalSecret !== expectedSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Invalid internal secret' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (authHeader) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { to, driver_id, type, data = {} }: EmailRequest = body;
    
    // Resolve recipient email: either provided directly or looked up from driver_id
    let resolvedTo = to;
    let enrichedData = { ...data };
    
    if (driver_id && !resolvedTo) {
      console.log(`🔍 [SEND-EMAIL] Looking up driver ${driver_id}...`);
      const driverInfo = await resolveDriverEmail(driver_id);
      resolvedTo = driverInfo.email;
      enrichedData.driverName = enrichedData.driverName || driverInfo.fullName;
      console.log(`✅ [SEND-EMAIL] Resolved to: ${resolvedTo}`);
    }
    
    // Capturer pour le catch
    emailTo = resolvedTo || "inconnu";
    emailType = type;

    console.log(`📧 [SEND-EMAIL] Envoi email ${type} à:`, resolvedTo);

    if (!resolvedTo || !type) {
      throw new Error("Paramètres manquants: 'to' ou 'driver_id' + 'type' sont requis");
    }

    const template = getEmailTemplate(type, enrichedData);

    console.log('📄 [SEND-EMAIL] Template généré - Sujet:', template.subject);


    // Use retry mechanism for reliability
    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [resolvedTo],
        subject: template.subject,
        html: template.html,
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌❌❌ [SEND-EMAIL] ÉCHEC DÉFINITIF après retry:", emailResult.error);
      
      await sendAdminAlert(resend, {
        emailType: type,
        recipient: resolvedTo,
        error: emailResult.error || "Erreur inconnue",
        context: driver_id ? `Driver ID: ${driver_id}` : undefined
      });
      
      return new Response(
        JSON.stringify({ success: false, error: emailResult.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅✅✅ [SEND-EMAIL] Email envoyé avec succès - ID:", emailResult.emailId);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.emailId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("❌❌❌ [SEND-EMAIL] ERREUR CRITIQUE COMPLÈTE:", {
      message: error.message,
      stack: error.stack,
      type: emailType,
      to: emailTo,
      resendConfigured: Deno.env.get("RESEND_API_KEY") ? "OUI" : "NON"
    });

    // Tenter d'envoyer un email d'alerte à l'admin
    try {
      await resend.emails.send({
        from: "SoloCab Error <noreply@solocab.fr>",
        to: ["alexandrediarra00@gmail.com"],
        subject: `[ERREUR SOLOCAB] Échec envoi email ${emailType}`,
        html: `
          <h2>⚠️ Erreur d'envoi d'email détectée</h2>
          <p><strong>Type d'email:</strong> ${emailType}</p>
          <p><strong>Destinataire:</strong> ${emailTo}</p>
          <p><strong>Erreur:</strong> ${error.message}</p>
          <pre>${error.stack}</pre>
          <hr>
          <p><small>Email automatique du système SoloCab</small></p>
        `,
      });
      console.log("✅ [SEND-EMAIL] Email d'alerte envoyé à l'admin");
    } catch (alertError: any) {
      console.error("❌ [SEND-EMAIL] Impossible d'envoyer l'alerte admin:", alertError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Vérifier les logs Supabase pour plus de détails"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
