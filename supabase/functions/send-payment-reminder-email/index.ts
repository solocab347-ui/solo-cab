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

    const { driver_id, reminder_type } = await req.json();
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

    console.log("[PAYMENT-REMINDER-EMAIL] Driver found:", driver.profiles.email);

    let subject: string;
    let html: string;

    if (reminder_type === "past_due") {
      subject = "⚠️ Votre paiement SoloCab n'a pas pu être effectué";
      html = `
        <h1>Bonjour ${driver.profiles.full_name},</h1>
        <p>Nous avons tenté de prélever votre abonnement mensuel SoloCab de 9,99€, mais le paiement n'a pas pu être effectué.</p>
        
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
          <li>Carte bloquée par votre banque</li>
        </ul>

        <h2>📞 Besoin d'aide ?</h2>
        <p>Notre équipe support est disponible pour vous aider à régulariser votre situation.</p>
        
        <p style="margin-top: 30px;">Cordialement,<br>L'équipe SoloCab</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          SoloCab - Plateforme de gestion VTC<br>
          www.solocab.fr
        </p>
      `;
    } else {
      // Relance douce avant échéance
      subject = "🔔 Rappel - Prochain prélèvement SoloCab dans 3 jours";
      html = `
        <h1>Bonjour ${driver.profiles.full_name},</h1>
        <p>Votre prochain prélèvement mensuel SoloCab de <strong>9,99€</strong> aura lieu dans 3 jours.</p>
        
        <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #16a34a; margin-top: 0;">✅ Tout est en ordre</h2>
          <p style="margin: 0;">Ce message est un simple rappel. Si votre carte bancaire est valide, aucune action n'est requise.</p>
        </div>

        <h2>💡 Assurez-vous que :</h2>
        <ul>
          <li>Votre carte bancaire est valide et non expirée</li>
          <li>Votre compte dispose des fonds nécessaires</li>
          <li>Votre plafond de paiement permet cette transaction</li>
        </ul>

        <h2>📊 Votre abonnement</h2>
        <p>
          <strong>Tarif :</strong> 9,99€/mois<br>
          <strong>Avantages :</strong> 0% de commission, clients illimités, QR code personnalisé, profil public
        </p>
        
        <p style="margin-top: 30px;">Merci de votre confiance,<br>L'équipe SoloCab</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          SoloCab - Plateforme de gestion VTC<br>
          www.solocab.fr
        </p>
      `;
    }

    await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [driver.profiles.email],
      subject: subject,
      html: html,
    });

    console.log("[PAYMENT-REMINDER-EMAIL] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
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
