import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Check, Clock, ShieldCheck, CreditCard, Car } from "lucide-react";
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

// SoloCab brand color themes per card rank
const GLOW_THEMES = [
  { from: '217 91% 60%', to: '210 100% 45%', name: 'solocab-blue' },     // Bleu SoloCab
  { from: '270 70% 60%', to: '280 80% 50%', name: 'solocab-violet' },    // Violet
  { from: '25 95% 55%', to: '15 90% 50%', name: 'solocab-orange' },      // Orange
  { from: '175 70% 45%', to: '190 80% 40%', name: 'solocab-teal' },      // Teal
  { from: '340 75% 55%', to: '350 80% 48%', name: 'solocab-rose' },      // Rose
  { from: '45 90% 50%', to: '35 85% 45%', name: 'solocab-gold' },        // Or
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
  clientPaymentMethod,
}: DriverResultCardProps) {
  const displayName = driver.display_name || driver.company_name || 'Chauffeur VTC';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const approachTime = estimateApproachTime(driver.distance_meters);
  const theme = GLOW_THEMES[(rank - 1) % GLOW_THEMES.length];

  const vehicleLabel = [driver.vehicle_brand, driver.vehicle_model]
    .filter(Boolean)
    .join(' ') || null;

  return (
    <div
      className="relative rounded-2xl cursor-pointer h-full group"
      onClick={() => onToggleSelect(driver.driver_id)}
    >
      {/* Animated glowing border container */}
      <div
        className="absolute -inset-[2px] rounded-2xl overflow-hidden"
        style={{ padding: 0 }}
      >
        {/* Spinning conic gradient border */}
        <div
          className="absolute inset-0 animate-spin-slow"
          style={{
            background: `conic-gradient(
              from 0deg,
              hsl(${theme.from}) 0%,
              transparent 15%,
              hsl(${theme.to}) 30%,
              transparent 45%,
              hsl(${theme.from}) 60%,
              transparent 75%,
              hsl(${theme.to}) 90%,
              hsl(${theme.from}) 100%
            )`,
          }}
        />
        {/* Glow pulse */}
        <div
          className="absolute inset-0 animate-pulse opacity-40"
          style={{
            background: `radial-gradient(circle at 50% 0%, hsl(${theme.from} / 0.6), transparent 60%)`,
          }}
        />
      </div>

      {/* Inner card body */}
      <div
        className={cn(
          "relative flex flex-col rounded-2xl overflow-hidden h-full transition-all duration-300",
          "bg-gradient-to-b from-card via-card to-card/95",
          "border border-transparent",
          isSelected && "scale-[1.02]"
        )}
        style={{
          boxShadow: isSelected
            ? `0 0 24px 4px hsl(${theme.from} / 0.35), 0 0 48px 8px hsl(${theme.to} / 0.15)`
            : `0 0 12px 2px hsl(${theme.from} / 0.15)`,
        }}
      >
        {/* Rank badge */}
        <div
          className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-lg text-white"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`,
          }}
        >
          {rank}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div
            className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`,
            }}
          >
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        )}

        {/* Avatar section */}
        <div className="flex flex-col items-center pt-5 pb-2 px-3">
          <div
            className="relative rounded-full p-[3px] transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`,
            }}
          >
            <Avatar className="h-16 w-16 border-2 border-card">
              <AvatarImage
                src={driver.profile_photo_url || undefined}
                alt={displayName}
                className="object-cover object-[center_15%]"
              />
              <AvatarFallback
                className="font-bold text-base text-white"
                style={{
                  background: `linear-gradient(135deg, hsl(${theme.from} / 0.3), hsl(${theme.to} / 0.3))`,
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Live indicator dot */}
            {driver.is_live_location && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
            )}
          </div>

          {/* Name */}
          <h4 className="font-semibold text-foreground text-sm mt-2 truncate w-full text-center leading-tight">
            {displayName}
          </h4>

          {/* Vehicle info */}
          {vehicleLabel && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
              <Car className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[120px]">{vehicleLabel}</span>
              {driver.vehicle_color && (
                <span className="text-muted-foreground/60">• {driver.vehicle_color}</span>
              )}
            </div>
          )}

          {/* Payment badge */}
          {clientPaymentMethod === 'card' && (
            <Badge
              variant="outline"
              className={cn(
                "mt-1.5 text-[9px] px-2 py-0 gap-0.5 font-medium",
                driver.stripe_connect_charges_enabled
                  ? "border-primary/40 text-primary bg-primary/5"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {driver.stripe_connect_charges_enabled ? (
                <><ShieldCheck className="h-2.5 w-2.5" /> Sécurisé</>
              ) : (
                <><CreditCard className="h-2.5 w-2.5" /> TPE</>
              )}
            </Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground px-2 pb-2">
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {formatDistance(driver.distance_meters)}
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="flex items-center gap-0.5" style={{ color: `hsl(${theme.from})` }}>
            <Clock className="h-3 w-3 shrink-0" />
            {approachTime}
          </span>
        </div>

        {/* Price section */}
        <div
          className="mt-auto p-3 text-center rounded-b-xl"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.from} / 0.15), hsl(${theme.to} / 0.25))`,
            borderTop: `1px solid hsl(${theme.from} / 0.3)`,
          }}
        >
          {driver.estimated_price !== undefined && driver.estimated_price > 0 ? (
            <div
              className="text-2xl font-extrabold tracking-tight text-white"
              style={{
                textShadow: `0 0 20px hsl(${theme.from} / 0.5)`,
              }}
            >
              {driver.estimated_price.toFixed(0)}€
            </div>
          ) : (
            <div className="text-sm text-white/70 italic">Sur devis</div>
          )}
          {routeDistanceKm !== undefined && (
            <div className="text-[10px] text-white/60 mt-0.5">
              {routeDistanceKm.toFixed(1)} km
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 p-2 pt-0 bg-muted/5">
          <Button
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              "flex-1 h-8 text-xs font-semibold gap-1 rounded-xl transition-all",
              isSelected && "text-white border-0"
            )}
            style={isSelected ? {
              background: `linear-gradient(135deg, hsl(${theme.from}), hsl(${theme.to}))`,
            } : undefined}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(driver.driver_id); }}
          >
            {isSelected ? <><Check className="h-3 w-3" /> Sélectionné</> : 'Choisir'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary rounded-xl"
            onClick={(e) => { e.stopPropagation(); onViewProfile(driver); }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
