import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, ArrowLeft, Car, MapPin, Clock, Loader2
} from 'lucide-react';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { DriverResultCard } from '../DriverResultCard';
import { DriverMap } from '../DriverMap';
import { useNavigate } from 'react-router-dom';

interface StepResultatsProps {
  drivers: NearbyDriver[];
  filteredDrivers: NearbyDriver[];
  selectedDriverIds: Set<string>;
  pickupCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  searchRadius: number | null;
  noDriversFound: boolean;
  fallbackToReservation: boolean;
  mode: 'reservation' | 'immediate';
  error: string | null;
  mapboxToken: string | null;
  tokenLoading: boolean;
  mapboxError: string | null;
  maxSearchRadiusKm: number;
  clientPaymentMethod: 'card' | 'cash' | null;
  onBack: () => void;
  onNext: () => void;
}

export function StepResultats({
  drivers, filteredDrivers, selectedDriverIds,
  pickupCoords, destCoords,
  routeDistanceKm, routeDurationMin,
  searchRadius, noDriversFound, fallbackToReservation,
  mode, error,
  mapboxToken, tokenLoading, mapboxError,
  maxSearchRadiusKm, clientPaymentMethod,
  onBack, onNext,
}: StepResultatsProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll carousel
  useEffect(() => {
    if (filteredDrivers.length <= 1) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % filteredDrivers.length;
      scrollRef.current?.scrollTo({ left: idx * 180, behavior: 'smooth' });
    }, 2000);
    return () => clearInterval(interval);
  }, [filteredDrivers.length]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        Modifier le trajet
      </Button>

      {/* Route summary */}
      {routeDistanceKm !== null && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-around text-center">
            <div>
              <div className="text-lg font-bold text-foreground">{routeDistanceKm.toFixed(1)} km</div>
              <div className="text-[11px] text-muted-foreground">Distance</div>
            </div>
            {routeDurationMin !== null && (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-lg font-bold text-foreground">~{Math.round(routeDurationMin)} min</div>
                  <div className="text-[11px] text-muted-foreground">Temps estimé</div>
                </div>
              </>
            )}
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-lg font-bold text-primary">{filteredDrivers.length}</div>
              <div className="text-[11px] text-muted-foreground">Chauffeur{filteredDrivers.length > 1 ? 's' : ''}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <DriverMap
        clientPosition={pickupCoords}
        destinationPosition={destCoords}
        drivers={filteredDrivers}
        selectedDriverIds={selectedDriverIds}
        onDriverClick={() => {}}
        searchRadius={searchRadius}
        mapboxToken={mapboxToken}
        tokenLoading={tokenLoading}
      />

      {mapboxError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>La carte est temporairement indisponible, mais la liste des chauffeurs reste fonctionnelle.</AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fallbackToReservation && mode === 'immediate' && filteredDrivers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun chauffeur connecté en temps réel. Voici les chauffeurs disponibles sur réservation.
          </AlertDescription>
        </Alert>
      )}

      {noDriversFound && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun chauffeur disponible dans un rayon de {maxSearchRadiusKm} km. Essayez d'élargir la zone.
          </AlertDescription>
        </Alert>
      )}

      {/* Cash filter warning */}
      {clientPaymentMethod === 'cash' && filteredDrivers.length === 0 && drivers.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucun chauffeur dans cette zone n'accepte les espèces.</AlertDescription>
        </Alert>
      )}

      {/* Drivers list */}
      {filteredDrivers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-xl p-3">
            <Car className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Professionnels certifiés à proximité</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Chaque chauffeur est un entrepreneur indépendant.</p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredDrivers.map((driver, index) => (
              <div key={driver.driver_id} className="snap-start shrink-0 w-[calc(50%-6px)] min-w-[160px] max-w-[220px] min-h-[320px]">
                <DriverResultCard
                  driver={driver}
                  routeDistanceKm={routeDistanceKm || undefined}
                  isSelected={selectedDriverIds.has(driver.driver_id)}
                  onToggleSelect={() => {}}
                  onViewProfile={(d) => navigate(`/chauffeur/${d.driver_id}`)}
                  rank={index + 1}
                  clientPaymentMethod={clientPaymentMethod}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next button */}
      {filteredDrivers.length > 0 && (
        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={onNext}
        >
          Continuer · {filteredDrivers.length} chauffeur{filteredDrivers.length > 1 ? 's' : ''}
        </Button>
      )}
    </div>
  );
}
