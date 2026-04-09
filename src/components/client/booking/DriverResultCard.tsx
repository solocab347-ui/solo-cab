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
  else if (km < 20) minutes = Math.round(km * 1.2);
  else minutes = Math.round(km * 1);
  if (minutes < 1) return '< 1 min';
  return `~${minutes} min`;
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

  const priceText = driver.estimated_price !== undefined && driver.estimated_price > 0
    ? `${driver.estimated_price.toFixed(2)}€`
    : null;

  return (
    <div
      className="relative rounded-xl cursor-pointer h-full group"
      onClick={() => onToggleSelect(driver.driver_id)}
    >
      {/* Glow border */}
      <div className={cn("absolute rounded-xl overflow-hidden", isSelected ? "-inset-[2px]" : "-inset-[1.5px]")}>
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, hsl(${theme.from}) 0%, transparent 10%, hsl(${theme.to}) 25%, transparent 35%, hsl(${theme.from}) 50%, transparent 60%, hsl(${theme.to}) 75%, transparent 85%, hsl(${theme.from}) 100%)`,
            animation: 'spin-slow 3s linear infinite',
          }}
        />
      </div>

      {isSelected && (
        <div
          className="absolute -inset-1 rounded-xl blur-md opacity-50"
          style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.4), hsl(${theme.to} / 0.4))` }}
        />
      )}

      {/* Card body — COMPACT */}
      <div
        className={cn(
          "relative flex flex-col rounded-xl overflow-hidden h-full transition-all duration-300",
          "bg-gradient-to-b from-card via-card to-card/95 border border-transparent",
          isSelected && "scale-[1.01]"
        )}
        style={{
          boxShadow: isSelected
            ? `0 0 20px 4px hsl(${theme.from} / 0.3)`
            : `0 0 8px 1px hsl(${theme.from} / 0.1)`,
        }}
      >
        {/* Header: rank + check */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            {rank}
          </div>
          {isSelected && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
            >
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Avatar + Name — compact */}
        <div className="flex flex-col items-center px-2 pt-1 pb-1.5">
          <div
            className="rounded-full p-[2px]"
            style={{ background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))` }}
          >
            <Avatar className="h-11 w-11 border-2 border-card">
              <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} className="object-cover object-[center_15%]" />
              <AvatarFallback className="font-bold text-xs text-white" style={{ background: `linear-gradient(135deg, hsl(${theme.from} / 0.3), hsl(${theme.to} / 0.3))` }}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <h4 className="font-bold text-foreground text-[11px] mt-1.5 truncate w-full text-center leading-tight">
            {displayName}
          </h4>

          {/* Stats: distance + time */}
          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-muted-foreground">
            <span>{formatDistance(driver.distance_meters)}</span>
            <span className="text-border">·</span>
            <span style={{ color: `hsl(${theme.from})` }} className="font-semibold">{approachTime}</span>
          </div>
        </div>

        {/* Price — compact */}
        <div
          className="py-1.5 text-center"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from} / 0.12), hsl(${theme.to} / 0.18))`,
            borderTop: `1px solid hsl(${theme.from} / 0.2)`,
          }}
        >
          {priceText ? (
            <div
              className="text-base font-extrabold text-white tracking-tight"
              style={{ textShadow: `0 0 12px hsl(${theme.from} / 0.4)` }}
            >
              {priceText}
            </div>
          ) : (
            <div className="text-[10px] text-white/60 italic">Sur devis</div>
          )}
        </div>

        {/* Profile link */}
        <div className="px-2 py-1.5 mt-auto">
          <button
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors w-full"
            onClick={(e) => { e.stopPropagation(); onViewProfile(driver); }}
          >
            <Eye className="h-3 w-3" />
            Profil
          </button>
        </div>
      </div>
    </div>
  );
}
