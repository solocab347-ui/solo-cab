import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  agreement_id?: string;
  run_all?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  try {
    console.log("[COMPANY-PAYMENT-REMINDER] Function started");

    const body: ReminderRequest = await req.json().catch(() => ({}));
    
    // Run graduated reminders function
    const { error: reminderError } = await supabaseClient.rpc('send_graduated_payment_reminders');
    if (reminderError) {
      console.error("[COMPANY-PAYMENT-REMINDER] Error running reminders:", reminderError);
    }
    
    // Run periodic summaries generation
    const { error: summaryError } = await supabaseClient.rpc('generate_periodic_payment_summaries');
    if (summaryError) {
      console.error("[COMPANY-PAYMENT-REMINDER] Error generating summaries:", summaryError);
    }

    // Fetch reminders that need email sending
    const { data: pendingReminders, error: fetchError } = await supabaseClient
      .from("company_payment_reminders")
      .select(`
        *,
        companies:company_id(company_name, contact_email, contact_name),
        drivers:driver_id(
          user_id,
          company_name,
          profiles:user_id(full_name, email)
        )
      `)
      .eq("email_sent", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("[COMPANY-PAYMENT-REMINDER] Error fetching reminders:", fetchError);
      throw fetchError;
    }

    console.log(`[COMPANY-PAYMENT-REMINDER] Found ${pendingReminders?.length || 0} reminders to email`);

    let emailsSent = 0;

    for (const reminder of pendingReminders || []) {
      const company = reminder.companies;
      const driver = reminder.drivers;
      const driverProfile = driver?.profiles;
      
      if (!company?.contact_email) {
        console.log(`[COMPANY-PAYMENT-REMINDER] Skipping - no company email for reminder ${reminder.id}`);
        continue;
      }

      let subject: string;
      let html: string;
      const driverName = driverProfile?.full_name || driver?.company_name || "Chauffeur";
      const amount = reminder.amount_due;

      if (reminder.reminder_level === 1) {
        subject = `⏰ Rappel : Paiement de ${amount}€ en attente - ${driverName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">⏰ Rappel de paiement</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
              <p>Bonjour ${company.contact_name || 'Madame, Monsieur'},</p>
              
              <p>Ce message est un rappel concernant un paiement en attente pour votre partenariat avec <strong>${driverName}</strong>.</p>
              
              <div style="background: #fff7ed; border: 2px solid #f97316; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #ea580c; margin-top: 0;">💳 Montant dû : ${amount}€</h2>
                <p style="margin: 0;">Échéance dépassée depuis 1 jour</p>
              </div>
              
              <h3>📋 Actions recommandées :</h3>
              <ol>
                <li>Connectez-vous à votre espace entreprise SoloCab</li>
                <li>Accédez à la section "Paiements"</li>
                <li>Effectuez le paiement et téléversez le justificatif</li>
              </ol>
              
              <p style="margin-top: 30px;">Cordialement,<br>L'équipe SoloCab</p>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
              SoloCab - Plateforme de gestion VTC<br>
              www.solocab.fr
            </div>
          </div>
        `;
      } else if (reminder.reminder_level === 2) {
        subject = `⚠️ URGENT : Paiement de ${amount}€ en retard - ${driverName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316, #dc2626); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">⚠️ Paiement en retard</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
              <p>Bonjour ${company.contact_name || 'Madame, Monsieur'},</p>
              
              <p><strong>Votre paiement est en retard depuis 3 jours.</strong></p>
              
              <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #dc2626; margin-top: 0;">🚨 Montant dû : ${amount}€</h2>
                <p style="margin: 0;">Partenaire : ${driverName}</p>
                <p style="margin: 0; margin-top: 8px;"><strong>Action requise immédiatement</strong></p>
              </div>
              
              <p>Le non-paiement dans les délais convenus peut affecter votre relation commerciale avec ce partenaire.</p>
              
              <h3>💳 Comment régulariser :</h3>
              <ol>
                <li>Connectez-vous à votre espace entreprise</li>
                <li>Accédez aux "Paiements"</li>
                <li>Effectuez le virement ou paiement convenu</li>
                <li>Notifiez le paiement avec le justificatif</li>
              </ol>
              
              <p style="margin-top: 30px;">Cordialement,<br>L'équipe SoloCab</p>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
              SoloCab - Plateforme de gestion VTC<br>
              www.solocab.fr
            </div>
          </div>
        `;
      } else {
        // Level 3 - Critical
        subject = `🚨 CRITIQUE : Paiement de ${amount}€ en retard depuis 7 jours - ${driverName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">🚨 ALERTE CRITIQUE</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
              <p>Bonjour ${company.contact_name || 'Madame, Monsieur'},</p>
              
              <div style="background: #fef2f2; border: 3px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">⚠️ Paiement critique en retard</h2>
                <p style="font-size: 18px; margin: 0;"><strong>Montant : ${amount}€</strong></p>
                <p style="margin: 8px 0 0 0;">Partenaire : ${driverName}</p>
                <p style="margin: 8px 0 0 0; color: #dc2626;"><strong>Retard : 7 jours ou plus</strong></p>
              </div>
              
              <h3 style="color: #dc2626;">⚠️ Conséquences possibles :</h3>
              <ul>
                <li>Suspension de la relation commerciale par le chauffeur</li>
                <li>Impossibilité de réserver de nouvelles courses</li>
                <li>Signalement sur la plateforme</li>
              </ul>
              
              <h3>💳 Action immédiate requise :</h3>
              <p>Veuillez régulariser ce paiement dans les plus brefs délais pour maintenir votre partenariat.</p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://solocab.fr/company-dashboard?tab=payments" 
                   style="background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Régulariser maintenant
                </a>
              </div>
              
              <p style="margin-top: 30px;">Cordialement,<br>L'équipe SoloCab</p>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px;">
              SoloCab - Plateforme de gestion VTC<br>
              www.solocab.fr
            </div>
          </div>
        `;
        
        // Also send email to driver for level 3
        if (resend && driverProfile?.email) {
          try {
            await resend.emails.send({
              from: "SoloCab <noreply@solocab.fr>",
              to: [driverProfile.email],
              subject: `⚠️ Paiement en retard de ${company.company_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #f97316, #dc2626); padding: 20px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0;">⚠️ Paiement en retard</h1>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
                    <p>Bonjour ${driverProfile.full_name},</p>
                    
                    <p>Nous vous informons qu'un paiement de <strong>${company.company_name}</strong> est en retard depuis plus de 7 jours.</p>
                    
                    <div style="background: #fff7ed; border: 2px solid #f97316; padding: 16px; border-radius: 8px; margin: 20px 0;">
                      <h2 style="color: #ea580c; margin-top: 0;">Montant attendu : ${amount}€</h2>
                      <p style="margin: 0;">L'entreprise a été relancée à plusieurs reprises.</p>
                    </div>
                    
                    <p>Vous pouvez contacter directement l'entreprise ou consulter votre espace chauffeur pour plus de détails.</p>
                    
                    <p style="margin-top: 30px;">Cordialement,<br>L'équipe SoloCab</p>
                  </div>
                </div>
              `,
            });
            console.log(`[COMPANY-PAYMENT-REMINDER] Driver notification email sent to ${driverProfile.email}`);
          } catch (driverEmailError) {
            console.error("[COMPANY-PAYMENT-REMINDER] Error sending driver email:", driverEmailError);
          }
        }
      }

      // Send email to company
      if (resend) {
        try {
          await resend.emails.send({
            from: "SoloCab <noreply@solocab.fr>",
            to: [company.contact_email],
            subject: subject,
            html: html,
          });

          // Mark as sent
          await supabaseClient
            .from("company_payment_reminders")
            .update({ email_sent: true })
            .eq("id", reminder.id);

          emailsSent++;
          console.log(`[COMPANY-PAYMENT-REMINDER] Email sent to ${company.contact_email} (level ${reminder.reminder_level})`);
        } catch (emailError) {
          console.error("[COMPANY-PAYMENT-REMINDER] Error sending email:", emailError);
        }
      } else {
        console.log("[COMPANY-PAYMENT-REMINDER] Resend not configured, skipping email");
      }
    }

    console.log(`[COMPANY-PAYMENT-REMINDER] Completed. Emails sent: ${emailsSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: emailsSent,
        reminders_processed: pendingReminders?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[COMPANY-PAYMENT-REMINDER] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});