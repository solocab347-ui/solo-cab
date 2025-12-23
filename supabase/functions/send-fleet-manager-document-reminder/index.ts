import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  fleetManagerId?: string;
  reminderType?: "day3" | "day5" | "day7";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fleetManagerId, reminderType } = await req.json() as ReminderRequest;

    // Get fleet managers who need reminders
    let query = supabase
      .from("fleet_managers")
      .select(`
        id,
        company_name,
        contact_email,
        contact_name,
        documents_status,
        documents_deadline,
        created_at
      `)
      .in("documents_status", ["pending", null])
      .not("documents_deadline", "is", null);

    if (fleetManagerId) {
      query = query.eq("id", fleetManagerId);
    }

    const { data: fleetManagers, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching fleet managers:", fetchError);
      throw fetchError;
    }

    if (!fleetManagers || fleetManagers.length === 0) {
      console.log("No fleet managers need reminders");
      return new Response(
        JSON.stringify({ success: true, message: "Aucune relance nécessaire", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];
    const now = new Date();

    for (const fm of fleetManagers) {
      const deadline = new Date(fm.documents_deadline);
      const createdAt = new Date(fm.created_at);
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let shouldSend = false;
      let emailType = "";
      let subject = "";
      let urgencyLevel = "";

      // Relance J+3 (4 jours restants)
      if (reminderType === "day3" || (daysSinceCreation === 3 && !reminderType)) {
        shouldSend = true;
        emailType = "day3";
        subject = "⚠️ Rappel : Plus que 4 jours pour soumettre vos documents";
        urgencyLevel = "warning";
      } 
      // Relance J+5 (2 jours restants)
      else if (reminderType === "day5" || (daysSinceCreation === 5 && !reminderType)) {
        shouldSend = true;
        emailType = "day5";
        subject = "🚨 URGENT : Plus que 2 jours pour soumettre vos documents !";
        urgencyLevel = "urgent";
      } 
      // Relance J+7 (dernier jour/dépassé)
      else if (reminderType === "day7" || (daysSinceCreation >= 7 && !reminderType)) {
        shouldSend = true;
        emailType = "day7";
        subject = "🚨 DERNIER RAPPEL : Soumettez vos documents maintenant !";
        urgencyLevel = "critical";
      }

      if (!shouldSend) continue;

      const deadlineFormatted = deadline.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  ${urgencyLevel === "critical" ? `
  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ DERNIER RAPPEL ⚠️</h1>
    <p style="margin: 10px 0 0;">Votre compte sera suspendu si les documents ne sont pas soumis !</p>
  </div>
  ` : urgencyLevel === "urgent" ? `
  <div style="background-color: #ea580c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🚨 RAPPEL URGENT</h1>
    <p style="margin: 10px 0 0;">Plus que ${daysUntilDeadline} jours !</p>
  </div>
  ` : `
  <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ Rappel Documents</h1>
    <p style="margin: 10px 0 0;">${daysUntilDeadline} jours restants</p>
  </div>
  `}

  <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    
    <p style="font-size: 16px;">Bonjour ${fm.contact_name},</p>
    
    ${emailType === "day3" ? `
    <p>Ceci est un rappel : il vous reste <strong>4 jours</strong> pour soumettre les documents requis pour <strong>${fm.company_name}</strong>.</p>
    
    <p>Les documents suivants sont toujours en attente :</p>
    ` : emailType === "day5" ? `
    <p style="color: #ea580c; font-weight: bold;">URGENT : Il ne vous reste plus que <strong>2 jours</strong> pour soumettre vos documents pour <strong>${fm.company_name}</strong> !</p>
    
    <p>Si les documents ne sont pas soumis avant la date limite, votre compte sera suspendu.</p>
    
    <p>Documents requis :</p>
    ` : `
    <p style="color: #dc2626; font-weight: bold;">DERNIER RAPPEL : Votre délai pour soumettre les documents est dépassé ou sur le point d'expirer !</p>
    
    <p>Votre compte <strong>${fm.company_name}</strong> sera <strong>SUSPENDU IMMÉDIATEMENT</strong> si vous ne soumettez pas les documents requis aujourd'hui.</p>
    
    <p>Documents requis :</p>
    `}

    <ul style="background-color: white; padding: 20px 20px 20px 40px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <li style="margin-bottom: 10px;"><strong>Extrait Kbis</strong> - Document d'immatriculation de moins de 3 mois</li>
      <li style="margin-bottom: 10px;"><strong>Attestation de capacité de transport</strong> - Pour le transport de personnes</li>
      <li><strong>Attestation d'assurance</strong> - Responsabilité civile professionnelle</li>
    </ul>

    <div style="background-color: ${urgencyLevel === "critical" ? "#fef2f2" : urgencyLevel === "urgent" ? "#fff7ed" : "#fefce8"}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyLevel === "critical" ? "#dc2626" : urgencyLevel === "urgent" ? "#ea580c" : "#f59e0b"};">
      <p style="margin: 0; font-weight: bold;">📅 Date limite : ${deadlineFormatted}</p>
      <p style="margin: 5px 0 0; font-size: 14px;">Temps restant : <strong>${daysUntilDeadline > 0 ? daysUntilDeadline + " jours" : "EXPIRÉ"}</strong></p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://solocab.fr/fleet-manager?tab=documents" 
         style="background-color: ${urgencyLevel === "critical" ? "#dc2626" : "#3b82f6"}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        📁 SOUMETTRE MES DOCUMENTS
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      Si vous avez des questions concernant les documents requis, n'hésitez pas à contacter notre équipe support.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      Ce message est un email automatique de SoloCab.<br>
      © ${new Date().getFullYear()} SoloCab - Tous droits réservés
    </p>
  </div>
</body>
</html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "SoloCab <noreply@solocab.fr>",
          to: [fm.contact_email],
          subject,
          html: emailHtml,
        });

        console.log(`✅ Rappel envoyé à ${fm.contact_email}:`, emailResponse);
        results.push({
          fleetManagerId: fm.id,
          email: fm.contact_email,
          type: emailType,
          success: true,
        });
      } catch (emailError: any) {
        console.error(`❌ Échec envoi email à ${fm.contact_email}:`, emailError);
        results.push({
          fleetManagerId: fm.id,
          email: fm.contact_email,
          type: emailType,
          success: false,
          error: emailError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-fleet-manager-document-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
