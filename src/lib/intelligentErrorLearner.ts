/**
 * INTELLIGENT ERROR LEARNER
 * Système d'apprentissage automatique des erreurs
 * - Détecte les patterns récurrents
 * - Apprend des corrections manuelles
 * - Applique des corrections automatiques
 * - Génère des alertes intelligentes
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "./productionLogger";
import { captureError } from "./sentry";

// Types pour le système d'apprentissage
export interface ErrorPattern {
  id: string;
  pattern_code: string;
  pattern_name: string;
  severity: "low" | "medium" | "high" | "critical";
  occurrences_count: number;
  learning_confidence: number;
  auto_fix_enabled: boolean;
  consecutive_failures: number;
}

export interface ErrorOccurrence {
  id: string;
  pattern_id: string;
  error_message: string;
  error_stack?: string;
  entity_type?: string;
  entity_id?: string;
  context: Record<string, any>;
  was_auto_fixed: boolean;
  fix_successful?: boolean;
}

export interface LearningRule {
  id: string;
  rule_code: string;
  rule_name: string;
  trigger_condition: {
    error_contains?: string[];
    severity?: string;
    occurrences_threshold?: number;
    consecutive_failures?: number;
    pattern_code?: string;
  };
  action_type: "auto_fix" | "alert" | "escalate" | "disable_feature" | "rollback" | "retry";
  action_config: Record<string, any>;
  priority: number;
}

export interface ErrorAlert {
  id: string;
  pattern_id: string;
  alert_type: "critical" | "warning" | "info" | "learning";
  title: string;
  message: string;
  occurrences_count: number;
}

interface LogErrorResult {
  occurrence_id: string;
  pattern_id: string;
  should_auto_fix: boolean;
  solution_id: string | null;
}

class IntelligentErrorLearner {
  private rules: LearningRule[] = [];
  private rulesLoaded = false;
  private isProcessing = false;

  /**
   * Initialise le système en chargeant les règles d'apprentissage
   */
  async initialize(): Promise<void> {
    try {
      await this.loadRules();
      logger.info("🧠 Intelligent Error Learner initialized", { 
        rulesCount: this.rules.length 
      });
    } catch (error) {
      logger.error("Failed to initialize error learner", { error });
    }
  }

  /**
   * Charge les règles d'apprentissage depuis la base de données
   */
  private async loadRules(): Promise<void> {
    const { data, error } = await supabase
      .from("error_learning_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (error) {
      logger.error("Failed to load learning rules", { error: error.message });
      return;
    }

    this.rules = (data || []).map(r => ({
      id: r.id,
      rule_code: r.rule_code,
      rule_name: r.rule_name,
      trigger_condition: r.trigger_condition as LearningRule["trigger_condition"],
      action_type: r.action_type as LearningRule["action_type"],
      action_config: r.action_config as Record<string, any>,
      priority: r.priority
    }));

    this.rulesLoaded = true;
  }

  /**
   * Enregistre une erreur et déclenche l'apprentissage
   */
  async logError(
    error: Error | string,
    options: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      context?: Record<string, any>;
      browserInfo?: Record<string, any>;
    } = {}
  ): Promise<LogErrorResult | null> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    try {
      // Appeler la fonction SQL pour enregistrer l'erreur
      const { data, error: rpcError } = await supabase.rpc("log_error_with_learning", {
        p_error_message: errorMessage,
        p_error_stack: errorStack || null,
        p_entity_type: options.entityType || null,
        p_entity_id: options.entityId || null,
        p_user_id: options.userId || null,
        p_context: options.context || {},
        p_browser_info: options.browserInfo || {}
      });

      if (rpcError) {
        logger.error("Failed to log error with learning", { error: rpcError.message });
        return null;
      }

      const result = data as unknown as LogErrorResult;

      // Vérifier les règles d'apprentissage
      await this.checkRules(errorMessage, result);

      // Si auto-fix recommandé, tenter la correction
      if (result.should_auto_fix && result.solution_id) {
        await this.attemptAutoFix(result);
      }

      return result;
    } catch (err) {
      logger.exception(err, { context: "logError" });
      return null;
    }
  }

  /**
   * Vérifie les règles d'apprentissage et déclenche les actions appropriées
   */
  private async checkRules(errorMessage: string, logResult: LogErrorResult): Promise<void> {
    if (!this.rulesLoaded) {
      await this.loadRules();
    }

    const lowerMessage = errorMessage.toLowerCase();

    for (const rule of this.rules) {
      const condition = rule.trigger_condition;
      let matches = false;

      // Vérifier si l'erreur contient certains mots-clés
      if (condition.error_contains) {
        matches = condition.error_contains.some(keyword => 
          lowerMessage.includes(keyword.toLowerCase())
        );
      }

      if (matches) {
        await this.executeRuleAction(rule, logResult, errorMessage);
      }
    }
  }

  /**
   * Exécute l'action définie par une règle
   */
  private async executeRuleAction(
    rule: LearningRule, 
    logResult: LogErrorResult,
    errorMessage: string
  ): Promise<void> {
    try {
      // Mettre à jour les stats de la règle
      const { data: currentRule } = await supabase
        .from("error_learning_rules")
        .select("times_triggered")
        .eq("id", rule.id)
        .single();

      await supabase
        .from("error_learning_rules")
        .update({
          times_triggered: (currentRule?.times_triggered || 0) + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq("id", rule.id);

      switch (rule.action_type) {
        case "retry":
          logger.info("🔄 Rule triggered: retry", { rule: rule.rule_code });
          // Le retry est géré au niveau du code appelant
          break;

        case "alert":
          await this.createAlert(logResult.pattern_id, errorMessage, rule.action_config);
          break;

        case "escalate":
          await this.escalateError(logResult.pattern_id, errorMessage);
          break;

        case "disable_feature":
          logger.warn("🚫 Feature disabled by rule", { 
            rule: rule.rule_code,
            config: rule.action_config 
          });
          // TODO: Implémenter la désactivation de feature
          break;

        case "auto_fix":
          // L'auto-fix est déjà géré via should_auto_fix
          break;
      }
    } catch (err) {
      logger.exception(err, { context: "executeRuleAction", rule: rule.rule_code });
    }
  }

  /**
   * Tente une correction automatique
   */
  private async attemptAutoFix(logResult: LogErrorResult): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    const startTime = performance.now();

    try {
      // Récupérer la solution
      const { data: solution, error } = await supabase
        .from("error_solutions")
        .select("*")
        .eq("id", logResult.solution_id)
        .single();

      if (error || !solution) {
        logger.warn("No solution found for auto-fix", { solutionId: logResult.solution_id });
        return false;
      }

      let success = false;

      // Exécuter la fonction de correction si définie
      if (solution.fix_function) {
        try {
          // Appeler via edge function pour isoler l'exécution
          const { data, error: fnError } = await supabase.functions.invoke("error-intelligence", {
            body: {
              action: "execute_fix",
              solution_id: logResult.solution_id,
              occurrence_id: logResult.occurrence_id
            }
          });

          success = !fnError && data?.success;
        } catch (fnErr) {
          logger.error("Auto-fix function failed", { error: fnErr });
        }
      }

      const duration = Math.round(performance.now() - startTime);

      // Enregistrer le résultat
      await supabase.rpc("log_fix_result", {
        p_occurrence_id: logResult.occurrence_id,
        p_solution_id: logResult.solution_id,
        p_was_successful: success,
        p_duration_ms: duration
      });

      if (success) {
        logger.info("✅ Auto-fix successful", { 
          occurrenceId: logResult.occurrence_id,
          duration: `${duration}ms`
        });
      } else {
        logger.warn("⚠️ Auto-fix failed", { 
          occurrenceId: logResult.occurrence_id 
        });
      }

      return success;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Crée une alerte intelligente
   */
  private async createAlert(
    patternId: string, 
    message: string,
    config: Record<string, any>
  ): Promise<void> {
    // Vérifier si une alerte non résolue existe déjà
    const { data: existing } = await supabase
      .from("error_alerts")
      .select("id, occurrences_count")
      .eq("pattern_id", patternId)
      .is("resolved_at", null)
      .single();

    if (existing) {
      // Incrémenter le compteur
      await supabase
        .from("error_alerts")
        .update({
          occurrences_count: existing.occurrences_count + 1,
          last_occurrence_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // Créer une nouvelle alerte
      await supabase
        .from("error_alerts")
        .insert({
          pattern_id: patternId,
          alert_type: config.alert_type || "warning",
          title: "Erreur récurrente détectée",
          message: message.substring(0, 500),
          context: config
        });
    }

    logger.info("🔔 Alert created/updated", { patternId });
  }

  /**
   * Escalade une erreur critique
   */
  private async escalateError(patternId: string, message: string): Promise<void> {
    await this.createAlert(patternId, message, { 
      alert_type: "critical",
      escalated: true 
    });

    // Envoyer à Sentry comme erreur critique
    captureError(
      new Error(`[ESCALATED] ${message}`),
      { patternId, escalated: true },
      "fatal"
    );

    logger.critical("🚨 Error escalated", { patternId, message: message.substring(0, 100) });
  }

  /**
   * Enregistre une correction manuelle pour apprentissage
   */
  async learnFromManualFix(
    patternId: string,
    fixDescription: string,
    options: {
      fixSteps?: Array<{ step: number; description: string; code?: string }>;
      fixCode?: string;
      shouldAutoFix?: boolean;
      userId?: string;
    } = {}
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc("learn_from_manual_fix", {
        p_pattern_id: patternId,
        p_fix_description: fixDescription,
        p_fix_steps: options.fixSteps || [],
        p_fix_code: options.fixCode || null,
        p_should_auto_fix: options.shouldAutoFix || false,
        p_fixed_by: options.userId || null
      });

      if (error) {
        logger.error("Failed to learn from manual fix", { error: error.message });
        return null;
      }

      logger.info("🎓 Learned from manual fix", { 
        patternId, 
        solutionId: data,
        autoFixEnabled: options.shouldAutoFix 
      });

      return data as string;
    } catch (err) {
      logger.exception(err, { context: "learnFromManualFix" });
      return null;
    }
  }

  /**
   * Récupère les métriques d'apprentissage
   */
  async getLearningMetrics(): Promise<any[]> {
    const { data, error } = await supabase
      .from("error_learning_metrics")
      .select("*")
      .order("occurrences_count", { ascending: false });

    if (error) {
      logger.error("Failed to fetch learning metrics", { error: error.message });
      return [];
    }

    return data || [];
  }

  /**
   * Récupère les alertes non résolues
   */
  async getUnresolvedAlerts(): Promise<ErrorAlert[]> {
    const { data, error } = await supabase
      .from("error_alerts")
      .select("*")
      .is("resolved_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch unresolved alerts", { error: error.message });
      return [];
    }

    return (data || []) as ErrorAlert[];
  }

  /**
   * Résout une alerte
   */
  async resolveAlert(
    alertId: string, 
    notes: string, 
    autoResolved: boolean = false
  ): Promise<boolean> {
    const { error } = await supabase
      .from("error_alerts")
      .update({
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
        auto_resolved: autoResolved,
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq("id", alertId);

    if (error) {
      logger.error("Failed to resolve alert", { error: error.message });
      return false;
    }

    logger.info("✅ Alert resolved", { alertId, autoResolved });
    return true;
  }

  /**
   * Active/désactive l'auto-fix pour un pattern
   */
  async toggleAutoFix(patternId: string, enabled: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("error_patterns")
      .update({ auto_fix_enabled: enabled })
      .eq("id", patternId);

    if (error) {
      logger.error("Failed to toggle auto-fix", { error: error.message });
      return false;
    }

    logger.info(`Auto-fix ${enabled ? "enabled" : "disabled"}`, { patternId });
    return true;
  }
}

// Singleton instance
export const errorLearner = new IntelligentErrorLearner();

// Initialiser au chargement
if (typeof window !== "undefined") {
  errorLearner.initialize();
}

// Helper pour intégration facile
export async function logErrorWithLearning(
  error: Error | string,
  context?: Record<string, any>
): Promise<void> {
  await errorLearner.logError(error, { context });
}
