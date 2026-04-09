import { useRef } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
      {/* Back + route summary */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground px-2 h-8" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Modifier
        </Button>
        {routeDistanceKm !== null && (
          <div className="flex items-center gap-2 text-xs">
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
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {fallbackToReservation && mode === 'immediate' && filteredDrivers.length === 0 && (
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Aucun chauffeur en temps réel. Voici ceux sur réservation.</AlertDescription></Alert>
      )}
      {noDriversFound && (
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Aucun chauffeur dans {maxSearchRadiusKm} km.</AlertDescription></Alert>
      )}
      {clientPaymentMethod === 'cash' && filteredDrivers.length === 0 && drivers.length > 0 && (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Aucun chauffeur n'accepte les espèces ici.</AlertDescription></Alert>
      )}

      {/* Drivers carousel — COMPACT cards */}
      {filteredDrivers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-1">
            <Car className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[11px] font-semibold text-foreground">Professionnels certifiés</p>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredDrivers.map((driver, index) => (
              <div key={driver.driver_id} className="snap-start shrink-0 w-[calc(50%-4px)] min-w-[150px] max-w-[180px]">
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

      {/* Map — compact */}
      <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: '150px' }}>
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

      {/* Fixed bottom CTA */}
      {filteredDrivers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-50">
          <div className="container mx-auto max-w-4xl">
            <Button className="w-full h-11 text-sm font-semibold gap-2" onClick={onNext}>
              Continuer · {filteredDrivers.length} chauffeur{filteredDrivers.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
