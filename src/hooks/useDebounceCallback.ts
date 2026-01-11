/**
 * Hook pour debouncer les callbacks avec une gestion de cleanup
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook qui debounce un callback
 * @param callback La fonction à debouncer
 * @param delay Le délai en ms
 * @param deps Les dépendances du callback
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Mettre à jour la référence du callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay, ...deps]) as T;

  return debouncedCallback;
}

/**
 * Hook qui throttle un callback
 * @param callback La fonction à throttler
 * @param delay Le délai en ms
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]) as T;

  return throttledCallback;
}

/**
 * Hook pour exécuter une action immédiatement puis la debouncer
 * Utile pour les mises à jour qui doivent être visibles immédiatement
 */
export function useImmediateThenDebounce<T extends (...args: any[]) => any>(
  immediateCallback: T,
  debouncedCallback: (...args: Parameters<T>) => void,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const immediateRef = useRef(immediateCallback);
  const debouncedRef = useRef(debouncedCallback);

  useEffect(() => {
    immediateRef.current = immediateCallback;
    debouncedRef.current = debouncedCallback;
  }, [immediateCallback, debouncedCallback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const callback = useCallback((...args: Parameters<T>) => {
    // Exécution immédiate
    immediateRef.current(...args);

    // Puis debounce pour la vraie action
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      debouncedRef.current(...args);
    }, delay);
  }, [delay]) as T;

  return callback;
}
