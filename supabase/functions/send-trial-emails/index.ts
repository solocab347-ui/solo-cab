import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TRIAL-EMAILS] ${step}${detailsStr}`);
};

// Get driver activity data for personalized emails
const getDriverActivity = async (supabase: any, driverId: string) => {
  const [
    { data: driver },
    { data: courses },
    { data: clients },
    { data: quotes },
    { count: vehicleCount },
  ] = await Promise.all([
    supabase.from('drivers').select('bio, service_description, base_fare, per_km_rate, minimum_price, working_sectors, gallery_photos').eq('id', driverId).single(),
    supabase.from('courses').select('id').eq('driver_id', driverId).limit(10),
    supabase.from('clients').select('id').eq('driver_id', driverId).limit(10),
    supabase.from('devis').select('id').eq('driver_id', driverId).limit(10),
    supabase.from('driver_vehicles').select('id', { count: 'exact', head: true }).eq('driver_id', driverId),
  ]);

  return {
    hasProfile: !!(driver?.bio || driver?.service_description),
    hasPricing: !!(driver?.base_fare || driver?.per_km_rate || driver?.minimum_price),
    hasSectors: driver?.working_sectors?.length > 0,
    hasPhotos: driver?.gallery_photos?.length > 0,
    hasVehicle: (vehicleCount || 0) > 0,
    courseCount: courses?.length || 0,
    clientCount: clients?.length || 0,
    quoteCount: quotes?.length || 0,
  };
};

const getEmailTemplate = (emailType: string, data: { 
  firstName: string; 
  daysLeft: number;
  activity: any;
  trialEndDate: string;
}) => {
  const { firstName, daysLeft, activity, trialEndDate } = data;
  
  // Build activity achievements list
  const achievements: string[] = [];
  if (activity.hasProfile) achievements.push("✅ Profil professionnel configuré");
  if (activity.hasPricing) achievements.push("✅ Tarifs paramétrés");
  if (activity.hasSectors) achievements.push("✅ Zone d'activité définie");
  if (activity.hasVehicle) achievements.push("✅ Véhicule enregistré");
  if (activity.clientCount > 0) achievements.push(`✅ ${activity.clientCount} client(s) enregistré(s)`);
  if (activity.quoteCount > 0) achievements.push(`✅ ${activity.quoteCount} devis créé(s)`);
  if (activity.courseCount > 0) achievements.push(`✅ ${activity.courseCount} course(s) réalisée(s)`);
  
  const achievementsHtml = achievements.length > 0 
    ? `<div class="achievements"><h3>🎯 Ce que vous avez déjà accompli :</h3><ul>${achievements.map(a => `<li>${a}</li>`).join('')}</ul></div>`
    : '';

  const baseStyle = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
    .achievements { background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 15px; margin: 20px 0; }
    .achievements h3 { margin: 0 0 10px 0; color: #15803d; }
    .achievements ul { margin: 0; padding-left: 20px; }
    .warning-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .urgent-box { background: #fee2e2; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .info-box { background: #eff6ff; border: 1px solid #3b82f6; border-radius: 10px; padding: 15px; margin: 20px 0; }
  `;

  const templates: Record<string, { subject: string; html: string }> = {
    // J+3 - Rappel onboarding
    j3_onboarding: {
      subject: `${firstName}, il vous reste quelques étapes pour commencer ! 🚀`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <h1>👋 Bonjour ${firstName} !</h1>
                  <p style="color: #666;">Votre période d'essai est en cours</p>
                </div>
                
                <p>Vous avez commencé votre aventure SoloCab il y a 3 jours. Il vous reste <strong>${daysLeft} jours d'essai gratuit</strong> pour explorer toutes les fonctionnalités.</p>
                
                ${achievementsHtml || `
                  <div class="info-box">
                    <p style="margin: 0;"><strong>💡 Conseil :</strong> Commencez par configurer votre profil et vos tarifs pour que vos clients puissent vous trouver !</p>
                  </div>
                `}
                
                <p><strong>Prochaines étapes suggérées :</strong></p>
                <ul>
                  ${!activity.hasProfile ? '<li>📝 Complétez votre profil professionnel</li>' : ''}
                  ${!activity.hasPricing ? '<li>💰 Configurez vos tarifs</li>' : ''}
                  ${!activity.hasVehicle ? '<li>🚗 Ajoutez votre véhicule</li>' : ''}
                  ${!activity.hasSectors ? '<li>📍 Définissez votre zone d\'activité</li>' : ''}
                  <li>🎯 Partagez votre QR code avec vos premiers clients</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/driver-dashboard" class="button">Continuer ma configuration →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
                <p style="font-size: 11px;">Essai gratuit - ${daysLeft} jours restants</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    // J+7 - Mise en avant de la valeur créée
    j7_value: {
      subject: `${firstName}, regardez ce que vous avez déjà construit ! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <h1>🎉 Une semaine déjà !</h1>
                  <p style="color: #666;">Votre progression sur SoloCab</p>
                </div>
                
                <p>Bonjour ${firstName},</p>
                <p>Cela fait maintenant une semaine que vous testez SoloCab. Il vous reste <strong>${daysLeft} jours d'essai gratuit</strong>.</p>
                
                ${achievementsHtml || `
                  <div class="info-box">
                    <p style="margin: 0;">Vous n'avez pas encore exploré toutes les fonctionnalités. Profitez de votre essai pour les découvrir !</p>
                  </div>
                `}
                
                <p><strong>Ce que SoloCab vous apporte :</strong></p>
                <ul>
                  <li>🔗 Un QR code personnalisé pour fidéliser vos clients</li>
                  <li>📊 Suivi de vos courses et de vos revenus</li>
                  <li>📄 Devis et factures professionnels en 1 clic</li>
                  <li>🤖 Un coach IA pour optimiser votre activité</li>
                </ul>
                
                <p>Vous êtes à mi-parcours de votre essai. C'est le moment idéal pour inviter vos premiers clients à scanner votre QR code !</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/driver-dashboard" class="button">Voir mon tableau de bord →</a>
                </div>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
                <p style="font-size: 11px;">Essai gratuit - ${daysLeft} jours restants</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    // J+10 - Projection
    j10_projection: {
      subject: `💭 ${firstName}, imaginez votre quotidien avec SoloCab`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <h1>💭 Projetez-vous...</h1>
                  <p style="color: #666;">Votre indépendance, votre liberté</p>
                </div>
                
                <p>Bonjour ${firstName},</p>
                
                <div class="warning-box">
                  <p style="font-size: 18px; margin: 0;">⏰ Plus que <strong>${daysLeft} jours</strong> d'essai gratuit</p>
                </div>
                
                <p>Imaginez un quotidien où...</p>
                <ul>
                  <li>🎯 Vos clients vous retrouvent directement via votre QR code</li>
                  <li>💰 Vous fixez vos propres tarifs sans intermédiaire</li>
                  <li>📱 Vous gérez vos courses en toute autonomie</li>
                  <li>🚀 Vous développez votre clientèle fidèle</li>
                </ul>
                
                ${achievementsHtml}
                
                <p><strong>SoloCab, c'est votre outil pour devenir vraiment indépendant.</strong> Plus besoin de dépendre des plateformes qui prennent une commission sur chaque course.</p>
                
                <p>L'accès de base est <strong>gratuit</strong>. Pour débloquer les fonctionnalités Premium (partenariats, promotions, prospection), l'abonnement est à seulement <strong>19,99€/mois</strong> !</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/driver-dashboard" class="button">Continuer l'aventure →</a>
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
    
    // J+13 - Avertissement bienveillant
    j13_warning: {
      subject: `⚠️ ${firstName}, votre essai gratuit se termine demain !`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <h1>⚠️ Dernier jour demain !</h1>
                </div>
                
                <p>Bonjour ${firstName},</p>
                
                <div class="urgent-box">
                  <p style="font-size: 20px; margin: 0;">Votre essai gratuit se termine <strong>demain</strong></p>
                  <p style="margin: 10px 0 0 0; font-size: 14px;">Date de fin : ${trialEndDate}</p>
                </div>
                
                ${achievementsHtml}
                
                <p><strong>Ce qui va se passer :</strong></p>
                <ul>
                  <li>📅 Demain, votre accès aux fonctionnalités sera suspendu</li>
                  <li>💾 Toutes vos données sont conservées (clients, courses, factures...)</li>
                  <li>🔓 Vous pourrez réactiver votre compte à tout moment en vous abonnant</li>
                </ul>
                
                <p><strong>L'accès de base reste gratuit.</strong> Pour les fonctionnalités avancées, abonnez-vous au Premium à 19,99€/mois (sans engagement).</p>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/subscription" class="button">M'abonner maintenant →</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">PS : Vos données restent accessibles. Rien n'est perdu si vous décidez de revenir plus tard.</p>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
    
    // J+14 - Notification de blocage
    j14_expiry: {
      subject: `🔒 ${firstName}, votre période d'essai est terminée`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><style>${baseStyle}</style></head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <h1>🔒 Essai terminé</h1>
                </div>
                
                <p>Bonjour ${firstName},</p>
                
                <div class="urgent-box">
                  <p style="font-size: 18px; margin: 0;">Votre période d'essai gratuit de 14 jours est terminée</p>
                </div>
                
                <p>Votre accès aux fonctionnalités de SoloCab est maintenant suspendu. <strong>Mais bonne nouvelle :</strong> toutes vos données sont conservées !</p>
                
                ${achievementsHtml}
                
                <p><strong>Pour retrouver l'accès complet :</strong></p>
                <ul>
                  <li>✅ L'accès de base reste <strong>gratuit</strong> (clients, courses, factures)</li>
                  <li>💳 Passez au Premium à 19,99€/mois pour les partenariats et promotions</li>
                  <li>🔓 Accès immédiat après paiement</li>
                </ul>
                
                <div style="text-align: center;">
                  <a href="https://solocab.fr/chauffeur/subscription" class="button" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">S'abonner pour continuer →</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">Merci d'avoir testé SoloCab. Nous espérons vous revoir bientôt !</p>
              </div>
              <div class="footer">
                <p>L'équipe SoloCab 🚗</p>
                <p style="font-size: 11px;">Questions ? Répondez à cet email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    },
  };

  return templates[emailType] || null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting trial emails processing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get emails to send (scheduled for now or past, not yet sent)
    const { data: emailsToSend, error: fetchError } = await supabase
      .from('trial_emails')
      .select(`
        id,
        driver_id,
        email_type,
        scheduled_for,
        drivers!inner (
          id,
          user_id,
          trial_status,
          trial_end_date
        )
      `)
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .eq('drivers.trial_status', 'active')
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch trial emails: ${fetchError.message}`);
    }

    logStep("Found emails to send", { count: emailsToSend?.length || 0 });

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const emailRecord of emailsToSend || []) {
      try {
        const driver = (emailRecord as any).drivers;
        
        // Get user email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', driver.user_id)
          .single();

        if (!profile?.email) {
          logStep("No email found for driver", { driverId: driver.id });
          continue;
        }

        // Get driver activity for personalization
        const activity = await getDriverActivity(supabase, driver.id);
        
        // Calculate days left
        const trialEnd = new Date(driver.trial_end_date);
        const now = new Date();
        const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        const template = getEmailTemplate(emailRecord.email_type, {
          firstName: profile.full_name?.split(' ')[0] || 'Chauffeur',
          daysLeft,
          activity,
          trialEndDate: trialEnd.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
        });

        if (!template) {
          logStep("Unknown email type", { emailType: emailRecord.email_type });
          continue;
        }

        // Send email
        const { error: sendError } = await resend.emails.send({
          from: "SoloCab <noreply@solocab.fr>",
          to: [profile.email],
          subject: template.subject,
          html: template.html,
        });

        if (sendError) {
          throw sendError;
        }

        // Mark as sent
        await supabase
          .from('trial_emails')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', emailRecord.id);

        results.push({ email: profile.email, success: true });
        logStep("Email sent successfully", { 
          email: profile.email, 
          emailType: emailRecord.email_type 
        });

      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        results.push({ email: 'unknown', success: false, error: errorMessage });
        logStep("Failed to send email", { error: errorMessage });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: emailsToSend?.length || 0,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
