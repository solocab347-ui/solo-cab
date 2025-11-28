import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Car, Award, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  };
  cardIndex?: number;
  onViewProfile?: (driverId: string) => void;
}

export const DriverCard = ({ driver, cardIndex = 0, onViewProfile }: DriverCardProps) => {
  // Forcer le rafraîchissement de l'image avec un key basé sur l'URL
  const imageKey = driver.profile_photo_url ? `${driver.id}-${driver.profile_photo_url.substring(0, 50)}` : driver.id;
  
  // Construire le nom d'affichage - toujours afficher le nom, jamais "chauffeur"
  const displayName = [];
  // Afficher le nom du chauffeur par défaut
  if (driver.display_driver_name !== false || !driver.company_name) {
    displayName.push(driver.full_name);
  }
  // Ajouter le nom de l'entreprise si activé et présent
  if (driver.display_company_name && driver.company_name) {
    displayName.push(driver.company_name);
  }
  // Garantir qu'il y a toujours au moins le nom du chauffeur
  const name = displayName.length > 0 ? displayName.join(" - ") : driver.full_name;

  // Couleurs vibrantes et attractives pour les cartes (3 variantes)
  const cardColors = [
    "bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20",
    "bg-gradient-to-br from-purple-500/5 via-background to-purple-500/10 border-purple-500/20",
    "bg-gradient-to-br from-blue-500/5 via-background to-blue-500/10 border-blue-500/20",
  ];
  const cardColor = cardColors[cardIndex % 3];

  return (
    <Card className={`group overflow-hidden hover:shadow-elegant hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1 flex flex-col border-2 ${cardColor}`}>
      {/* Large Profile Photo Section */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-foreground/5 via-background to-primary/10">
        {/* Distance Badge */}
        {driver.distance_km !== undefined && (
          <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm z-10">
            {driver.distance_km.toFixed(1)} km
          </Badge>
        )}

      {/* Large Profile Photo */}
        {driver.profile_photo_url ? (
          <OptimizedImage
            key={imageKey}
            src={driver.profile_photo_url}
            alt={name}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-primary">
            {driver.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1 bg-gradient-to-b from-background via-background to-primary/5">
        {/* Content flexbox avec flex-1 pour pousser le bouton en bas */}
        <div className="flex-1 space-y-4">
          {/* Driver Name */}
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-1">
              {name}
            </h3>
            
            {/* Company Name if different */}
            {driver.company_name && driver.display_company_name && driver.display_driver_name !== false && (
              <p className="text-sm text-muted-foreground">
                {driver.company_name}
              </p>
            )}
          </div>

          {/* Rating & Rides - Only show if there are rides */}
          {driver.total_rides > 0 && (
            <div className="flex items-center justify-center gap-4">
              {driver.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-sm">
                    {driver.rating.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Award className="w-4 h-4" />
                <span className="text-sm">{driver.total_rides} courses</span>
              </div>
            </div>
          )}

          {/* Vehicle Info - Only show if valid info exists */}
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
            
            const hasValidYear = driver.vehicle_year && 
              driver.vehicle_year > 1900 && 
              driver.vehicle_year <= new Date().getFullYear() + 1;
            
            // Ne rien afficher si aucune information valide
            if (!hasValidBrand && !hasValidModel && !hasValidColor && !hasValidYear) return null;
            
            return (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Car className="w-4 h-4" />
                <span className="text-sm">
                  {hasValidBrand && `${driver.vehicle_brand} `}
                  {hasValidModel && driver.vehicle_model}
                  {hasValidColor && ` · ${driver.vehicle_color}`}
                  {hasValidYear && ` (${driver.vehicle_year})`}
                </span>
              </div>
            );
          })()}

          {/* Working Sectors */}
          {driver.working_sectors && driver.working_sectors.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium">Secteurs d'activité</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {driver.working_sectors.slice(0, 3).map((sector) => (
                  <Badge
                    key={sector}
                    variant="outline"
                    className="text-xs"
                  >
                    {sector}
                  </Badge>
                ))}
                {driver.working_sectors.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{driver.working_sectors.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA Button - toujours en bas */}
        <Button 
          onClick={() => onViewProfile?.(driver.id)}
          className="w-full bg-gradient-to-r from-primary via-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 text-primary-foreground font-semibold mt-4"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Voir le profil
        </Button>
      </div>
    </Card>
  );
};
