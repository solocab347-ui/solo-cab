import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  text: string;
  highlight?: string;
}

interface FeatureListProps {
  features: Feature[];
  delay?: number;
  className?: string;
}

export function FeatureList({
  features,
  delay = 0,
  className
}: FeatureListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={cn(
        "bg-card/50 backdrop-blur-sm rounded-2xl p-5 border border-border/50",
        className
      )}
    >
      <ul className="space-y-4">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (delay + index + 1) * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-sm text-muted-foreground">
              {feature.text}
              {feature.highlight && (
                <span className="font-semibold text-foreground"> {feature.highlight}</span>
              )}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
