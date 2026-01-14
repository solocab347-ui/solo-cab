/**
 * UTILITAIRES POUR FONCTIONS ASYNCHRONES
 * Retry, timeout, et gestion d'erreurs uniformes
 */

import { handleError, AppError } from "./errorHandler";

export interface RetryOptions {
  /**
   * Nombre maximum de tentatives
   * @default 3
   */
  maxRetries?: number;
  /**
   * Délai de base pour le backoff exponentiel (en ms)
   * @default 1000
   */
  baseDelay?: number;
  /**
   * Facteur de multiplication pour le backoff
   * @default 2
   */
  backoffFactor?: number;
  /**
   * Contexte pour le logging
   */
  context?: string;
  /**
   * Callback appelé avant chaque retry
   */
  onRetry?: (attempt: number, error: any) => void;
  /**
   * Condition pour déterminer si une erreur peut être retentée
   */
  shouldRetry?: (error: any) => boolean;
}

/**
 * Exécute une fonction avec retry et backoff exponentiel
 * 
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => supabase.from('courses').insert(data),
 *   { maxRetries: 3, context: 'Création course' }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    context = "async operation",
    onRetry,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Vérifier si l'erreur peut être retentée
      if (!shouldRetry(error)) {
        console.error(`❌ [withRetry] Erreur non-retryable dans ${context}:`, error);
        throw error;
      }
      
      // Log et callback
      console.warn(
        `⚠️ [withRetry] Tentative ${attempt}/${maxRetries} échouée dans ${context}:`,
        error?.message || error
      );
      
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Si c'est la dernière tentative, ne pas attendre
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
        console.log(`⏳ [withRetry] Attente de ${delay}ms avant tentative ${attempt + 1}...`);
        await sleep(delay);
      }
    }
  }

  // Toutes les tentatives ont échoué
  console.error(`❌ [withRetry] Échec après ${maxRetries} tentatives dans ${context}`);
  throw new AppError(
    `Échec après ${maxRetries} tentatives`,
    "network",
    context
  );
}

/**
 * Détermine si une erreur peut être retentée par défaut
 */
function defaultShouldRetry(error: any): boolean {
  // Ne pas retenter les erreurs d'authentification
  if (error?.status === 401 || error?.status === 403) {
    return false;
  }
  
  // Ne pas retenter les erreurs de validation
  if (error?.name === "ZodError" || error?.code === "22P02") {
    return false;
  }
  
  // Ne pas retenter les erreurs de contrainte unique
  if (error?.code === "23505") {
    return false;
  }
  
  // Retenter les erreurs réseau et timeout
  if (
    error?.message?.includes("network") ||
    error?.message?.includes("fetch") ||
    error?.message?.includes("timeout") ||
    error?.code === "ECONNRESET" ||
    error?.code === "ETIMEDOUT"
  ) {
    return true;
  }
  
  // Retenter les erreurs 5xx
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }
  
  // Par défaut, retenter
  return true;
}

/**
 * Attendre un délai donné
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute une fonction avec timeout
 * 
 * @example
 * ```ts
 * const result = await withTimeout(
 *   () => fetchData(),
 *   5000,
 *   'Chargement des données'
 * );
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(
        `Opération expirée après ${timeoutMs}ms`,
        "network",
        context
      ));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Exécute plusieurs fonctions en parallèle avec gestion d'erreurs
 * Retourne les résultats réussis et les erreurs séparément
 */
export async function parallelSafe<T>(
  fns: Array<() => Promise<T>>,
  context?: string
): Promise<{
  results: T[];
  errors: Array<{ index: number; error: any }>;
}> {
  const settled = await Promise.allSettled(fns.map((fn) => fn()));
  
  const results: T[] = [];
  const errors: Array<{ index: number; error: any }> = [];
  
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      console.error(`❌ [parallelSafe] Erreur index ${index} dans ${context}:`, result.reason);
      errors.push({ index, error: result.reason });
    }
  });
  
  return { results, errors };
}

/**
 * Wrapper pour les opérations Supabase avec retry automatique
 * 
 * @example
 * ```ts
 * const { data, error } = await supabaseRetry(
 *   () => supabase.from('courses').insert(data).select().single(),
 *   'Création course'
 * );
 * ```
 */
export async function supabaseRetry<T>(
  fn: () => Promise<{ data: T | null; error: any }>,
  context?: string,
  options: Omit<RetryOptions, 'context'> = {}
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await withRetry(async () => {
      const response = await fn();
      
      // Si erreur Supabase, la lever pour déclencher le retry
      if (response.error) {
        throw response.error;
      }
      
      return response;
    }, { ...options, context });
    
    return result;
  } catch (error: any) {
    // Retourner l'erreur dans le format Supabase
    return { data: null, error };
  }
}
