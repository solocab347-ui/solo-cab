import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  MessageSquare,
  CalendarPlus,
  Phone,
  Mail,
  ChevronRight,
  Eye
} from "lucide-react";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
interface Driver {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  rating: number | null;
  display_driver_name: boolean;
  display_company_name: boolean;
  show_rating_public: boolean;
  show_phone: boolean;
  show_email: boolean;
  user_id: string;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    email: string | null;
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
  const navigate = useNavigate();
  const [favoriteDriver, setFavoriteDriver] = useState<Driver | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

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
        vehicle_color,
        rating,
        display_driver_name,
        display_company_name,
        show_rating_public,
        show_phone,
        show_email,
        user_id,
        profiles:user_id(full_name, profile_photo_url, phone, email)
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

  const getVehicleDescription = (driver: Driver): string => {
    // Affichage: modèle en premier, couleur à la fin
    const parts = [];
    if (driver.vehicle_brand) parts.push(driver.vehicle_brand);
    if (driver.vehicle_model && driver.vehicle_model !== driver.vehicle_brand) parts.push(driver.vehicle_model);
    if (driver.vehicle_color) parts.push(driver.vehicle_color);
    return parts.join(' ') || '';
  };

  const handleBookCourse = (driverId: string) => {
    navigate(`/create-course?driver_id=${driverId}`);
  };

  const handleMessage = () => {
    navigate("/client-dashboard?tab=messages");
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="animate-pulse h-20 bg-muted/30 rounded-xl" />
    );
  }

  if (!favoriteDriver && allDrivers.length === 0) {
    return null;
  }

  return (
    <>
      {favoriteDriver ? (
        <Card className="group relative overflow-hidden border border-border/50 bg-gradient-to-r from-card via-card to-primary/5 hover:shadow-lg transition-all duration-300">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative p-4 flex items-center gap-4">
            {/* Avatar with favorite badge */}
            <div 
              className="relative flex-shrink-0 cursor-pointer group"
              onClick={() => {
                setSelectedDriverId(favoriteDriver.id);
                setShowProfileDialog(true);
              }}
            >
              <Avatar className="w-14 h-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage 
                  src={favoriteDriver.profiles?.profile_photo_url || undefined} 
                  alt={getDriverDisplayName(favoriteDriver)} 
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white font-bold">
                  {getDriverDisplayName(favoriteDriver).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-3 h-3 text-white fill-white" />
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-foreground truncate">
                  {getDriverDisplayName(favoriteDriver)}
                </h3>
                {favoriteDriver.rating && favoriteDriver.rating > 0 && (
                  <Badge variant="secondary" className="gap-0.5 text-xs px-1.5 py-0">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {favoriteDriver.rating.toFixed(1)}
                  </Badge>
                )}
              </div>
              
              {favoriteDriver.company_name && favoriteDriver.display_company_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{favoriteDriver.company_name}</span>
                </p>
              )}
              
              {getVehicleDescription(favoriteDriver) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Car className="w-3 h-3" />
                  <span className="truncate">{getVehicleDescription(favoriteDriver)}</span>
                </p>
              )}
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button 
                size="sm"
                onClick={() => handleBookCourse(favoriteDriver.id)}
                className="bg-primary hover:bg-primary/90 h-9 px-3"
              >
                <CalendarPlus className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Réserver</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleMessage}
                className="h-9 w-9"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              {favoriteDriver.show_phone && favoriteDriver.profiles?.phone && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCall(favoriteDriver.profiles.phone!)}
                  className="h-9 w-9 text-green-600"
                >
                  <Phone className="w-4 h-4" />
                </Button>
              )}

              {favoriteDriver.show_email && favoriteDriver.profiles?.email && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEmail(favoriteDriver.profiles.email!)}
                  className="h-9 w-9 text-blue-600"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              )}
              
              {allDrivers.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSelectDialog(true)}
                  className="h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-dashed border-2 border-muted-foreground/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Heart className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Aucun chauffeur favori</p>
                <p className="text-xs text-muted-foreground/70">Sélectionnez votre chauffeur préféré</p>
              </div>
            </div>
            {allDrivers.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSelectDialog(true)}
              >
                Choisir
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Dialog pour sélectionner le chauffeur favori */}
      <Dialog open={showSelectDialog} onOpenChange={setShowSelectDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Choisir mon chauffeur favori
            </DialogTitle>
            <DialogDescription>
              Votre chauffeur favori apparaîtra en premier pour vos réservations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 mt-4">
            {allDrivers.map((driver) => {
              const isCurrentFavorite = favoriteDriver?.id === driver.id;
              
              return (
                <div 
                  key={driver.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 border",
                    isCurrentFavorite 
                      ? "border-red-500 bg-red-500/10" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}
                  onClick={() => !changing && handleChangeFavorite(driver.id)}
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage 
                      src={driver.profiles?.profile_photo_url || undefined} 
                      alt={getDriverDisplayName(driver)} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-sm">
                      {getDriverDisplayName(driver).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{getDriverDisplayName(driver)}</p>
                    {driver.company_name && driver.display_company_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {driver.company_name}
                      </p>
                    )}
                  </div>
                  
                  {isCurrentFavorite ? (
                    <Badge className="bg-red-500 text-white gap-1 text-xs">
                      <Heart className="w-3 h-3 fill-current" />
                      Actuel
                    </Badge>
                  ) : (
                    <Check className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <DriverProfileDialog
        driverId={selectedDriverId}
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        isRegistered={true}
      />
    </>
  );
}