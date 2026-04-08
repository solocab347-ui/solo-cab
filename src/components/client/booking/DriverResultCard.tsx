import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Check, Clock, Lock, Car, UserCheck, Star } from "lucide-react";
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
      {/* Glowing border — always animated */}
      <div className={cn("absolute rounded-2xl overflow-hidden", isSelected ? "-inset-[3px]" : "-inset-[2px]")}>
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, hsl(${theme.from}) 0%, transparent 10%, hsl(${theme.to}) 25%, transparent 35%, hsl(${theme.from}) 50%, transparent 60%, hsl(${theme.to}) 75%, transparent 85%, hsl(${theme.from}) 100%)`,
            animation: 'spin-slow 3s linear infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 90deg, transparent 0%, hsl(${theme.from}) 5%, hsl(${theme.to}) 10%, transparent 15%, transparent 100%)`,
            animation: 'spin-slow 2s linear infinite reverse',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, hsl(${theme.from} / ${isSelected ? '0.8' : '0.5'}), transparent 50%), radial-gradient(circle at 50% 100%, hsl(${theme.to} / ${isSelected ? '0.8' : '0.5'}), transparent 50%)`,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </div>

      {isSelected && (
        <div
          className="absolute -inset-1 rounded-2xl blur-md"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from} / 0.4), hsl(${theme.to} / 0.4))`,
            animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}

      {/* Card body — fills all space */}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl overflow-hidden h-full transition-all duration-300",
          "bg-gradient-to-b from-card via-card to-card/95 border border-transparent",
          isSelected && "scale-[1.02]"
        )}
        style={{
          boxShadow: isSelected
            ? `0 0 30px 6px hsl(${theme.from} / 0.4), 0 0 60px 12px hsl(${theme.to} / 0.2)`
            : `0 0 12px 2px hsl(${theme.from} / 0.15)`,
        }}
      >
        {/* Header: rank + badge + check */}
        <div className="flex items-center justify-between px-2.5 pt-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            {rank}
          </div>
          <Badge
            className="text-[8px] px-2 py-0.5 gap-0.5 font-bold border-0 text-white shadow-md"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <UserCheck className="h-2.5 w-2.5" /> Indépendant
          </Badge>
          {isSelected ? (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          ) : <div className="w-6" />}
        </div>

        {/* Avatar + Name + Vehicle — expanded */}
        <div className="flex flex-col items-center px-3 pt-3 pb-2 flex-1">
          <div
            className="rounded-full p-[2.5px] shadow-lg"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <Avatar className="h-16 w-16 border-2 border-card">
              <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} className="object-cover object-[center_15%]" />
              <AvatarFallback className="font-bold text-base text-white" style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.3), hsl(${theme.to} / 0.3))` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
          {driver.is_live_location && (
            <span className="relative -mt-3 ml-9 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
          )}

          <h4 className="font-bold text-foreground text-sm mt-2 truncate w-full text-center leading-tight">
            {displayName}
          </h4>

          {vehicleLabel && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Car className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[110px]">{vehicleLabel}</span>
              {driver.vehicle_color && <span className="text-muted-foreground/50">• {driver.vehicle_color}</span>}
            </div>
          )}

          {/* Stats grid */}
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{formatDistance(driver.distance_meters)}</span>
            </div>
            <span className="w-px h-3 bg-border" />
            <div className="flex items-center gap-0.5" style={{ color: `hsl(${theme.from})` }}>
              <Clock className="h-3 w-3 shrink-0" />
              <span className="font-semibold">{approachTime}</span>
            </div>
          </div>

          {/* CB badge */}
          <Badge
            variant="outline"
            className="mt-2 text-[9px] px-2 py-0.5 gap-1 font-medium border-primary/30 text-primary bg-primary/5"
          >
            <Lock className="h-2.5 w-2.5" /> CB sécurisée
          </Badge>
        </div>

        {/* Price section */}
        <div
          className="py-3 text-center"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from} / 0.12), hsl(${theme.to} / 0.18))`,
            borderTop: `1px solid hsl(${theme.from} / 0.2)`,
          }}
        >
          {priceText ? (
            <>
              <div
                className="text-xl font-extrabold text-white tracking-tight"
                style={{ textShadow: `0 0 16px hsl(${theme.from} / 0.4)` }}
              >
                {priceText}
              </div>
              {routeDistanceKm !== undefined && (
                <div className="text-[9px] text-white/50 mt-0.5">{routeDistanceKm.toFixed(1)} km</div>
              )}
            </>
          ) : (
            <div className="text-xs text-white/60 italic">Sur devis</div>
          )}
        </div>

        {/* Actions — profile link + select button */}
        <div className="px-2.5 pb-2.5 pt-2 flex flex-col gap-1.5 mt-auto">
          <button
            className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors py-1"
            onClick={(e) => { e.stopPropagation(); onViewProfile(driver); }}
          >
            <Eye className="h-3.5 w-3.5" />
            Voir le profil
          </button>
          <Button
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "w-full h-9 text-xs font-semibold gap-1.5 rounded-xl transition-all",
              isSelected && "text-white border-0"
            )}
            style={isSelected ? { background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` } : undefined}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(driver.driver_id); }}
          >
            {isSelected ? <><Check className="h-3.5 w-3.5" /> Sélectionné</> : 'Choisir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
