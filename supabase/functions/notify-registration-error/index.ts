import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "Abdallahkanoute72@gmail.com";

interface RegistrationErrorPayload {
  step: string;
  email?: string;
  phone?: string;
  fullName?: string;
  errorMessage: string;
  errorCode?: string;
  userId?: string;
  driverId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

// HTML escape to prevent injection
const escapeHtml = (s: string | undefined | null): string => {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max 5 calls per minute per IP

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting by IP
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(clientIP);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    entry.count++;
  } else {
    rateLimitMap.set(clientIP, { count: 1, resetAt: now + 60000 });
  }

  try {
    const payload: RegistrationErrorPayload = await req.json();

    console.log("[notify-registration-error] Received error notification for step:", payload.step);

    const {
      step,
      email,
      phone,
      fullName,
      errorMessage,
      errorCode,
      userId,
      driverId,
      timestamp,
      userAgent,
      url,
    } = payload;

    const formattedTime = new Date(timestamp).toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      dateStyle: "full",
      timeStyle: "long",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚠️ Erreur d'inscription SoloCab</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; text-align: center;">
                ⚠️ ERREUR D'INSCRIPTION DÉTECTÉE
              </h1>
              <p style="margin: 10px 0 0; color: #fecaca; font-size: 14px; text-align: center;">
                Une intervention peut être nécessaire
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Alert Box -->
              <table role="presentation" style="width: 100%; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 16px;">
                      Message d'erreur:
                    </p>
                    <p style="margin: 8px 0 0; color: #7f1d1d; font-family: monospace; font-size: 14px; word-break: break-word;">
                      ${escapeHtml(errorMessage)}
                    </p>
                    ${errorCode ? `<p style="margin: 8px 0 0; color: #991b1b; font-size: 12px;">Code: ${escapeHtml(errorCode)}</p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- User Info -->
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                👤 Informations utilisateur
              </h2>
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;">Étape:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: bold;">
                    <span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px;">
                      ${escapeHtml(step)}
                    </span>
                  </td>
                </tr>
                ${fullName ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Nom:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${escapeHtml(fullName)}</td>
                </tr>` : ""}
                ${email ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Email:</td>
                  <td style="padding: 8px 0; color: #1e293b;">
                    <a href="mailto:${escapeHtml(email)}" style="color: #059669; text-decoration: none;">${escapeHtml(email)}</a>
                  </td>
                </tr>` : ""}
                ${phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Téléphone:</td>
                  <td style="padding: 8px 0; color: #1e293b;">
                    <a href="tel:${escapeHtml(phone)}" style="color: #059669; text-decoration: none;">${escapeHtml(phone)}</a>
                  </td>
                </tr>` : ""}
                ${userId ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">User ID:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-family: monospace; font-size: 12px;">${escapeHtml(userId)}</td>
                </tr>` : ""}
                ${driverId ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Driver ID:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-family: monospace; font-size: 12px;">${escapeHtml(driverId)}</td>
                </tr>` : ""}
              </table>

              <!-- Technical Info -->
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                🔧 Détails techniques
              </h2>
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;">Date/Heure:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${formattedTime}</td>
                </tr>
                ${url ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">URL:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 12px; word-break: break-all;">${escapeHtml(url)}</td>
                </tr>` : ""}
                ${userAgent ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Navigateur:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 11px; word-break: break-all;">${escapeHtml(userAgent)}</td>
                </tr>` : ""}
              </table>

              <!-- Action Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://solocab.fr/admin" 
                       style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      🔍 Accéder au Dashboard Admin
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                Cette notification a été envoyée automatiquement par le système de surveillance SoloCab.
              </p>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">
                © ${new Date().getFullYear()} SoloCab - Surveillance des inscriptions
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Alertes SoloCab <noreply@solocab.fr>",
      to: [ADMIN_EMAIL],
      subject: `⚠️ ERREUR INSCRIPTION - ${step} - ${email || "Utilisateur inconnu"}`,
      html: emailHtml,
    });

    console.log("[notify-registration-error] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[notify-registration-error] Error:", error);
    
    // Don't fail silently - log but return success to not block registration
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200, // Return 200 to not block the user flow
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
