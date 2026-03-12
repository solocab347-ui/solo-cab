import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from 'react';

type TapAction = () => void;

interface InstantTapProps<T extends HTMLElement> {
  role: 'button';
  tabIndex: number;
  onPointerDown: (event: PointerEvent<T>) => void;
  onPointerMove: (event: PointerEvent<T>) => void;
  onPointerUp: (event: PointerEvent<T>) => void;
  onPointerCancel: () => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<T>) => void;
}

/**
 * Rend les interactions tactiles instantanées et évite le double déclenchement click + pointerup.
 */
export const useInstantTap = () => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);
  const skipNextClickRef = useRef(false);

  const MOVE_THRESHOLD = 10;

  const getTapProps = useCallback(
    <T extends HTMLElement>(action: TapAction): InstantTapProps<T> => ({
      role: 'button',
      tabIndex: 0,
      onPointerDown: (event) => {
        if (event.pointerType !== 'touch') return;
        touchStartRef.current = { x: event.clientX, y: event.clientY };
        isScrollingRef.current = false;
      },
      onPointerMove: (event) => {
        if (event.pointerType !== 'touch' || !touchStartRef.current) return;

        const deltaX = Math.abs(event.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(event.clientY - touchStartRef.current.y);

        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
          isScrollingRef.current = true;
        }
      },
      onPointerUp: (event) => {
        if (event.pointerType !== 'touch') return;

        if (!isScrollingRef.current) {
          skipNextClickRef.current = true;
          action();
        }

        touchStartRef.current = null;
        isScrollingRef.current = false;
      },
      onPointerCancel: () => {
        touchStartRef.current = null;
        isScrollingRef.current = false;
      },
      onClick: () => {
        if (skipNextClickRef.current) {
          skipNextClickRef.current = false;
          return;
        }
        action();
      },
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          action();
        }
      },
    }),
    []
  );

  return { getTapProps };
};
