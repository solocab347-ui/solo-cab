import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ReminderRequest {
  course_id: string;
  employee_id?: string;
  guest_name?: string;
  guest_email?: string;
  invitation_token?: string;
  company_id?: string;
  sent_by: "driver" | "company";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: ReminderRequest = await req.json();

    console.log("[send-payment-reminder] Received request:", body);

    // Récupérer les infos de la course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select(`
        id, pickup_address, destination_address, scheduled_date, driver_id,
        driver:drivers!courses_driver_id_fkey(
          user_id,
          company_name,
          profile:profiles!drivers_user_id_fkey(full_name)
        )
      `)
      .eq("id", body.course_id)
      .single();

    if (courseError || !course) {
      console.error("[send-payment-reminder] Course not found:", courseError);
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const driverName = (course as any).driver?.profile?.full_name || 
                       (course as any).driver?.company_name || 
                       "Votre chauffeur";

    let recipientEmail: string | null = null;
    let recipientName: string | null = null;
    let trackingLink: string | null = null;

    // Cas 1: Invité avec token
    if (body.invitation_token && body.guest_email) {
      recipientEmail = body.guest_email;
      recipientName = body.guest_name || "Cher collaborateur";
      trackingLink = `https://solocab.fr/guest-tracking?token=${body.invitation_token}`;
    }
    // Cas 2: Employé inscrit
    else if (body.employee_id) {
      const { data: employee } = await supabase
        .from("company_employees")
        .select("user_id")
        .eq("id", body.employee_id)
        .single();

      if (employee?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", employee.user_id)
          .single();

        recipientEmail = profile?.email || null;
        recipientName = profile?.full_name || "Cher collaborateur";
        trackingLink = "https://solocab.fr/employee-dashboard";

        // Créer une notification in-app
        await supabase.from("notifications").insert({
          user_id: employee.user_id,
          title: "Confirmation de paiement requise",
          message: `${driverName} vous demande de confirmer le mode de paiement pour votre course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}`,
          type: "payment_reminder",
          data: { course_id: body.course_id }
        });
      }
    }

    // Envoyer l'email si on a une adresse
    if (recipientEmail && RESEND_API_KEY) {
      const courseDate = new Date(course.scheduled_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">SoloCab</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Confirmation de paiement requise</h2>
            
            <p>Bonjour ${recipientName},</p>
            
            <p>${driverName} vous demande de confirmer le mode de paiement pour votre course :</p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f97316;">
              <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${courseDate}</p>
              <p style="margin: 5px 0;"><strong>📍 Départ :</strong> ${course.pickup_address?.split(',')[0]}</p>
              <p style="margin: 5px 0;"><strong>🎯 Arrivée :</strong> ${course.destination_address?.split(',')[0]}</p>
            </div>
            
            <p>Veuillez confirmer comment vous avez réglé cette course :</p>
            <ul>
              <li>Facturation entreprise</li>
              <li>Payé avec la carte entreprise</li>
              <li>Payé à titre personnel (note de frais)</li>
            </ul>
            
            ${trackingLink ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingLink}" style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Confirmer mon paiement
                </a>
              </div>
            ` : ''}
            
            <p style="color: #6b7280; font-size: 14px;">
              Cette confirmation est importante pour sécuriser le paiement de votre chauffeur.
            </p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>SoloCab - Votre partenaire VTC</p>
          </div>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SoloCab <noreply@solocab.fr>",
          to: [recipientEmail],
          subject: `Confirmation de paiement requise - Course du ${new Date(course.scheduled_date).toLocaleDateString('fr-FR')}`,
          html: emailHtml,
        }),
      });

      if (!emailRes.ok) {
        const errorText = await emailRes.text();
        console.error("[send-payment-reminder] Email error:", errorText);
      } else {
        console.log("[send-payment-reminder] Email sent successfully to:", recipientEmail);
      }
    }

    // Si c'est l'entreprise qui relance, notifier aussi via l'invitation
    if (body.sent_by === "company" && body.invitation_token) {
      // Mettre à jour la date de dernière relance sur l'invitation
      await supabase
        .from("company_employee_course_invitations")
        .update({ 
          last_reminder_sent_at: new Date().toISOString() 
        })
        .eq("token", body.invitation_token);
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: !!recipientEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-payment-reminder] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
