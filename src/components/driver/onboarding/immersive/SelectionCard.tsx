import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionCardProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  selected?: boolean;
  onClick: () => void;
  delay?: number;
}

export function SelectionCard({
  icon,
  iconBgClass = 'bg-gradient-to-br from-cyan-500 to-teal-500',
  title,
  subtitle,
  badge,
  badgeClass = 'bg-amber-500 text-white',
  selected = false,
  onClick,
  delay = 0
}: SelectionCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border-2 transition-all duration-300",
        "flex items-center gap-4 text-left",
        selected 
          ? "border-cyan-400 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          : "border-border/50 bg-card/50 hover:border-muted-foreground/30"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
        iconBgClass
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{title}</span>
          {badge && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              badgeClass
            )}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Selection indicator or arrow */}
      <div className="shrink-0">
        {selected ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-cyan-400 flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-background" />
          </motion.div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </motion.button>
  );
}
