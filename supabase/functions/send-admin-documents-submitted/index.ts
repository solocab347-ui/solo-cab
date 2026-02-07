import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmailWithRetry } from '../_shared/emailRetry.ts';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email principal de l'admin SoloCab
const ADMIN_EMAIL = "solocab347@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { driver_id, notification_type = "documents_submitted" } = await req.json();

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
        vehicle_brand,
        vehicle_plate,
        created_at,
        documents_status,
        documents_submitted_at,
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

    console.log(`📧 Envoi email admin - ${notification_type} pour: ${driverName}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

    let emailSubject = "";
    let emailContent = "";

    if (notification_type === "documents_submitted") {
      emailSubject = "📋 Documents soumis - Validation requise";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>📋 Documents à valider</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Bonjour Admin,</p>
            
            <p>Un chauffeur vient de soumettre ses documents pour validation.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0;">Informations du chauffeur</h3>
              <p><strong>👤 Nom :</strong> ${driverName}</p>
              <p><strong>📧 Email :</strong> ${driverEmail}</p>
              <p><strong>📱 Téléphone :</strong> ${driverPhone}</p>
              <p><strong>🚗 Véhicule :</strong> ${driverData.vehicle_brand || ""} ${driverData.vehicle_model || "Non spécifié"}</p>
              <p><strong>🔢 Immatriculation :</strong> ${driverData.vehicle_plate || "Non fourni"}</p>
              <p><strong>📅 Date soumission :</strong> ${driverData.documents_submitted_at ? new Date(driverData.documents_submitted_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            
            <p>⚡ <strong>Action requise :</strong></p>
            <ul>
              <li>Vérifier les 9 documents uploadés</li>
              <li>Valider ou rejeter chaque document</li>
              <li>Le chauffeur pourra lancer son essai gratuit une fois les documents validés</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://solocab.fr/admin-dashboard" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                Accéder au panneau admin
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">💡 Traitez cette demande rapidement pour permettre au chauffeur de démarrer son essai.</p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>SoloCab - Système de notification admin</p>
          </div>
        </div>
      `;
    } else if (notification_type === "new_registration") {
      emailSubject = "🚗 Nouveau chauffeur inscrit";
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>🚗 Nouvelle inscription</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Bonjour Admin,</p>
            
            <p>Un nouveau chauffeur vient de s'inscrire sur SoloCab.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0;">Informations du chauffeur</h3>
              <p><strong>👤 Nom :</strong> ${driverName}</p>
              <p><strong>📧 Email :</strong> ${driverEmail}</p>
              <p><strong>📱 Téléphone :</strong> ${driverPhone}</p>
              <p><strong>📅 Date inscription :</strong> ${new Date(driverData.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <p>ℹ️ <strong>Prochaines étapes pour le chauffeur :</strong></p>
            <ul>
              <li>Compléter son tunnel d'onboarding</li>
              <li>Uploader ses 9 documents</li>
              <li>Attendre la validation admin</li>
              <li>Lancer son essai gratuit de 14 jours</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://solocab.fr/admin-dashboard" 
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                Voir le tableau de bord
              </a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>SoloCab - Système de notification admin</p>
          </div>
        </div>
      `;
    }

    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [ADMIN_EMAIL],
        subject: emailSubject,
        html: emailContent
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌ Échec envoi email admin:", emailResult.error);
    } else {
      console.log("✅ Email admin envoyé avec succès");
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
