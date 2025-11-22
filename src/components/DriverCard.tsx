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
}

export const DriverCard = ({ driver }: DriverCardProps) => {
  // Combine vehicle photos and gallery photos for carousel
  const allPhotos = [
    ...(driver.vehicle_photos || []),
    ...(driver.gallery_photos || []),
  ].filter(Boolean);

  // Use first photo as background, or placeholder
  const backgroundPhoto = allPhotos.length > 0 ? allPhotos[0] : '/placeholder.svg';

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

  return (
    <Card className="group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
      {/* Vehicle Background with Profile Photo Overlay */}
      <div className="relative h-80 overflow-hidden">
        {/* Vehicle Background Image */}
        <div className="absolute inset-0">
          <img
            src={backgroundPhoto}
            alt={`${name} - Véhicule`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
        </div>

        {/* Distance Badge */}
        {driver.distance_km !== undefined && (
          <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm z-10">
            {driver.distance_km.toFixed(1)} km
          </Badge>
        )}

        {/* Centered Profile Photo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-white/90 bg-gradient-dark overflow-hidden shadow-2xl mb-4">
            {driver.profile_photo_url ? (
              <img
                src={driver.profile_photo_url}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white">
                {driver.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Centered Driver Name */}
          <h3 className="text-2xl font-bold text-white text-center px-4 drop-shadow-lg mb-2">
            {name}
          </h3>

          {/* Rating & Rides - Only show if there are rides */}
          {driver.total_rides > 0 && (
            <div className="flex items-center gap-4 text-white/90 mb-3">
              {driver.rating > 0 && (
                <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-sm">
                    {driver.rating.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                <Award className="w-4 h-4 text-white" />
                <span className="text-sm font-medium">{driver.total_rides} courses</span>
              </div>
            </div>
          )}

          {/* Vehicle Info - Only show if info exists */}
          {(driver.vehicle_brand || driver.vehicle_model) && (
            <div className="flex items-center justify-center gap-2 text-white/90 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <Car className="w-4 h-4" />
              <span className="font-medium text-sm">
                {driver.vehicle_brand && `${driver.vehicle_brand} `}
                {driver.vehicle_model}
                {driver.vehicle_year && ` (${driver.vehicle_year})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content - Sectors */}
      <div className="p-6 space-y-4">
        {driver.working_sectors && driver.working_sectors.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Secteurs d'activité</span>
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

        {/* CTA */}
        <Link to={`/chauffeur/${driver.id}`}>
          <Button className="w-full bg-gradient-premium hover:opacity-90">
            <UserPlus className="w-4 h-4 mr-2" />
            Voir le profil
          </Button>
        </Link>
      </div>
    </Card>
  );
};
