import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface FloatingMapButtonProps {
  onClick: () => void;
}

export function FloatingMapButton({ onClick }: FloatingMapButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
      onClick={onClick}
      className="fixed bottom-6 right-4 z-[900] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 transition-all duration-200 cursor-pointer"
      aria-label="Revenir à la carte"
    >
      <MapPin className="w-5 h-5" />
      <span className="text-sm font-bold">Carte</span>
    </motion.button>
  );
}
