/**
 * Gestionnaire de mémoire pour éviter les fuites et crashes
 * Nettoie automatiquement les ressources inutilisées
 */

class MemoryManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryCheckInterval = 30000; // 30 secondes

  start() {
    // Nettoyage périodique
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.memoryCheckInterval);

    // Nettoyage avant fermeture
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.stop());
    }
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private performCleanup() {
    try {
      // Forcer garbage collection si disponible
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }

      // Nettoyer sessionStorage ancien (>1h)
      this.cleanOldSessionStorage();

    } catch (error) {
      console.error('Erreur nettoyage mémoire:', error);
    }
  }

  private cleanOldSessionStorage() {
    if (typeof window === 'undefined') return;

    try {
      const now = Date.now();
      const oneHour = 3600000;

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (!key) continue;

        try {
          const item = sessionStorage.getItem(key);
          if (!item) continue;

          const data = JSON.parse(item);
          if (data.timestamp && (now - data.timestamp) > oneHour) {
            sessionStorage.removeItem(key);
          }
        } catch {
          // Item invalide, le garder
        }
      }
    } catch (error) {
      console.error('Erreur nettoyage sessionStorage:', error);
    }
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

// Démarrage automatique
if (typeof window !== 'undefined') {
  memoryManager.start();
}
