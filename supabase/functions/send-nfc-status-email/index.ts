import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-NFC-STATUS-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const resend = new Resend(resendKey);
    const { order_id, new_status, tracking_number } = await req.json();
    logStep("Request data", { order_id, new_status });

    if (!order_id || !new_status) {
      throw new Error("order_id et new_status sont requis");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabaseClient
      .from("nfc_plate_orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      throw new Error("Commande non trouvée");
    }

    logStep("Order found", { order_number: order.order_number, email: order.email });

    // Générer le lien de suivi
    const baseUrl = Deno.env.get("SITE_URL") || "https://solocab.fr";
    const trackingLink = `${baseUrl}/suivi-plaque-nfc?token=${order.tracking_token}`;

    // Préparer le contenu de l'email selon le statut
    let emailSubject = "";
    let emailContent = "";

    switch (new_status) {
      case "preparing":
        emailSubject = `🛠️ Votre plaque NFC SoloCab est en préparation - ${order.order_number}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed;">SoloCab</h1>
            </div>
            
            <h2 style="color: #1f2937;">Bonjour ${order.first_name},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Bonne nouvelle ! Votre plaque NFC VTC Coutras est maintenant en cours de préparation dans nos ateliers.
            </p>
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">📦 Commande ${order.order_number}</h3>
              <p style="margin: 0; opacity: 0.9;">En préparation</p>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h4 style="color: #1f2937; margin-top: 0;">Adresse de livraison :</h4>
              <p style="color: #4b5563; margin: 0;">
                ${order.first_name} ${order.last_name}<br>
                ${order.shipping_address}<br>
                ${order.shipping_postal_code} ${order.shipping_city}
              </p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Nous vous enverrons un nouvel email dès que votre colis sera expédié avec le numéro de suivi.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Suivre ma commande
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © 2024 SoloCab - La plateforme des chauffeurs VTC indépendants
            </p>
          </div>
        `;
        break;

      case "shipped":
        emailSubject = `🚚 Votre plaque NFC SoloCab est expédiée ! - ${order.order_number}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed;">SoloCab</h1>
            </div>
            
            <h2 style="color: #1f2937;">Bonjour ${order.first_name},</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Excellente nouvelle ! Votre plaque NFC VTC Coutras vient d'être expédiée et est en route vers vous !
            </p>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">🚚 Commande ${order.order_number}</h3>
              <p style="margin: 0; opacity: 0.9;">Colis expédié</p>
              ${tracking_number ? `<p style="margin: 10px 0 0 0; font-family: monospace; background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px;">Suivi : ${tracking_number}</p>` : ''}
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h4 style="color: #1f2937; margin-top: 0;">📍 Livraison prévue sous 5-7 jours ouvrés</h4>
              <p style="color: #4b5563; margin: 0;">
                ${order.first_name} ${order.last_name}<br>
                ${order.shipping_address}<br>
                ${order.shipping_postal_code} ${order.shipping_city}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Suivre mon colis
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>💡 Conseil :</strong> Dès réception, scannez votre plaque avec votre smartphone pour vérifier qu'elle est bien liée à votre profil SoloCab.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © 2024 SoloCab - La plateforme des chauffeurs VTC indépendants
            </p>
          </div>
        `;
        break;

      case "delivered":
        emailSubject = `✅ Votre plaque NFC SoloCab est livrée ! - ${order.order_number}`;
        emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7c3aed;">SoloCab</h1>
            </div>
            
            <h2 style="color: #1f2937;">Félicitations ${order.first_name} ! 🎉</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Votre plaque NFC VTC Coutras a été livrée avec succès ! Vous pouvez maintenant la programmer et l'installer sur votre véhicule.
            </p>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0 0 10px 0; font-size: 24px;">✅ Livraison confirmée</h3>
              <p style="margin: 0; opacity: 0.9;">Commande ${order.order_number}</p>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h4 style="color: #1f2937; margin-top: 0;">🛠️ Prochaines étapes :</h4>
              <ol style="color: #4b5563; line-height: 1.8;">
                <li>Programmez votre plaque NFC avec le lien de votre profil SoloCab</li>
                <li>Installez la plaque sur votre véhicule (pare-brise ou tableau de bord)</li>
                <li>Testez le scan avec votre smartphone</li>
                <li>Vos clients peuvent maintenant vous contacter en un scan !</li>
              </ol>
            </div>

            ${order.qr_code_link ? `
            <div style="background: #ede9fe; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h4 style="color: #5b21b6; margin-top: 0;">🔗 Lien à programmer sur votre plaque :</h4>
              <code style="display: block; background: white; padding: 12px; border-radius: 6px; word-break: break-all; color: #7c3aed; font-size: 13px;">
                ${order.qr_code_link}
              </code>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://solocab.fr/driver-dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Accéder à mon tableau de bord
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              © 2024 SoloCab - La plateforme des chauffeurs VTC indépendants
            </p>
          </div>
        `;
        break;

      default:
        logStep("Unknown status, skipping email", { new_status });
        return new Response(
          JSON.stringify({ success: true, message: "Statut non supporté pour l'email" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
    }

    // Envoyer l'email
    const emailResponse = await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [order.email],
      subject: emailSubject,
      html: emailContent,
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
