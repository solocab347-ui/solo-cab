/**
 * PERFORMANCE STABILIZER - Système de stabilisation global
 * Évite les re-renders excessifs et optimise les performances
 */

import { useEffect, useRef } from 'react';

/**
 * Hook pour éviter les re-renders excessifs
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useRef((...args: any[]) => callbackRef.current(...args)).current as T;
};

/**
 * Hook pour détecter et prévenir les boucles infinies (mode log uniquement)
 */
export const useInfiniteLoopDetector = (componentName: string, maxRenders: number = 100) => {
  const renderCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  
  useEffect(() => {
    const now = Date.now();
    
    // Reset le compteur toutes les 10 secondes (augmenté)
    if (now - lastResetRef.current > 10000) {
      renderCountRef.current = 0;
      lastResetRef.current = now;
      return;
    }
    
    renderCountRef.current++;
    
    if (renderCountRef.current > maxRenders) {
      // Juste logger sans forcer le reload (trop agressif)
      console.warn(`⚠️ Renders excessifs dans ${componentName} - ${renderCountRef.current} renders en 10s`);
    }
  });
};

/**
 * Hook pour stabiliser les valeurs d'objets/arrays
 * Évite les re-renders causés par les références qui changent
 */
export const useStableValue = <T>(value: T): T => {
  const cache = useRef<T>(value);
  
  // Comparaison profonde simplifiée
  if (JSON.stringify(cache.current) !== JSON.stringify(value)) {
    cache.current = value;
  }
  
  return cache.current;
};

/**
 * Debounce pour éviter les appels trop fréquents
 */
export const useDebounce = <T>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useRef(value).current as any;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Throttle pour limiter la fréquence d'exécution
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): T => {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useRef((...args: any[]) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - (now - lastRun.current));
    }
  }).current as T;
};
