import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestTrackingEmailRequest {
  course_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accept both JWT auth (from frontend) and internal secret (from other edge functions)
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("x-internal-secret");
    
    let isAuthorized = false;
    
    // Check internal secret for backend-to-backend calls
    if (internalSecret && internalSecret === supabaseServiceKey) {
      isAuthorized = true;
    }
    
    // Check JWT for frontend calls
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user }, error } = await supabaseAuth.auth.getUser();
      if (user && !error) {
        isAuthorized = true;
      }
    }
    
    if (!isAuthorized) {
      console.error("❌ Unauthorized access attempt to email function");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { course_id }: GuestTrackingEmailRequest = await req.json();

    if (!course_id) {
      return new Response(
        JSON.stringify({ error: "course_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Récupérer les informations de la course et du chauffeur
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id,
        guest_name,
        guest_email,
        guest_phone,
        guest_tracking_token,
        guest_estimated_price,
        pickup_address,
        destination_address,
        scheduled_date,
        status,
        driver_id,
        driver_ids,
        is_guest_booking
      `)
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      console.error("❌ Course non trouvée:", courseError);
      return new Response(
        JSON.stringify({ error: "Course non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!course.is_guest_booking) {
      console.error("❌ Cette course n'est pas une réservation invité");
      return new Response(
        JSON.stringify({ error: "Cette course n'est pas une réservation invité" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!course.guest_email) {
      console.log("⚠️ Pas d'email pour ce client invité, aucun email envoyé");
      return new Response(
        JSON.stringify({ success: true, message: "Pas d'email disponible" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!course.guest_tracking_token) {
      console.error("❌ Token de suivi manquant");
      return new Response(
        JSON.stringify({ error: "Token de suivi manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer les infos du chauffeur principal
    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select(`
        id,
        company_name,
        show_phone,
        profiles!drivers_user_id_fkey(full_name, phone)
      `)
      .eq("id", course.driver_id)
      .single();

    if (driverError || !driverData) {
      console.error("❌ Chauffeur non trouvé:", driverError);
      return new Response(
        JSON.stringify({ error: "Chauffeur non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profiles = driverData.profiles as any;
    const driverName = driverData.company_name || profiles?.full_name || "Votre chauffeur";
    const driverPhone = driverData.show_phone ? profiles?.phone : null;

    // Vérifier si c'est une course partagée (plusieurs chauffeurs)
    const isSharedCourse = course.driver_ids && course.driver_ids.length > 1;
    let sharedDriversInfo = "";

    if (isSharedCourse) {
      // Récupérer les infos des autres chauffeurs
      const otherDriverIds = course.driver_ids.filter((id: string) => id !== course.driver_id);
      const { data: otherDrivers } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          profiles!drivers_user_id_fkey(full_name)
        `)
        .in("id", otherDriverIds);

      if (otherDrivers && otherDrivers.length > 0) {
        const otherNames = otherDrivers.map((d: any) => 
          d.company_name || d.profiles?.full_name || "Chauffeur partenaire"
        ).join(", ");
        sharedDriversInfo = `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>🤝 Course partagée</strong></p>
            <p style="margin: 5px 0 0 0; color: #92400e;">Cette course peut être assurée en partenariat avec : ${otherNames}</p>
          </div>
        `;
      }
    }

    // Formater la date
    const scheduledDate = new Date(course.scheduled_date);
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Construire le lien de suivi — utiliser SITE_URL ou fallback sur le domaine publié
    const siteUrl = Deno.env.get("SITE_URL") || "https://solo-cab-to-lovable.lovable.app";
    const trackingUrl = `${siteUrl}/reservation-suivi/${course.guest_tracking_token}`;

    console.log(`📧 Envoi email de suivi à ${course.guest_email} pour course ${course_id}`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "SoloCab <noreply@solocab.fr>",
      to: [course.guest_email],
      subject: `🚗 Confirmation de votre réservation - ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>🚗 Votre réservation est confirmée !</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Bonjour <strong>${course.guest_name}</strong>,</p>
            
            <p>Votre réservation avec <strong>${driverName}</strong> a bien été enregistrée.</p>
            
            ${sharedDriversInfo}
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #1e40af;">📋 Détails de votre course</h3>
              <p><strong>📅 Date :</strong> ${formattedDate} à ${formattedTime}</p>
              <p><strong>📍 Départ :</strong> ${course.pickup_address}</p>
              <p><strong>🎯 Arrivée :</strong> ${course.destination_address}</p>
              ${course.guest_estimated_price ? `<p><strong>💰 Prix estimé :</strong> ${course.guest_estimated_price.toFixed(2)} €</p>` : ''}
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">👤 Votre chauffeur</h3>
              <p><strong>${driverName}</strong></p>
              ${driverPhone ? `<p>📞 ${driverPhone}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📱 Suivre ma réservation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center;">
              💡 Conservez ce lien pour suivre l'évolution de votre course en temps réel
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;" />
            
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; color: #059669;"><strong>🎁 Créez votre compte SoloCab</strong></p>
              <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">
                Inscrivez-vous gratuitement pour bénéficier d'un historique de vos courses, de réservations simplifiées et de factures automatiques.
              </p>
            </div>
            
            <p>L'équipe SoloCab</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            <p>SoloCab - Plateforme de mise en relation chauffeurs VTC</p>
            <p>Vous recevez cet email car vous avez effectué une réservation sur SoloCab.</p>
          </div>
        </div>
      `
    });

    if (emailError) {
      console.error("❌ Erreur envoi email:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Marquer que le client a été notifié
    await supabase
      .from("courses")
      .update({ guest_notified_at: new Date().toISOString() })
      .eq("id", course_id);

    console.log("✅ Email de suivi envoyé avec succès:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
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
