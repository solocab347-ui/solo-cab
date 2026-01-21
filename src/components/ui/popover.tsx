import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

// Trigger amélioré pour mobile avec protection anti-scroll
const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, onPointerDown, onPointerMove, onPointerUp, ...props }, ref) => {
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const isScrollingRef = React.useRef(false);
  const lastScrollBlockRef = React.useRef(0);
  
  const MOVE_THRESHOLD = 12;
  const MIN_PRESS_DURATION = 100;
  const SCROLL_BLOCK_DURATION = 250;
  
  const handlePointerDown = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') {
      touchStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      };
      isScrollingRef.current = false;
    }
    onPointerDown?.(e);
  }, [onPointerDown]);
  
  const handlePointerMove = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch' && touchStartRef.current) {
      const deltaX = Math.abs(e.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(e.clientY - touchStartRef.current.y);
      
      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        isScrollingRef.current = true;
        lastScrollBlockRef.current = Date.now();
      }
    }
    onPointerMove?.(e);
  }, [onPointerMove]);
  
  const handlePointerUp = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') {
      const now = Date.now();
      
      // Bloquer si scroll récent
      if (now - lastScrollBlockRef.current < SCROLL_BLOCK_DURATION) {
        e.preventDefault();
        e.stopPropagation();
        touchStartRef.current = null;
        isScrollingRef.current = false;
        return;
      }
      
      // Bloquer si mouvement détecté
      if (isScrollingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        touchStartRef.current = null;
        isScrollingRef.current = false;
        return;
      }
      
      // Bloquer si durée trop courte
      if (touchStartRef.current) {
        const duration = now - touchStartRef.current.time;
        if (duration < MIN_PRESS_DURATION) {
          e.preventDefault();
          e.stopPropagation();
          touchStartRef.current = null;
          return;
        }
      }
      
      touchStartRef.current = null;
      isScrollingRef.current = false;
    }
    onPointerUp?.(e);
  }, [onPointerUp]);
  
  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      className={cn("touch-manipulation", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      {...props}
    />
  );
});
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
