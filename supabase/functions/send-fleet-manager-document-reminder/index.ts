import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  fleetManagerId?: string; // Optional: send to specific fleet manager
  reminderType?: "registration" | "day3" | "day5" | "day7";
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
        JSON.stringify({ success: true, message: "No reminders needed", sent: 0 }),
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

      // Determine which reminder to send based on days since creation
      let shouldSend = false;
      let emailType = "";
      let subject = "";
      let urgencyLevel = "";

      if (reminderType === "registration" || (daysSinceCreation === 0 && !reminderType)) {
        shouldSend = true;
        emailType = "registration";
        subject = "⚠️ Important: Submit your documents within 7 days";
        urgencyLevel = "normal";
      } else if (reminderType === "day3" || (daysSinceCreation === 3 && !reminderType)) {
        shouldSend = true;
        emailType = "day3";
        subject = "⚠️ Reminder: 4 days left to submit your documents";
        urgencyLevel = "warning";
      } else if (reminderType === "day5" || (daysSinceCreation === 5 && !reminderType)) {
        shouldSend = true;
        emailType = "day5";
        subject = "🚨 URGENT: Only 2 days left to submit your documents!";
        urgencyLevel = "urgent";
      } else if (reminderType === "day7" || (daysSinceCreation >= 7 && !reminderType)) {
        shouldSend = true;
        emailType = "day7";
        subject = "🚨 FINAL WARNING: Submit your documents now to avoid suspension!";
        urgencyLevel = "critical";
      }

      if (!shouldSend) continue;

      const deadlineFormatted = deadline.toLocaleDateString("en-US", {
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  ${urgencyLevel === "critical" ? `
  <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ FINAL WARNING ⚠️</h1>
    <p style="margin: 10px 0 0;">Your account will be SUSPENDED if documents are not submitted!</p>
  </div>
  ` : urgencyLevel === "urgent" ? `
  <div style="background-color: #ea580c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🚨 URGENT REMINDER</h1>
    <p style="margin: 10px 0 0;">Only ${daysUntilDeadline} days left!</p>
  </div>
  ` : urgencyLevel === "warning" ? `
  <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">⚠️ Document Reminder</h1>
    <p style="margin: 10px 0 0;">${daysUntilDeadline} days remaining</p>
  </div>
  ` : `
  <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Welcome to SoloCab!</h1>
    <p style="margin: 10px 0 0;">Complete your registration</p>
  </div>
  `}

  <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    
    <p style="font-size: 16px;">Hello ${fm.contact_name},</p>
    
    ${emailType === "registration" ? `
    <p>Welcome to SoloCab Fleet Manager! Your account for <strong>${fm.company_name}</strong> has been created successfully.</p>
    
    <p>To activate your account and start managing your drivers, you must submit the following documents <strong>within 7 days</strong>:</p>
    ` : emailType === "day3" ? `
    <p>This is a reminder that you have <strong>4 days left</strong> to submit your required documents for <strong>${fm.company_name}</strong>.</p>
    
    <p>The following documents are still required:</p>
    ` : emailType === "day5" ? `
    <p style="color: #ea580c; font-weight: bold;">URGENT: You have only <strong>2 days left</strong> to submit your documents for <strong>${fm.company_name}</strong>!</p>
    
    <p>If documents are not submitted by the deadline, your account will be suspended.</p>
    
    <p>Required documents:</p>
    ` : `
    <p style="color: #dc2626; font-weight: bold;">FINAL WARNING: Your deadline to submit documents has passed or is about to expire!</p>
    
    <p>Your account for <strong>${fm.company_name}</strong> will be <strong>SUSPENDED IMMEDIATELY</strong> if you do not submit the required documents today.</p>
    
    <p>Required documents:</p>
    `}

    <ul style="background-color: white; padding: 20px 20px 20px 40px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <li style="margin-bottom: 10px;"><strong>Kbis Extract</strong> - Company registration document (less than 3 months old)</li>
      <li style="margin-bottom: 10px;"><strong>Transport Capacity Certificate</strong> - Passenger transport capacity attestation</li>
      <li><strong>Insurance Certificate</strong> - Professional liability insurance</li>
    </ul>

    <div style="background-color: ${urgencyLevel === "critical" ? "#fef2f2" : urgencyLevel === "urgent" ? "#fff7ed" : "#fefce8"}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyLevel === "critical" ? "#dc2626" : urgencyLevel === "urgent" ? "#ea580c" : "#f59e0b"};">
      <p style="margin: 0; font-weight: bold;">📅 Deadline: ${deadlineFormatted}</p>
      <p style="margin: 5px 0 0; font-size: 14px;">Time remaining: <strong>${daysUntilDeadline > 0 ? daysUntilDeadline + " days" : "EXPIRED"}</strong></p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://solocab.fr/fleet-manager?tab=documents" 
         style="background-color: ${urgencyLevel === "critical" ? "#dc2626" : "#3b82f6"}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        📁 UPLOAD DOCUMENTS NOW
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b;">
      If you have any questions about the required documents, please contact our support team.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      This is an automated message from SoloCab Fleet Management.<br>
      © ${new Date().getFullYear()} SoloCab - All rights reserved
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

        console.log(`Reminder sent to ${fm.contact_email}:`, emailResponse);
        results.push({
          fleetManagerId: fm.id,
          email: fm.contact_email,
          type: emailType,
          success: true,
        });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${fm.contact_email}:`, emailError);
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
