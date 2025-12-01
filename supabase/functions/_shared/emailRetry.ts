/**
 * 🔄 EMAIL RETRY MECHANISM
 * Système de retry robuste pour envoi d'emails avec backoff exponentiel
 */

interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Envoie un email avec retry automatique
 */
export async function sendEmailWithRetry(
  resend: any,
  emailParams: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  },
  config: RetryConfig = {}
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any = null;
  let currentDelay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      console.log(`📧 [RETRY] Tentative ${attempt}/${finalConfig.maxAttempts} envoi email à ${emailParams.to[0]}`);
      
      const result = await resend.emails.send(emailParams);
      
      if (result.error) {
        throw new Error(JSON.stringify(result.error));
      }

      console.log(`✅✅✅ [RETRY] Email envoyé avec succès (tentative ${attempt}) - ID: ${result.data?.id}`);
      return {
        success: true,
        emailId: result.data?.id
      };

    } catch (error: any) {
      lastError = error;
      console.error(`❌ [RETRY] Tentative ${attempt} échouée:`, error.message);

      // Si dernier essai, abandonner
      if (attempt === finalConfig.maxAttempts) {
        console.error(`❌❌❌ [RETRY] ÉCHEC DÉFINITIF après ${finalConfig.maxAttempts} tentatives`);
        break;
      }

      // Attendre avant retry avec backoff exponentiel
      console.log(`⏳ [RETRY] Attente ${currentDelay}ms avant retry...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Augmenter délai pour prochain essai
      currentDelay = Math.min(
        currentDelay * finalConfig.backoffMultiplier,
        finalConfig.maxDelayMs
      );
    }
  }

  // Si on arrive ici, tous les essais ont échoué
  return {
    success: false,
    error: lastError?.message || "Erreur inconnue"
  };
}

/**
 * Envoie une alerte admin en cas d'échec email critique
 */
export async function sendAdminAlert(
  resend: any,
  alertDetails: {
    emailType: string;
    recipient: string;
    error: string;
    context?: string;
  }
): Promise<void> {
  try {
    console.log("🚨 [ALERT] Envoi alerte admin pour échec email");
    
    await resend.emails.send({
      from: "SoloCab Alerts <noreply@solocab.fr>",
      to: ["alexandrediarra00@gmail.com"],
      subject: `🚨 Échec Envoi Email - ${alertDetails.emailType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🚨 Alerte Système Email</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
            <h2>Échec d'envoi d'email détecté</h2>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p><strong>Type d'email:</strong> ${alertDetails.emailType}</p>
              <p><strong>Destinataire:</strong> ${alertDetails.recipient}</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            </div>

            <h3>Erreur:</h3>
            <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto;">${alertDetails.error}</pre>

            ${alertDetails.context ? `
              <h3>Contexte:</h3>
              <pre style="background: #374151; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto;">${alertDetails.context}</pre>
            ` : ''}

            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <strong>⚠️ Actions à vérifier:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>RESEND_API_KEY valide</li>
                <li>Domaine solocab.fr vérifié dans Resend</li>
                <li>Rate limits Resend non dépassés</li>
                <li>Email destinataire valide</li>
              </ul>
            </div>

            <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
              Cet email a été généré automatiquement par le système de monitoring SoloCab.
            </p>
          </div>
        </div>
      `
    });

    console.log("✅ [ALERT] Alerte admin envoyée");
  } catch (error: any) {
    console.error("❌ [ALERT] Impossible d'envoyer alerte admin:", error);
    // Ne pas throw - c'est une alerte secondaire
  }
}