import { motion } from 'framer-motion';
import { X, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImmersiveHeaderProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  onClose?: () => void;
  onReset?: () => void;
  onPreview?: () => void;
}

export function ImmersiveHeader({
  icon,
  iconBgClass = 'bg-gradient-to-br from-primary to-accent',
  title,
  subtitle,
  currentStep,
  totalSteps,
  onClose,
  onReset,
  onPreview
}: ImmersiveHeaderProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      {/* Top bar with actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {onReset && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Center icon + title */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
              iconBgClass
            )}
          >
            {icon}
          </motion.div>
          <div className="text-left">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* Preview button */}
        {onPreview && (
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPreview}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {!onPreview && <div className="w-8" />}
      </div>

      {/* Progress bar */}
      <div className="relative h-1 bg-muted">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Step indicator */}
      <p className="text-center text-xs text-muted-foreground py-2">
        Étape {currentStep} sur {totalSteps}
      </p>
    </div>
  );
}
