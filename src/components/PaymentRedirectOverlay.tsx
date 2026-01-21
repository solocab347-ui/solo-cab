import { motion } from "framer-motion";
import { CreditCard, Lock, Loader2 } from "lucide-react";

interface PaymentRedirectOverlayProps {
  isVisible: boolean;
}

export const PaymentRedirectOverlay = ({ isVisible }: PaymentRedirectOverlayProps) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="text-center px-6 max-w-sm">
        {/* Animated card icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="relative mx-auto mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-premium flex items-center justify-center mx-auto">
            <CreditCard className="w-10 h-10 text-premium-foreground" />
          </div>
          
          {/* Pulsing ring */}
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-premium mx-auto"
          />
        </motion.div>

        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold mb-2"
        >
          Redirection vers le paiement
        </motion.h2>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground text-sm mb-6"
        >
          Vous allez être redirigé vers notre partenaire de paiement sécurisé Stripe
        </motion.p>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connexion sécurisée en cours...</span>
        </motion.div>

        {/* Security badge */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Lock className="w-3 h-3" />
          <span>Paiement 100% sécurisé par Stripe</span>
        </motion.div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-2 rounded-full bg-premium"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
