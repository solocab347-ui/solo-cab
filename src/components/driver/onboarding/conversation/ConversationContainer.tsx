import { useRef, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationContainerProps {
  children: ReactNode;
  className?: string;
}

export function ConversationContainer({ children, className }: ConversationContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [children]);

  return (
    <ScrollArea 
      className={`flex-1 pr-2 ${className}`}
      ref={scrollRef}
    >
      <motion.div 
        className="flex flex-col gap-3 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {children}
        <div ref={endRef} />
      </motion.div>
    </ScrollArea>
  );
}
