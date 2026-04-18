import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Star, 
  Heart,
  CalendarPlus,
  Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_brand: string | null;
  rating: number | null;
  display_driver_name: boolean;
  display_company_name: boolean;
  show_rating_public: boolean;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface DriverSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverIds: string[];
  favoriteDriverId: string | null;
  onSelectDriver: (driverId: string) => void;
}

export function DriverSelectionDialog({
  open,
  onOpenChange,
  driverIds,
  favoriteDriverId,
  onSelectDriver,
}: DriverSelectionDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && driverIds.length > 0) {
      fetchDrivers();
    }
  }, [open, driverIds]);

  const fetchDrivers = async () => {
    if (!driverIds || driverIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data: driversData, error } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          vehicle_model,
          vehicle_brand,
          rating,
          display_driver_name,
          display_company_name,
          show_rating_public,
          profiles:user_id(full_name, profile_photo_url)
        `)
        .in("id", driverIds);

      if (error) throw error;

      if (driversData) {
        // Trier: chauffeur favori en premier
        const sorted = (driversData as any[]).sort((a, b) => {
          if (a.id === favoriteDriverId) return -1;
          if (b.id === favoriteDriverId) return 1;
          return 0;
        });
        setDrivers(sorted);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDriverDisplayName = (driver: Driver): string => {
    const fullName = driver.profiles?.full_name?.trim();
    const companyName = driver.company_name?.trim();
    const showDriverName = driver.display_driver_name === true;
    const showCompanyName = driver.display_company_name === true;

    if (showDriverName && fullName) {
      return fullName;
    }
    if (showCompanyName && companyName) {
      return companyName;
    }
    return "Chauffeur VTC";
  };

  const handleSelectDriver = (driverId: string) => {
    onSelectDriver(driverId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Réserver une course
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le chauffeur avec lequel vous souhaitez réserver
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            drivers.map((driver) => {
              const isFavorite = driver.id === favoriteDriverId;

              return (
                <Card
                  key={driver.id}
                  className={cn(
                    "relative p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 bg-card",
                    isFavorite && "border-2 border-primary/60 ring-1 ring-primary/20 shadow-md"
                  )}
                  onClick={() => handleSelectDriver(driver.id)}
                >
                  {isFavorite && (
                    <Badge
                      variant="default"
                      className="absolute -top-2 left-4 gap-1 text-[10px] px-2 py-0.5 bg-primary text-primary-foreground shadow-sm"
                    >
                      <Heart className="w-3 h-3 fill-current" />
                      Favori
                    </Badge>
                  )}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-2 border-primary/30">
                      <AvatarImage
                        src={driver.profiles?.profile_photo_url || undefined}
                        alt={getDriverDisplayName(driver)}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {getDriverDisplayName(driver).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate leading-tight">
                        {getDriverDisplayName(driver)}
                      </p>

                      {driver.company_name && driver.display_company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{driver.company_name}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {driver.vehicle_brand && driver.vehicle_model && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[11px] font-normal py-0.5 px-2"
                          >
                            <Car className="w-3 h-3" />
                            {driver.vehicle_brand} {driver.vehicle_model}
                          </Badge>
                        )}
                        {driver.rating && driver.rating > 0 && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[11px] font-normal py-0.5 px-2"
                          >
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {driver.rating.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button size="sm" className="flex-shrink-0">
                      Réserver
                    </Button>
                  </div>
                </Card>
              );
            })
          )}

          {!loading && drivers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun chauffeur associé</p>
            </div>
          )}

          {!loading && drivers.length > 1 && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground gap-2"
                onClick={() => {
                  onOpenChange(false);
                  window.location.href = "/chauffeurs";
                }}
              >
                <Star className="w-3 h-3" />
                Comparer les prix sur la vitrine
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
