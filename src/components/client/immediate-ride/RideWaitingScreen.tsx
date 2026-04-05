import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  MapPin,
  Navigation,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Users,
  Car,
} from 'lucide-react';

export type WaitingStatus = 'searching' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

interface RideWaitingScreenProps {
  requestId: string;
  requestGroupId?: string;
  requestType: 'exclusive' | 'multi';
  driverCount: number;
  pickupAddress: string;
  destinationAddress: string;
  estimatedPrice: number;
  driverName?: string;
  timeoutAt: string;
  onCancel: () => void;
  onAccepted: (driverName: string) => void;
  onExpired: () => void;
}

export function RideWaitingScreen({
  requestId,
  requestGroupId,
  requestType,
  driverCount,
  pickupAddress,
  destinationAddress,
  estimatedPrice,
  driverName,
  timeoutAt,
  onCancel,
  onAccepted,
  onExpired,
}: RideWaitingScreenProps) {
  const [status, setStatus] = useState<WaitingStatus>('searching');
  const [timeLeft, setTimeLeft] = useState(90);
  const [acceptedDriverName, setAcceptedDriverName] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Calculate time left from timeoutAt
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeout = new Date(timeoutAt).getTime();
      const remaining = Math.max(0, Math.ceil((timeout - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && status === 'searching') {
        setStatus('expired');
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timeoutAt, status, onExpired]);

  // Subscribe to realtime updates on ride_requests
  useEffect(() => {
    const filterField = requestGroupId ? 'request_group_id' : 'id';
    const filterValue = requestGroupId || requestId;

    const channel = supabase
      .channel(`waiting-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `${filterField}=eq.${filterValue}`,
        },
        async (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'accepted') {
            // Fetch driver info
            const driverId = payload.new?.selected_driver_id;
            if (driverId) {
              const { data: driver } = await supabase
                .from('drivers')
                .select('profiles:user_id(full_name), company_name')
                .eq('id', driverId)
                .single();
              const name = (driver as any)?.profiles?.full_name || (driver as any)?.company_name || 'Chauffeur';
              setAcceptedDriverName(name);
              onAccepted(name);
            }
            setStatus('accepted');
          } else if (newStatus === 'rejected') {
            setStatus('rejected');
          } else if (newStatus === 'expired') {
            setStatus('expired');
            onExpired();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, requestGroupId, onAccepted, onExpired]);

  // Cancel ride request
  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      await supabase
        .from('ride_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);
      setStatus('cancelled');
      onCancel();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setIsCancelling(false);
    }
  }, [requestId, onCancel]);

  const progressPercent = (timeLeft / 90) * 100;
  const timerColor = timeLeft > 60 ? 'text-green-500' : timeLeft > 30 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Progress bar */}
        {status === 'searching' && (
          <div className="h-1.5 bg-muted">
            <motion.div
              className={`h-full ${
                timeLeft > 60
                  ? 'bg-green-500'
                  : timeLeft > 30
                  ? 'bg-amber-500'
                  : 'bg-destructive'
              }`}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        )}

        <CardContent className="pt-8 pb-8 text-center space-y-5">
          {/* Status icon */}
          <AnimatePresence mode="wait">
            {status === 'searching' && (
              <motion.div
                key="searching"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative mx-auto w-20 h-20"
              >
                {/* Pulsating rings */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/15"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Car className="h-10 w-10 text-primary" />
                  </motion.div>
                </div>
              </motion.div>
            )}
            {status === 'accepted' && (
              <motion.div
                key="accepted"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
            )}
            {(status === 'expired' || status === 'rejected') && (
              <motion.div
                key="expired"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto"
              >
                <XCircle className="h-10 w-10 text-destructive" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status text */}
          {status === 'searching' && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Recherche de chauffeur en cours…</h3>
              {requestType === 'exclusive' ? (
                <p className="text-sm text-muted-foreground">
                  {driverName ? `${driverName} a` : 'Le chauffeur a'} été contacté. 
                  Il a jusqu'à 90 secondes pour répondre.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {driverCount} chauffeurs sont contactés.
                  Le premier à accepter prendra votre course.
                </p>
              )}
            </div>
          )}

          {status === 'accepted' && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                Chauffeur trouvé ! 🎉
              </h3>
              <p className="text-sm text-muted-foreground">
                {acceptedDriverName || 'Votre chauffeur'} a accepté votre course.
              </p>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Aucun chauffeur disponible</h3>
              <p className="text-sm text-muted-foreground">
                Le délai de réponse est écoulé. Vous pouvez relancer une recherche.
              </p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Demande déclinée</h3>
              <p className="text-sm text-muted-foreground">
                Le chauffeur n'est pas disponible. Essayez un autre chauffeur.
              </p>
            </div>
          )}

          {/* Timer */}
          {status === 'searching' && (
            <div className="flex items-center justify-center gap-2">
              <Clock className={`h-4 w-4 ${timerColor}`} />
              <span className={`text-sm font-mono font-bold ${timerColor}`}>
                Temps restant : {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Request type badge */}
          <div className="flex justify-center">
            {requestType === 'exclusive' ? (
              <Badge className="gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Crown className="h-3.5 w-3.5" />
                Demande exclusive
              </Badge>
            ) : (
              <Badge className="gap-1.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                <Users className="h-3.5 w-3.5" />
                {driverCount} chauffeurs contactés
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Route Summary */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div className="w-0.5 h-10 bg-gradient-to-b from-green-500 to-primary" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium truncate">{pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="text-sm font-medium truncate">{destinationAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <span className="text-sm text-muted-foreground">Prix estimé</span>
            <span className="text-lg font-bold text-primary">{estimatedPrice.toFixed(2)}€</span>
          </div>
        </CardContent>
      </Card>

      {/* Cancel button */}
      {status === 'searching' && (
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          size="lg"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Annuler la demande
        </Button>
      )}

      {/* Retry / Go back buttons */}
      {(status === 'expired' || status === 'rejected') && (
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={onCancel}>
            Relancer une recherche
          </Button>
        </div>
      )}
    </div>
  );
}
