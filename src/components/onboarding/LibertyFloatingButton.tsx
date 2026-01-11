import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LibertyFloatingButtonProps {
  onClick: () => void;
  hasUnreadTips?: boolean;
  className?: string;
}

export const LibertyFloatingButton = ({ onClick, hasUnreadTips = true, className }: LibertyFloatingButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn("fixed bottom-6 right-6 z-40", className)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xl border border-white/10">
              <p className="text-sm font-medium">Besoin d'aide ? Je suis Liberty !</p>
              <p className="text-xs text-white/60">Cliquez pour ouvrir le guide</p>
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
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
        </div>

        {/* Notification badge */}
        {hasUnreadTips && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900"
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

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
        className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center border border-slate-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </motion.div>
  );
};

export default LibertyFloatingButton;
