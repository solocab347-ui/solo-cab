/**
 * GESTIONNAIRE D'ERREURS AMÉLIORÉ
 * Version centralisée avec intégration Sentry et UI cohérente
 * 
 * Fonctionnalités:
 * - Classification automatique des erreurs
 * - Messages utilisateur contextuels
 * - Logging structuré vers Sentry
 * - Retry automatique pour erreurs temporaires
 * - Support du mode offline
 */

import { toast } from "sonner";
import { captureError as sentryCaptureError } from "./sentry";
import { categorizeError, ERROR_MESSAGES, isRetryableError, calculateRetryDelay, RETRY } from "./networkConfig";
import { logger } from "./productionLogger";

export type ErrorCategory = 'network' | 'auth' | 'validation' | 'database' | 'timeout' | 'unknown';

export interface ErrorDetails {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  retryable: boolean;
  originalError?: any;
  context?: string;
  timestamp: number;
}

/**
 * Classe d'erreur applicative standardisée
 */
export class AppError extends Error {
  category: ErrorCategory;
  context?: string;
  retryable: boolean;
  userMessage: string;

  constructor(
    message: string, 
    category: ErrorCategory = 'unknown', 
    context?: string,
    userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.context = context;
    this.retryable = category === 'network' || category === 'timeout';
    this.userMessage = userMessage || ERROR_MESSAGES[category];
  }
}

/**
 * Analyse et traite une erreur de manière centralisée
 */
export function handleError(error: any, context?: string, options?: {
  showToast?: boolean;
  logToSentry?: boolean;
  customMessage?: string;
}): ErrorDetails {
  const {
    showToast = true,
    logToSentry = true,
    customMessage,
  } = options || {};

  const category = categorizeError(error);
  const retryable = isRetryableError(error);
  const userMessage = customMessage || ERROR_MESSAGES[category];

  const details: ErrorDetails = {
    category,
    message: error?.message || 'Unknown error',
    userMessage,
    retryable,
    originalError: error,
    context,
    timestamp: Date.now(),
  };

  // Log local
  logger.error(`[${category}] ${context || 'Error'}`, {
    message: details.message,
    retryable,
    stack: error?.stack?.substring(0, 500),
  });

  // Toast utilisateur
  if (showToast) {
    if (category === 'auth') {
      toast.error(userMessage, {
        action: {
          label: 'Se reconnecter',
          onClick: () => window.location.href = '/login',
        },
      });
    } else if (retryable) {
      toast.error(userMessage, {
        description: 'L\'opération sera retentée automatiquement.',
        duration: 4000,
      });
    } else {
      toast.error(userMessage, { duration: 5000 });
    }
  }

  // Sentry (sauf erreurs de validation/auth normales)
  if (logToSentry && category !== 'validation') {
    sentryCaptureError(
      error,
      { category, context, retryable },
      category === 'auth' ? 'warning' : 'error'
    );
  }

  return details;
}

/**
 * Wrapper pour fonctions async avec gestion d'erreur automatique
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
  options?: { showToast?: boolean; customMessage?: string }
): Promise<{ success: true; data: T } | { success: false; error: ErrorDetails }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorDetails = handleError(error, context, options);
    return { success: false, error: errorDetails };
  }
}

/**
 * Retry une fonction avec backoff exponentiel
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    context?: string;
    onRetry?: (attempt: number, error: any) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? RETRY.MAX_ATTEMPTS;
  const context = options?.context ?? 'operation';
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Ne pas retry les erreurs non-retryables
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Log et callback
      logger.warn(`Retry ${attempt + 1}/${maxRetries} for ${context}`, {
        error: error?.message,
      });
      options?.onRetry?.(attempt + 1, error);
      
      // Attendre avant le prochain retry
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
      }
    }
  }
  
  throw new AppError(
    `Échec après ${maxRetries} tentatives: ${lastError?.message}`,
    'network',
    context
  );
}

/**
 * Décorateur pour ajouter du retry à une méthode de classe
 */
export function Retryable(maxRetries: number = 3) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        { maxRetries, context: propertyKey }
      );
    };
    
    return descriptor;
  };
}

/**
 * Gestionnaire d'erreurs global pour les événements non capturés
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'unhandledRejection', {
      showToast: false,
      logToSentry: true,
    });
  });

  window.addEventListener('error', (event) => {
    handleError(event.error, 'globalError', {
      showToast: false,
      logToSentry: true,
    });
  });
}

/**
 * Wrapper pour les opérations critiques (paiements, etc.)
 * Affiche une UI de chargement et gère les erreurs de manière spéciale
 */
export async function executeCriticalOperation<T>(
  operation: () => Promise<T>,
  options: {
    context: string;
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<{ success: boolean; data?: T; error?: ErrorDetails }> {
  const {
    context,
    loadingMessage = 'Opération en cours...',
    successMessage = 'Opération réussie',
    errorMessage,
  } = options;

  const toastId = toast.loading(loadingMessage);

  try {
    const result = await withRetry(operation, {
      maxRetries: RETRY.MAX_ATTEMPTS_CRITICAL,
      context,
    });

    toast.success(successMessage, { id: toastId });
    return { success: true, data: result };

  } catch (error) {
    const details = handleError(error, context, {
      showToast: false,
      customMessage: errorMessage,
    });

    toast.error(details.userMessage, { id: toastId });
    return { success: false, error: details };
  }
}
