import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedTransitionProps {
  /** Message de validation affiché */
  message: string;
  /** Type de transition */
  type?: 'success' | 'next_section';
  /** Callback quand l'animation est terminée */
  onComplete?: () => void;
  /** Durée de l'animation (ms) */
  duration?: number;
}

export function GuidedTransition({
  message,
  type = 'success',
  onComplete,
  duration = 1500
}: GuidedTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.9],
        y: [20, 0, 0, -10]
      }}
      transition={{ 
        duration: duration / 1000,
        times: [0, 0.2, 0.8, 1]
      }}
      onAnimationComplete={onComplete}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          type === 'success' 
            ? "bg-gradient-to-br from-green-500 to-emerald-600" 
            : "bg-gradient-to-br from-primary to-accent"
        )}
      >
        {type === 'success' ? (
          <CheckCircle2 className="w-8 h-8 text-white" />
        ) : (
          <Sparkles className="w-8 h-8 text-white" />
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-semibold text-center text-foreground"
      >
        {message}
      </motion.p>

      {/* Particules de celebration */}
      {type === 'success' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0,
                x: '50%',
                y: '50%',
                scale: 0
              }}
              animate={{ 
                opacity: [0, 1, 0],
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
                scale: [0, 1, 0.5]
              }}
              transition={{ 
                duration: 0.8,
                delay: 0.2 + i * 0.05
              }}
              className="absolute w-2 h-2 rounded-full bg-primary/80"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
