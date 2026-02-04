import { motion } from 'framer-motion';
import { Lightbulb, Calculator, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipBoxProps {
  type?: 'tip' | 'calculation' | 'highlight';
  title?: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const icons = {
  tip: Lightbulb,
  calculation: Calculator,
  highlight: Star,
};

const styles = {
  tip: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  calculation: "bg-primary/10 border-primary/30 text-primary",
  highlight: "bg-accent/10 border-accent/30 text-accent",
};

export function TipBox({ 
  type = 'tip', 
  title, 
  children, 
  delay = 0,
  className 
}: TipBoxProps) {
  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className={cn(
        "rounded-xl p-4 border-2",
        styles[type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          {title && <p className="font-semibold text-sm">{title}</p>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}
