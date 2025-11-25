/**
 * BOOST PERFORMANCES - Optimisations drastiques
 */

// Désactiver les logs en production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

// Optimiser le scroll
export const optimizeScroll = () => {
  // Smooth scroll natif
  document.documentElement.style.scrollBehavior = 'smooth';
};

// Précharger les images critiques
export const preloadCriticalImages = (urls: string[]) => {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

// Optimiser les animations
export const optimizeAnimations = () => {
  // Réduire les animations si l'utilisateur préfère moins de mouvement
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms');
  }
};

// Cleanup memory
export const cleanupMemory = () => {
  if (typeof (window as any).gc === 'function') {
    (window as any).gc();
  }
};

// Monitor memory usage
export const monitorMemory = () => {
  if ((performance as any).memory) {
    const used = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
    const total = Math.round((performance as any).memory.totalJSHeapSize / 1048576);
    const limit = Math.round((performance as any).memory.jsHeapSizeLimit / 1048576);
    
    if (used > limit * 0.9) {
      console.warn(`⚠️ Mémoire critique: ${used}MB/${limit}MB`);
      cleanupMemory();
    }
  }
};

// Initialiser les optimisations
export const initPerformanceBoost = () => {
  optimizeScroll();
  optimizeAnimations();
  
  // Désactiver les animations pendant le scroll
  let scrollTimer: NodeJS.Timeout;
  let isScrolling = false;
  
  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      isScrolling = true;
      document.body.classList.add('is-scrolling');
    }
    
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      isScrolling = false;
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });
};
