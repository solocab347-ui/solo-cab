import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant d'image optimisé pour éviter les problèmes de chargement
 * Utilise le lazy loading et gère les erreurs gracieusement
 */
export const OptimizedImage = ({
  src,
  alt,
  className,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    // Ne rien faire si src est undefined/null ou identique
    if (!src) {
      setIsLoading(false);
      setHasError(false);
      setImageSrc(null);
      return;
    }

    // Si l'image est déjà chargée avec le même src, ne pas recharger
    if (imageSrc === src && !isLoading && !hasError) {
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    let mounted = true;
    
    img.onload = () => {
      if (mounted) {
        setImageSrc(src);
        setIsLoading(false);
        onLoad?.();
      }
    };

    img.onerror = () => {
      if (mounted) {
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    };

    img.src = src;

    return () => {
      mounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]); // Enlever onLoad et onError des dépendances pour éviter les re-renders

  if (isLoading) {
    return (
      <div className={cn('bg-muted animate-pulse rounded', className)} />
    );
  }

  if (hasError || !imageSrc) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('bg-muted rounded flex items-center justify-center', className)}>
        <span className="text-muted-foreground text-sm">Image indisponible</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn('object-cover', className)}
      loading="lazy"
      decoding="async"
    />
  );
};
