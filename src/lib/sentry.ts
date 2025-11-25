/**
 * SENTRY MONITORING INTEGRATION
 * Monitoring des erreurs et performances en production
 */

import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || "development";

export function initSentry() {
  // Ne pas initialiser Sentry en développement sans DSN
  if (!SENTRY_DSN || ENVIRONMENT === "development") {
    console.log("🔧 Sentry not initialized (dev mode or no DSN)");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance Monitoring
    integrations: [],

    // Sample rate pour les traces de performance
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,

    // Ignore certaines erreurs communes non critiques
    ignoreErrors: [
      // Erreurs réseau courantes
      "NetworkError",
      "Failed to fetch",
      
      // Erreurs d'extensions navigateur
      "Non-Error promise rejection captured",
      
      // Erreurs de scripts externes
      /chrome-extension/,
      /moz-extension/,
    ],

    // Informations contextuelles
    beforeSend(event, hint) {
      // Enrichir l'événement avec des infos custom
      const error = hint.originalException;
      
      if (error instanceof Error) {
        // Ajouter des tags personnalisés
        event.tags = {
          ...event.tags,
          error_type: error.name,
        };

        // Ajouter du contexte supplémentaire
        event.contexts = {
          ...event.contexts,
          app: {
            name: "SoloCab",
            version: import.meta.env.VITE_APP_VERSION || "1.0.0",
          },
        };
      }

      return event;
    },
  });

  console.log("✅ Sentry initialized for", ENVIRONMENT);
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
