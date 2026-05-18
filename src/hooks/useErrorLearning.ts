/**
 * Hook React pour l'intégration du système d'apprentissage des erreurs
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { errorLearner, ErrorPattern, ErrorAlert } from "@/lib/intelligentErrorLearner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearningMetrics {
  pattern_id: string;
  pattern_code: string;
  pattern_name: string;
  severity: string;
  occurrences_count: number;
  learning_confidence: number;
  auto_fixed_count: number;
  successful_fixes: number;
  manual_fixes_count: number;
  avg_fix_duration_ms: number;
  auto_fix_enabled: boolean;
  is_active: boolean;
}

export function useErrorLearning() {
  const queryClient = useQueryClient();

  // Charger les métriques d'apprentissage
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ["error-learning-metrics"],
    queryFn: () => errorLearner.getLearningMetrics(),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });

  // Charger les alertes non résolues
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["error-alerts-unresolved"],
    queryFn: () => errorLearner.getUnresolvedAlerts(),
    staleTime: 120000,
    refetchInterval: 300000,
  });

  // Mutation pour résoudre une alerte
  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      return errorLearner.resolveAlert(alertId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-alerts-unresolved"] });
      toast.success("Alerte résolue");
    },
    onError: () => {
      toast.error("Erreur lors de la résolution de l'alerte");
    }
  });

  // Mutation pour toggle auto-fix
  const toggleAutoFixMutation = useMutation({
    mutationFn: async ({ patternId, enabled }: { patternId: string; enabled: boolean }) => {
      return errorLearner.toggleAutoFix(patternId, enabled);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["error-learning-metrics"] });
      toast.success(`Auto-fix ${variables.enabled ? "activé" : "désactivé"}`);
    },
    onError: () => {
      toast.error("Erreur lors de la modification");
    }
  });

  // Mutation pour apprendre d'une correction manuelle
  const learnFromFixMutation = useMutation({
    mutationFn: async (params: {
      patternId: string;
      fixDescription: string;
      fixSteps?: Array<{ step: number; description: string; code?: string }>;
      fixCode?: string;
      shouldAutoFix?: boolean;
    }) => {
      return errorLearner.learnFromManualFix(
        params.patternId,
        params.fixDescription,
        {
          fixSteps: params.fixSteps,
          fixCode: params.fixCode,
          shouldAutoFix: params.shouldAutoFix
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-learning-metrics"] });
      toast.success("Correction enregistrée pour apprentissage");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement");
    }
  });

  // Fonction pour déclencher un cycle d'apprentissage
  const runLearningCycle = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("error-intelligence", {
        body: { action: "run_learning_cycle" }
      });

      if (error) throw error;

      toast.success(`Cycle d'apprentissage terminé: ${data.patterns_analyzed} patterns analysés`);
      
      await refetchMetrics();
      await refetchAlerts();

      return data;
    } catch (err) {
      toast.error("Erreur lors du cycle d'apprentissage");
      throw err;
    }
  }, [refetchMetrics, refetchAlerts]);

  // Statistiques agrégées
  const stats = {
    totalPatterns: metrics?.length || 0,
    totalOccurrences: metrics?.reduce((sum: number, m: LearningMetrics) => sum + m.occurrences_count, 0) || 0,
    autoFixEnabled: metrics?.filter((m: LearningMetrics) => m.auto_fix_enabled).length || 0,
    avgConfidence: metrics?.length 
      ? metrics.reduce((sum: number, m: LearningMetrics) => sum + m.learning_confidence, 0) / metrics.length 
      : 0,
    unresolvedAlerts: alerts?.length || 0,
    criticalAlerts: alerts?.filter((a: ErrorAlert) => a.alert_type === "critical").length || 0
  };

  return {
    // Data
    metrics: metrics as LearningMetrics[] || [],
    alerts: alerts as ErrorAlert[] || [],
    stats,
    
    // Loading states
    isLoading: metricsLoading || alertsLoading,
    
    // Actions
    resolveAlert: resolveAlertMutation.mutate,
    toggleAutoFix: toggleAutoFixMutation.mutate,
    learnFromFix: learnFromFixMutation.mutate,
    runLearningCycle,
    
    // Refetch
    refresh: () => {
      refetchMetrics();
      refetchAlerts();
    }
  };
}

/**
 * Hook pour logger les erreurs avec apprentissage automatique
 */
export function useErrorLogger() {
  const logError = useCallback(async (
    error: Error | string,
    context?: {
      entityType?: string;
      entityId?: string;
      additionalContext?: Record<string, any>;
    }
  ) => {
    try {
      const result = await errorLearner.logError(error, {
        entityType: context?.entityType,
        entityId: context?.entityId,
        context: context?.additionalContext,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          online: navigator.onLine,
          url: window.location.href
        }
      });

      return result;
    } catch (err) {
      console.error("Failed to log error with learning:", err);
      return null;
    }
  }, []);

  return { logError };
}

/**
 * Hook pour afficher les alertes critiques
 */
export function useCriticalAlerts() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: alerts } = useQuery({
    queryKey: ["critical-alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("error_alerts")
        .select("*")
        .eq("alert_type", "critical")
        .is("resolved_at", null)
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 120000,
    refetchInterval: 300000
  });

  const visibleAlerts = alerts?.filter(a => !dismissed.includes(a.id)) || [];

  const dismissAlert = useCallback((alertId: string) => {
    setDismissed(prev => [...prev, alertId]);
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await supabase
      .from("error_alerts")
      .update({ 
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq("id", alertId);
    
    setDismissed(prev => [...prev, alertId]);
  }, []);

  return {
    alerts: visibleAlerts,
    hasAlerts: visibleAlerts.length > 0,
    dismissAlert,
    acknowledgeAlert
  };
}
