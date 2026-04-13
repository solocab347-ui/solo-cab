import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Car,
  Star,
  Heart,
  Phone,
  MessageSquare,
  CalendarPlus,
  GripVertical,
  Plus,
  Ban,
  Trash2,
  Search,
  Loader2,
  Eye,
  MoreVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientBlockDriverDialog } from "./ClientBlockDriverDialog";
import { DriverProfileDialog } from "@/components/DriverProfileDialog";

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
  is_pioneer?: boolean;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
  };
}

interface SortableDriverCardProps {
  driver: Driver;
  displayName: string;
  isFavorite: boolean;
  onSetFavorite: (id: string) => void;
  onBook: (id: string) => void;
  onMessage: () => void;
  onCall: (phone: string) => void;
  onRemove: (driver: Driver) => void;
  onBlock: (driver: Driver) => void;
  onViewProfile: (id: string) => void;
}

function SortableDriverCard({
  driver,
  displayName,
  isFavorite,
  onSetFavorite,
  onBook,
  onMessage,
  onCall,
  onRemove,
  onBlock,
  onViewProfile,
}: SortableDriverCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: driver.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Affichage: marque + modèle + couleur
  const vehicleParts = [];
  if (driver.vehicle_brand) vehicleParts.push(driver.vehicle_brand);
  if (driver.vehicle_model && driver.vehicle_model !== driver.vehicle_brand) vehicleParts.push(driver.vehicle_model);
  if (driver.vehicle_color) vehicleParts.push(driver.vehicle_color);
  const vehicleInfo = vehicleParts.join(' ');

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl group",
        isFavorite 
          ? "ring-2 ring-red-500 bg-gradient-to-br from-red-500/10 via-card to-orange-500/5" 
          : "bg-gradient-to-br from-card via-card to-muted/30 hover:ring-1 hover:ring-primary/30"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Badges - Favoris ou Pionnier */}
      {isFavorite ? (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white gap-1 text-[10px] shadow-lg px-2">
            <Heart className="w-3 h-3 fill-current" />
            Favori
          </Badge>
        </div>
      ) : driver.is_pioneer && (
        <div className="absolute top-3 left-3 z-10">
          <PioneerBadge size="xs" />
        </div>
      )}

      <div className="p-5">
        {/* Avatar section */}
        <div className="flex flex-col items-center text-center mb-4">
          <div 
            className="relative cursor-pointer group/avatar"
            onClick={() => onViewProfile(driver.id)}
          >
            <Avatar className="w-20 h-20 ring-4 ring-background shadow-xl">
              <AvatarImage
                src={driver.profiles?.profile_photo_url || undefined}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-orange-500 text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>

          <h3 className="font-bold text-base mt-3 truncate w-full">
            {displayName}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            {driver.rating && driver.rating > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <Star className="w-3 h-3 fill-current" />
                {driver.rating.toFixed(1)}
              </Badge>
            )}
            {vehicleInfo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Car className="w-3 h-3" />
                {vehicleInfo}
              </span>
            )}
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Button
            size="sm"
            onClick={() => onBook(driver.id)}
            className="h-9 px-4 bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 text-white shadow-lg"
          >
            <CalendarPlus className="w-4 h-4 mr-1.5" />
            Réserver
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onMessage}
            className="h-9 w-9 p-0"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          {driver.show_phone && driver.profiles?.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCall(driver.profiles.phone!)}
              className="h-9 w-9 p-0 text-green-600 border-green-500/30 hover:bg-green-500/10"
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Secondary actions */}
        <div className="flex items-center justify-center gap-1 pt-2 border-t border-border/50">
          {!isFavorite && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              onClick={() => onSetFavorite(driver.id)}
            >
              <Heart className="w-3.5 h-3.5 mr-1" />
              Favori
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuItem onClick={() => onViewProfile(driver.id)}>
                <Eye className="w-4 h-4 mr-2" />
                Voir le profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onRemove(driver)}
                className="text-muted-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Retirer
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onBlock(driver)}
                className="text-destructive"
              >
                <Ban className="w-4 h-4 mr-2" />
                Bloquer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

interface ClientDriversGridProps {
  clientId: string;
  driverIds: string[];
  favoriteDriverId: string | null;
  isExclusive?: boolean;
  onRefresh?: () => void;
}

