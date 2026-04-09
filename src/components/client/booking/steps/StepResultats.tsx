import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle, ArrowLeft, Car
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

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back + route summary inline */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground px-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Modifier
        </Button>
        {routeDistanceKm !== null && (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-foreground">{routeDistanceKm.toFixed(1)} km</span>
            {routeDurationMin !== null && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="font-bold text-foreground">~{Math.round(routeDurationMin)} min</span>
              </>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="font-bold text-primary">{filteredDrivers.length} chauffeur{filteredDrivers.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Error states */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fallbackToReservation && mode === 'immediate' && filteredDrivers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucun chauffeur connecté en temps réel. Voici ceux disponibles sur réservation.</AlertDescription>
        </Alert>
      )}

      {noDriversFound && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucun chauffeur dans un rayon de {maxSearchRadiusKm} km. Élargissez la zone.</AlertDescription>
        </Alert>
      )}

      {clientPaymentMethod === 'cash' && filteredDrivers.length === 0 && drivers.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Aucun chauffeur dans cette zone n'accepte les espèces.</AlertDescription>
        </Alert>
      )}

      {/* Drivers carousel FIRST */}
      {filteredDrivers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Car className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs font-semibold text-foreground">Professionnels certifiés à proximité</p>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredDrivers.map((driver, index) => (
              <div key={driver.driver_id} className="snap-start shrink-0 w-[calc(50%-5px)] min-w-[155px] max-w-[200px]">
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

      {/* Map AFTER drivers - compact height */}
      <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: '180px' }}>
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
      </div>

      {mapboxError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Carte temporairement indisponible.</AlertDescription>
        </Alert>
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
