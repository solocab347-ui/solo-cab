import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { cn } from '@/lib/utils';

interface ImmersiveInputProps {
  type?: 'text' | 'numeric';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
  delay?: number;
}

export function ImmersiveInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  suffix,
  className,
  delay = 0
}: ImmersiveInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn("relative", className)}
    >
      <div className="relative">
        {type === 'numeric' ? (
          <NumericInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={cn(
              "h-16 text-xl font-medium bg-background/80",
              "border-2 border-cyan-400/50 rounded-xl",
              "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20",
              "transition-all duration-300",
              suffix && "pr-14"
            )}
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "h-16 text-lg bg-background/80",
              "border-2 border-cyan-400/50 rounded-xl",
              "focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20",
              "transition-all duration-300",
              "placeholder:text-muted-foreground/60"
            )}
          />
        )}
        
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  );
}
