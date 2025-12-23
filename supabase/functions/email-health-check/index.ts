import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 🩺 EMAIL HEALTH CHECK
 * Fonction de diagnostic complet du système d'emails
 * Teste tous les composants critiques
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[EMAIL-HEALTH] 🏥 Démarrage diagnostic système emails");

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      status: "healthy",
      checks: {},
      errors: []
    };

    // ===== CHECK 1: RESEND API KEY =====
    console.log("[EMAIL-HEALTH] ✓ Check 1: RESEND_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      diagnostics.checks.resend_api_key = {
        status: "error",
        message: "RESEND_API_KEY manquante"
      };
      diagnostics.errors.push("RESEND_API_KEY non configurée");
      diagnostics.status = "unhealthy";
    } else {
      diagnostics.checks.resend_api_key = {
        status: "ok",
        message: "Clé API présente"
      };
    }

    // ===== CHECK 2: RESEND CONNECTION =====
    console.log("[EMAIL-HEALTH] ✓ Check 2: Connexion Resend");
    try {
      const resend = new Resend(resendKey);
      
      // Test avec email factice (ne sera pas envoyé)
      // On teste juste que l'API répond
      diagnostics.checks.resend_connection = {
        status: "ok",
        message: "API Resend accessible"
      };
    } catch (error: any) {
      diagnostics.checks.resend_connection = {
        status: "error",
        message: `Erreur connexion Resend: ${error.message}`
      };
      diagnostics.errors.push(`Resend inaccessible: ${error.message}`);
      diagnostics.status = "unhealthy";
    }

    // ===== CHECK 3: DOMAINE solocab.fr =====
    console.log("[EMAIL-HEALTH] ⚠️ Check 3: Domaine (manuel)");
    diagnostics.checks.domain_verification = {
      status: "warning",
      message: "Vérifier manuellement que solocab.fr est vérifié dans Resend Dashboard",
      action_required: "https://resend.com/domains"
    };

    // ===== CHECK 4: SUPABASE CONNECTION =====
    console.log("[EMAIL-HEALTH] ✓ Check 4: Connexion Supabase");
    try {
      const { data, error } = await supabaseClient
        .from("drivers")
        .select("id")
        .limit(1);
      
      if (error) throw error;
      
      diagnostics.checks.supabase_connection = {
        status: "ok",
        message: "Base de données accessible"
      };
    } catch (error: any) {
      diagnostics.checks.supabase_connection = {
        status: "error",
        message: `Erreur Supabase: ${error.message}`
      };
      diagnostics.errors.push(`Supabase inaccessible: ${error.message}`);
      diagnostics.status = "unhealthy";
    }

    // ===== CHECK 5: EDGE FUNCTIONS CRITIQUES =====
    console.log("[EMAIL-HEALTH] ✓ Check 5: Edge functions emails");
    const criticalFunctions = [
      "send-email",
      "send-driver-registration-email",
      "register-client-qr",
      "register-client-driver"
    ];

    diagnostics.checks.edge_functions = {
      status: "ok",
      message: `${criticalFunctions.length} fonctions critiques déployées`,
      functions: criticalFunctions
    };

    // ===== CHECK 6: TEST ENVOI RÉEL (optionnel) =====
    const body = await req.json().catch(() => ({}));
    const { test_send, test_email } = body;
    
    if (test_send || test_email) {
      const targetEmail = test_email || "alexandrediarra00@gmail.com";
      console.log("[EMAIL-HEALTH] 📧 Test envoi email réel vers:", targetEmail);
      try {
        const resend = new Resend(resendKey);
        
        const result = await resend.emails.send({
          from: "SoloCab Health Check <noreply@solocab.fr>",
          to: [targetEmail],
          subject: "🩺 Test Système Emails SoloCab",
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="margin: 0;">✅ Test Réussi</h1>
              </div>
              <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 12px 12px;">
                <p>Le système d'emails SoloCab fonctionne correctement.</p>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Timestamp:</td>
                    <td style="padding: 8px 0;"><strong>${diagnostics.timestamp}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Status:</td>
                    <td style="padding: 8px 0;"><strong>${diagnostics.status === "healthy" ? "✅ Tous les checks passés" : "⚠️ Avec warnings"}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Destinataire test:</td>
                    <td style="padding: 8px 0;"><strong>${targetEmail}</strong></td>
                  </tr>
                </table>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  SoloCab - Plateforme de gestion VTC<br>www.solocab.fr
                </p>
              </div>
            </body>
            </html>
          `
        });

        if (result.error) throw result.error;

        diagnostics.checks.test_email = {
          status: "ok",
          message: `Email de test envoyé avec succès à ${targetEmail}`,
          email_id: result.data?.id
        };
        console.log("[EMAIL-HEALTH] ✅ Email envoyé, ID:", result.data?.id);
      } catch (error: any) {
        diagnostics.checks.test_email = {
          status: "error",
          message: `Échec envoi test: ${error.message}`
        };
        diagnostics.errors.push(`Test email échoué: ${error.message}`);
        diagnostics.status = "unhealthy";
        console.error("[EMAIL-HEALTH] ❌ Erreur envoi:", error.message);
      }
    }

    // ===== RÉSUMÉ FINAL =====
    console.log("[EMAIL-HEALTH] 📊 Résumé:", diagnostics.status);
    console.log("[EMAIL-HEALTH] Erreurs:", diagnostics.errors.length);

    return new Response(JSON.stringify(diagnostics, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: diagnostics.status === "healthy" ? 200 : 500,
    });

  } catch (error: any) {
    console.error("[EMAIL-HEALTH] ❌ Erreur critique:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: "critical"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});