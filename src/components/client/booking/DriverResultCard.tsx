import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Check, Clock, ShieldCheck, CreditCard } from "lucide-react";
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

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden h-full",
        "bg-gradient-to-b from-card via-card to-muted/20",
        isSelected
          ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
          : "border-border/40 hover:border-primary/40 hover:shadow-md"
      )}
      onClick={() => onToggleSelect(driver.driver_id)}
    >
      {/* Rank badge - floating */}
      <div className={cn(
        "absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-md",
        rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {rank}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      {/* Avatar section */}
      <div className="flex flex-col items-center pt-5 pb-3 px-3">
        <div className={cn(
          "relative rounded-full p-[3px] transition-all duration-300",
          isSelected
            ? "bg-gradient-to-br from-primary via-blue-400 to-primary"
            : "bg-gradient-to-br from-border/60 to-border/30"
        )}>
          <Avatar className="h-16 w-16 border-2 border-background">
            <AvatarImage 
              src={driver.profile_photo_url || undefined} 
              alt={displayName}
              className="object-cover object-[center_20%]"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <h4 className="font-semibold text-foreground text-sm mt-2 truncate w-full text-center leading-tight">
          {displayName}
        </h4>

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
        <span className="flex items-center gap-0.5 text-primary/80">
          <Clock className="h-3 w-3 shrink-0" />
          {approachTime}
        </span>
      </div>

      {/* Price section */}
      <div className="mt-auto border-t border-border/40 bg-muted/10 p-3 text-center">
        {driver.estimated_price !== undefined && driver.estimated_price > 0 ? (
          <div className="text-2xl font-extrabold text-primary tracking-tight">
            {driver.estimated_price.toFixed(0)}€
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">Sur devis</div>
        )}
        {routeDistanceKm !== undefined && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {routeDistanceKm.toFixed(1)} km
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 p-2 pt-0 bg-muted/10">
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          className={cn("flex-1 h-8 text-xs font-semibold gap-1 rounded-xl", isSelected && "bg-primary")}
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
  );
}
