import React, { memo, lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * HOC pour mémoizer les composants et éviter les re-renders inutiles
 */
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
) {
  const MemoizedComponent = memo(Component);
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }
  return MemoizedComponent;
}

/**
 * Lazy load avec fallback par défaut
 */
export function lazyLoad<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: P & React.JSX.IntrinsicAttributes) => (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent {...props as any} />
    </Suspense>
  );
}

/**
 * Composant de fallback par défaut
 */
function DefaultFallback() {
  return (
    <div className="w-full space-y-4 p-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Détecte les re-renders excessifs
 */
export function useRenderCount(componentName: string, threshold: number = 10) {
  const renderCount = React.useRef(0);
  const lastReset = React.useRef(Date.now());

  React.useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceReset = now - lastReset.current;

    // Reset counter every 10 seconds
    if (timeSinceReset > 10000) {
      renderCount.current = 1;
      lastReset.current = now;
      return;
    }

    // Warn if excessive renders
    if (renderCount.current > threshold) {
      console.warn(
        `⚠️ Excessive renders detected in ${componentName}: ${renderCount.current} renders in ${(timeSinceReset / 1000).toFixed(1)}s`
      );
    }
  });
}

/**
 * Batch state updates pour React 18+
 */
export function batchStateUpdates(updates: (() => void)[]) {
  React.startTransition(() => {
    updates.forEach(update => update());
  });
}
