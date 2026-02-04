import { motion } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
  showSparkles?: boolean;
  delay?: number;
  className?: string;
}

export function QuestionCard({
  title,
  hint,
  children,
  showSparkles = false,
  delay = 0,
  className
}: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: "easeOut" }}
      className={cn("space-y-6", className)}
    >
      {/* Title with sparkles */}
      <div className="flex items-center justify-center gap-2">
        {showSparkles && (
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </motion.span>
        )}
        <h2 className="text-xl font-bold text-center">{title}</h2>
        {showSparkles && (
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </motion.span>
        )}
      </div>

      {/* Hint */}
      {hint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2 text-sm text-muted-foreground"
        >
          <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
          <p>{hint}</p>
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
