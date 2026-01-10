import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Car, 
  Star, 
  Heart, 
  Check,
  Building2,
  Calendar,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

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

interface FavoriteDriverSectionProps {
  clientId: string;
  favoriteDriverId: string | null;
  driverIds: string[];
  onFavoriteChange?: () => void;
}

export function FavoriteDriverSection({ 
  clientId, 
  favoriteDriverId, 
  driverIds,
  onFavoriteChange 
}: FavoriteDriverSectionProps) {
  const { t } = useLocale();
  const [favoriteDriver, setFavoriteDriver] = useState<Driver | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, [favoriteDriverId, driverIds]);

  const fetchDrivers = async () => {
    if (!driverIds || driverIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const selectFields = `
        id,
        company_name,
        vehicle_model,
        vehicle_brand,
        rating,
        display_driver_name,
        display_company_name,
        show_rating_public,
        profiles:user_id(full_name, profile_photo_url)
      `;

      const { data: driversData, error } = await supabase
        .from("drivers")
        .select(selectFields)
        .in("id", driverIds);

      if (error) throw error;

      if (driversData) {
        setAllDrivers(driversData as any);
        
        if (favoriteDriverId) {
          const favorite = driversData.find((d: any) => d.id === favoriteDriverId);
          setFavoriteDriver(favorite as any || null);
        } else if (driversData.length > 0) {
          // Si pas de favori défini mais il y a des chauffeurs, prendre le premier
          setFavoriteDriver(driversData[0] as any);
        }
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeFavorite = async (newFavoriteId: string) => {
    setChanging(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          favorite_driver_id: newFavoriteId,
          updated_at: new Date().toISOString()
        })
        .eq("id", clientId);

      if (error) throw error;

      const newFavorite = allDrivers.find(d => d.id === newFavoriteId);
      setFavoriteDriver(newFavorite || null);
      setShowSelectDialog(false);
      
      toast.success("Chauffeur favori mis à jour !");
      onFavoriteChange?.();
    } catch (error) {
      console.error("Error updating favorite driver:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setChanging(false);
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

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  if (!favoriteDriver && allDrivers.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="p-4 md:p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="text-lg md:text-xl font-bold">Mon chauffeur favori</h2>
        </div>
        
        {favoriteDriver ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-primary/30">
              <AvatarImage 
                src={favoriteDriver.profiles?.profile_photo_url || undefined} 
                alt={getDriverDisplayName(favoriteDriver)} 
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                {getDriverDisplayName(favoriteDriver).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h3 className="font-bold text-lg">{getDriverDisplayName(favoriteDriver)}</h3>
                <Badge variant="default" className="bg-red-500 gap-1">
                  <Heart className="w-3 h-3 fill-current" />
                  Favori
                </Badge>
              </div>
              
              {favoriteDriver.company_name && favoriteDriver.display_company_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center sm:justify-start mt-1">
                  <Building2 className="w-3 h-3" />
                  {favoriteDriver.company_name}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                {favoriteDriver.vehicle_brand && favoriteDriver.vehicle_model && (
                  <Badge variant="secondary" className="gap-1">
                    <Car className="w-3 h-3" />
                    {favoriteDriver.vehicle_brand} {favoriteDriver.vehicle_model}
                  </Badge>
                )}
                {favoriteDriver.rating && favoriteDriver.rating > 0 && favoriteDriver.show_rating_public && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {favoriteDriver.rating.toFixed(1)}
                  </Badge>
                )}
              </div>
            </div>
            
            {allDrivers.length > 1 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSelectDialog(true)}
                className="flex-shrink-0"
              >
                Changer
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Aucun chauffeur favori défini</p>
            {allDrivers.length > 0 && (
              <Button onClick={() => setShowSelectDialog(true)}>
                Choisir un favori
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Dialog pour sélectionner le chauffeur favori */}
      <Dialog open={showSelectDialog} onOpenChange={setShowSelectDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Choisir mon chauffeur favori
            </DialogTitle>
            <DialogDescription>
              Votre chauffeur favori apparaîtra en premier dans vos options de réservation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {allDrivers.map((driver) => {
              const isCurrentFavorite = favoriteDriver?.id === driver.id;
              
              return (
                <Card 
                  key={driver.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-md",
                    isCurrentFavorite 
                      ? "border-2 border-red-500 bg-red-50 dark:bg-red-950/20" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => !changing && handleChangeFavorite(driver.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={driver.profiles?.profile_photo_url || undefined} 
                        alt={getDriverDisplayName(driver)} 
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getDriverDisplayName(driver).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getDriverDisplayName(driver)}</p>
                      {driver.company_name && driver.display_company_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {driver.company_name}
                        </p>
                      )}
                    </div>
                    
                    {isCurrentFavorite ? (
                      <Badge variant="default" className="bg-red-500 gap-1 flex-shrink-0">
                        <Heart className="w-3 h-3 fill-current" />
                        Actuel
                      </Badge>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={changing}
                        className="flex-shrink-0"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
