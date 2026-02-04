import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickOption {
  label: string;
  value: string;
}

interface QuickOptionsProps {
  options: QuickOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  delay?: number;
}

export function QuickOptions({
  options,
  selectedValue,
  onSelect,
  delay = 0
}: QuickOptionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay * 0.1 }}
      className="flex flex-wrap gap-2 justify-center"
    >
      {options.map((option, index) => (
        <motion.div
          key={option.value}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (delay + index) * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge
            variant={selectedValue === option.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer px-4 py-2.5 text-sm font-medium transition-all",
              selectedValue === option.value 
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 border-transparent shadow-lg shadow-cyan-500/30"
                : "hover:border-cyan-400/50 hover:bg-cyan-400/10"
            )}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Badge>
        </motion.div>
      ))}
    </motion.div>
  );
}
