import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  primaryLabel: string;
  primaryIcon?: React.ReactNode;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  secondaryIcon?: React.ReactNode;
  onSecondary?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  delay?: number;
  className?: string;
}

export function ActionButtons({
  primaryLabel,
  primaryIcon = <ArrowRight className="w-5 h-5" />,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  secondaryIcon = <Sparkles className="w-4 h-4" />,
  onSecondary,
  showBack = false,
  onBack,
  delay = 0,
  className
}: ActionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn("space-y-3", className)}
    >
      <div className={cn(
        "flex gap-3",
        secondaryLabel ? "flex-row" : "flex-col"
      )}>
        {secondaryLabel && onSecondary && (
          <Button
            variant="outline"
            onClick={onSecondary}
            className="flex-1 h-14 gap-2 rounded-xl border-2"
          >
            {secondaryIcon}
            {secondaryLabel}
          </Button>
        )}
        
        <Button
          onClick={onPrimary}
          disabled={primaryDisabled}
          className={cn(
            "h-14 gap-2 rounded-xl text-base font-semibold",
            "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
            "shadow-lg shadow-orange-500/30 transition-all duration-300",
            secondaryLabel ? "flex-1" : "w-full"
          )}
        >
          {primaryLabel}
          {primaryIcon}
        </Button>
      </div>

      {showBack && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full h-12 gap-2 text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Button>
      )}
    </motion.div>
  );
}
