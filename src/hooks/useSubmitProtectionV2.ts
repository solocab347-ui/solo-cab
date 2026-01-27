/**
 * PROTECTION ANTI-DOUBLE-SOUMISSION RENFORCÉE
 * Version améliorée avec verrouillage côté serveur optionnel
 * 
 * Fonctionnalités:
 * - Debounce configurable (5s standard, 10s critique)
 * - Clé unique par opération pour détecter les doublons
 * - État de chargement visible pour l'UI
 * - Verrouillage optimiste + timeout de sécurité
 * - Support des opérations critiques (paiements)
 */

import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { SUBMIT_PROTECTION } from "@/lib/networkConfig";
import { logger } from "@/lib/productionLogger";

interface SubmitProtectionOptions {
  /**
   * Délai minimum entre deux soumissions (en ms)
   * @default 5000
   */
  debounceMs?: number;
  /**
   * Message affiché en cas de double-clic
   */
  warningMessage?: string;
  /**
   * Clé unique pour identifier différentes soumissions
   */
  uniqueKey?: string;
  /**
   * Mode critique (paiements, etc.) - debounce plus long
   */
  critical?: boolean;
  /**
   * Timeout de sécurité - libère le verrou après X ms si la fonction ne termine pas
   * @default 60000 (1 minute)
   */
  safetyTimeout?: number;
}

interface SubmitProtectionReturn {
  /** État de chargement */
  isSubmitting: boolean;
  /** Wrapper pour protéger une fonction de soumission */
  protectedSubmit: <T>(fn: () => Promise<T>, submitKey?: string) => Promise<T | null>;
  /** Réinitialiser l'état manuellement */
  reset: () => void;
  /** Vérifie si une soumission est possible */
  canSubmit: (submitKey?: string) => boolean;
  /** Temps restant avant possibilité de nouvelle soumission */
  cooldownRemaining: number;
}

// Stockage global des clés de soumission récentes (partagé entre hooks)
const globalSubmitHistory = new Map<string, number>();

// Nettoyage périodique de l'historique (toutes les 30s)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const maxAge = SUBMIT_PROTECTION.CRITICAL_DEBOUNCE_MS * 2;
    for (const [key, timestamp] of globalSubmitHistory.entries()) {
      if (now - timestamp > maxAge) {
        globalSubmitHistory.delete(key);
      }
    }
  }, 30000);
}

/**
 * Hook pour protéger les formulaires contre les soumissions multiples
 */
export function useSubmitProtection(options: SubmitProtectionOptions = {}): SubmitProtectionReturn {
  const {
    debounceMs = options.critical 
      ? SUBMIT_PROTECTION.CRITICAL_DEBOUNCE_MS 
      : SUBMIT_PROTECTION.DEBOUNCE_MS,
    warningMessage = "Veuillez patienter, votre demande est en cours de traitement...",
    uniqueKey = "",
    safetyTimeout = 60000,
  } = options;

  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);
  const lastSubmitKeyRef = useRef<string>("");
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Mettre à jour le cooldown toutes les 100ms quand actif
  const updateCooldown = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    const remaining = Math.max(0, debounceMs - timeSinceLastSubmit);
    setCooldownRemaining(remaining);
    return remaining;
  }, [debounceMs]);

  const canSubmit = useCallback((submitKey?: string): boolean => {
    const now = Date.now();
    const currentKey = submitKey || uniqueKey;
    
    // Si déjà en cours de soumission locale
    if (isSubmittingRef.current) {
      return false;
    }
    
    // Vérifier l'historique global pour cette clé
    const globalLastSubmit = globalSubmitHistory.get(currentKey);
    if (globalLastSubmit && (now - globalLastSubmit) < debounceMs) {
      return false;
    }
    
    // Vérifier le délai local
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    if (timeSinceLastSubmit < debounceMs && currentKey === lastSubmitKeyRef.current) {
      return false;
    }
    
    return true;
  }, [debounceMs, uniqueKey]);

  const reset = useCallback(() => {
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setCooldownRemaining(0);
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const protectedSubmit = useCallback(async <T>(
    fn: () => Promise<T>,
    submitKey?: string
  ): Promise<T | null> => {
    const now = Date.now();
    const currentKey = submitKey || uniqueKey || `submit-${now}`;
    
    // Vérification locale
    if (isSubmittingRef.current) {
      logger.warn("⚠️ [SubmitProtection] Soumission bloquée - déjà en cours");
      toast.warning(warningMessage);
      return null;
    }
    
    // Vérification délai avec même clé
    const globalLastSubmit = globalSubmitHistory.get(currentKey);
    if (globalLastSubmit && (now - globalLastSubmit) < debounceMs) {
      const remaining = Math.ceil((debounceMs - (now - globalLastSubmit)) / 1000);
      logger.warn(`⚠️ [SubmitProtection] Doublon bloqué - même requête récente`, { 
        currentKey, 
        remainingSeconds: remaining 
      });
      toast.warning(`Cette demande a déjà été envoyée. Réessayez dans ${remaining}s.`);
      return null;
    }
    
    const timeSinceLastLocal = now - lastSubmitTimeRef.current;
    if (timeSinceLastLocal < debounceMs && currentKey === lastSubmitKeyRef.current) {
      const remaining = Math.ceil((debounceMs - timeSinceLastLocal) / 1000);
      logger.warn(`⚠️ [SubmitProtection] Délai non écoulé`, { 
        timeSince: timeSinceLastLocal, 
        required: debounceMs 
      });
      toast.warning(`Veuillez patienter ${remaining}s avant de réessayer.`);
      return null;
    }
    
    // Marquer comme en cours
    isSubmittingRef.current = true;
    lastSubmitTimeRef.current = now;
    lastSubmitKeyRef.current = currentKey;
    globalSubmitHistory.set(currentKey, now);
    setIsSubmitting(true);
    
    // Timeout de sécurité pour éviter un blocage permanent
    safetyTimeoutRef.current = setTimeout(() => {
      if (isSubmittingRef.current) {
        logger.error("⚠️ [SubmitProtection] Safety timeout - libération forcée du verrou");
        reset();
      }
    }, safetyTimeout);
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      // En cas d'erreur, permettre une nouvelle tentative immédiate
      lastSubmitTimeRef.current = 0;
      globalSubmitHistory.delete(currentKey);
      throw error;
    } finally {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [debounceMs, warningMessage, uniqueKey, safetyTimeout, reset]);

  return {
    isSubmitting,
    protectedSubmit,
    reset,
    canSubmit,
    cooldownRemaining,
  };
}

/**
 * Génère une clé unique basée sur les paramètres d'une course
 */
export function generateCourseSubmitKey(params: {
  pickupAddress?: string;
  destinationAddress?: string;
  scheduledDate?: string;
  clientId?: string;
  guestEmail?: string;
  driverId?: string;
}): string {
  const fields = [
    params.pickupAddress?.substring(0, 30),
    params.destinationAddress?.substring(0, 30),
    params.scheduledDate,
    params.clientId || params.guestEmail,
    params.driverId,
  ].filter(Boolean);
  
  return `course-${fields.join('|')}`;
}

/**
 * Génère une clé pour les opérations de paiement
 */
export function generatePaymentSubmitKey(params: {
  courseId?: string;
  amount?: number;
  type?: string;
}): string {
  return `payment-${params.courseId}-${params.amount}-${params.type}`;
}

// Note: HOC withSubmitProtection moved to a separate component file to avoid JSX in .ts file
