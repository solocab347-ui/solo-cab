/**
 * SENTRY MONITORING INTEGRATION
 * - Web : @sentry/react
 * - Native (Capacitor) : @sentry/capacitor + @sentry/react avec contexte device
 *   (modèle, OS, version Android/iOS, release tracking)
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || "development";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

const isNative = typeof (globalThis as any)?.Capacitor !== "undefined"
  && (globalThis as any).Capacitor?.isNativePlatform?.() === true;

export async function initSentry() {
  if (!SENTRY_DSN || ENVIRONMENT === "development") {
    console.log("🔧 Sentry not initialized (dev mode or no DSN)");
    return;
  }

  const commonOptions = {
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `solocab@${APP_VERSION}`,
    dist: APP_VERSION,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
    maxBreadcrumbs: 100,
    ignoreErrors: [
      "NetworkError",
      "Failed to fetch",
      "Non-Error promise rejection captured",
      /chrome-extension/,
      /moz-extension/,
    ],
    beforeSend(event: any, hint: any) {
      const error = hint?.originalException;
      if (error instanceof Error) {
        event.tags = { ...event.tags, error_type: error.name };
      }
      event.contexts = {
        ...event.contexts,
        app: { name: "SoloCab", version: APP_VERSION, native: isNative },
      };
      return event;
    },
  };

  try {
    if (isNative) {
      // Init Capacitor SDK avec le SDK React imbriqué
      const cap: any = await import("@sentry/capacitor");
      cap.init(
        { ...commonOptions, dist: APP_VERSION },
        Sentry.init,
      );

      // Enrichit avec device info
      try {
        const { Device } = await import("@capacitor/device");
        const [info, id] = await Promise.all([Device.getInfo(), Device.getId()]);
        Sentry.setContext("device", {
          model: info.model,
          manufacturer: info.manufacturer,
          os: info.operatingSystem,
          os_version: info.osVersion,
          android_sdk: info.androidSDKVersion,
          platform: info.platform,
          web_view_version: info.webViewVersion,
          identifier: id?.identifier,
        });
        Sentry.setTag("device.model", info.model ?? "unknown");
        Sentry.setTag("device.os", `${info.operatingSystem} ${info.osVersion}`);
      } catch (e) {
        console.warn("[sentry] device context fail", e);
      }
    } else {
      Sentry.init(commonOptions);
    }
    console.log("✅ Sentry initialized for", ENVIRONMENT, isNative ? "(native)" : "(web)");
  } catch (e) {
    console.error("[sentry] init failed", e);
  }
}

/**
 * Capturer une erreur manuellement avec contexte
 */
export function captureError(
  error: Error,
  context?: { [key: string]: any },
  level: Sentry.SeverityLevel = "error"
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context) {
      scope.setContext("additional_info", context);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capturer un message personnalisé
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: { [key: string]: any }
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context) {
      scope.setContext("additional_info", context);
    }
    
    Sentry.captureMessage(message);
  });
}

/**
 * Définir l'utilisateur courant pour tracking
 */
export function setUser(userId: string, email?: string, role?: string) {
  Sentry.setUser({
    id: userId,
    email,
    role,
  });
}

/**
 * Nettoyer les infos utilisateur (logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Ajouter un breadcrumb (fil d'ariane) pour tracer les actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = "info",
  data?: { [key: string]: any }
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Mesurer une transaction de performance
 */
export function measurePerformance(name: string, fn: () => void) {
  const startTime = performance.now();
  
  try {
    fn();
  } finally {
    const duration = performance.now() - startTime;
    
    addBreadcrumb(
      `${name} completed in ${duration.toFixed(2)}ms`,
      "performance",
      "info",
      { duration }
    );
  }
}
