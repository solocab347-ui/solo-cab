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

  // If no photos, use placeholder
  const photos = allPhotos.length > 0 
    ? allPhotos 
    : ['/placeholder.svg'];

  const displayName = [];
  if (driver.display_driver_name) displayName.push(driver.full_name);
  if (driver.display_company_name && driver.company_name) displayName.push(driver.company_name);
  const name = displayName.length > 0 ? displayName.join(" - ") : "Chauffeur VTC";

  return (
    <Card className="group overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
      {/* Photo Carousel */}
      <div className="relative h-56 overflow-hidden bg-gradient-dark">
        <Carousel className="w-full h-full">
          <CarouselContent>
            {photos.map((photo, index) => (
              <CarouselItem key={index}>
                <div className="relative h-56 w-full">
                  <img
                    src={photo}
                    alt={`${name} - Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </Carousel>

        {/* Profile Photo Badge */}
        <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full border-4 border-card bg-gradient-dark overflow-hidden shadow-elegant">
          {driver.profile_photo_url ? (
            <img
              src={driver.profile_photo_url}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {driver.full_name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        {/* Distance Badge */}
        {driver.distance_km !== undefined && (
          <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm">
            {driver.distance_km.toFixed(1)} km
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Name & Rating */}
        <div>
          <h3 className="text-xl font-bold mb-2 line-clamp-1">{name}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-premium fill-premium" />
              <span className="font-semibold text-foreground">
                {driver.rating.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              <span>{driver.total_rides} courses</span>
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-2 text-sm">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {driver.vehicle_brand && `${driver.vehicle_brand} `}
            {driver.vehicle_model}
            {driver.vehicle_year && ` (${driver.vehicle_year})`}
          </span>
        </div>

        {/* Sectors */}
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {driver.working_sectors?.slice(0, 3).map((sector) => (
              <Badge
                key={sector}
                variant="outline"
                className="text-xs"
              >
                {sector}
              </Badge>
            ))}
            {driver.working_sectors && driver.working_sectors.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{driver.working_sectors.length - 3}
              </Badge>
            )}
          </div>
        </div>

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
