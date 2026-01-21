import { useCallback, useRef } from 'react';

/**
 * Hook pour empêcher les clics accidentels pendant le défilement sur mobile
 * Détecte si l'utilisateur fait défiler vs un clic intentionnel
 */
export const useTouchSafeClick = (onSafeClick?: () => void) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isScrollingRef = useRef(false);
  
  // Seuils de détection
  const MOVE_THRESHOLD = 10; // pixels de mouvement maximum pour considérer comme un clic
  const MIN_PRESS_DURATION = 50; // durée minimum de pression en ms
  const MAX_PRESS_DURATION = 500; // durée maximum en ms (évite les appuis longs accidentels)
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isScrollingRef.current = false;
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Si le mouvement dépasse le seuil, c'est un défilement
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      isScrollingRef.current = true;
    }
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const duration = Date.now() - touchStartRef.current.time;
    const wasScrolling = isScrollingRef.current;
    
    // Réinitialiser
    touchStartRef.current = null;
    isScrollingRef.current = false;
    
    // Ne pas déclencher le clic si:
    // - L'utilisateur faisait défiler
    // - La durée est trop courte (touch accidentel)
    // - La durée est trop longue (appui long non intentionnel)
    if (wasScrolling || duration < MIN_PRESS_DURATION || duration > MAX_PRESS_DURATION) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Clic intentionnel détecté
    if (onSafeClick) {
      onSafeClick();
    }
    return true;
  }, [onSafeClick]);
  
  const getTouchProps = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return {
    touchProps: getTouchProps(),
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getTouchProps
  };
};

/**
 * Hook simplifié qui retourne un handler onClick sécurisé pour mobile
 * Bloque le clic si un défilement est détecté
 */
export const useScrollSafeClick = () => {
  const lastTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wasScrollingRef = useRef(false);
  
  const SCROLL_DETECTION_WINDOW = 200; // ms après un scroll pour bloquer les clics
  const MOVE_THRESHOLD = 8; // pixels
  
  // Listener global pour détecter le scroll
  const markScrollStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    lastTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);
  
  const detectScrolling = useCallback((e: TouchEvent) => {
    if (!lastTouchRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - lastTouchRef.current.x);
    const deltaY = Math.abs(touch.clientY - lastTouchRef.current.y);
    
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      wasScrollingRef.current = true;
      // Reset après un délai
      setTimeout(() => {
        wasScrollingRef.current = false;
      }, SCROLL_DETECTION_WINDOW);
    }
  }, []);
  
  // Vérifie si on peut déclencher un clic
  const canClick = useCallback(() => {
    return !wasScrollingRef.current;
  }, []);
  
  // Handler sécurisé
  const createSafeClickHandler = useCallback(<T extends (...args: any[]) => any>(handler: T) => {
    return (e: React.MouseEvent | React.TouchEvent) => {
      if (!canClick()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      handler(e);
    };
  }, [canClick]);
  
  return {
    canClick,
    createSafeClickHandler,
    touchStartHandler: markScrollStart,
    touchMoveHandler: detectScrolling
  };
};

export default useTouchSafeClick;
