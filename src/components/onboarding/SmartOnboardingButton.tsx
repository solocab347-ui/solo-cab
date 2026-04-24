import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartOnboardingButtonProps {
  onClick: () => void;
  profileCompletion?: {
    percentage: number;
    requiredMissing: number;
    isProfileReady: boolean;
  };
  className?: string;
}

export const SmartOnboardingButton = ({ 
  onClick, 
  profileCompletion,
  className 
}: SmartOnboardingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  
  const bottomPosition = "bottom-24";
  
  // Check if profile is incomplete and show reminder
  useEffect(() => {
    if (profileCompletion && !profileCompletion.isProfileReady) {
      const lastDismissed = localStorage.getItem("smart-onboarding-dismissed-at");
      
      if (lastDismissed) {
        const dismissedTime = new Date(lastDismissed).getTime();
        const now = Date.now();
        const hoursSinceDismiss = (now - dismissedTime) / (1000 * 60 * 60);
        
        // Show reminder after 1 hour if profile is incomplete
        if (hoursSinceDismiss >= 1) {
          setShowReminder(true);
          setIsMinimized(false);
        } else {
          setIsMinimized(true);
        }
      } else {
        // First time - show full button
        setIsMinimized(false);
      }
    } else if (profileCompletion?.isProfileReady) {
      setIsMinimized(true);
    }
  }, [profileCompletion]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("smart-onboarding-dismissed-at", new Date().toISOString());
    setIsMinimized(true);
    setShowReminder(false);
  };

  const handleExpand = () => {
    setIsMinimized(false);
    setShowReminder(false);
  };

  const percentage = profileCompletion?.percentage || 0;
  const requiredMissing = profileCompletion?.requiredMissing || 0;
  const isReady = profileCompletion?.isProfileReady || false;

  // Minimized state
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("fixed right-4 z-40 transition-all duration-300", bottomPosition, className)}
      >
        <motion.button
          onClick={handleExpand}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg"
        >
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            <ChevronUp className="w-5 h-5 text-amber-400" />
          </div>
        </motion.button>
        {(showReminder || (requiredMissing > 0)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse"
          >
            {requiredMissing > 0 ? requiredMissing : "!"}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn("fixed right-4 z-40 transition-all duration-300", bottomPosition, className)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <div className="bg-storefront-dark text-foreground px-4 py-3 rounded-xl shadow-xl border border-border">
              <p className="text-sm font-medium flex items-center gap-2">
                {isReady ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Profil complet !
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-warning" />
                    {requiredMissing} élément{requiredMissing > 1 ? 's' : ''} à configurer
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cliquez pour ouvrir le guide Liberty
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">{percentage}% complété</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative group"
      >
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity",
          isReady 
            ? "bg-gradient-to-r from-green-500 to-emerald-500"
            : "bg-gradient-to-r from-amber-500 to-orange-500"
        )} />
        
        {/* Button */}
        <div className={cn(
          "relative w-14 h-14 rounded-full p-0.5 shadow-xl",
          isReady
            ? "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500"
            : "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
        )}>
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            >
              {isReady ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <Sparkles className="w-6 h-6 text-amber-400" />
              )}
            </motion.div>
          </div>
        </div>

        {/* Progress ring */}
        <svg 
          className="absolute inset-0 w-14 h-14 -rotate-90"
          viewBox="0 0 56 56"
        >
          <circle
            cx="28"
            cy="28"
            r="26"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          <circle
            cx="28"
            cy="28"
            r="26"
            fill="none"
            stroke={isReady ? "#22c55e" : "#f59e0b"}
            strokeWidth="3"
            strokeDasharray={`${(percentage / 100) * 163.36} 163.36`}
            strokeLinecap="round"
          />
        </svg>

        {/* Notification badge */}
        {requiredMissing > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900 text-white text-xs font-bold"
          >
            {requiredMissing}
          </motion.div>
        )}

        {/* Pulse animation for incomplete profile */}
        {!isReady && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-amber-500 rounded-full"
          />
        )}
      </motion.button>

      {/* Minimize button */}
      <button
        onClick={handleDismiss}
        className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center border border-slate-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Réduire"
      >
        <ChevronUp className="w-3 h-3 text-white rotate-180" />
      </button>
    </motion.div>
  );
};

export default SmartOnboardingButton;
