import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Eye, Check, Clock, ShieldCheck, CreditCard } from "lucide-react";
import { NearbyDriver } from "@/hooks/useNearbyDrivers";

interface DriverResultCardProps {
  driver: NearbyDriver;
  routeDistanceKm?: number;
  isSelected: boolean;
  onToggleSelect: (driverId: string) => void;
  onViewProfile: (driver: NearbyDriver) => void;
  rank: number;
  clientPaymentMethod?: 'card' | 'cash' | null;
}

// Estimate approach time based on distance (avg 30km/h in urban, 60km/h highway)
function estimateApproachTime(distanceMeters: number): string {
  const km = distanceMeters / 1000;
  let minutes: number;
  if (km < 5) {
    minutes = Math.round(km * 2); // ~30km/h urban
  } else if (km < 20) {
    minutes = Math.round(10 + (km - 5) * 1.5); // mixed
  } else {
    minutes = Math.round(10 + 22.5 + (km - 20) * 1); // ~60km/h
  }
  return minutes < 1 ? '< 1 min' : `~${Math.max(minutes, 2)} min`;
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
    <Card
      className={`transition-all duration-200 h-full ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md' 
          : 'hover:shadow-md hover:border-primary/30'
      }`}
      onClick={() => onToggleSelect(driver.driver_id)}
    >
      <CardContent className="p-3 flex flex-col items-center text-center gap-2 h-full">
        {/* Rank badge */}
        <div className="relative w-full flex justify-center">
          <div className={`absolute -top-1 left-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${
            rank <= 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {rank}
          </div>
          <Avatar className="h-14 w-14 border-2 border-background shadow">
            <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <h4 className="font-semibold text-foreground text-sm truncate w-full">{displayName}</h4>

        {/* Payment badge */}
        {clientPaymentMethod === 'card' && (
          driver.stripe_connect_charges_enabled ? (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary bg-primary/5">
              <ShieldCheck className="h-2.5 w-2.5" />
              Paiement sécurisé
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5 border-muted-foreground/30 text-muted-foreground">
              <CreditCard className="h-2.5 w-2.5" />
              TPE
            </Badge>
          )
        )}

        {/* Distance & approach */}
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5 justify-center">
            <MapPin className="h-3 w-3" />
            À {formatDistance(driver.distance_meters)}
          </span>
          <span className="flex items-center gap-0.5 justify-center text-primary/80">
            <Clock className="h-3 w-3" />
            {approachTime}
          </span>
        </div>

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-border/50 w-full">
          {driver.estimated_price !== undefined && driver.estimated_price > 0 ? (
            <div className="text-2xl font-bold text-primary">
              {driver.estimated_price.toFixed(0)}€
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Sur devis</div>
          )}
          {routeDistanceKm !== undefined && (
            <div className="text-[10px] text-muted-foreground">
              {routeDistanceKm.toFixed(1)} km
            </div>
          )}
        </div>

        {/* Select button */}
        <Button
          size="sm"
          variant={isSelected ? 'default' : 'outline'}
          className={`w-full h-8 text-xs gap-1 ${isSelected ? 'bg-primary' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(driver.driver_id);
          }}
        >
          {isSelected ? (
            <>
              <Check className="h-3 w-3 shrink-0" />
              Sélectionné
            </>
          ) : (
            'Choisir'
          )}
        </Button>

        {/* Profile link */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary p-0"
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile(driver);
          }}
        >
          <Eye className="h-3 w-3" />
          Voir profil
        </Button>
      </CardContent>
    </Card>
  );
}
