import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Wrapper de transition de page léger, basé sur framer-motion.
 * Donne une sensation native lors des navigations entre routes lazy-loadées.
 *
 * Usage : envelopper le contenu d'une page (généralement à la racine du composant)
 *   <PageTransition>...</PageTransition>
 *
 * Performance : transition courte (180ms) + GPU (transform/opacity uniquement)
 * pour rester fluide même sur mobile bas de gamme.
 */
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
