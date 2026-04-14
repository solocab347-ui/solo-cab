import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getEmailTemplate = (emailNumber: number, data: { firstName: string; blockedStep: string }) => {
  const firstName = data.firstName || "Chauffeur";
  const stepMessages: Record<string, string> = {
    settings: "configurer vos paramètres de base (tarifs, zone d'activité)",
    profile: "compléter votre profil professionnel",
    documents: "soumettre vos documents obligatoires",
    payment: "finaliser votre abonnement",
  };
  
  const stepAction = stepMessages[data.blockedStep] || "finaliser votre inscription";
  
  const templates = [
    // Day 1 - Warm welcome back
    {
      subject: `${firstName}, votre compte SoloCab vous attend ! 🚗`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .highlight { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">👋 Bonjour ${firstName} !</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre aventure VTC vous attend</p>
              </div>
              <div class="content">
                <p>Nous avons remarqué que vous avez commencé votre inscription sur SoloCab, mais que vous n'avez pas encore terminé.</p>
                
                <div class="highlight">
                  <p style="margin: 0;"><strong>📍 Prochaine étape :</strong> ${stepAction}</p>
                </div>
                
                <p>Nous savons que la vie est chargée ! Mais votre indépendance et votre liberté de chauffeur VTC sont à portée de main.</p>
                
                <p><strong>Ce que SoloCab vous apporte :</strong></p>
                <ul>
                  <li>✅ Fidélisez vos clients grâce au QR code personnalisé</li>
                  <li>✅ Gérez vos courses, devis et factures facilement</li>
                  <li>✅ Outil 100% adapté aux chauffeurs indépendants</li>
                  <li>✅ Seulement 19,99€/mois après validation</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Reprendre mon inscription →</a>
                </div>
                
                <p style="color: #666;">Si vous avez des questions, répondez simplement à cet email.</p>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
                <p style="font-size: 11px;">Si vous ne souhaitez plus recevoir ces emails, votre campagne se terminera automatiquement dans 7 jours.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 2 - Address potential issues
    {
      subject: `${firstName}, les problèmes techniques sont résolus ! ✅`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .success-box { background: #d1fae5; border: 1px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔧 Bonne nouvelle !</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Tout est prêt pour vous</p>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <div class="success-box">
                  <p style="margin: 0; font-size: 18px;">✅ <strong>Tous les problèmes techniques ont été résolus !</strong></p>
                </div>
                
                <p>Nous avons travaillé dur ces derniers jours pour améliorer la plateforme. Si vous avez rencontré des difficultés lors de votre inscription, sachez que tout fonctionne parfaitement maintenant.</p>
                
                <p><strong>Ce qui a été amélioré :</strong></p>
                <ul>
                  <li>🚀 Processus d'inscription simplifié</li>
                  <li>💳 Paiement sécurisé optimisé</li>
                  <li>📱 Interface mobile améliorée</li>
                  <li>⚡ Performance générale boostée</li>
                </ul>
                
                <p>Votre compte est toujours là, prêt à être finalisé. Vous n'avez qu'à reprendre là où vous vous étiez arrêté.</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Finaliser mon compte →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 3 - Value proposition
    {
      subject: `💰 ${firstName}, combien de clients perdez-vous chaque semaine ?`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .stat-box { background: #fffbeb; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📊 Chiffres clés</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Ce que SoloCab peut changer pour vous</p>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <p>Savez-vous qu'un chauffeur VTC indépendant perd en moyenne <strong>3 à 5 clients potentiels par mois</strong> simplement parce qu'il n'a pas d'outil professionnel de gestion ?</p>
                
                <div class="stat-box">
                  <p style="font-size: 24px; margin: 0; color: #d97706;"><strong>+40%</strong></p>
                  <p style="margin: 5px 0 0 0;">de fidélisation client avec un QR code personnalisé</p>
                </div>
                
                <p><strong>Ce que nos chauffeurs constatent :</strong></p>
                <ul>
                  <li>📈 Plus de réservations régulières</li>
                  <li>⏰ 2h de temps administratif économisé par semaine</li>
                  <li>💳 Paiements facilités et professionnels</li>
                  <li>📱 Clients satisfaits grâce au suivi en temps réel</li>
                </ul>
                
                <p><strong>Et tout ça pour seulement 19,99€/mois</strong> - soit le prix d'une demi-course !</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Je me lance maintenant →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 4 - Social proof
    {
      subject: `🏆 ${firstName}, rejoignez les chauffeurs qui ont fait le pas`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .testimonial { background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 5px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🌟 Témoignages</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Ils ont choisi SoloCab</p>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <p>Voici ce que disent les chauffeurs qui utilisent SoloCab au quotidien :</p>
                
                <div class="testimonial">
                  <p>"Grâce au QR code SoloCab, mes clients me retrouvent facilement. Fini les numéros perdus !"</p>
                  <p style="text-align: right; font-style: normal;"><strong>- Alexandre, Paris</strong></p>
                </div>
                
                <div class="testimonial">
                  <p>"L'application me fait gagner un temps fou sur la facturation. Je me concentre enfin sur mes courses."</p>
                  <p style="text-align: right; font-style: normal;"><strong>- Marie, Lyon</strong></p>
                </div>
                
                <p>Chaque jour qui passe, c'est une opportunité de plus de vous différencier de la concurrence.</p>
                
                <p><strong>Votre compte vous attend. Prêt à faire le premier pas vers plus d'indépendance ?</strong></p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Rejoindre la communauté →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 5 - Urgency
    {
      subject: `⏰ ${firstName}, ne laissez pas passer cette opportunité`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .countdown { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⏰ Le temps passe...</h1>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <div class="countdown">
                  <p style="font-size: 18px; margin: 0;">Cela fait déjà <strong>plusieurs jours</strong> que votre compte vous attend</p>
                </div>
                
                <p>Pendant ce temps, d'autres chauffeurs ont déjà :</p>
                <ul>
                  <li>✅ Configuré leur profil professionnel</li>
                  <li>✅ Reçu leur QR code personnalisé</li>
                  <li>✅ Commencé à fidéliser leurs clients</li>
                  <li>✅ Simplifié leur gestion quotidienne</li>
                </ul>
                
                <p><strong>Qu'est-ce qui vous retient ?</strong></p>
                <ul>
                  <li>❓ Problème technique → <em>Tout est résolu maintenant !</em></li>
                  <li>❓ Manque de temps → <em>5 minutes suffisent pour reprendre</em></li>
                  <li>❓ Hésitation sur le prix → <em>19,99€/mois, sans engagement</em></li>
                </ul>
                
                <p>Si vous avez une question, répondez directement à cet email. Nous sommes là pour vous aider.</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Reprendre maintenant →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 6 - Personal touch
    {
      subject: `${firstName}, pouvons-nous vous aider ? 🤝`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .question-box { background: #eff6ff; border: 1px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🤝 On est là pour vous</h1>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <p>Je suis personnellement curieux de savoir ce qui vous empêche de finaliser votre inscription sur SoloCab.</p>
                
                <div class="question-box">
                  <p style="margin: 0;"><strong>Répondez simplement à cet email</strong> et dites-nous :</p>
                  <ul style="margin: 10px 0 0 0;">
                    <li>Avez-vous rencontré un problème technique ?</li>
                    <li>Y a-t-il quelque chose que vous n'avez pas compris ?</li>
                    <li>Avez-vous besoin d'aide pour une étape spécifique ?</li>
                  </ul>
                </div>
                
                <p>Nous lisons chaque réponse et nous vous répondrons personnellement dans les 24h.</p>
                
                <p>Votre réussite en tant que chauffeur indépendant nous tient vraiment à cœur. SoloCab a été créé par et pour des chauffeurs VTC, nous comprenons vos besoins.</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Essayer à nouveau →</a>
                </div>
                
                <p>À très bientôt,</p>
                <p><strong>L'équipe SoloCab</strong></p>
              </div>
              <div class="footer">
                <p>📧 Répondez directement à cet email pour nous contacter</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    // Day 7 - Last chance
    {
      subject: `📢 Dernier rappel : ${firstName}, votre compte SoloCab`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
              .final-box { background: #f3f4f6; border: 2px dashed #9ca3af; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📢 Dernier message</h1>
              </div>
              <div class="content">
                <p>Bonjour ${firstName},</p>
                
                <p>C'est notre dernier email de relance. Nous ne voulons pas vous importuner davantage.</p>
                
                <div class="final-box">
                  <p style="margin: 0;">Votre compte SoloCab est toujours disponible.<br>Il vous attend, prêt à être activé quand vous le souhaiterez.</p>
                </div>
                
                <p><strong>Récapitulatif de ce que SoloCab vous offre :</strong></p>
                <ul>
                  <li>🚗 Gestion complète de vos courses</li>
                  <li>📱 QR code pour fidéliser vos clients</li>
                  <li>📋 Devis et factures automatiques</li>
                  <li>💰 Seulement 19,99€/mois</li>
                </ul>
                
                <p>Si un jour vous décidez de vous lancer, nous serons là.</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/connexion" class="button">Finaliser mon inscription →</a>
                </div>
                
                <p>Bonne route, avec ou sans SoloCab !</p>
                <p><strong>L'équipe SoloCab</strong></p>
              </div>
              <div class="footer">
                <p>Ceci est notre dernier email. Vous ne recevrez plus de relances après celui-ci.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  ];
  
  // Return template based on email number (1-7), default to first if out of range
  const index = Math.min(Math.max(emailNumber - 1, 0), templates.length - 1);
  return templates[index];
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active campaigns that need an email today
    const { data: campaigns, error: campaignsError } = await supabase
      .from("reengagement_campaigns")
      .select("*")
      .eq("is_active", true)
      .lte("next_email_at", new Date().toISOString())
      .lt("emails_sent", 7);

    if (campaignsError) {
      throw new Error(`Error fetching campaigns: ${campaignsError.message}`);
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to process`);

    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const campaign of campaigns || []) {
      try {
        // Check if user has resumed (completed onboarding)
        const { data: driver } = await supabase
          .from("drivers")
          .select("onboarding_completed, onboarding_step")
          .eq("id", campaign.driver_id)
          .single();

        if (driver?.onboarding_completed) {
          // User completed onboarding, deactivate campaign
          await supabase
            .from("reengagement_campaigns")
            .update({
              is_active: false,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaign.id);

          console.log(`Campaign for ${campaign.email} completed - user finished onboarding`);
          results.push({ email: campaign.email, success: true, error: "Completed onboarding" });
          continue;
        }

        // Get email template based on number of emails sent
        const emailNumber = campaign.emails_sent + 1;
        const firstName = campaign.full_name?.split(" ")[0] || "Chauffeur";
        
        const template = getEmailTemplate(emailNumber, {
          firstName,
          blockedStep: campaign.blocked_step,
        });

        // Send email
        const emailResponse = await resend.emails.send({
          from: "SoloCab <noreply@solocab.fr>",
          to: [campaign.email],
          subject: template.subject,
          html: template.html,
          reply_to: "contact@solocab.fr",
        });

        console.log(`Email ${emailNumber}/7 sent to ${campaign.email}:`, emailResponse);

        // Update campaign
        const nextEmailDate = new Date();
        nextEmailDate.setDate(nextEmailDate.getDate() + 1); // Next email tomorrow

        await supabase
          .from("reengagement_campaigns")
          .update({
            emails_sent: emailNumber,
            last_email_sent_at: new Date().toISOString(),
            next_email_at: emailNumber >= 7 ? null : nextEmailDate.toISOString(),
            is_active: emailNumber < 7,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        results.push({ email: campaign.email, success: true });

      } catch (emailError: any) {
        console.error(`Error sending email to ${campaign.email}:`, emailError);
        results.push({ email: campaign.email, success: false, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-reengagement-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
