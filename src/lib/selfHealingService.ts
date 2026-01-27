/**
 * SELF-HEALING SERVICE (V2)
 * Système d'auto-correction automatique des erreurs connues
 * Chaque erreur corrigée manuellement est enregistrée pour ne plus se reproduire
 * Intégré avec le système d'apprentissage intelligent
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "./productionLogger";
import { errorLearner } from "./intelligentErrorLearner";

interface ErrorLearning {
  id: string;
  error_type: string;
  error_pattern: string;
  description: string;
  auto_fix_enabled: boolean;
  occurrences: number;
}

interface HealthCheckResult {
  check_name: string;
  issues_found: number;
  issues_fixed: number;
}

interface IntegrityIssue {
  type: string;
  entity_id: string;
  description: string;
  fixed: boolean;
}

class SelfHealingService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunTime: number = 0;
  private readonly MIN_INTERVAL_MS = 30000; // 30 secondes minimum entre les runs

  /**
   * Démarre le service de self-healing en arrière-plan
   */
  start(intervalMs: number = 60000) {
    if (this.intervalId) {
      logger.info("Self-healing service already running");
      return;
    }

    logger.info("🔧 Starting self-healing service", { intervalMs });

    // Exécuter immédiatement puis à intervalle régulier
    this.runHealthChecks();
    this.intervalId = setInterval(() => this.runHealthChecks(), intervalMs);
  }

  /**
   * Arrête le service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Self-healing service stopped");
    }
  }

  /**
   * Exécute tous les health checks via la fonction SQL
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    // Éviter les exécutions trop rapprochées
    const now = Date.now();
    if (now - this.lastRunTime < this.MIN_INTERVAL_MS) {
      logger.debug("Health checks skipped - too soon since last run");
      return [];
    }

    if (this.isRunning) {
      logger.debug("Health checks already running");
      return [];
    }

    this.isRunning = true;
    this.lastRunTime = now;

    try {
      const { data, error } = await supabase.rpc('run_health_checks');

      if (error) {
        logger.error("Health checks failed", { error: error.message });
        return [];
      }

      const results = (data || []) as HealthCheckResult[];
      
      // Logger les résultats significatifs
      const fixedTotal = results.reduce((sum, r) => sum + (r.issues_fixed || 0), 0);
      if (fixedTotal > 0) {
        logger.info("✅ Self-healing applied fixes", { 
          totalFixed: fixedTotal,
          details: results.filter(r => r.issues_fixed > 0)
        });
      }

      return results;
    } catch (err) {
      // Enregistrer l'erreur pour apprentissage
      await errorLearner.logError(
        err instanceof Error ? err : new Error(String(err)),
        { entityType: "health_check", context: { phase: "runHealthChecks" } }
      );
      logger.exception(err, { context: "runHealthChecks" });
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Vérifie l'intégrité d'une course spécifique et corrige si nécessaire
   */
  async verifyCourseIntegrity(courseId: string): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      // Récupérer la course avec ses données associées
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
          id, status, client_id, driver_id,
          devis:devis(id, status, amount),
          factures:factures(id, invoice_number, payment_status)
        `)
        .eq('id', courseId)
        .maybeSingle();

      if (courseError || !course) {
        logger.warn("Course not found for integrity check", { courseId });
        return issues;
      }

      // Vérification 1: Course terminée sans facture
      if (course.status === 'completed') {
        const hasInvoice = course.factures && course.factures.length > 0;
        const acceptedDevis = (course.devis as any[])?.find((d: any) => d.status === 'accepted');

        if (!hasInvoice && acceptedDevis) {
          // Auto-correction: créer la facture manquante
          const fixed = await this.createMissingInvoice(
            courseId, 
            course.client_id, 
            course.driver_id, 
            { id: acceptedDevis.id, amount: acceptedDevis.amount }
          );
          
          issues.push({
            type: 'MISSING_INVOICE',
            entity_id: courseId,
            description: 'Course terminée sans facture',
            fixed
          });
        }
      }

      // Vérification 2: Course sans devis
      if (['pending', 'confirmed'].includes(course.status) && (!course.devis || (course.devis as any[]).length === 0)) {
        issues.push({
          type: 'MISSING_DEVIS',
          entity_id: courseId,
          description: 'Course sans devis associé',
          fixed: false // Nécessite une action manuelle ou plus de contexte
        });
      }

      // Logger les problèmes trouvés
      if (issues.length > 0) {
        await this.logIntegrityIssues(issues);
      }

      return issues;
    } catch (err) {
      logger.exception(err, { context: "verifyCourseIntegrity", courseId });
      return issues;
    }
  }

  /**
   * Crée une facture manquante pour une course
   */
  private async createMissingInvoice(
    courseId: string, 
    clientId: string | null, 
    driverId: string | null,
    devis: { id: string; amount: number }
  ): Promise<boolean> {
    try {
      // Générer le numéro de facture
      const { data: lastInvoice } = await supabase
        .from('factures')
        .select('invoice_number')
        .like('invoice_number', 'FAC-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/FAC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const invoiceNumber = `FAC-${String(nextNumber).padStart(6, '0')}`;

      // Créer la facture
      const { error } = await supabase
        .from('factures')
        .insert({
          course_id: courseId,
          client_id: clientId,
          driver_id: driverId,
          devis_id: devis.id,
          amount: devis.amount,
          payment_method: 'pending',
          payment_status: 'pending',
          invoice_number: invoiceNumber
        });

      if (error) {
        logger.error("Failed to create missing invoice", { courseId, error: error.message });
        return false;
      }

      logger.info("✅ Auto-created missing invoice", { courseId, invoiceNumber });

      // Logger la correction
      await this.logAutoFix('MISSING_INVOICE', 'course', courseId, `Created invoice ${invoiceNumber}`, true);

      return true;
    } catch (err) {
      logger.exception(err, { context: "createMissingInvoice", courseId });
      return false;
    }
  }

  /**
   * Enregistre une correction automatique dans les logs
   */
  private async logAutoFix(
    errorType: string,
    entityType: string,
    entityId: string,
    fixApplied: string,
    success: boolean,
    errorMessage?: string
  ) {
    try {
      // Récupérer l'ID du learning correspondant
      const { data: learning } = await supabase
        .from('error_learnings')
        .select('id')
        .eq('error_type', errorType)
        .maybeSingle();

      await supabase
        .from('auto_fix_logs')
        .insert({
          learning_id: learning?.id,
          entity_type: entityType,
          entity_id: entityId,
          fix_applied: fixApplied,
          success,
          error_message: errorMessage
        });

      // Mettre à jour les statistiques du learning manuellement
      if (learning?.id) {
        const field = success ? 'fix_success_count' : 'fix_failure_count';
        const { data: currentLearning } = await supabase
          .from('error_learnings')
          .select(field)
          .eq('id', learning.id)
          .single();
        
        if (currentLearning) {
          await supabase
            .from('error_learnings')
            .update({ [field]: ((currentLearning as any)[field] || 0) + 1 })
            .eq('id', learning.id);
        }
      }
    } catch (err) {
      logger.exception(err, { context: "logAutoFix" });
    }
  }

  /**
   * Enregistre les problèmes d'intégrité trouvés
   */
  private async logIntegrityIssues(issues: IntegrityIssue[]) {
    for (const issue of issues) {
      try {
        // Récupérer la valeur actuelle
        const { data: learning } = await supabase
          .from('error_learnings')
          .select('id, occurrences')
          .eq('error_type', issue.type)
          .maybeSingle();
        
        if (learning) {
          await supabase
            .from('error_learnings')
            .update({
              occurrences: (learning.occurrences || 0) + 1,
              last_occurrence_at: new Date().toISOString()
            })
            .eq('id', learning.id);
        }
      } catch {
        // Ignorer les erreurs de mise à jour des stats
      }
    }
  }

  /**
   * Récupère les statistiques des apprentissages
   */
  async getLearningStats(): Promise<ErrorLearning[]> {
    const { data, error } = await supabase
      .from('error_learnings')
      .select('*')
      .eq('is_active', true)
      .order('occurrences', { ascending: false });

    if (error) {
      logger.error("Failed to fetch learning stats", { error: error.message });
      return [];
    }

    return (data || []) as ErrorLearning[];
  }

  /**
   * Vérifie et corrige les factures manquantes pour toutes les courses terminées
   * Appelé manuellement ou via cron
   */
  async fixAllMissingInvoices(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('auto_create_missing_invoices');

      if (error) {
        logger.error("Failed to run auto_create_missing_invoices", { error: error.message });
        return 0;
      }

      const fixedCount = data || 0;
      if (fixedCount > 0) {
        logger.info(`✅ Auto-created ${fixedCount} missing invoices`);
      }

      return fixedCount;
    } catch (err) {
      logger.exception(err, { context: "fixAllMissingInvoices" });
      return 0;
    }
  }
}

// Instance singleton
export const selfHealingService = new SelfHealingService();

// Export pour les tests
export { SelfHealingService };
