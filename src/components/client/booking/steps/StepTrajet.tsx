import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MapPin, Navigation, Loader2, Zap, CalendarClock, Calendar, Clock, Search, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressQuickPicks, type QuickAddress } from '../AddressQuickPicks';
import { SaveAddressButton } from '../SaveAddressButton';
import type { SavedAddress, RecentAddress } from '@/hooks/useClientAddresses';

interface StepTrajetProps {
  mode: 'reservation' | 'immediate';
  setMode: (m: 'reservation' | 'immediate') => void;
  /** When true, hide the immediate/reservation toggle and force reservation. Used for exclusive clients. */
  lockReservation?: boolean;
  pickupAddress: string;
  destinationAddress: string;
  onPickupChange: (val: string) => void;
  onDestChange: (val: string) => void;
  pickupSuggestions: any[];
  destSuggestions: any[];
  showPickupSuggestions: boolean;
  showDestSuggestions: boolean;
  onSelectPickup: (f: any) => void;
  onSelectDest: (f: any) => void;
  onPickupFocus: () => void;
  onDestFocus: () => void;
  onPickupBlur: () => void;
  onDestBlur: () => void;
  scheduledDate: string;
  scheduledTime: string;
  setScheduledDate: (v: string) => void;
  setScheduledTime: (v: string) => void;
  maxSearchRadiusKm: number;
  setMaxSearchRadiusKm: (v: number) => void;
  isGettingLocation: boolean;
  getCurrentLocation: () => void;
  pickupCoords?: { lat: number; lng: number } | null;
  destCoords?: { lat: number; lng: number } | null;
  isGeocoding: boolean;
  isLoading: boolean;
  priceRange: { min: number; max: number } | null;
  isFetchingPrices: boolean;
  routeDistanceKm: number | null;
  routeDurationMin: number | null;
  driversCount: number;
  onNext: () => void;
  // Quick picks (optional, only shown for logged-in clients)
  savedAddresses?: SavedAddress[];
  recentAddresses?: RecentAddress[];
  onPickQuickPickup?: (a: QuickAddress) => void;
  onPickQuickDest?: (a: QuickAddress) => void;
}

