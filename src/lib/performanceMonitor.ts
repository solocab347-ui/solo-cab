/**
 * Système de monitoring de performance pour SoloCab
 * Détecte et log les problèmes de performance en temps réel
 */

interface PerformanceMetrics {
  renderTime: number;
  fetchTime: number;
  interactionDelay: number;
  memoryUsage?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  /**
   * Démarre le monitoring de performance
   */
  start() {
    if (this.isMonitoring || typeof window === 'undefined') return;
    
    this.isMonitoring = true;
    this.setupObservers();
    this.monitorMemory();
  }

  /**
   * Configure les observers de performance
   */
  private setupObservers() {
    try {
      // Monitor long tasks (>50ms)
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⚠️ Tâche longue:', {
              duration: entry.duration.toFixed(2) + 'ms',
              name: entry.name,
              type: entry.entryType
            });
          }
        }
      });

      // Essayer d'observer les long tasks (pas supporté partout)
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch {
        // longtask pas supporté, continuer sans
      }

      // Monitor paint timing
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('🎨 Paint timing:', entry.name, entry.startTime.toFixed(2) + 'ms');
        }
      });

      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

    } catch (error) {
      console.warn('Performance monitoring not fully supported:', error);
    }
  }

  /**
   * Monitor l'utilisation mémoire
   */
  private monitorMemory() {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1048576;
      const totalMB = memory.totalJSHeapSize / 1048576;
      const percentage = (usedMB / totalMB) * 100;

      if (percentage > 90) {
        console.error('❌ Mémoire critique:', {
          used: usedMB.toFixed(2) + 'MB',
          total: totalMB.toFixed(2) + 'MB',
          percentage: percentage.toFixed(1) + '%'
        });
      } else if (percentage > 75) {
        console.warn('⚠️ Mémoire élevée:', {
          used: usedMB.toFixed(2) + 'MB',
          percentage: percentage.toFixed(1) + '%'
        });
      }

      setTimeout(checkMemory, 10000); // Vérifier toutes les 10s
    };

    setTimeout(checkMemory, 5000); // Premier check après 5s
  }

  /**
   * Arrête le monitoring
   */
  stop() {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Récupère les métriques
   */
  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  /**
   * Log un warning de performance personnalisé
   */
  logSlowOperation(operation: string, duration: number) {
    if (duration > 100) {
      console.warn(`⚠️ Opération lente: ${operation} - ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Measure l'exécution d'une fonction
   */
  async measure<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.logSlowOperation(label, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ ${label} failed after ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
}

// Singleton
export const performanceMonitor = new PerformanceMonitor();

// Démarrer automatiquement en dev
if (import.meta.env.DEV) {
  performanceMonitor.start();
}
