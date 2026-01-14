/**
 * Hook pour intégrer le self-healing dans les composants React
 * Démarre automatiquement le service et fournit des utilitaires
 */

import { useEffect, useCallback, useState } from "react";
import { selfHealingService } from "@/lib/selfHealingService";
import { useAuth } from "@/hooks/useAuth";

interface SelfHealingState {
  isRunning: boolean;
  lastRunResults: { check_name: string; issues_fixed: number }[];
}

/**
 * Hook principal pour le self-healing
 * Démarre automatiquement le service pour les utilisateurs connectés
 */
export function useSelfHealing(autoStart: boolean = true) {
  const { user } = useAuth();
  const [state, setState] = useState<SelfHealingState>({
    isRunning: false,
    lastRunResults: []
  });

  // Démarrer/arrêter le service selon l'état de connexion
  useEffect(() => {
    if (autoStart && user) {
      selfHealingService.start(60000); // Check toutes les minutes
      setState(prev => ({ ...prev, isRunning: true }));

      return () => {
        selfHealingService.stop();
        setState(prev => ({ ...prev, isRunning: false }));
      };
    }
  }, [autoStart, user]);

  // Fonction pour exécuter manuellement les health checks
  const runHealthChecks = useCallback(async () => {
    const results = await selfHealingService.runHealthChecks();
    setState(prev => ({
      ...prev,
      lastRunResults: results.map(r => ({
        check_name: r.check_name,
        issues_fixed: r.issues_fixed
      }))
    }));
    return results;
  }, []);

  // Fonction pour vérifier une course spécifique
  const verifyCourse = useCallback(async (courseId: string) => {
    return selfHealingService.verifyCourseIntegrity(courseId);
  }, []);

  // Fonction pour corriger toutes les factures manquantes
  const fixMissingInvoices = useCallback(async () => {
    return selfHealingService.fixAllMissingInvoices();
  }, []);

  return {
    ...state,
    runHealthChecks,
    verifyCourse,
    fixMissingInvoices
  };
}

/**
 * Hook pour vérifier automatiquement l'intégrité d'une course
 * À utiliser dans les composants de détail de course
 */
export function useCourseIntegrityCheck(courseId: string | undefined) {
  const [issues, setIssues] = useState<{ type: string; fixed: boolean }[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const checkIntegrity = async () => {
      setIsChecking(true);
      try {
        const foundIssues = await selfHealingService.verifyCourseIntegrity(courseId);
        setIssues(foundIssues.map(i => ({ type: i.type, fixed: i.fixed })));
      } finally {
        setIsChecking(false);
      }
    };

    // Vérifier après un court délai pour ne pas bloquer le rendu
    const timer = setTimeout(checkIntegrity, 1000);
    return () => clearTimeout(timer);
  }, [courseId]);

  return { issues, isChecking, hasIssues: issues.length > 0 };
}
