import { Wifi, WifiOff, MapPin, Loader2, Map as MapIcon } from 'lucide-react';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { cn } from '@/lib/utils';
import { useDriverAvailability } from '@/contexts/DriverAvailabilityContext';

interface DriverAvailabilityToggleBigProps {
  driverId: string;
  initialAvailable?: boolean;
  onAvailabilityChange?: (isAvailable: boolean) => void;
  onSwitchToMap?: () => void;
}

export function DriverAvailabilityToggleBig({
  driverId,
  initialAvailable,
  onAvailabilityChange,
  onSwitchToMap,
}: DriverAvailabilityToggleBigProps) {
  const { isAvailable, isLoading, toggleAvailability } = useDriverAvailability();

  const { isTracking, error } = useDriverLocationTracker({
    driverId,
    enabled: true,
  });

  const handleToggle = async () => {
    await toggleAvailability();
    onAvailabilityChange?.(!isAvailable);
    if (!isAvailable && onSwitchToMap) {
      onSwitchToMap();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl p-4 flex items-center justify-center gap-3 border-2 border-border bg-muted/30">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement du statut...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <button
        onClick={handleToggle}
        className={cn(
          'w-full rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-500 border-2 shadow-lg cursor-pointer active:scale-[0.98]',
          isAvailable
            ? 'bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-400/20 border-emerald-500/60 shadow-emerald-500/25'
            : 'bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-400/10 border-red-500/40 shadow-red-500/10'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500',
              isAvailable
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/40'
                : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30'
            )}
          >
            {isAvailable ? (
              <Wifi className="w-7 h-7 text-white" />
            ) : (
              <WifiOff className="w-7 h-7 text-white" />
            )}
            {isAvailable && isTracking && (
              <span className="absolute inset-0 rounded-xl border-2 border-emerald-400 animate-ping opacity-30" />
            )}
          </div>

          <div className="text-left">
            <p
              className={cn(
                'text-lg font-bold tracking-tight',
                isAvailable ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {isAvailable ? 'Connecté' : 'Déconnecté'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAvailable
                ? 'Vous recevez les courses immédiates'
                : 'Réservations uniquement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAvailable && isTracking && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">GPS</span>
            </div>
          )}
          {isAvailable && !isTracking && !error && (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          )}

          <div
            className={cn(
              'w-14 h-8 rounded-full relative transition-all duration-500 border',
              isAvailable
                ? 'bg-emerald-500 border-emerald-400'
                : 'bg-muted border-border'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-500',
                isAvailable ? 'left-7' : 'left-1'
              )}
            />
          </div>
        </div>
      </button>

      {isAvailable && onSwitchToMap && (
        <button
          onClick={onSwitchToMap}
          className="w-full rounded-xl p-3 flex items-center justify-center gap-2 bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-all active:scale-[0.98] cursor-pointer"
        >
          <MapIcon className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">Voir la carte en direct</span>
        </button>
      )}
    </div>
  );
}
