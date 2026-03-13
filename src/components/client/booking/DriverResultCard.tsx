import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Car, Eye, Check } from "lucide-react";
import { NearbyDriver } from "@/hooks/useNearbyDrivers";

interface DriverResultCardProps {
  driver: NearbyDriver;
  routeDistanceKm?: number;
  isSelected: boolean;
  onToggleSelect: (driverId: string) => void;
  onViewProfile: (driver: NearbyDriver) => void;
  rank: number;
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

  return (
    <Card
      className={`transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md' 
          : 'hover:shadow-md hover:border-primary/30'
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Rank + Avatar */}
          <div className="relative">
            <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${
              rank <= 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {rank}
            </div>
            <Avatar className="h-12 w-12 border-2 border-background shadow">
              <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-foreground text-sm truncate">{displayName}</h4>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                À {formatDistance(driver.distance_meters)}
              </span>
              {driver.has_surcharge && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/50 text-warning">
                  Majoration
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(driver);
                }}
              >
                <Eye className="h-3 w-3" />
                Profil
              </Button>
            </div>
          </div>

          {/* Price + Select */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {driver.estimated_price !== undefined && (
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {driver.estimated_price.toFixed(0)}€
                </div>
                {routeDistanceKm !== undefined && (
                  <div className="text-[10px] text-muted-foreground">
                    {routeDistanceKm.toFixed(1)} km
                  </div>
                )}
              </div>
            )}

            <Button
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              className={`h-8 text-xs gap-1 ${isSelected ? 'bg-primary' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(driver.driver_id);
              }}
            >
              {isSelected ? (
                <>
                  <Check className="h-3 w-3" />
                  Sélectionné
                </>
              ) : (
                'Choisir'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
