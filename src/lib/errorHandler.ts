/**
 * SYSTÈME CENTRALISÉ DE GESTION D'ERREURS
 * Capture et traite toutes les erreurs de manière uniforme
 */

import { toast } from "sonner";
import { captureError } from "./sentry";

export type ErrorType = "validation" | "network" | "auth" | "database" | "unknown";

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: any;
  context?: string;
}

/**
 * Classe pour gérer les erreurs de manière standardisée
 */
export class AppError extends Error {
  type: ErrorType;
  context?: string;

  constructor(message: string, type: ErrorType = "unknown", context?: string) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.context = context;
  }
}

/**
 * Gestionnaire centralisé d'erreurs avec logging et notifications utilisateur
 */
export function handleError(error: any, context?: string): ErrorDetails {
  console.error(`❌ Error in ${context || "unknown context"}:`, error);

  let errorDetails: ErrorDetails;

  // Analyser le type d'erreur
  if (error instanceof AppError) {
    errorDetails = {
      type: error.type,
      message: error.message,
      context: error.context || context,
      originalError: error,
    };
  } else if (error?.code === "PGRST" || error?.message?.includes("violates")) {
    // Erreur base de données
    errorDetails = {
      type: "database",
      message: "Erreur lors de l'opération en base de données",
      context,
      originalError: error,
    };
  } else if (error?.status === 401 || error?.message?.includes("auth")) {
    // Erreur authentification
    errorDetails = {
      type: "auth",
      message: "Problème d'authentification. Veuillez vous reconnecter",
      context,
      originalError: error,
    };
  } else if (error?.message?.includes("network") || error?.message?.includes("fetch")) {
    // Erreur réseau
    errorDetails = {
      type: "network",
      message: "Problème de connexion. Vérifiez votre internet",
      context,
      originalError: error,
    };
  } else if (error?.name === "ZodError") {
    // Erreur validation Zod
    errorDetails = {
      type: "validation",
      message: error.errors?.[0]?.message || "Données invalides",
      context,
      originalError: error,
    };
  } else {
    // Erreur générique
    errorDetails = {
      type: "unknown",
      message: error?.message || "Une erreur inattendue est survenue",
      context,
      originalError: error,
    };
  }

  // Afficher le toast approprié
  toast.error(errorDetails.message);

  // Envoyer à Sentry pour monitoring (sauf erreurs de validation)
  if (errorDetails.type !== "validation" && errorDetails.originalError) {
    captureError(
      errorDetails.originalError,
      {
        type: errorDetails.type,
        context: errorDetails.context,
        message: errorDetails.message,
      },
      errorDetails.type === "auth" ? "warning" : "error"
    );
  }

  return errorDetails;
}

/**
 * Wrapper pour les fonctions asynchrones avec gestion d'erreurs automatique
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string
): Promise<{ success: true; data: T } | { success: false; error: ErrorDetails }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorDetails = handleError(error, context);
    return { success: false, error: errorDetails };
  }
}

/**
 * Retry une fonction async avec backoff exponentiel
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  context?: string
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Retry ${i + 1}/${maxRetries} failed in ${context}:`, error);
      
      // Attendre avec backoff exponentiel (1s, 2s, 4s...)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  // Toutes les tentatives ont échoué
  throw new AppError(
    `Échec après ${maxRetries} tentatives`,
    "network",
    context
  );
}
