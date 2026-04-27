import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { useDriverAvailability } from '@/contexts/DriverAvailabilityContext';
import { cn } from '@/lib/utils';

interface DriverAvailabilityToggleProps {
  driverId: string;
  initialAvailable?: boolean;
  onAvailabilityChange?: (isAvailable: boolean) => void;
  compact?: boolean;
}

export function DriverAvailabilityToggle({
  driverId,
  onAvailabilityChange,
  compact = false,
}: DriverAvailabilityToggleProps) {
  const { isOnline, isToggling, toggleAvailability, driverStatus } = useDriverAvailability();
  const isBusy = driverStatus === 'assigned' || driverStatus === 'in_ride';

  const {
    accuracy,
    lastUpdate,
    error,
    isTracking,
  } = useDriverLocationTracker({
    driverId,
    enabled: isOnline,
  });

  const handleToggle = async (checked: boolean) => {
    if (isBusy || isToggling) return;
    if (checked === isOnline) return;
    await toggleAvailability();
    onAvailabilityChange?.(!isOnline);
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    return `Il y a ${Math.floor(diff / 3600)}h`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={isOnline}
          onCheckedChange={handleToggle}
          id="availability-toggle-compact"
          disabled={isBusy || isToggling}
        />
        <Label
          htmlFor="availability-toggle-compact"
          className={cn(
            'text-sm cursor-pointer',
            isOnline ? 'text-green-600' : 'text-muted-foreground'
          )}
        >
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </Label>
        {isOnline && isTracking && (
          <MapPin className="h-3.5 w-3.5 text-green-600 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label
            htmlFor="availability-toggle"
            className="text-base font-medium cursor-pointer"
          >
            Disponibilité immédiate
          </Label>
          <p className="text-sm text-muted-foreground">
            Recevez des demandes de courses immédiates
          </p>
        </div>

        <Switch
          checked={isOnline}
          onCheckedChange={handleToggle}
          id="availability-toggle"
          disabled={isBusy || isToggling}
        />
      </div>

      {/* Status indicators */}
      {isOnline && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          {isTracking ? (
            <>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <MapPin className="h-3 w-3 mr-1 animate-pulse" />
                GPS actif
              </Badge>
              {accuracy && (
                <Badge variant="secondary" className="text-xs">
                  ±{Math.round(accuracy)}m
                </Badge>
              )}
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  {formatLastUpdate()}
                </span>
              )}
            </>
          ) : error ? (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              {error}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Activation GPS...
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
