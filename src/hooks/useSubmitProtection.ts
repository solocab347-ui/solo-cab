import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";

interface SubmitProtectionOptions {
  /**
   * Délai minimum entre deux soumissions (en ms)
   * @default 5000
   */
  debounceMs?: number;
  /**
   * Message affiché en cas de double-clic
   * @default "Veuillez patienter, votre demande est en cours de traitement..."
   */
  warningMessage?: string;
  /**
   * Clé unique pour identifier différentes soumissions (optionnel)
   */
  uniqueKey?: string;
}

interface SubmitProtectionReturn {
  /**
   * État de chargement
   */
  isSubmitting: boolean;
  /**
   * Wrapper pour protéger une fonction de soumission
   */
  protectedSubmit: <T>(fn: () => Promise<T>) => Promise<T | null>;
  /**
   * Réinitialiser l'état manuellement (utile en cas d'erreur)
   */
  reset: () => void;
  /**
   * Vérifie si une soumission est possible maintenant
   */
  canSubmit: () => boolean;
}

/**
 * Hook pour protéger les formulaires contre les soumissions multiples
 * 
 * @example
 * ```tsx
 * const { isSubmitting, protectedSubmit } = useSubmitProtection();
 * 
 * const handleSubmit = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   
 *   const result = await protectedSubmit(async () => {
 *     // Logique de soumission
 *     return await createCourse(data);
 *   });
 *   
 *   if (result) {
 *     // Succès
 *   }
 * };
 * ```
 */
export function useSubmitProtection(options: SubmitProtectionOptions = {}): SubmitProtectionReturn {
  const {
    debounceMs = 5000,
    warningMessage = "Veuillez patienter, votre demande est en cours de traitement...",
  } = options;

  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const lastSubmitKeyRef = useRef<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    
    // Si déjà en cours de soumission, bloquer
    if (isSubmittingRef.current) {
      return false;
    }
    
    // Si délai non écoulé, bloquer
    if (timeSinceLastSubmit < debounceMs) {
      return false;
    }
    
    return true;
  }, [debounceMs]);

  const reset = useCallback(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  const protectedSubmit = useCallback(async <T>(
    fn: () => Promise<T>,
    submitKey?: string
  ): Promise<T | null> => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    
    // Générer une clé unique si fournie
    const currentKey = submitKey || options.uniqueKey || "";
    
    // Vérification double-submit
    if (isSubmittingRef.current) {
      console.warn("⚠️ [useSubmitProtection] Soumission bloquée - déjà en cours");
      toast.warning(warningMessage);
      return null;
    }
    
    // Vérification du délai avec même clé
    if (timeSinceLastSubmit < debounceMs && currentKey === lastSubmitKeyRef.current) {
      console.warn(`⚠️ [useSubmitProtection] Soumission bloquée - délai non écoulé (${timeSinceLastSubmit}ms < ${debounceMs}ms)`);
      toast.warning(warningMessage);
      return null;
    }
    
    // Marquer comme en cours
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    lastSubmitKeyRef.current = currentKey;
    setIsSubmitting(true);
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      // En cas d'erreur, permettre une nouvelle tentative immédiate
      lastSubmitTimeRef.current = 0;
      throw error;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [debounceMs, warningMessage, options.uniqueKey]);

  return {
    isSubmitting,
    protectedSubmit,
    reset,
    canSubmit,
  };
}

/**
 * Génère une clé unique basée sur les paramètres d'une course
 * Utile pour identifier des soumissions identiques
 */
export function generateSubmitKey(params: Record<string, any>): string {
  const relevantFields = [
    params.pickupAddress,
    params.destinationAddress,
    params.scheduledDate,
    params.clientId || params.guestEmail,
    params.driverId,
  ].filter(Boolean);
  
  return relevantFields.join("|");
}