export function ClientDriversGrid({
  clientId,
  driverIds,
  favoriteDriverId,
  isExclusive,
  onRefresh,
}: ClientDriversGridProps) {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>(driverIds);
  const [loading, setLoading] = useState(true);
  const [driverToRemove, setDriverToRemove] = useState<Driver | null>(null);
  const [driverToBlock, setDriverToBlock] = useState<Driver | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchDrivers();
  }, [driverIds]);

  const fetchDrivers = async () => {
    if (!driverIds || driverIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("drivers")
        .select(`
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
          is_pioneer,
          profiles:user_id(full_name, profile_photo_url, phone)
        `)
        .in("id", driverIds);

      if (data) {
        const sorted = orderedIds
          .map((id) => data.find((d: any) => d.id === id))
          .filter(Boolean) as Driver[];
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

    // Always mask full name for public display
    const maskedName = fullName ? (() => {
      const parts = fullName.split(/\s+/);
      if (parts.length <= 1) return parts[0] || "Chauffeur VTC";
      return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
    })() : null;

    if (driver.display_driver_name && maskedName) return maskedName;
    if (driver.display_company_name && companyName) return companyName;
    return maskedName || companyName || "Chauffeur VTC";
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedIds.indexOf(active.id as string);
      const newIndex = orderedIds.indexOf(over.id as string);
      const newOrder = arrayMove(orderedIds, oldIndex, newIndex);

      setOrderedIds(newOrder);
      
      const sorted = newOrder
        .map((id) => drivers.find((d) => d.id === id))
        .filter(Boolean) as Driver[];
      setDrivers(sorted);

      try {
        await supabase
          .from("clients")
          .update({ driver_ids: newOrder })
          .eq("id", clientId);
      } catch (error) {
        console.error("Error saving order:", error);
      }
    }
  };

  const handleSetFavorite = async (driverId: string) => {
    try {
      await supabase
        .from("clients")
        .update({ favorite_driver_id: driverId })
        .eq("id", clientId);
      toast.success("Chauffeur favori mis à jour");
      onRefresh?.();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleRemoveDriver = async () => {
    if (!driverToRemove) return;

    setIsProcessing(true);
    try {
      const newIds = orderedIds.filter((id) => id !== driverToRemove.id);
      await supabase
        .from("clients")
        .update({ driver_ids: newIds })
        .eq("id", clientId);

      toast.success("Chauffeur retiré");
      setDriverToRemove(null);
      setOrderedIds(newIds);
      setDrivers(drivers.filter((d) => d.id !== driverToRemove.id));
      onRefresh?.();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockDriver = async (reason: string) => {
    if (!driverToBlock) return;

    setIsProcessing(true);
    try {
      const newIds = orderedIds.filter((id) => id !== driverToBlock.id);
      await supabase
        .from("clients")
        .update({ driver_ids: newIds })
        .eq("id", clientId);

      await supabase.from("client_driver_blocks").insert({
        client_id: clientId,
        driver_id: driverToBlock.id,
        blocked_by: "client",
        block_reason: reason,
      });

      toast.success("Chauffeur bloqué");
      setDriverToBlock(null);
      setOrderedIds(newIds);
      setDrivers(drivers.filter((d) => d.id !== driverToBlock.id));
      onRefresh?.();
    } catch (error) {
      toast.error("Erreur lors du blocage");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewProfile = (driverId: string) => {
    setSelectedDriverId(driverId);
    setShowProfileDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (isExclusive) {
    const driver = drivers[0];
    if (!driver) return null;

    return (
      <>
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-card to-orange-500/5 border-primary/20">
          <div className="flex items-center gap-5">
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleViewProfile(driver.id)}
            >
              <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                <AvatarImage src={driver.profiles?.profile_photo_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-2xl">
                  {getDriverDisplayName(driver).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <Badge className="mb-2 bg-gradient-to-r from-primary to-orange-500 text-white">
                Chauffeur exclusif
              </Badge>
              <h3 className="font-bold text-xl">{getDriverDisplayName(driver)}</h3>
              {(driver.vehicle_brand || driver.vehicle_model) && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Car className="w-4 h-4" />
                  {[driver.vehicle_brand, driver.vehicle_model !== driver.vehicle_brand ? driver.vehicle_model : null, driver.vehicle_color].filter(Boolean).join(' ')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate(`/create-course?driver_id=${driver.id}`)}
                className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Réserver
              </Button>
              <Button
                variant="outline"
                onClick={() => handleViewProfile(driver.id)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Profil
              </Button>
            </div>
          </div>
        </Card>

        <DriverProfileDialog
          driverId={selectedDriverId}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          isRegistered={true}
        />
      </>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed border-2">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Car className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Aucun chauffeur</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Découvrez des chauffeurs VTC de qualité près de chez vous
        </p>
        <Button 
          onClick={() => navigate("/chauffeurs")} 
          className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:opacity-90"
        >
          <Search className="w-4 h-4" />
          Découvrir des chauffeurs
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Glissez pour réorganiser • Cliquez sur la photo pour voir le profil
          </p>
          <Button
            size="sm"
            onClick={() => navigate("/chauffeurs")}
            className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 text-white"
          >
            <Plus className="w-4 h-4" />
            Ajouter un chauffeur
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((driver) => (
                <SortableDriverCard
                  key={driver.id}
                  driver={driver}
                  displayName={getDriverDisplayName(driver)}
                  isFavorite={driver.id === favoriteDriverId}
                  onSetFavorite={handleSetFavorite}
                  onBook={(id) => navigate(`/create-course?driver_id=${id}`)}
                  onMessage={() => navigate("/client-dashboard?tab=messages")}
                  onCall={(phone) => (window.location.href = `tel:${phone}`)}
                  onRemove={setDriverToRemove}
                  onBlock={setDriverToBlock}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Remove Dialog */}
      <AlertDialog
        open={!!driverToRemove}
        onOpenChange={() => setDriverToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce chauffeur sera retiré de votre liste. Vous pourrez le retrouver sur la vitrine publique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDriver}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Dialog */}
      <ClientBlockDriverDialog
        open={!!driverToBlock}
        onOpenChange={() => setDriverToBlock(null)}
        driverName={driverToBlock ? getDriverDisplayName(driverToBlock) : ""}
        onBlock={handleBlockDriver}
        isLoading={isProcessing}
      />

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
