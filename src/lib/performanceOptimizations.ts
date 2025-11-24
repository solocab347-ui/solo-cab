/**
 * Optimisations de performance pour SoloCab
 * Utilitaires pour éviter les gels d'interface et améliorer la réactivité
 */

// Debounce function optimisé pour scalabilité (300ms pour réactivité max)
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300 // Réduit à 300ms pour plus de réactivité
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function pour limiter la fréquence d'exécution
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Batch updates pour éviter trop de re-renders
export function batchUpdates<T>(
  updates: (() => void)[],
  callback?: () => void
) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
    callback?.();
  });
}

// Lazy load images pour éviter de bloquer le chargement
export function lazyLoadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

// Cleanup pour les subscriptions Supabase
export function createCleanupHandler() {
  const cleanupFunctions: (() => void)[] = [];
  
  return {
    add: (cleanup: () => void) => cleanupFunctions.push(cleanup),
    cleanup: () => cleanupFunctions.forEach(fn => fn()),
  };
}

// Safe sessionStorage avec gestion d'erreur
export const safeSessionStorage = {
  setItem: (key: string, value: any) => {
    try {
      const data = {
        value,
        timestamp: Date.now()
      };
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('SessionStorage error:', error);
    }
  },
  
  getItem: (key: string, expirationMinutes: number = 10) => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      const now = Date.now();
      
      if (parsed.timestamp && (now - parsed.timestamp) > expirationMinutes * 60 * 1000) {
        sessionStorage.removeItem(key);
        return null;
      }
      
      return parsed.value !== undefined ? parsed.value : parsed;
    } catch (error) {
      console.warn('SessionStorage error:', error);
      return null;
    }
  },
  
  removeItem: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('SessionStorage error:', error);
    }
  }
};

// Detect performance issues
export function detectPerformanceIssues() {
  if (typeof window === 'undefined') return;
  
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⚠️ Long task detected:', entry.duration.toFixed(2), 'ms');
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      return () => observer.disconnect();
    } catch (error) {
      console.warn('Performance monitoring not supported');
    }
  }
}

// Request idle callback polyfill
export const requestIdleCallbackPolyfill = 
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (callback: () => void) => setTimeout(callback, 1);
