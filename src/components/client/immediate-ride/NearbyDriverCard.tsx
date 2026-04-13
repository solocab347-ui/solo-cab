import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Car } from "lucide-react";
import { NearbyDriver } from "@/hooks/useNearbyDrivers";
import { formatDriverName } from "@/lib/formatDriverName";

interface NearbyDriverCardProps {
  driver: NearbyDriver;
  routeDistanceKm?: number;
  onSelect: (driver: NearbyDriver) => void;
  isSelected?: boolean;
}

export function NearbyDriverCard({
  driver,
  routeDistanceKm,
  onSelect,
  isSelected = false,
}: NearbyDriverCardProps) {
  const displayName = formatDriverName(driver.display_name || driver.company_name, false);
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format distance from driver to client
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onSelect(driver)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-background shadow">
            <AvatarImage src={driver.profile_photo_url || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground truncate">{displayName}</h4>
              {driver.company_name && driver.display_name !== driver.company_name && (
                <Badge variant="secondary" className="text-xs">
                  {driver.company_name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                À {formatDistance(driver.distance_meters)}
              </span>
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                VTC
              </span>
            </div>

            {/* Pricing */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <span>{driver.base_fare.toFixed(2)}€ base</span>
                <span className="mx-1">•</span>
                <span>{driver.per_km_rate.toFixed(2)}€/km</span>
              </div>
            </div>
          </div>

          {/* Price & Action */}
          <div className="flex flex-col items-end gap-2">
            {routeDistanceKm !== undefined && driver.estimated_price !== undefined && (
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {driver.estimated_price.toFixed(2)}€
                </div>
                <div className="text-xs text-muted-foreground">
                  {routeDistanceKm.toFixed(1)} km
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(driver);
              }}
            >
              {isSelected ? 'Sélectionné' : 'Choisir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