export function StepTrajet({
  mode, setMode,
  lockReservation = false,
  pickupAddress, destinationAddress,
  onPickupChange, onDestChange,
  pickupSuggestions, destSuggestions,
  showPickupSuggestions, showDestSuggestions,
  onSelectPickup, onSelectDest,
  onPickupFocus, onDestFocus,
  onPickupBlur, onDestBlur,
  scheduledDate, scheduledTime,
  setScheduledDate, setScheduledTime,
  maxSearchRadiusKm, setMaxSearchRadiusKm,
  isGettingLocation, getCurrentLocation,
  pickupCoords, destCoords,
  isGeocoding, isLoading,
  priceRange, isFetchingPrices,
  routeDistanceKm, routeDurationMin,
  driversCount,
  onNext,
  savedAddresses = [],
  recentAddresses = [],
  onPickQuickPickup,
  onPickQuickDest,
}: StepTrajetProps) {
  const canProceed = (() => {
    if (!pickupAddress.trim() || !destinationAddress.trim()) return false;
    if (mode === 'reservation' && (!scheduledDate || !scheduledTime)) return false;
    return true;
  })();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Mode Toggle (hidden for exclusive clients — they can only book as reservation, sent directly to their driver) */}
      {!lockReservation ? (
        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
          <button
            onClick={() => setMode('immediate')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
              mode === 'immediate'
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-4 w-4" />
            Course immédiate
          </button>
          <button
            onClick={() => setMode('reservation')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
              mode === 'reservation'
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Réservation
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground">
            <span className="font-semibold">Réservation auprès de votre chauffeur</span> — il recevra votre demande même hors-ligne.
          </p>
        </div>
      )}

      {/* Address Card */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          {/* Pickup */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
              <div className="flex-1 relative">
                <Input
                  value={pickupAddress}
                  onChange={(e) => onPickupChange(e.target.value)}
                  onFocus={onPickupFocus}
                  onBlur={onPickupBlur}
                  placeholder="Adresse de départ"
                  className="border-0 shadow-none bg-muted/30 h-11 pl-3"
                />
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((f, i) => (
                      <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => onSelectPickup(f)}>
                        {f._isStrategic ? (
                          <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        )}
                        <div>
                          {f._isStrategic && <span className="text-[10px] text-primary font-medium block">Lieu stratégique</span>}
                          <span className="text-foreground">{f.place_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={getCurrentLocation} disabled={isGettingLocation}>
                {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              </Button>
            </div>
            {(onPickQuickPickup && (savedAddresses.length > 0 || recentAddresses.length > 0)) || pickupAddress.trim() ? (
              <div className="mt-2 ml-5 flex items-start justify-between gap-2 flex-wrap">
                {onPickQuickPickup && (savedAddresses.length > 0 || recentAddresses.length > 0) ? (
                  <AddressQuickPicks
                    saved={savedAddresses}
                    recent={recentAddresses}
                    onSelect={onPickQuickPickup}
                    excludeAddress={pickupAddress}
                    title="Départ rapide"
                  />
                ) : <span />}
                <SaveAddressButton
                  address={pickupAddress}
                  coords={pickupCoords}
                  defaultType="home"
                />
              </div>
            ) : null}
          </div>

          {/* Divider line */}
          <div className="ml-1.5 w-0.5 h-4 bg-border" />

          {/* Destination */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive shrink-0" style={{ transform: 'rotate(45deg)' }} />
              <div className="flex-1 relative">
                <Input
                  value={destinationAddress}
                  onChange={(e) => onDestChange(e.target.value)}
                  onFocus={onDestFocus}
                  onBlur={onDestBlur}
                  placeholder="Adresse de destination"
                  className="border-0 shadow-none bg-muted/30 h-11 pl-3"
                />
                {showDestSuggestions && destSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {destSuggestions.map((f, i) => (
                      <button key={i} className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b border-border/30 last:border-0" onMouseDown={() => onSelectDest(f)}>
                        {f._isStrategic ? (
                          <Navigation className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        )}
                        <div>
                          {f._isStrategic && <span className="text-[10px] text-primary font-medium block">Lieu stratégique</span>}
                          <span className="text-foreground">{f.place_name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(onPickQuickDest && (savedAddresses.length > 0 || recentAddresses.length > 0)) || destinationAddress.trim() ? (
              <div className="mt-2 ml-5 flex items-start justify-between gap-2 flex-wrap">
                {onPickQuickDest && (savedAddresses.length > 0 || recentAddresses.length > 0) ? (
                  <AddressQuickPicks
                    saved={savedAddresses}
                    recent={recentAddresses}
                    onSelect={onPickQuickDest}
                    excludeAddress={destinationAddress}
                    title="Destination rapide"
                  />
                ) : <span />}
                <SaveAddressButton
                  address={destinationAddress}
                  coords={destCoords}
                  defaultType="work"
                />
              </div>
            ) : null}
          </div>

          {/* Date/Time for reservations */}
          {mode === 'reservation' && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Date et heure de prise en charge
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Date</span>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Heure</span>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                  />
                </div>
              </div>
              {(!scheduledDate || !scheduledTime) && (
                <p className="text-[11px] text-amber-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Veuillez sélectionner la date et l'heure pour continuer
                </p>
              )}
            </div>
          )}

          {/* Search radius */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm text-foreground">Zone de recherche</Label>
              <span className="text-sm font-medium text-primary">{maxSearchRadiusKm} km</span>
            </div>
            <Slider
              value={[maxSearchRadiusKm]}
              min={5}
              max={100}
              step={5}
              onValueChange={([value]) => setMaxSearchRadiusKm(value)}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>5 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route info preview */}
      {routeDistanceKm !== null && (
        <Card className="border-border/50">
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
            {priceRange && (
              <>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-lg font-bold text-primary">
                    {priceRange.min === priceRange.max
                      ? `${priceRange.min.toFixed(0)}€`
                      : `${priceRange.min.toFixed(0)}–${priceRange.max.toFixed(0)}€`}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Estimation</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {isFetchingPrices && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Estimation des prix...
        </div>
      )}

      {/* Next button */}
      <Button
        className="w-full h-12 text-base font-semibold gap-2"
        onClick={onNext}
        disabled={!canProceed || isGeocoding || isLoading}
      >
        {isGeocoding || isLoading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Recherche en cours...</>
        ) : (
          <><Search className="mr-2 h-5 w-5" />Rechercher des chauffeurs</>
        )}
      </Button>
    </div>
  );
}
