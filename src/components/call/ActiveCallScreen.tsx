import { PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallSession, formatCallDuration } from '@/hooks/useCallSession';
import { useLiveKitCall } from '@/hooks/useLiveKitCall';
import { motion } from 'framer-motion';

interface ActiveCallScreenProps {
  call: CallSession;
  otherName: string;
  duration: number;
  isMuted: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export function ActiveCallScreen({
  call,
  otherName,
  duration,
  isMuted,
  onEndCall,
  onToggleMute,
}: ActiveCallScreenProps) {
  const isRinging = call.status === 'ringing';
  const otherLabel = call.caller_type === call.receiver_type
    ? ''
    : call.caller_id === call.receiver_id
      ? ''
      : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-primary/10"
    >
      {/* Avatar */}
      <div className="relative mb-6">
        {call.status === 'active' && (
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary/20"
            style={{ margin: '-12px' }}
          />
        )}
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/30">
          <User className="h-10 w-10 text-primary" />
        </div>
      </div>

      {/* Info */}
      <h2 className="text-xl font-bold mb-1">{otherName}</h2>
      {isRinging ? (
        <motion.p
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-sm text-muted-foreground mb-8"
        >
          Appel en cours...
        </motion.p>
      ) : (
        <p className="text-2xl font-mono text-primary mb-8 tabular-nums">
          {formatCallDuration(duration)}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onToggleMute}
            variant={isMuted ? 'destructive' : 'secondary'}
            size="lg"
            className="h-14 w-14 rounded-full"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <span className="text-xs text-muted-foreground">
            {isMuted ? 'Muet' : 'Micro'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onEndCall}
            size="lg"
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </Button>
          <span className="text-xs text-muted-foreground">Raccrocher</span>
        </div>
      </div>

      {/* Privacy notice */}
      <p className="text-[11px] text-muted-foreground/60 mt-12 text-center px-8">
        🔒 Appel sécurisé — aucun numéro de téléphone partagé
      </p>
    </motion.div>
  );
}
