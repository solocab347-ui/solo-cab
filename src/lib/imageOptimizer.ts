/**
 * Optimisation des images pour éviter les blocages
 * Charge les images de manière progressive
 */

interface ImageCache {
  [key: string]: string;
}

class ImageOptimizer {
  private cache: ImageCache = {};
  private loadingImages: Set<string> = new Set();

  /**
   * Charge une image de manière optimisée
   */
  async loadImage(src: string): Promise<string> {
    // Déjà en cache
    if (this.cache[src]) {
      return this.cache[src];
    }

    // Déjà en cours de chargement
    if (this.loadingImages.has(src)) {
      return new Promise((resolve) => {
        const checkLoaded = setInterval(() => {
          if (this.cache[src]) {
            clearInterval(checkLoaded);
            resolve(this.cache[src]);
          }
        }, 100);
      });
    }

    // Charger l'image
    this.loadingImages.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache[src] = src;
        this.loadingImages.delete(src);
        resolve(src);
      };

      img.onerror = () => {
        this.loadingImages.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  /**
   * Précharge plusieurs images
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => 
      this.loadImage(url).catch(err => console.warn('Image preload failed:', err))
    );
    await Promise.all(promises);
  }

  /**
   * Nettoie le cache
   */
  clearCache(): void {
    this.cache = {};
    this.loadingImages.clear();
  }

  /**
   * Obtient la taille du cache
   */
  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }
}

export const imageOptimizer = new ImageOptimizer();

/**
 * Hook React pour charger des images de manière optimisée
 */
export function useOptimizedImage(src: string | null | undefined) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!src) {
      setImageSrc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    imageOptimizer
      .loadImage(src)
      .then(loadedSrc => {
        setImageSrc(loadedSrc);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [src]);

  return { imageSrc, loading, error };
}

// Import React pour le hook
import React from 'react';
