/**
 * Protection contre l'écran blanc
 * Détecte et récupère automatiquement des situations d'écran blanc
 */

class WhiteScreenGuard {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastContentCheck = Date.now();
  private consecutiveEmptyChecks = 0;
  private maxEmptyChecks = 3;
  private isRecovering = false;

  /**
   * Démarre la surveillance
   */
  start() {
    if (typeof window === 'undefined') return;

    // Vérifier régulièrement qu'il y a du contenu visible
    this.checkInterval = setInterval(() => {
      this.checkScreenContent();
    }, 2000);

    // Vérifier immédiatement après le chargement
    if (document.readyState === 'complete') {
      setTimeout(() => this.checkScreenContent(), 3000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.checkScreenContent(), 3000);
      });
    }
  }

  /**
   * Arrête la surveillance
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Vérifie qu'il y a du contenu visible
   */
  private checkScreenContent() {
    if (this.isRecovering) return;

    try {
      const body = document.body;
      const root = document.getElementById('root');

      // Vérifier le contenu textuel
      const hasTextContent = body.textContent && body.textContent.trim().length > 50;
      
      // Vérifier les éléments visibles
      const hasVisibleElements = body.children.length > 1 && 
                                 (root?.children.length ?? 0) > 0;

      // Vérifier la couleur de fond (ne devrait pas être complètement blanc)
      const backgroundColor = window.getComputedStyle(body).backgroundColor;
      const isWhiteBackground = backgroundColor === 'rgb(255, 255, 255)' || 
                               backgroundColor === '#ffffff' ||
                               backgroundColor === 'white';

      if (!hasTextContent || !hasVisibleElements) {
        this.consecutiveEmptyChecks++;
        console.warn(`⚠️ Vérification écran blanc (${this.consecutiveEmptyChecks}/${this.maxEmptyChecks})`);

        if (this.consecutiveEmptyChecks >= this.maxEmptyChecks) {
          this.attemptRecovery();
        }
      } else {
        // Reset si contenu détecté
        this.consecutiveEmptyChecks = 0;
      }

      // Alerte si fond blanc avec peu de contenu
      if (isWhiteBackground && !hasTextContent) {
        console.warn('⚠️ Fond blanc détecté avec peu de contenu');
      }

    } catch (error) {
      console.error('Erreur vérification écran:', error);
    }
  }

  /**
   * Tente de récupérer d'un écran blanc
   */
  private attemptRecovery() {
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    console.error('🚨 ÉCRAN BLANC DÉTECTÉ - Tentative de récupération');

    try {
      // 1. Nettoyer les subscriptions
      if ((window as any).subscriptionManager) {
        (window as any).subscriptionManager.unsubscribeAll();
      }

      // 2. Nettoyer le localStorage/sessionStorage potentiellement corrompu
      try {
        const backupAuth = localStorage.getItem('supabase.auth.token');
        sessionStorage.clear();
        if (backupAuth) {
          localStorage.setItem('supabase.auth.token', backupAuth);
        }
      } catch (e) {
        console.error('Erreur nettoyage storage:', e);
      }

      // 3. Recharger après un court délai
      setTimeout(() => {
        console.log('🔄 Rechargement de la page...');
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      // Force reload en cas d'échec de la récupération
      window.location.reload();
    }
  }

  /**
   * Force un rechargement immédiat
   */
  forceReload() {
    console.log('🔄 Rechargement forcé');
    this.stop();
    window.location.reload();
  }
}

// Singleton
export const whiteScreenGuard = new WhiteScreenGuard();

// Démarrage automatique
if (typeof window !== 'undefined') {
  // Attendre que React soit monté
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => whiteScreenGuard.start(), 1000);
    });
  } else {
    setTimeout(() => whiteScreenGuard.start(), 1000);
  }

  // Arrêter avant déchargement
  window.addEventListener('beforeunload', () => {
    whiteScreenGuard.stop();
  });
}
