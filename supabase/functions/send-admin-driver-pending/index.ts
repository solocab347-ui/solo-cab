import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmailWithRetry } from '../_shared/emailRetry.ts';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "solocab347@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate internal service call with secret header
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!internalSecret || internalSecret !== expectedSecret) {
      console.error("❌ Unauthorized access attempt to email function");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { driver_id } = await req.json();

    if (!driver_id) {
      return new Response(
        JSON.stringify({ error: "driver_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer les informations du chauffeur
    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select(`
        id,
        license_number,
        vehicle_model,
        created_at,
        profiles!drivers_user_id_fkey(email, full_name, phone)
      `)
      .eq("id", driver_id)
      .single();

    if (driverError || !driverData) {
      console.error("❌ Chauffeur non trouvé:", driverError);
      return new Response(
        JSON.stringify({ error: "Chauffeur non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profiles = driverData.profiles as any;
    const driverName = profiles?.full_name || "Inconnu";
    const driverEmail = profiles?.email || "Non fourni";
    const driverPhone = profiles?.phone || "Non fourni";

    console.log(`📧 Envoi email admin pour nouveau chauffeur en attente: ${driverName}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [ADMIN_EMAIL],
        subject: "🚨 Nouveau chauffeur en attente de validation",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🚨 Nouveau chauffeur en attente</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour Admin,</p>
              
              <p>Un nouveau chauffeur a terminé son inscription et son paiement. Son dossier est maintenant en attente de validation.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0;">Informations du chauffeur</h3>
                <p><strong>👤 Nom :</strong> ${driverName}</p>
                <p><strong>📧 Email :</strong> ${driverEmail}</p>
                <p><strong>📱 Téléphone :</strong> ${driverPhone}</p>
                <p><strong>🚗 Véhicule :</strong> ${driverData.vehicle_model || "Non spécifié"}</p>
                <p><strong>📋 N° Licence :</strong> ${driverData.license_number || "Non fourni"}</p>
                <p><strong>📅 Date inscription :</strong> ${new Date(driverData.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              
              <p>⚡ <strong>Action requise :</strong></p>
              <ul>
                <li>Vérifier les documents uploadés</li>
                <li>Valider ou mettre en attente le dossier</li>
                <li>Le chauffeur recevra un email dès que vous aurez traité sa demande</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://solocab.fr/admin-dashboard" 
                   style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                  Accéder au panneau admin
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">💡 Pensez à traiter cette demande dans les 24-48h pour maintenir une bonne expérience utilisateur.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
              <p>SoloCab - Système de notification admin</p>
            </div>
          </div>
        `
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌❌❌ Échec envoi email admin après retry:", emailResult.error);
    } else {
      console.log("✅✅✅ Email admin envoyé avec succès");
    }

    return new Response(
      JSON.stringify({ success: emailResult.success }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
