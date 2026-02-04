import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CoachAvatar } from './CoachAvatar';

interface CoachSpeechProps {
  title: string;
  message: string;
  highlight?: string;
  delay?: number;
  className?: string;
}

export function CoachSpeech({ 
  title, 
  message, 
  highlight, 
  delay = 0,
  className 
}: CoachSpeechProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: 'easeOut' }}
      className={cn("flex flex-col items-center text-center space-y-4", className)}
    >
      <CoachAvatar size="lg" />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.1 + 0.2, duration: 0.4 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold text-foreground leading-tight">
          {title}
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
          {message}
          {highlight && (
            <span className="text-primary font-medium"> {highlight}</span>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
}
