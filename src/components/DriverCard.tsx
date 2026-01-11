import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Car, Award, UserPlus, UserCheck, Sparkles } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { cn } from "@/lib/utils";

interface DriverCardProps {
  driver: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
    vehicle_brand?: string;
    vehicle_model: string;
    vehicle_year?: number;
    vehicle_color?: string;
    vehicle_photos?: string[];
    gallery_photos?: string[];
    rating: number;
    total_rides: number;
    working_sectors: string[];
    company_name?: string;
    display_driver_name?: boolean;
    display_company_name?: boolean;
    distance_km?: number;
    show_rating_public?: boolean;
    is_pioneer?: boolean;
  };
  cardIndex?: number;
  onViewProfile?: (driverId: string) => void;
  isRegistered?: boolean;
}

export const DriverCard = ({ driver, cardIndex = 0, onViewProfile, isRegistered = false }: DriverCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const imageKey = driver.profile_photo_url ? `${driver.id}-${driver.profile_photo_url.substring(0, 50)}` : driver.id;
  
  // Construire le nom d'affichage
  const displayName = [];
  if (driver.display_driver_name !== false || !driver.company_name) {
    displayName.push(driver.full_name);
  }
  if (driver.display_company_name && driver.company_name) {
    displayName.push(driver.company_name);
  }
  const name = displayName.length > 0 ? displayName.join(" - ") : driver.full_name;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-500 flex flex-col border-0",
        "bg-gradient-to-b from-card via-card to-card/80",
        "shadow-lg hover:shadow-2xl hover:shadow-primary/20",
        "hover:-translate-y-2",
        driver.is_pioneer && "ring-1 ring-amber-400/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Effet de lumière au survol */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/5 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none z-0",
        isHovered && "opacity-100"
      )} />
      
      {/* Photo Section */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          {isRegistered ? (
            <Badge className="bg-emerald-500/90 backdrop-blur-sm text-white border-0 shadow-lg gap-1.5 text-xs">
              <UserCheck className="w-3 h-3" />
              Inscrit
            </Badge>
          ) : driver.is_pioneer && (
            <PioneerBadge size="xs" />
          )}
        </div>
        
        {/* Distance Badge */}
        {driver.distance_km !== undefined && (
          <Badge className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-sm text-white border-0 text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            {driver.distance_km.toFixed(1)} km
          </Badge>
        )}

        {/* Photo */}
        {driver.profile_photo_url ? (
          <OptimizedImage
            key={imageKey}
            src={driver.profile_photo_url}
            alt={name}
            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
            <span className="text-8xl font-light text-primary/60">
              {driver.full_name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>
        )}

        {/* Info overlay en bas de l'image */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
          <h3 className="text-xl font-semibold text-white mb-1 line-clamp-1">
            {name}
          </h3>
          
          {/* Rating & Stats */}
          {driver.total_rides > 0 && (
            <div className="flex items-center gap-3 text-white/90">
              {driver.show_rating_public !== false && driver.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-white/70" />
                <span className="text-sm">{driver.total_rides} courses</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 relative z-10">
        {/* Vehicle Info */}
        {(() => {
          const invalidTerms = ['compléter', 'attente', 'pending', 'en attente', 'à compléter'];
          
          const hasValidBrand = driver.vehicle_brand && 
            driver.vehicle_brand.trim() &&
            !invalidTerms.some(term => driver.vehicle_brand?.toLowerCase().includes(term));
          
          const hasValidModel = driver.vehicle_model && 
            driver.vehicle_model.trim() &&
            !invalidTerms.some(term => driver.vehicle_model?.toLowerCase().includes(term));
          
          const hasValidColor = driver.vehicle_color && 
            driver.vehicle_color.trim() &&
            !invalidTerms.some(term => driver.vehicle_color?.toLowerCase().includes(term));
          
          if (!hasValidBrand && !hasValidModel) return null;
          
          return (
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <Car className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">
                {hasValidBrand && `${driver.vehicle_brand} `}
                {hasValidModel && driver.vehicle_model}
                {hasValidColor && ` · ${driver.vehicle_color}`}
              </span>
            </div>
          );
        })()}

        {/* Working Sectors */}
        {driver.working_sectors && driver.working_sectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
            {driver.working_sectors.slice(0, 2).map((sector) => (
              <Badge
                key={sector}
                variant="secondary"
                className="text-[10px] font-normal bg-muted/50 hover:bg-muted"
              >
                {sector}
              </Badge>
            ))}
            {driver.working_sectors.length > 2 && (
              <Badge variant="secondary" className="text-[10px] font-normal bg-muted/50">
                +{driver.working_sectors.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* CTA Button */}
        <Button 
          onClick={() => onViewProfile?.(driver.id)}
          className={cn(
            "w-full transition-all duration-300 font-medium",
            "bg-primary hover:bg-primary/90",
            "shadow-sm hover:shadow-md hover:shadow-primary/20"
          )}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Découvrir
        </Button>
      </div>
    </Card>
  );
};
