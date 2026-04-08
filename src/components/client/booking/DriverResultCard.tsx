import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Check, Clock, Lock, Car, UserCheck } from "lucide-react";
import { NearbyDriver } from "@/hooks/useNearbyDrivers";
import { cn } from "@/lib/utils";

interface DriverResultCardProps {
  driver: NearbyDriver;
  routeDistanceKm?: number;
  isSelected: boolean;
  onToggleSelect: (driverId: string) => void;
  onViewProfile: (driver: NearbyDriver) => void;
  rank: number;
  clientPaymentMethod?: 'card' | 'cash' | null;
}

const GLOW_THEMES = [
  { from: '217 91% 60%', to: '210 100% 45%' },
  { from: '270 70% 60%', to: '280 80% 50%' },
  { from: '25 95% 55%', to: '15 90% 50%' },
  { from: '175 70% 45%', to: '190 80% 40%' },
  { from: '340 75% 55%', to: '350 80% 48%' },
  { from: '45 90% 50%', to: '35 85% 45%' },
];

function estimateApproachTime(distanceMeters: number): string {
  const km = distanceMeters / 1000;
  let minutes: number;
  if (km < 5) minutes = Math.round(km * 2);
  else if (km < 20) minutes = Math.round(10 + (km - 5) * 1.5);
  else minutes = Math.round(10 + 22.5 + (km - 20) * 1);
  return minutes < 1 ? '< 1 min' : `${Math.max(minutes, 2)} min`;
}

export function DriverResultCard({
  driver,
  routeDistanceKm,
  isSelected,
  onToggleSelect,
  onViewProfile,
  rank,
}: DriverResultCardProps) {
  const displayName = driver.display_name || driver.company_name || 'Chauffeur VTC';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  const approachTime = estimateApproachTime(driver.distance_meters);
  const theme = GLOW_THEMES[(rank - 1) % GLOW_THEMES.length];
  const vehicleLabel = [driver.vehicle_brand, driver.vehicle_model].filter(Boolean).join(' ') || null;

  const priceText = driver.estimated_price !== undefined && driver.estimated_price > 0
    ? `${driver.estimated_price.toFixed(0)}€`
    : null;

  return (
    <div
      className="relative rounded-2xl cursor-pointer h-full group"
      onClick={() => onToggleSelect(driver.driver_id)}
    >
      {/* Glowing border */}
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 animate-spin-slow"
          style={{ background: `conic-gradient(from 0deg, hsl(${theme.from}) 0%, transparent 15%, hsl(${theme.to}) 30%, transparent 45%, hsl(${theme.from}) 60%, transparent 75%, hsl(${theme.to}) 90%, hsl(${theme.from}) 100%)` }}
        />
        <div
          className="absolute inset-0 animate-pulse opacity-40"
          style={{ background: `radial-gradient(circle at 50% 0%, hsl(${theme.from} / 0.6), transparent 60%)` }}
        />
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl overflow-hidden h-full transition-all duration-300",
          "bg-gradient-to-b from-card via-card to-card/95 border border-transparent",
          isSelected && "scale-[1.02]"
        )}
        style={{
          boxShadow: isSelected
            ? `0 0 24px 4px hsl(${theme.from} / 0.35), 0 0 48px 8px hsl(${theme.to} / 0.15)`
            : `0 0 12px 2px hsl(${theme.from} / 0.15)`,
        }}
      >
        {/* Header: rank + badge + check */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            {rank}
          </div>
          <Badge
            className="text-[8px] px-1.5 py-0.5 gap-0.5 font-bold border-0 text-white shadow-md"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <UserCheck className="h-2.5 w-2.5" /> Indépendant
          </Badge>
          {isSelected ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shadow"
              style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
            >
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          ) : <div className="w-5" />}
        </div>

        {/* Avatar + Name + Vehicle */}
        <div className="flex flex-col items-center px-2 pt-1.5 pb-1">
          <div
            className="rounded-full p-[2px]"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <Avatar className="h-12 w-12 border-2 border-card">
              <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} className="object-cover object-[center_15%]" />
              <AvatarFallback className="font-bold text-xs text-white" style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.3), hsl(${theme.to} / 0.3))` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {driver.is_live_location && (
            <span className="relative -mt-2.5 ml-7 w-2.5 h-2.5 rounded-full bg-emerald-500 border-[1.5px] border-card animate-pulse" />
          )}
          <h4 className="font-semibold text-foreground text-[11px] mt-1 truncate w-full text-center leading-tight">
            {displayName}
          </h4>
          {vehicleLabel && (
            <div className="flex items-center gap-0.5 mt-0.5 text-[8px] text-muted-foreground">
              <Car className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate max-w-[100px]">{vehicleLabel}</span>
              {driver.vehicle_color && <span className="text-muted-foreground/60">• {driver.vehicle_color}</span>}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground px-2 pb-1">
          <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{formatDistance(driver.distance_meters)}</span>
          <span className="w-px h-2 bg-border" />
          <span className="flex items-center gap-0.5" style={{ color: `hsl(${theme.from})` }}><Clock className="h-2.5 w-2.5" />{approachTime}</span>
          <span className="w-px h-2 bg-border" />
          <span className="flex items-center gap-0.5 text-primary"><Lock className="h-2 w-2" />CB</span>
        </div>

        {/* Price — inline compact */}
        <div className="flex flex-col items-center py-1.5 text-center" style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.08), hsl(${theme.to} / 0.12))` }}>
          {priceText ? (
            <>
              <span className="text-sm font-bold text-white">{priceText}</span>
              {routeDistanceKm !== undefined && (
                <span className="text-[8px] text-white/40 mt-0.5">{routeDistanceKm.toFixed(1)} km</span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-white/60 italic">Sur devis</span>
          )}
        </div>

        {/* Voir profil link + Select button */}
        <div className="px-1.5 pb-1.5 pt-0.5 flex flex-col gap-1">
          <button
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors py-0.5"
            onClick={(e) => { e.stopPropagation(); onViewProfile(driver); }}
          >
            <Eye className="h-3 w-3" />
            Voir le profil
          </button>
          <Button
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "w-full h-7 text-[10px] font-semibold gap-1 rounded-xl transition-all",
              isSelected && "text-white border-0"
            )}
            style={isSelected ? { background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` } : undefined}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(driver.driver_id); }}
          >
            {isSelected ? <><Check className="h-3 w-3" /> Sélectionné</> : 'Choisir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
