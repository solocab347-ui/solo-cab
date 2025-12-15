/**
 * REGRESSION GUARD
 * Système de protection contre les régressions
 * Détecte et prévient les effets de bord des modifications
 */

import { logger } from './productionLogger';
import { criticalPathValidator } from './criticalPathValidator';
import { featureRegistry } from './featureRegistry';

type FeatureStatus = 'ok' | 'warning' | 'error';

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  features: {
    id: string;
    status: FeatureStatus;
    lastCheck: Date;
    message?: string;
  }[];
  lastFullCheck: Date | null;
}

export interface RegressionAlert {
  timestamp: Date;
  severity: 'warning' | 'error' | 'critical';
  feature: string;
  message: string;
  suggestedAction: string;
}

class RegressionGuard {
  private healthStatus: HealthStatus = {
    overall: 'healthy',
    features: [],
    lastFullCheck: null
  };
  
  private alerts: RegressionAlert[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Démarrer les vérifications périodiques en production
    if (typeof window !== 'undefined') {
      this.startPeriodicChecks();
    }
  }

  /**
   * Démarrer les vérifications périodiques
   */
  startPeriodicChecks(intervalMs: number = 60000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    logger.info('RegressionGuard: vérifications périodiques activées', { interval: intervalMs });
  }

  /**
   * Arrêter les vérifications périodiques
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Effectuer une vérification de santé complète
   */
  async performHealthCheck(): Promise<HealthStatus> {
    logger.debug('RegressionGuard: démarrage health check');

    // Exécuter la validation des chemins critiques
    const validation = await criticalPathValidator.validateAll();

    // Mettre à jour le statut
    const features: HealthStatus['features'] = featureRegistry.getAll().map(f => {
      const relatedTests = validation.failedTests.filter(t => 
        t.includes(f.id) || f.tables.some(table => t.includes(table))
      );

      return {
        id: f.id,
        status: relatedTests.length > 0 ? 'error' : 'ok',
        lastCheck: new Date(),
        message: relatedTests.length > 0 ? `Tests échoués: ${relatedTests.join(', ')}` : undefined
      };
    });

    const errorCount = features.filter(f => f.status === 'error').length;
    const warningCount = features.filter(f => f.status === 'warning').length;

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (errorCount > 0) {
      overall = errorCount > 2 ? 'critical' : 'degraded';
    } else if (warningCount > 0) {
      overall = 'degraded';
    }

    this.healthStatus = {
      overall,
      features,
      lastFullCheck: new Date()
    };

    // Générer des alertes si nécessaire
    if (overall !== 'healthy') {
      this.generateAlerts(features.filter(f => f.status !== 'ok'));
    }

    return this.healthStatus;
  }

  /**
   * Générer des alertes pour les problèmes détectés
   */
  private generateAlerts(problematicFeatures: HealthStatus['features']) {
    problematicFeatures.forEach(f => {
      const feature = featureRegistry.get(f.id);
      if (!feature) return;

      // Éviter les alertes en double
      const recentAlert = this.alerts.find(
        a => a.feature === f.id && 
        (Date.now() - a.timestamp.getTime()) < 300000 // 5 minutes
      );

      if (!recentAlert) {
        const alert: RegressionAlert = {
          timestamp: new Date(),
          severity: f.status === 'error' ? 'error' : 'warning',
          feature: f.id,
          message: f.message || `La fonctionnalité ${feature.name} présente des anomalies`,
          suggestedAction: this.getSuggestedAction(feature)
        };

        this.alerts.push(alert);
        logger.warn('🚨 Alerte régression détectée', alert);
      }
    });

    // Garder seulement les 50 dernières alertes
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  /**
   * Obtenir l'action suggérée pour une feature problématique
   */
  private getSuggestedAction(feature: ReturnType<typeof featureRegistry.get>): string {
    if (!feature) return 'Vérifier les logs';

    const graph = featureRegistry.getDependencyGraph(feature.id);
    
    if (feature.edgeFunctions.length > 0) {
      return `Vérifier les edge functions: ${feature.edgeFunctions.join(', ')}`;
    }

    if (feature.tables.length > 0) {
      return `Vérifier les tables et RLS: ${feature.tables.join(', ')}`;
    }

    if (graph && graph.directDependencies.length > 0) {
      return `Vérifier les dépendances: ${graph.directDependencies.join(', ')}`;
    }

    return 'Exécuter les tests manuellement et vérifier les logs';
  }

  /**
   * Obtenir le statut de santé actuel
   */
  getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }

  /**
   * Obtenir les alertes récentes
   */
  getAlerts(limit: number = 10): RegressionAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Effacer les alertes
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Vérifier si une modification est safe
   */
  async validateBeforeModification(
    affectedTables: string[],
    affectedFunctions: string[]
  ): Promise<{
    canProceed: boolean;
    warnings: string[];
    blockers: string[];
  }> {
    const risk = featureRegistry.assessModificationRisk(affectedTables, affectedFunctions);
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Vérifier l'état actuel du système
    const currentHealth = await this.performHealthCheck();

    if (currentHealth.overall === 'critical') {
      blockers.push('Le système est actuellement en état critique - corriger les problèmes existants avant modification');
    }

    if (risk.riskLevel === 'critical') {
      warnings.push(`Risque critique: ${risk.impactedFeatures.length} fonctionnalités impactées`);
      warnings.push(...risk.recommendations);
    } else if (risk.riskLevel === 'high') {
      warnings.push(`Risque élevé: ${risk.impactedFeatures.length} fonctionnalités impactées`);
    }

    return {
      canProceed: blockers.length === 0,
      warnings,
      blockers
    };
  }
}

// Singleton
export const regressionGuard = new RegressionGuard();

// Export pour utilisation dans les tests
export { RegressionGuard };
