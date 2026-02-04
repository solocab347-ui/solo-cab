import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickReply {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
}

interface QuickRepliesProps {
  options: QuickReply[];
  onSelect: (value: string) => void;
  delay?: number;
  className?: string;
}

export function QuickReplies({ options, onSelect, delay = 0, className }: QuickRepliesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.1 }}
      className={cn("flex flex-wrap gap-2 justify-center mt-2", className)}
    >
      {options.map((option, index) => (
        <motion.div
          key={option.value}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: (delay + index) * 0.1 }}
        >
          <Button
            variant={option.variant || "outline"}
            size="sm"
            onClick={() => onSelect(option.value)}
            className="h-9 px-4 rounded-full"
          >
            {option.icon}
            {option.label}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
}
