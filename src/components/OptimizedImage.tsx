import { useState, useCallback, memo } from 'react';
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
 * Composant d'image optimisé pour éviter les problèmes de chargement et de flash
 * Utilise le lazy loading natif et gère les erreurs gracieusement
 */
export const OptimizedImage = memo(({
  src,
  alt,
  className,
  fallback,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Si pas de src, afficher le fallback directement
  if (!src) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('bg-muted rounded flex items-center justify-center', className)}>
        <span className="text-muted-foreground text-sm">Image indisponible</span>
      </div>
    );
  }

  if (hasError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('bg-muted rounded flex items-center justify-center', className)}>
        <span className="text-muted-foreground text-sm">Image indisponible</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Placeholder pendant le chargement - même dimensions */}
      {!isLoaded && (
        <div className={cn('absolute inset-0 bg-muted rounded', className)} />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'object-cover transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
