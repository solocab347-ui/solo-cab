import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Routes } from "react-router-dom";
import { ReactNode } from "react";

/**
 * Wrapper qui anime les transitions entre routes sans toucher
 * la définition de chaque <Route />.
 *
 * Performance : transition courte (180ms), GPU only (opacity).
 * Pas de transform Y pour éviter les reflows sur les pages longues
 * type Dashboard (scroll-position safe).
 */
interface AnimatedRoutesProps {
  children: ReactNode;
}

export const AnimatedRoutes = ({ children }: AnimatedRoutesProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
};
