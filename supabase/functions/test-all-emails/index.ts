import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 📧 TEST ALL EMAILS
 * Fonction pour tester tous les types d'emails du système SoloCab
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const testEmail = body.test_email || "abdallahkanoute72@gmail.com";
    const testName = body.test_name || "Test Utilisateur";
    
    console.log("[TEST-ALL-EMAILS] 📧 Démarrage tests emails vers:", testEmail);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    const results: Record<string, any> = {};
    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ========================================
    // 1. EMAIL BIENVENUE CLIENT
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] 🎉 Bienvenue sur SoloCab - Client",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🎉 Bienvenue sur SoloCab !</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour <strong>${testName}</strong>,</p>
              <p>Nous sommes ravis de vous accueillir sur SoloCab !</p>
              <p>Votre compte a été créé avec succès. Vous pouvez maintenant profiter de tous nos services :</p>
              <ul>
                <li>🚗 Réserver des courses avec votre chauffeur</li>
                <li>📋 Consulter vos devis et factures</li>
                <li>💬 Communiquer directement avec votre chauffeur</li>
                <li>📊 Suivre l'historique de vos courses</li>
              </ul>
              <p>Bonne route avec SoloCab !</p>
              <p>L'équipe SoloCab</p>
            </div>
          </div>
        `
      });
      results.client_welcome = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email client bienvenue envoyé");
    } catch (e: any) {
      results.client_welcome = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email client:", e.message);
    }

    // ========================================
    // 2. EMAIL INSCRIPTION CHAUFFEUR
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] 📝 Dossier d'inscription SoloCab reçu",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <h1>Bonjour ${testName},</h1>
            <p>Nous avons bien reçu votre dossier d'inscription en tant que chauffeur VTC sur la plateforme SoloCab.</p>
            
            <h2>✅ Votre paiement a été validé</h2>
            <p>Votre abonnement mensuel de <strong>9,99€</strong> est maintenant actif.</p>
            <p>Vous bénéficiez de <strong>14 jours d'essai gratuit</strong>.</p>

            <h2>📋 Prochaines étapes</h2>
            <p>Vous avez <strong>7 jours</strong> pour soumettre vos documents professionnels.</p>
            <p>Notre équipe examinera votre dossier sous 24 à 48 heures.</p>
            
            <h3>Documents requis :</h3>
            <ul>
              <li>✓ Carte professionnelle VTC</li>
              <li>✓ Permis de conduire</li>
              <li>✓ Attestation d'assurance</li>
              <li>✓ Carte grise véhicule</li>
            </ul>

            <p>À très bientôt sur SoloCab !<br>L'équipe SoloCab</p>
          </div>
        `
      });
      results.driver_registration = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email inscription chauffeur envoyé");
    } catch (e: any) {
      results.driver_registration = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email inscription:", e.message);
    }

    // ========================================
    // 3. EMAIL BIENVENUE CHAUFFEUR (avec délai 7 jours)
    // ========================================
    const deadline7Days = new Date();
    deadline7Days.setDate(deadline7Days.getDate() + 7);
    const formattedDeadline = deadline7Days.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] 🎉 Bienvenue sur SoloCab - Finalisez votre inscription",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🎉 Bienvenue sur SoloCab !</h1>
              <p>Félicitations ${testName} !</p>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Votre compte chauffeur a été créé avec succès !</p>
              
              <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>✅ Ce que vous pouvez faire dès maintenant :</strong></p>
                <ul>
                  <li>Explorer votre tableau de bord</li>
                  <li>Configurer votre profil et vos tarifs</li>
                  <li>Découvrir toutes les fonctionnalités</li>
                </ul>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>⚠️ IMPORTANT : Action requise sous 7 jours</strong></p>
                <p>Pour conserver votre accès et commencer à recevoir des courses, vous devez soumettre vos documents professionnels <strong>avant le ${formattedDeadline}</strong>.</p>
              </div>
              
              <p>L'équipe SoloCab</p>
            </div>
          </div>
        `
      });
      results.driver_welcome = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email bienvenue chauffeur envoyé");
    } catch (e: any) {
      results.driver_welcome = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email bienvenue:", e.message);
    }

    // ========================================
    // 4. EMAIL RAPPEL DOCUMENTS (urgent)
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] 🚨 URGENT : Dernier rappel - Vos documents sont attendus",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <div style="background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🚨 DERNIER RAPPEL</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour <strong>${testName}</strong>,</p>
              <p>C'est votre dernier rappel avant la suspension de votre accès !</p>
              
              <div style="background: #ef4444; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <div style="font-size: 48px; font-weight: bold;">1</div>
                <p style="margin: 0;">jour restant</p>
              </div>
              
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>⚠️ Attention :</strong></p>
                <p>Vous avez jusqu'au <strong>${formattedDate}</strong> pour soumettre vos documents.</p>
                <p style="color: #ef4444;"><strong>Passé ce délai, votre accès à SoloCab sera suspendu.</strong></p>
              </div>
              
              <h3>📋 Documents requis :</h3>
              <ul>
                <li>✓ Carte professionnelle VTC valide</li>
                <li>✓ Permis de conduire</li>
                <li>✓ Attestation d'assurance professionnelle</li>
                <li>✓ Carte grise du véhicule</li>
              </ul>
              
              <p>L'équipe SoloCab</p>
            </div>
          </div>
        `
      });
      results.document_reminder_urgent = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email rappel documents urgent envoyé");
    } catch (e: any) {
      results.document_reminder_urgent = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email rappel:", e.message);
    }

    // ========================================
    // 5. EMAIL PAIEMENT ÉCHOUÉ
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] ⚠️ Votre paiement SoloCab n'a pas pu être effectué",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <h1>Bonjour ${testName},</h1>
            <p>Nous avons tenté de prélever votre abonnement mensuel SoloCab de <strong>9,99€</strong>, mais le paiement n'a pas pu être effectué.</p>
            
            <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #dc2626; margin-top: 0;">⚠️ Action requise</h2>
              <p style="margin: 0;">Votre accès à la plateforme sera suspendu si le paiement n'est pas régularisé sous <strong>48 heures</strong>.</p>
            </div>

            <h2>💳 Comment régulariser ?</h2>
            <ol>
              <li>Connectez-vous à votre tableau de bord SoloCab</li>
              <li>Accédez à la section "Abonnement"</li>
              <li>Mettez à jour vos informations de paiement</li>
            </ol>

            <h3>Raisons possibles du rejet :</h3>
            <ul>
              <li>Carte bancaire expirée</li>
              <li>Fonds insuffisants</li>
              <li>Plafond de paiement atteint</li>
            </ul>

            <p>Cordialement,<br>L'équipe SoloCab</p>
          </div>
        `
      });
      results.payment_failed = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email paiement échoué envoyé");
    } catch (e: any) {
      results.payment_failed = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email paiement:", e.message);
    }

    // ========================================
    // 6. EMAIL RAPPEL PRÉLÈVEMENT
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] 🔔 Rappel - Prochain prélèvement SoloCab dans 3 jours",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <h1>Bonjour ${testName},</h1>
            <p>Votre prochain prélèvement mensuel SoloCab de <strong>9,99€</strong> aura lieu dans 3 jours.</p>
            
            <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #16a34a; margin-top: 0;">✅ Tout est en ordre</h2>
              <p style="margin: 0;">Ce message est un simple rappel. Si votre carte bancaire est valide, aucune action n'est requise.</p>
            </div>

            <h2>📊 Votre abonnement</h2>
            <p>
              <strong>Tarif :</strong> 9,99€/mois<br>
              <strong>Essai gratuit :</strong> 14 jours<br>
              <strong>Avantages :</strong> 0% de commission, clients illimités, QR code personnalisé
            </p>
            
            <p>Merci de votre confiance,<br>L'équipe SoloCab</p>
          </div>
        `
      });
      results.payment_reminder = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email rappel prélèvement envoyé");
    } catch (e: any) {
      results.payment_reminder = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email rappel:", e.message);
    }

    // ========================================
    // 7. EMAIL FIN PÉRIODE D'ESSAI
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] ⏰ Votre période d'essai SoloCab se termine bientôt",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>⏰ Fin de période d'essai</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour <strong>${testName}</strong>,</p>
              
              <p>Votre période d'essai gratuit de <strong>14 jours</strong> se termine bientôt.</p>
              
              <div style="background: #e0e7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>📊 Récapitulatif de votre essai :</strong></p>
                <ul>
                  <li>0% de commission sur toutes vos courses</li>
                  <li>QR code personnalisé actif</li>
                  <li>Profil public accessible</li>
                </ul>
              </div>
              
              <p><strong>Que se passe-t-il ensuite ?</strong></p>
              <p>À la fin de votre essai, votre abonnement de <strong>9,99€/mois</strong> sera automatiquement activé si vous avez enregistré un moyen de paiement.</p>
              
              <p>L'équipe SoloCab</p>
            </div>
          </div>
        `
      });
      results.trial_ending = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email fin essai envoyé");
    } catch (e: any) {
      results.trial_ending = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email fin essai:", e.message);
    }

    // ========================================
    // 8. EMAIL VALIDATION CHAUFFEUR
    // ========================================
    try {
      const result = await resend.emails.send({
        from: "SoloCab <noreply@solocab.fr>",
        to: [testEmail],
        subject: "[TEST] ✅ Votre profil SoloCab a été validé !",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: 10px; text-align: center; font-weight: bold; color: #92400e;">
              ⚠️ CECI EST UN EMAIL DE TEST - ${timestamp}
            </div>
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>✅ Profil Validé !</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour <strong>${testName}</strong>,</p>
              
              <p>Excellente nouvelle ! Votre profil chauffeur a été <strong>validé par notre équipe</strong>.</p>
              
              <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>🚀 Vous pouvez maintenant :</strong></p>
                <ul>
                  <li>Recevoir des demandes de course</li>
                  <li>Utiliser votre QR code personnel</li>
                  <li>Apparaître dans le répertoire public</li>
                  <li>Accéder à toutes les fonctionnalités</li>
                </ul>
              </div>
              
              <p>Bienvenue officiellement dans la communauté SoloCab !</p>
              
              <p>L'équipe SoloCab</p>
            </div>
          </div>
        `
      });
      results.driver_validated = { success: true, emailId: result.data?.id };
      console.log("[TEST-ALL-EMAILS] ✅ Email validation chauffeur envoyé");
    } catch (e: any) {
      results.driver_validated = { success: false, error: e.message };
      console.error("[TEST-ALL-EMAILS] ❌ Erreur email validation:", e.message);
    }

    // ========================================
    // RÉSUMÉ
    // ========================================
    const successCount = Object.values(results).filter((r: any) => r.success).length;
    const totalCount = Object.keys(results).length;

    console.log(`[TEST-ALL-EMAILS] 📊 Résumé: ${successCount}/${totalCount} emails envoyés avec succès`);

    return new Response(JSON.stringify({
      success: successCount === totalCount,
      message: `${successCount}/${totalCount} emails de test envoyés à ${testEmail}`,
      testEmail,
      timestamp,
      results,
      summary: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount,
      }
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: successCount > 0 ? 200 : 500,
    });

  } catch (error: any) {
    console.error("[TEST-ALL-EMAILS] ❌ Erreur critique:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: "critical"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
