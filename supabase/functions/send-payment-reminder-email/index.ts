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
    console.log("[PAYMENT-REMINDER-EMAIL] Function started");

    const { driver_id, reminder_type, attempt_count = 1 } = await req.json();
    if (!driver_id) {
      throw new Error("driver_id is required");
    }

    // Fetch driver and profile info
    const { data: driver, error: driverError } = await supabaseClient
      .from("drivers")
      .select(`
        *,
        profiles:user_id(email, full_name)
      `)
      .eq("id", driver_id)
      .single();

    if (driverError) throw driverError;
    if (!driver) throw new Error("Driver not found");

    console.log("[PAYMENT-REMINDER-EMAIL] Driver found:", driver.profiles.email, "Type:", reminder_type, "Attempt:", attempt_count);

    let subject: string;
    let html: string;
    const dashboardUrl = "https://solocab.fr/driver-dashboard?tab=subscription";

    if (reminder_type === "past_due") {
      // Adapter le message selon le nombre de tentatives
      const isUrgent = attempt_count >= 3;
      const urgencyEmoji = isUrgent ? "🚨" : "⚠️";
      const urgencyText = isUrgent 
        ? `<strong style="color: #dc2626;">URGENT - ${attempt_count}ème tentative échouée</strong>` 
        : `Tentative ${attempt_count} de prélèvement`;
      
      const suspensionWarning = isUrgent
        ? `<p style="color: #dc2626; font-weight: bold;">⚠️ Votre compte sera suspendu automatiquement après la prochaine tentative échouée.</p>`
        : `<p>Votre accès à la plateforme sera suspendu si le paiement n'est pas régularisé sous <strong>48 heures</strong>.</p>`;

      subject = `${urgencyEmoji} ${isUrgent ? 'URGENT - ' : ''}Échec de paiement SoloCab (tentative ${attempt_count})`;
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">SoloCab</h1>
          </div>

          <h2 style="color: #1a1a1a;">Bonjour ${driver.profiles.full_name},</h2>
          
          <p>${urgencyText}</p>
          
          <p>Nous avons tenté de prélever votre abonnement Premium SoloCab de <strong>9,99€</strong>, mais le paiement n'a pas pu être effectué.</p>
          
          <div style="background: ${isUrgent ? '#fef2f2' : '#fef9c3'}; border: 2px solid ${isUrgent ? '#dc2626' : '#ca8a04'}; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <h3 style="color: ${isUrgent ? '#dc2626' : '#ca8a04'}; margin-top: 0;">${urgencyEmoji} Action requise immédiatement</h3>
            ${suspensionWarning}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              💳 Régulariser mon paiement
            </a>
          </div>

          <h3 style="color: #1a1a1a;">📋 Comment régulariser ?</h3>
          <ol style="padding-left: 20px;">
            <li>Cliquez sur le bouton ci-dessus</li>
            <li>Accédez à la section "Abonnement"</li>
            <li>Cliquez sur "Régulariser mon paiement"</li>
            <li>Mettez à jour vos informations bancaires si nécessaire</li>
          </ol>

          <h3 style="color: #1a1a1a;">❓ Raisons possibles du rejet :</h3>
          <ul style="padding-left: 20px; color: #666;">
            <li>Carte bancaire expirée</li>
            <li>Fonds insuffisants</li>
            <li>Plafond de paiement atteint</li>
            <li>Carte bloquée par votre banque</li>
          </ul>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="margin-top: 0; color: #1a1a1a;">📞 Besoin d'aide ?</h4>
            <p style="margin: 0; color: #666;">Notre équipe support est disponible pour vous aider à régulariser votre situation. Répondez simplement à cet email.</p>
          </div>
          
          <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe SoloCab</strong></p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            SoloCab - Plateforme de gestion VTC<br>
            <a href="https://www.solocab.fr" style="color: #3b82f6;">www.solocab.fr</a>
          </p>
        </body>
        </html>
      `;
    } else if (reminder_type === "upcoming") {
      // Relance douce 3 jours avant échéance
      subject = "🔔 Rappel - Prochain prélèvement SoloCab dans 3 jours";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">SoloCab</h1>
          </div>

          <h2 style="color: #1a1a1a;">Bonjour ${driver.profiles.full_name},</h2>
          
          <p>Votre prochain prélèvement Premium SoloCab de <strong>9,99€</strong> aura lieu dans 3 jours.</p>
          
          <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <h3 style="color: #16a34a; margin-top: 0;">✅ Simple rappel</h3>
            <p style="margin: 0;">Si votre carte bancaire est valide, aucune action n'est requise de votre part.</p>
          </div>

          <h3 style="color: #1a1a1a;">💡 Vérifiez que :</h3>
          <ul style="padding-left: 20px;">
            <li>Votre carte bancaire est valide et non expirée</li>
            <li>Votre compte dispose des fonds nécessaires</li>
            <li>Votre plafond de paiement permet cette transaction</li>
          </ul>

          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
            <h4 style="margin-top: 0; color: #1e40af;">📊 Votre abonnement</h4>
            <p style="margin: 0; color: #1e40af;">
              <strong>Tarif :</strong> 9,99€/mois (Premium)<br>
              <strong>Avantages :</strong> Partenariats, promotions, prospection + toutes les fonctionnalités gratuites
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Gérer mon abonnement →
            </a>
          </div>
          
          <p style="margin-top: 30px;">Merci de votre confiance,<br><strong>L'équipe SoloCab</strong></p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            SoloCab - Plateforme de gestion VTC<br>
            <a href="https://www.solocab.fr" style="color: #3b82f6;">www.solocab.fr</a>
          </p>
        </body>
        </html>
      `;
    } else {
      throw new Error(`Unknown reminder_type: ${reminder_type}`);
    }

    await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [driver.profiles.email],
      subject: subject,
      html: html,
    });

    console.log("[PAYMENT-REMINDER-EMAIL] Email sent successfully to", driver.profiles.email);

    return new Response(JSON.stringify({ success: true, type: reminder_type, attempt_count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[PAYMENT-REMINDER-EMAIL] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
