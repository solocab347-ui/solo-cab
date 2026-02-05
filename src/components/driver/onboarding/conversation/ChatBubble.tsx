import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';

interface ChatBubbleProps {
  message: string;
  isBot?: boolean;
  isTyping?: boolean;
  delay?: number;
  avatarUrl?: string;
  userName?: string;
  className?: string;
  children?: React.ReactNode;
   showSignature?: boolean;
}

export function ChatBubble({ 
  message, 
  isBot = true, 
  isTyping = false,
  delay = 0,
  avatarUrl,
  userName,
  className,
   children,
   showSignature = false
}: ChatBubbleProps) {
   const lang = 'fr';
   const signatures = motivationTranslations.signatures;
   const signatureKeys = Object.keys(signatures) as Array<keyof typeof signatures>;
   const randomSignature = signatures[signatureKeys[Math.floor(Math.random() * signatureKeys.length)]];
 
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
      className={cn(
        "flex gap-2.5 max-w-[95%]",
        isBot ? "self-start" : "self-end flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className={cn(
        "w-8 h-8 shrink-0 border-2",
        isBot ? "border-primary/30" : "border-accent/30"
      )}>
        {isBot ? (
          <>
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
              <Bot className="w-4 h-4 text-white" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-muted">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Bubble */}
      <div className={cn(
        "rounded-2xl px-4 py-3 shadow-sm",
        isBot 
          ? "bg-card border border-border rounded-tl-sm" 
          : "bg-primary text-primary-foreground rounded-tr-sm"
      )}>
        {isTyping ? (
          <div className="flex items-center gap-1 py-1">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 rounded-full bg-current"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 rounded-full bg-current"
            />
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 rounded-full bg-current"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
            {children}
             {showSignature && isBot && (
               <p className="text-xs text-primary/70 italic pt-2 border-t border-border/30 mt-2">
                 "{randomSignature[lang]}"
               </p>
             )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
