import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InputCardProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  suffix?: string;
  delay?: number;
  className?: string;
}

export function InputCard({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  suffix,
  delay = 0,
  className
}: InputCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className={cn("space-y-3", className)}
    >
      <div className="text-center">
        <p className="font-medium text-foreground">{label}</p>
        {hint && (
          <p className="text-sm text-muted-foreground mt-1">{hint}</p>
        )}
      </div>
      
      <div className="relative">
        <Input
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-16 text-center text-2xl font-bold rounded-2xl",
            "border-2 border-border focus:border-primary",
            "bg-card shadow-sm",
            suffix && "pr-14"
          )}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-medium">
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  );
}
