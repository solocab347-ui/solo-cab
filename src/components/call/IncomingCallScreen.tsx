import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallSession } from '@/hooks/useCallSession';
import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallScreenProps {
  call: CallSession;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallScreen({ call, callerName, onAccept, onReject }: IncomingCallScreenProps) {
  const callerLabel = call.caller_type === 'client' ? 'Client' : 'Chauffeur';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/20"
      >
        {/* Pulsating ring */}
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-green-500/30"
            style={{ margin: '-20px' }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute inset-0 rounded-full bg-green-500/20"
            style={{ margin: '-40px' }}
          />
          <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
            <User className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Caller info */}
        <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
        <p className="text-muted-foreground mb-2">{callerLabel}</p>
        <motion.p
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-sm text-green-500 font-medium mb-12"
        >
          📞 Appel entrant...
        </motion.p>

        {/* Action buttons */}
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={onReject}
              size="lg"
              className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </Button>
            <span className="text-xs text-muted-foreground">Refuser</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <Button
                onClick={onAccept}
                size="lg"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
              >
                <Phone className="h-7 w-7 text-white" />
              </Button>
            </motion.div>
            <span className="text-xs text-muted-foreground">Accepter</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
