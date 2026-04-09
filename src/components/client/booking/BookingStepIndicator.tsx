import { cn } from '@/lib/utils';
import { MapPin, Users, CreditCard, Check } from 'lucide-react';

interface BookingStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const STEPS = [
  { icon: MapPin, label: 'Trajet' },
  { icon: Users, label: 'Chauffeurs' },
  { icon: CreditCard, label: 'Confirmer' },
];

export function BookingStepIndicator({ currentStep, totalSteps }: BookingStepIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      {STEPS.slice(0, totalSteps).map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        const Icon = step.icon;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                  !isActive && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className="flex-1 mx-2 mb-5">
                <div
                  className={cn(
                    "h-0.5 rounded-full transition-all duration-500",
                    isDone ? "bg-primary" : "bg-border"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
