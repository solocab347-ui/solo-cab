import { supabase } from '@/integrations/supabase/client';

interface RegistrationErrorPayload {
  step: string;
  email?: string;
  phone?: string;
  fullName?: string;
  errorMessage: string;
  errorCode?: string;
  userId?: string;
  driverId?: string;
}

/**
 * Notifie l'admin d'une erreur d'inscription
 * Ne bloque pas le flux utilisateur en cas d'échec de notification
 */
export async function notifyRegistrationError(payload: RegistrationErrorPayload): Promise<void> {
  try {
    const enrichedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    console.log('[notifyRegistrationError] Sending notification:', enrichedPayload.step);

    // Fire and forget - don't await to not slow down user experience
    supabase.functions.invoke('notify-registration-error', {
      body: enrichedPayload,
    }).then(({ error }) => {
      if (error) {
        console.error('[notifyRegistrationError] Failed to send notification:', error);
      } else {
        console.log('[notifyRegistrationError] Notification sent successfully');
      }
    }).catch((err) => {
      console.error('[notifyRegistrationError] Exception:', err);
    });
  } catch (error) {
    // Silently fail - we don't want to disrupt the user flow
    console.error('[notifyRegistrationError] Error preparing notification:', error);
  }
}
