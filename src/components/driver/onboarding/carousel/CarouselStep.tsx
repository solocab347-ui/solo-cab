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
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "w-full h-full flex flex-col overflow-y-auto",
        "px-4 py-6 pb-32", // padding bottom for navigation buttons
        className
      )}
    >
      {children}
    </motion.div>
  );
}
