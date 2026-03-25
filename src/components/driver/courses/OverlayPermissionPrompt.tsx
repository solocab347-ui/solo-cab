import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Zap, X } from 'lucide-react';

interface OverlayPermissionPromptProps {
  visible: boolean;
  onGrant: () => void;
  onDeny: () => void;
}

export function OverlayPermissionPrompt({ visible, onGrant, onDeny }: OverlayPermissionPromptProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-[9998] mx-auto max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
            {/* Icon + Title */}
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">
                  Recevoir les courses en direct
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Activez la superposition pour voir les nouvelles courses apparaître 
                  instantanément par-dessus votre écran, comme sur Uber ou Bolt.
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                ⚡ Réponse instantanée
              </span>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                🔔 Vibration + alerte
              </span>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                ⏱️ Timer 30s
              </span>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12"
                onClick={onDeny}
              >
                <BellOff className="h-4 w-4 mr-2" />
                Plus tard
              </Button>
              <Button
                className="h-12 bg-gradient-to-r from-primary to-primary/80"
                onClick={onGrant}
              >
                <Bell className="h-4 w-4 mr-2" />
                Activer
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
