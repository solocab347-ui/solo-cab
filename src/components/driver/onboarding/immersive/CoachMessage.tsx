import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';

interface CoachMessageProps {
  name?: string;
  role?: string;
  message: string;
  highlight?: string;
  delay?: number;
  className?: string;
   showSignature?: boolean;
}

export function CoachMessage({
  name = "Alex",
  role = "Coach SoloCab",
  message,
  highlight,
  delay = 0,
   className,
   showSignature = false
}: CoachMessageProps) {
   const lang = 'fr';
   const signatures = motivationTranslations.signatures;
   const signatureKeys = Object.keys(signatures) as Array<keyof typeof signatures>;
   const randomSignature = signatures[signatureKeys[Math.floor(Math.random() * signatureKeys.length)]];
 
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: "easeOut" }}
      className={cn(
        "bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50 shadow-lg",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shrink-0">
          A
        </div>
        
        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">– {role}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
            {highlight && (
              <span className="text-foreground font-medium"> {highlight}</span>
            )}
          </p>
           {showSignature && (
             <p className="text-xs text-primary/70 italic pt-2 border-t border-border/30 mt-2">
               "{randomSignature[lang]}"
             </p>
           )}
        </div>
      </div>
    </motion.div>
  );
}
