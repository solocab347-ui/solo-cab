import { Wifi, WifiOff, MapPin, Loader2, Map as MapIcon, Car, Coffee } from 'lucide-react';
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
  const { isOnline, isAvailableForCourses, driverStatus, isLoading, toggleAvailability, toggleBreak } = useDriverAvailability();
  const isAssigned = driverStatus === 'assigned';
  const isInRide = driverStatus === 'in_ride';
  const isBreak = driverStatus === 'break';
  const isBusy = isInRide || isAssigned;

  // GPS strictement synchronisé avec l'état chauffeur :
  // online / assigned / in_ride → GPS actif. break / offline → coupé.
  const trackingEnabled = isOnline || isAssigned || isInRide;
  const { isTracking, error } = useDriverLocationTracker({
    driverId,
    enabled: trackingEnabled,
  });

  const handleToggle = async () => {
    if (isBusy) return;
    await toggleAvailability();
    onAvailabilityChange?.(!isOnline);
    if (!isOnline && onSwitchToMap) {
      onSwitchToMap();
    }
  };

  const statusTitle = isInRide
    ? 'En course'
    : isAssigned
      ? 'Course assignée'
      : isBreak
        ? 'En pause'
        : isOnline
          ? 'En ligne'
          : 'Hors ligne';

  const statusSubtitle = isInRide
    ? 'Course en cours — indisponible'
    : isAssigned
      ? 'Course attribuée — indisponible'
      : isBreak
        ? 'Aucune course reçue'
        : isOnline
          ? 'Courses immédiates + réservations'
          : 'Réservations (>2h) uniquement';

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
          'w-full rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-500 border-2 shadow-lg',
          isBusy ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]',
          isBusy
            ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-amber-400/20 border-amber-500/60 shadow-amber-500/25'
            : isBreak
              ? 'bg-gradient-to-r from-blue-500/10 via-blue-500/10 to-blue-400/10 border-blue-500/40 shadow-blue-500/10'
              : isOnline
                ? 'bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-400/20 border-emerald-500/60 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-red-500/10 via-rose-500/10 to-red-400/10 border-red-500/40 shadow-red-500/10'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500',
              isBusy
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/40'
                : isBreak
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
                  : isOnline
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/40'
                    : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30'
            )}
          >
            {isBusy ? (
              <Car className="w-7 h-7 text-white" />
            ) : isBreak ? (
              <Coffee className="w-7 h-7 text-white" />
            ) : isOnline ? (
              <Wifi className="w-7 h-7 text-white" />
            ) : (
              <WifiOff className="w-7 h-7 text-white" />
            )}
            {isOnline && isTracking && !isBusy && (
              <span className="absolute inset-0 rounded-xl border-2 border-emerald-400 animate-ping opacity-30" />
            )}
          </div>

          <div className="text-left">
            <p
              className={cn(
                'text-lg font-bold tracking-tight',
                isBusy ? 'text-amber-400' 
                  : isBreak ? 'text-blue-400'
                  : isOnline ? 'text-emerald-400' 
                  : 'text-red-400'
              )}
            >
              {statusTitle}
            </p>
            <p className="text-xs text-muted-foreground">{statusSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline && isTracking && !isBusy && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">GPS</span>
            </div>
          )}
          {isOnline && !isTracking && !error && !isBusy && (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          )}

          {!isBusy && (
            <div
              className={cn(
                'w-14 h-8 rounded-full relative transition-all duration-500 border',
                isOnline
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'bg-muted border-border'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-500',
                  isOnline ? 'left-7' : 'left-1'
                )}
              />
            </div>
          )}
        </div>
      </button>

      {/* Break toggle - only when online and not busy */}
      {(isOnline || isBreak) && !isBusy && (
        <button
          onClick={toggleBreak}
          className={cn(
            'w-full rounded-xl p-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer',
            isBreak
              ? 'bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25'
          )}
        >
          <Coffee className={cn('w-5 h-5', isBreak ? 'text-emerald-400' : 'text-blue-400')} />
          <span className={cn('text-sm font-semibold', isBreak ? 'text-emerald-400' : 'text-blue-400')}>
            {isBreak ? 'Reprendre le service' : 'Prendre une pause'}
          </span>
        </button>
      )}

      {isAvailableForCourses && onSwitchToMap && (
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
