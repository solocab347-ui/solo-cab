/**
 * Garde de stabilité pour éviter crashes et fuites mémoire
 * Systèmes de protection critique pour 1000 connexions simultanées
 */

import { subscriptionManager } from './subscriptionManager';

class StabilityGuard {
  private errorCount = 0;
  private maxErrors = 10;
  private errorResetInterval = 60000; // 1 minute
  private lastErrorReset = Date.now();

  /**
   * Wrapper safe pour les opérations critiques
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string
  ): Promise<T> {
    try {
      // Reset error count si intervalle écoulé
      if (Date.now() - this.lastErrorReset > this.errorResetInterval) {
        this.errorCount = 0;
        this.lastErrorReset = Date.now();
      }

      // Circuit breaker: trop d'erreurs
      if (this.errorCount >= this.maxErrors) {
        console.error(`🚨 Circuit breaker activé pour ${operationName}`);
        return fallback;
      }

      const result = await operation();
      return result;
    } catch (error) {
      this.errorCount++;
      console.error(`❌ Erreur dans ${operationName}:`, error);
      return fallback;
    }
  }

  /**
   * Wrapper safe pour subscriptions
   */
  safeSubscribe(
    channelName: string,
    config: any,
    callback: (payload: any) => void
  ): () => void {
    try {
      return subscriptionManager.subscribe(channelName, config, callback);
    } catch (error) {
      console.error(`❌ Erreur subscription ${channelName}:`, error);
      return () => {}; // Noop cleanup
    }
  }

  /**
   * Nettoyage d'urgence
   */
  emergencyCleanup() {
    console.warn('🚨 Nettoyage d\'urgence activé');
    
    // Unsubscribe tout
    subscriptionManager.unsubscribeAll();

    // Clear caches
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.error('Erreur clear sessionStorage:', error);
      }
    }

    // Reset error counter
    this.errorCount = 0;
    this.lastErrorReset = Date.now();
  }

  /**
   * Check santé système
   */
  healthCheck(): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check channels actifs
    const activeChannels = subscriptionManager.getActiveCount();
    if (activeChannels > 10) {
      issues.push(`Trop de channels actifs: ${activeChannels}`);
    }

    // Check error rate
    if (this.errorCount > 5) {
      issues.push(`Taux d'erreur élevé: ${this.errorCount}`);
    }

    // Check mémoire si disponible
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const percentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
      if (percentage > 85) {
        issues.push(`Mémoire élevée: ${percentage.toFixed(1)}%`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// Singleton
export const stabilityGuard = new StabilityGuard();

// Health check périodique
if (typeof window !== 'undefined') {
  setInterval(() => {
    const health = stabilityGuard.healthCheck();
    if (!health.healthy) {
      console.warn('⚠️ Problèmes détectés:', health.issues);
      
      // Cleanup si trop de problèmes
      if (health.issues.length >= 2) {
        stabilityGuard.emergencyCleanup();
      }
    }
  }, 30000); // Check toutes les 30s
}
