import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickSelectOption {
  label: string;
  value: string;
  description?: string;
}

interface QuickSelectProps {
  options: QuickSelectOption[];
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  className?: string;
}

export function QuickSelect({
  options,
  value,
  onChange,
  delay = 0,
  className
}: QuickSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className={cn("flex flex-wrap justify-center gap-2", className)}
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay * 0.1 + index * 0.05 }}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
              "border-2 shadow-sm",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-primary/25"
                : "bg-card text-foreground border-border hover:border-primary/50"
            )}
          >
            {option.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
