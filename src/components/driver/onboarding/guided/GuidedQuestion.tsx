import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';

interface GuidedQuestionProps {
  /** L'emoji ou icône à afficher */
  icon?: string;
  /** Le titre principal de la question */
  title: string;
  /** Explication détaillée (peut contenir du markdown simple) */
  explanation?: string;
  /** Conseil pratique */
  tip?: string;
  /** Le contenu de saisie (input, badges, switch, etc.) */
  children: ReactNode;
  /** Animation delay */
  delay?: number;
  /** État de la question */
  isActive?: boolean;
}

export function GuidedQuestion({
  icon,
  title,
  explanation,
  tip,
  children,
  delay = 0,
  isActive = true
}: GuidedQuestionProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    
    // Séquence d'animation
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setShowExplanation(true), 300 + delay));
    if (tip) {
      timers.push(setTimeout(() => setShowTip(true), 800 + delay));
    }
    timers.push(setTimeout(() => setShowInput(true), tip ? 1200 + delay : 800 + delay));
    
    return () => timers.forEach(clearTimeout);
  }, [isActive, delay, tip]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4 w-full"
    >
      {/* Avatar + Titre principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delay * 0.001 }}
        className="flex items-start gap-3"
      >
        <Avatar className="w-10 h-10 border-2 border-primary/30 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
            <Bot className="w-5 h-5 text-white" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
        </div>
      </motion.div>

      {/* Explication */}
      <AnimatePresence>
        {showExplanation && explanation && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="ml-13 pl-[52px]"
          >
            <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conseil / Tip */}
      <AnimatePresence>
        {showTip && tip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="ml-13 pl-[52px]"
          >
            <div className="bg-primary/10 rounded-xl px-4 py-3 border border-primary/20">
              <p className="text-sm text-primary leading-relaxed">
                💡 {tip}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone de saisie */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            className="ml-13 pl-[52px]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
