/**
 * Hook pour intégrer le self-healing dans les composants React
 * Démarre automatiquement le service et fournit des utilitaires
 * Inclut maintenant l'appel à platform-maintenance pour les vérifications système
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { selfHealingService } from "@/lib/selfHealingService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SelfHealingState {
  isRunning: boolean;
  lastRunResults: { check_name: string; issues_fixed: number }[];
  platformMaintenanceResults: PlatformMaintenanceResult | null;
}

interface PlatformMaintenanceResult {
  success: boolean;
  timestamp: string;
  total_issues_found: number;
  total_issues_fixed: number;
  learning_applied: string[];
}

/**
 * Hook principal pour le self-healing
 * Démarre automatiquement le service pour les utilisateurs connectés
 */
export function useSelfHealing(autoStart: boolean = true) {
  const { user, userRole } = useAuth();
  const [state, setState] = useState<SelfHealingState>({
    isRunning: false,
    lastRunResults: [],
    platformMaintenanceResults: null
  });
  const maintenanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fonction pour exécuter la maintenance de la plateforme
  const runPlatformMaintenance = useCallback(async () => {
    try {
      console.log('[SELF-HEALING] Running platform maintenance...');
      const { data, error } = await supabase.functions.invoke('platform-maintenance');
      
      if (error) {
        console.error('[SELF-HEALING] Platform maintenance error:', error);
        return null;
      }
      
      console.log('[SELF-HEALING] Platform maintenance completed:', {
        issuesFound: data?.total_issues_found || 0,
        issuesFixed: data?.total_issues_fixed || 0,
        learning: data?.learning_applied || []
      });
      
      setState(prev => ({
        ...prev,
        platformMaintenanceResults: data as PlatformMaintenanceResult
      }));
      
      return data as PlatformMaintenanceResult;
    } catch (error) {
      console.error('[SELF-HEALING] Platform maintenance exception:', error);
      return null;
    }
  }, []);

  // Démarrer/arrêter le service selon l'état de connexion
  useEffect(() => {
    if (autoStart && user) {
      selfHealingService.start(60000); // Check toutes les minutes
      setState(prev => ({ ...prev, isRunning: true }));

      // Pour les admins et chauffeurs, exécuter la maintenance périodiquement
      if (userRole === 'admin' || userRole === 'driver') {
        // Première exécution après 2 minutes
        const initialTimeout = setTimeout(() => {
          runPlatformMaintenance();
          
          // Puis toutes les 30 minutes
          maintenanceIntervalRef.current = setInterval(runPlatformMaintenance, 30 * 60 * 1000);
        }, 2 * 60 * 1000);

        return () => {
          selfHealingService.stop();
          clearTimeout(initialTimeout);
          if (maintenanceIntervalRef.current) {
            clearInterval(maintenanceIntervalRef.current);
          }
          setState(prev => ({ ...prev, isRunning: false }));
        };
      }

      return () => {
        selfHealingService.stop();
        setState(prev => ({ ...prev, isRunning: false }));
      };
    }
  }, [autoStart, user, userRole, runPlatformMaintenance]);

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
    fixMissingInvoices,
    runPlatformMaintenance
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
