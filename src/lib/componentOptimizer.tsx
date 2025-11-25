/**
 * COMPONENT OPTIMIZER - Utilitaires de mémoisation et optimisation React
 */

import React, { memo, useMemo, useCallback, useRef, useEffect } from "react";

/**
 * Mémoization profonde pour objets et tableaux
 */
export function useDeepMemo<T>(value: T, deps: React.DependencyList = []): T {
  const ref = useRef<T>(value);
  const serializedValue = JSON.stringify(value);
  const serializedDeps = JSON.stringify(deps);

  return useMemo(() => {
    const newSerialized = JSON.stringify(value);
    if (serializedValue !== ref.current && newSerialized !== serializedValue) {
      ref.current = value;
    }
    return ref.current;
  }, [serializedDeps, serializedValue]);
}

/**
 * Mémoization de callback avec dépendances profondes
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Hook pour détecter les re-renders excessifs
 */
export function useRenderTracking(componentName: string, threshold = 10) {
  const renderCount = useRef(0);
  const lastAlert = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();

    // Réinitialiser après 10 secondes
    if (now - lastAlert.current > 10000) {
      renderCount.current = 1;
      lastAlert.current = now;
      return;
    }

    // Avertir si trop de renders
    if (renderCount.current > threshold) {
      console.warn(
        `⚠️ ${componentName}: ${renderCount.current} renders en ${
          (now - lastAlert.current) / 1000
        }s`
      );
    }
  });
}

/**
 * HOC pour mémoiser automatiquement un composant
 */
export function withAutoMemo<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
) {
  const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
    // Comparaison shallow par défaut
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
      if (prevProps[key as keyof P] !== nextProps[key as keyof P]) {
        return false;
      }
    }

    return true;
  });

  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }

  return MemoizedComponent;
}

/**
 * Hook pour throttle (limitation de fréquence)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        // Programmer l'exécution après le délai
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Hook pour debounce (retard d'exécution)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Hook pour batch de state updates
 */
export function useBatchUpdates() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const updates = useRef<Array<() => void>>([]);

  const batchUpdate = useCallback((updateFn: () => void) => {
    updates.current.push(updateFn);
  }, []);

  const flush = useCallback(() => {
    React.startTransition(() => {
      updates.current.forEach((fn) => fn());
      updates.current = [];
      forceUpdate();
    });
  }, []);

  return { batchUpdate, flush };
}
