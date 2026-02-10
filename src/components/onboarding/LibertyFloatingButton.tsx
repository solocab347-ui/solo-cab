import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HelpCircle, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LibertyFloatingButtonProps {
  onClick: () => void;
  hasUnreadTips?: boolean;
  className?: string;
}

// Check if guide has incomplete steps
const checkIncompleteSteps = (): boolean => {
  const saved = localStorage.getItem("liberty-guide-progress");
  if (!saved) return true; // No progress = incomplete
  
  const { completed } = JSON.parse(saved);
  if (!completed || completed.length === 0) return true;
  
  // Total steps in the guide (17 steps across all sections)
  const TOTAL_STEPS = 17;
  return completed.length < TOTAL_STEPS;
};

export const LibertyFloatingButton = ({ onClick, hasUnreadTips = true, className }: LibertyFloatingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  
  // Check if the guide was dismissed and if there are incomplete steps
  useEffect(() => {
    const dismissedAt = localStorage.getItem("liberty-guide-dismissed-at");
    const hasIncomplete = checkIncompleteSteps();
    
    if (dismissedAt && hasIncomplete) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = Date.now();
      const hoursSinceDismiss = (now - dismissedTime) / (1000 * 60 * 60);
      
      // Show reminder after 1 hour if there are incomplete steps
      if (hoursSinceDismiss >= 1) {
        setShowReminder(true);
        setIsMinimized(false);
      } else {
        setIsMinimized(true);
      }
    } else if (!hasIncomplete) {
      // Guide completed, stay minimized
      setIsMinimized(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("liberty-guide-dismissed-at", new Date().toISOString());
    setIsMinimized(true);
    setShowReminder(false);
  };

  const handleExpand = () => {
    setIsMinimized(false);
    setShowReminder(false);
  };

  // Minimized state - small icon that can be expanded
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("fixed bottom-24 right-4 z-40", className)}
      >
        <motion.button
          onClick={handleExpand}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg"
        >
          <div className="w-full h-full rounded-full bg-storefront-dark flex items-center justify-center">
            <ChevronUp className="w-5 h-5 text-amber-400" />
          </div>
        </motion.button>
        {showReminder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn("fixed bottom-24 right-4 z-40", className)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <div className="bg-storefront-dark text-foreground px-4 py-2 rounded-xl shadow-xl border border-border">
              <p className="text-sm font-medium">Besoin d'aide ? Je suis Liberty !</p>
              <p className="text-xs text-muted-foreground">Cliquez pour ouvrir le guide</p>
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
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
        
        {/* Button */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl">
          <div className="w-full h-full rounded-full bg-storefront-dark flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
        </div>

        {/* Notification badge */}
        {(hasUnreadTips || showReminder) && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-storefront-dark"
          >
            <HelpCircle className="w-3 h-3 text-white" />
          </motion.div>
        )}

        {/* Pulse animation */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-amber-500 rounded-full"
        />
      </motion.button>

      {/* Dismiss button - visible on hover */}
      <button
        onClick={handleDismiss}
        className="absolute -top-2 -left-2 w-6 h-6 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center border border-border transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </motion.div>
  );
};

export default LibertyFloatingButton;
