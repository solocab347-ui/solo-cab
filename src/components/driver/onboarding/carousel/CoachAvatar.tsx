import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CoachAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export function CoachAvatar({ size = 'md', className, pulse = false }: CoachAvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', duration: 0.6 }}
      className={cn(
        "relative rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center font-bold text-white shadow-xl",
        sizeClasses[size],
        pulse && "animate-pulse",
        className
      )}
    >
      A
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent opacity-50 blur-lg -z-10" />
    </motion.div>
  );
}
