import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselNavProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
  isLoading?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function CarouselNav({
  currentStep,
  totalSteps,
  canGoNext,
  canGoBack,
  onNext,
  onBack,
  nextLabel = "Continuer",
  isLoading = false,
  showSkip = false,
  onSkip
}: CarouselNavProps) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6 px-4"
    >
      <div className="max-w-md mx-auto space-y-3">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentStep
                  ? "w-6 bg-primary"
                  : i < currentStep
                    ? "w-1.5 bg-primary/60"
                    : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {canGoBack && (
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="flex-1 h-14 rounded-2xl border-2"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Retour
            </Button>
          )}
          
          <Button
            size="lg"
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className={cn(
              "flex-[2] h-14 rounded-2xl font-semibold text-base",
              "bg-gradient-to-r from-primary to-accent hover:opacity-90",
              "shadow-lg shadow-primary/25",
              !canGoBack && "flex-1"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isLastStep ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Terminer
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>

        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Passer cette étape
          </button>
        )}
      </div>
    </motion.div>
  );
}
