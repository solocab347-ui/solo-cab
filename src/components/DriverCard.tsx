import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Car, Award, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
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
}

export const DriverCard = ({ driver, cardIndex = 0 }: DriverCardProps) => {
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

  // Couleurs alternées pour les cartes (3 variantes)
  const cardColors = [
    "bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10",
    "bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10",
    "bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10",
  ];
  const cardColor = cardColors[cardIndex % 3];

  return (
    <Card className={`group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 flex flex-col ${cardColor}`}>
      {/* Large Profile Photo Section */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        {/* Distance Badge */}
        {driver.distance_km !== undefined && (
          <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm z-10">
            {driver.distance_km.toFixed(1)} km
          </Badge>
        )}

      {/* Large Profile Photo */}
        {driver.profile_photo_url ? (
          <img
            src={driver.profile_photo_url}
            alt={name}
            className="w-full h-full object-cover object-[center_20%]"
            onError={(e) => {
              console.error("Error loading driver photo");
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-primary">
            {driver.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        {/* Content flexbox avec flex-1 pour pousser le bouton en bas */}
        <div className="flex-1 space-y-4">
          {/* Driver Name */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground mb-1">
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
            const hasValidBrand = driver.vehicle_brand && 
              !driver.vehicle_brand.toLowerCase().includes('compléter');
            const hasValidModel = driver.vehicle_model && 
              !driver.vehicle_model.toLowerCase().includes('compléter');
            
            if (!hasValidBrand && !hasValidModel) return null;
            
            return (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Car className="w-4 h-4" />
                <span className="text-sm">
                  {hasValidBrand && `${driver.vehicle_brand} `}
                  {hasValidModel && driver.vehicle_model}
                  {driver.vehicle_color && !driver.vehicle_color.toLowerCase().includes('compléter') && ` · ${driver.vehicle_color}`}
                  {driver.vehicle_year && ` (${driver.vehicle_year})`}
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
        <Link to={`/chauffeur/${driver.id}`} className="mt-4">
          <Button className="w-full bg-gradient-premium hover:opacity-90">
            <UserPlus className="w-4 h-4 mr-2" />
            Voir le profil
          </Button>
        </Link>
      </div>
    </Card>
  );
};
