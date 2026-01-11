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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { ClientBlockDriverDialog } from "./ClientBlockDriverDialog";

interface Driver {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_brand: string | null;
  rating: number | null;
  display_driver_name: boolean;
  display_company_name: boolean;
  show_rating_public: boolean;
  show_phone: boolean;
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative p-4 transition-all hover:shadow-md",
        isFavorite && "ring-2 ring-red-500/50 bg-red-500/5"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Favorite badge */}
      {isFavorite && (
        <Badge className="absolute top-2 left-2 bg-red-500 text-white gap-1 text-[10px]">
          <Heart className="w-3 h-3 fill-current" />
          Favori
        </Badge>
      )}

      <div className="flex flex-col items-center text-center pt-4">
        <Avatar className="w-16 h-16 mb-3 ring-2 ring-border">
          <AvatarImage
            src={driver.profiles?.profile_photo_url || undefined}
            alt={displayName}
          />
          <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-lg">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <h3 className="font-semibold text-sm truncate w-full mb-1">
          {displayName}
        </h3>

        {driver.rating && driver.rating > 0 && driver.show_rating_public && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            {driver.rating.toFixed(1)}
          </div>
        )}

        {driver.vehicle_brand && driver.vehicle_model && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
            <Car className="w-3 h-3" />
            {driver.vehicle_brand}
          </p>
        )}

        {/* Quick actions */}
        <div className="flex items-center justify-center gap-1 mb-3">
          <Button
            size="sm"
            variant="default"
            className="h-8 px-2"
            onClick={() => onBook(driver.id)}
          >
            <CalendarPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={onMessage}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
          {driver.show_phone && driver.profiles?.phone && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-green-600"
              onClick={() => onCall(driver.profiles.phone!)}
            >
              <Phone className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Actions menu */}
        <div className="flex items-center gap-1 w-full">
          {!isFavorite && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs text-red-500 hover:text-red-600"
              onClick={() => onSetFavorite(driver.id)}
            >
              <Heart className="w-3 h-3 mr-1" />
              Favori
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onRemove(driver)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive"
            onClick={() => onBlock(driver)}
          >
            <Ban className="w-3 h-3" />
          </Button>
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
          rating,
          display_driver_name,
          display_company_name,
          show_rating_public,
          show_phone,
          profiles:user_id(full_name, profile_photo_url, phone)
        `)
        .in("id", driverIds);

      if (data) {
        // Trier selon l'ordre actuel
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

    if (driver.display_driver_name && fullName) return fullName;
    if (driver.display_company_name && companyName) return companyName;
    return fullName || companyName || "Chauffeur VTC";
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedIds.indexOf(active.id as string);
      const newIndex = orderedIds.indexOf(over.id as string);
      const newOrder = arrayMove(orderedIds, oldIndex, newIndex);

      setOrderedIds(newOrder);
      
      // Réordonner les drivers localement
      const sorted = newOrder
        .map((id) => drivers.find((d) => d.id === id))
        .filter(Boolean) as Driver[];
      setDrivers(sorted);

      // Sauvegarder l'ordre dans la base
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isExclusive) {
    // Exclusive client - simplified view
    const driver = drivers[0];
    if (!driver) return null;

    return (
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={driver.profiles?.profile_photo_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white text-lg">
              {getDriverDisplayName(driver).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Badge variant="secondary" className="mb-2">
              Chauffeur exclusif
            </Badge>
            <h3 className="font-bold text-lg">{getDriverDisplayName(driver)}</h3>
            {driver.vehicle_brand && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="w-3 h-3" />
                {driver.vehicle_brand} {driver.vehicle_model}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => navigate(`/create-course?driver_id=${driver.id}`)}
            >
              <CalendarPlus className="w-4 h-4 mr-1" />
              Réserver
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-medium mb-2">Aucun chauffeur</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Découvrez des chauffeurs VTC près de chez vous
        </p>
        <Button onClick={() => navigate("/chauffeurs")} className="gap-2">
          <Search className="w-4 h-4" />
          Découvrir
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Glissez pour réorganiser • Cliquez sur ❤️ pour définir le favori
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/chauffeurs")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              Vous pourrez le retrouver sur la vitrine publique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDriver}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground"
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
    </>
  );
}
