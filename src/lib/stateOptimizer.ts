import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook pour éviter les re-renders excessifs lors de mises à jour d'état fréquentes
 */
export function useThrottledState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void] {
  const [state, setState] = React.useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const setThrottledState = useCallback((value: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(value);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setThrottledState];
}

/**
 * Hook pour détecter les fuites mémoire
 */
export function useMemoryLeakDetector(componentName: string) {
  useEffect(() => {
    const mounted = Date.now();
    console.log(`✅ ${componentName} mounted at`, new Date(mounted).toISOString());

    return () => {
      const unmounted = Date.now();
      const lifetime = unmounted - mounted;
      console.log(`❌ ${componentName} unmounted after ${(lifetime / 1000).toFixed(2)}s`);
    };
  }, [componentName]);
}

/**
 * Hook pour nettoyer les subscriptions automatiquement
 */
export function useCleanup() {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup };
}

/**
 * Hook pour prévenir les états après unmount
 */
export function useSafeState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState<T>(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState];
}

import React from 'react';
