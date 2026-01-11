import { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Car } from "lucide-react";

interface FleetDriver {
  id: string;
  driver_id: string;
  status: string;
  joined_at: string;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand?: string | null;
    status: string;
    user_id: string;
    rating?: number | null;
    vehicle_photos?: string[] | null;
    bio?: string | null;
    services_offered?: string[] | null;
    is_pioneer?: boolean;
    profile?: {
      full_name: string;
      email: string;
      phone: string;
      profile_photo_url?: string | null;
    };
  };
}

interface OptimizedFleetDriverCardProps {
  driver: FleetDriver;
  onViewProfile: (driverId: string) => void;
}

/**
 * Composant mémorisé pour éviter les re-renders inutiles
 * Utilise lazy loading pour les images
 */
export const OptimizedFleetDriverCard = memo(function OptimizedFleetDriverCard({
  driver,
  onViewProfile
}: OptimizedFleetDriverCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const driverProfile = driver.driver?.profile;
  const driverData = driver.driver;
  
  const initials = (driverProfile?.full_name || "?")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const photoUrl = driverProfile?.profile_photo_url;
  const showImage = photoUrl && !imageError;

  return (
    <Card 
      className="card-modern p-4 cursor-pointer group hover-glow-primary transition-all duration-200 will-change-transform"
      onClick={() => driverData?.id && onViewProfile(driverData.id)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar avec lazy loading */}
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 border-2 border-border group-hover:border-primary/50 transition-colors">
            {showImage ? (
              <>
                {!imageLoaded && (
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                    {initials}
                  </AvatarFallback>
                )}
                <AvatarImage 
                  src={photoUrl} 
                  alt={driverProfile?.full_name}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={imageLoaded ? "opacity-100" : "opacity-0"}
                />
              </>
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          {/* Status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
            driverData?.status === 'active' ? 'bg-success' : 'bg-muted'
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {driverProfile?.full_name || "Chauffeur"}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Car className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {driverData?.vehicle_brand} {driverData?.vehicle_model}
            </span>
          </div>
        </div>

        {/* Rating, Pioneer Badge & Status */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {driverData?.is_pioneer && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 text-[10px] px-1.5 py-0">
              🏆 Pionnier
            </Badge>
          )}
          {driverData?.rating && driverData.rating > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium">{driverData.rating.toFixed(1)}</span>
            </div>
          )}
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 ${
              driver.status === 'partner' 
                ? 'border-info/50 text-info bg-info/10' 
                : 'border-success/50 text-success bg-success/10'
            }`}
          >
            {driver.status === 'partner' ? 'Partenaire' : 'Interne'}
          </Badge>
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison pour éviter les re-renders
  return (
    prevProps.driver.id === nextProps.driver.id &&
    prevProps.driver.status === nextProps.driver.status &&
    prevProps.driver.driver?.rating === nextProps.driver.driver?.rating &&
    prevProps.driver.driver?.profile?.full_name === nextProps.driver.driver?.profile?.full_name &&
    prevProps.driver.driver?.profile?.profile_photo_url === nextProps.driver.driver?.profile?.profile_photo_url
  );
});
