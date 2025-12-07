import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmailWithRetry, sendAdminAlert } from '../_shared/emailRetry.ts';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { driver_id, client_name } = await req.json();

    if (!driver_id || !client_name) {
      return new Response(
        JSON.stringify({ error: "driver_id et client_name requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer l'email du chauffeur
    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select(`
        user_id,
        profiles!drivers_user_id_fkey(email, full_name)
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
    const driverEmail = profiles?.email;
    const driverName = profiles?.full_name;

    if (!driverEmail) {
      console.error("❌ Email chauffeur manquant");
      return new Response(
        JSON.stringify({ error: "Email chauffeur manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Envoi email inscription client à ${driverEmail}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

    const emailResult = await sendEmailWithRetry(
      resend,
      {
        from: "SoloCab <noreply@solocab.fr>",
        to: [driverEmail],
        subject: "🎉 Nouveau client inscrit !",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1>🎉 Nouveau client !</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>Bonjour <strong>${driverName}</strong>,</p>
              
              <p>Excellente nouvelle ! <strong>${client_name}</strong> vient de s'inscrire dans votre base clients SoloCab.</p>
              
              <p>📋 <strong>Prochaines étapes :</strong></p>
              <ul>
                <li>Le client peut désormais créer des demandes de course</li>
                <li>Vous recevrez des notifications pour chaque nouvelle demande</li>
                <li>Vous pourrez communiquer directement via la messagerie</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://solocab.fr/driver-dashboard" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
                  Voir mon tableau de bord
                </a>
              </div>
              
              <p>Bonne route avec SoloCab !</p>
              
              <p>L'équipe SoloCab</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
              <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
            </div>
          </div>
        `
      },
      { maxAttempts: 3 }
    );

    if (!emailResult.success) {
      console.error("❌❌❌ Échec envoi email après retry");
      await sendAdminAlert(resend, {
        emailType: "driver_client_registered",
        recipient: driverEmail,
        error: emailResult.error || "Erreur inconnue",
        context: `Driver ID: ${driver_id}, Client: ${client_name}`
      });
    } else {
      console.log("✅✅✅ Email envoyé avec succès");
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
