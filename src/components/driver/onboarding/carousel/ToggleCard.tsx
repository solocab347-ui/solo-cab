import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ToggleCardProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  delay?: number;
  className?: string;
}

export function ToggleCard({
  title,
  description,
  checked,
  onChange,
  delay = 0,
  className
}: ToggleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4 }}
      className={cn(
        "bg-card rounded-2xl p-5 border-2 border-border shadow-sm",
        checked && "border-primary bg-primary/5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          className="scale-125"
        />
      </div>
    </motion.div>
  );
}
