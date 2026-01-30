import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ⚠️ SÉCURITÉ: Vérifier que l'utilisateur est admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier que l'utilisateur authentifié est admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rôle admin
    const { data: hasAdminRole } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    console.log("[DRIVER-VALIDATION-EMAIL] Function started");

    const { driver_id, action, document_type, rejection_reason } = await req.json();
    if (!driver_id || !action) {
      throw new Error("driver_id and action are required");
    }

    console.log("[DRIVER-VALIDATION-EMAIL] Processing:", driver_id, action);

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

    console.log("[DRIVER-VALIDATION-EMAIL] Driver found:", driver.profiles.email);

    let subject: string;
    let html: string;

    if (action === "validated") {
      subject = "✅ Vos documents SoloCab sont validés - Compte actif !";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Félicitations !</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 18px; color: #1f2937;">Bonjour <strong>${driver.profiles.full_name}</strong>,</p>
              
              <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; color: #065f46; font-weight: 600;">
                  ✅ Tous vos documents ont été validés par notre équipe !
                </p>
              </div>
              
              <p style="color: #4b5563; line-height: 1.6;">
                Votre compte chauffeur SoloCab est maintenant <strong>entièrement actif</strong>. 
                Vous avez accès à toutes les fonctionnalités de la plateforme.
              </p>

              <h2 style="color: #1f2937; margin-top: 30px;">🚀 Prochaines étapes</h2>
              <ol style="color: #4b5563; line-height: 2;">
                <li>Complétez votre profil public pour attirer plus de clients</li>
                <li>Configurez vos tarifs personnalisés</li>
                <li>Partagez votre QR code avec vos clients réguliers</li>
                <li>Commencez à recevoir des réservations !</li>
              </ol>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://solocab.fr/driver-dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Accéder à mon espace
                </a>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Bienvenue dans la communauté SoloCab ! 🚗
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (action === "rejected") {
      const docTypeText = document_type || "Un de vos documents";
      const reasonText = rejection_reason || "Non conforme aux exigences";
      
      subject = "⚠️ Document rejeté - Action requise sur SoloCab";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Action requise</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 18px; color: #1f2937;">Bonjour <strong>${driver.profiles.full_name}</strong>,</p>
              
              <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 600;">
                  ❌ Document rejeté : ${docTypeText}
                </p>
                <p style="margin: 0; color: #92400e;">
                  <strong>Raison :</strong> ${reasonText}
                </p>
              </div>
              
              <p style="color: #4b5563; line-height: 1.6;">
                Afin d'activer votre compte SoloCab, veuillez corriger ce document et le soumettre à nouveau.
              </p>

              <h2 style="color: #1f2937; margin-top: 30px;">📋 Comment corriger ?</h2>
              <ol style="color: #4b5563; line-height: 2;">
                <li>Connectez-vous à votre espace chauffeur</li>
                <li>Allez dans l'onglet "Mes Documents"</li>
                <li>Supprimez le document rejeté</li>
                <li>Téléchargez un nouveau document conforme</li>
                <li>Soumettez à nouveau pour validation</li>
              </ol>

              <div style="text-align: center; margin-top: 30px;">
                <a href="https://solocab.fr/driver-dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Corriger mon document
                </a>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Besoin d'aide ? Contactez-nous à support@solocab.fr
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "❌ Votre demande de compte chauffeur SoloCab";
      html = `
        <h1>Bonjour ${driver.profiles.full_name},</h1>
        <p>Nous avons examiné votre demande de compte chauffeur SoloCab.</p>
        
        <p>Malheureusement, nous ne pouvons pas valider votre compte pour le moment.</p>

        <h2>Raisons possibles :</h2>
        <ul>
          <li>Documents incomplets ou non conformes</li>
          <li>Licence professionnelle invalide</li>
          <li>Informations de véhicule incorrectes</li>
        </ul>

        <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez plus d'informations, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>L'équipe SoloCab</p>
        
        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          SoloCab - Plateforme de gestion VTC
        </p>
      `;
    }

    await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [driver.profiles.email],
      subject: subject,
      html: html,
    });

    console.log("[DRIVER-VALIDATION-EMAIL] Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[DRIVER-VALIDATION-EMAIL] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
