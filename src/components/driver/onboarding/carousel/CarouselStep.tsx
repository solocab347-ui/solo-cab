import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CarouselStepProps {
  children: ReactNode;
  className?: string;
}

export function CarouselStep({ children, className }: CarouselStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        // Full viewport, NO vertical scroll
        "w-full h-full flex flex-col",
        "overflow-hidden", // CRITICAL: No scroll
        "px-4 py-4",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
