import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Star,
  Phone,
  Mail,
  CalendarPlus,
  ExternalLink,
  Trash2,
  Ban,
  Unlock,
  Users,
  ShieldOff,
  Loader2,
  Plus,
  MessageSquare,
} from "lucide-react";
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ShareButtons from "@/components/ShareButtons";
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
  show_email: boolean;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    email: string | null;
  };
}

interface BlockedDriver extends Driver {
  block_id: string;
  block_reason: string | null;
  blocked_at: string;
}

interface ClientDriverManagementProps {
  onViewProfile?: () => void;
}

export const ClientDriverManagement = ({ onViewProfile }: ClientDriverManagementProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [blockedDrivers, setBlockedDrivers] = useState<BlockedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isExclusive, setIsExclusive] = useState(false);

  // Dialog states
  const [driverToRemove, setDriverToRemove] = useState<Driver | null>(null);
  const [driverToBlock, setDriverToBlock] = useState<Driver | null>(null);
  const [driverToUnblock, setDriverToUnblock] = useState<BlockedDriver | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get client info
      const { data: client } = await supabase
        .from("clients")
        .select("id, driver_id, driver_ids, is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) {
        setLoading(false);
        return;
      }

      setClientId(client.id);
      setIsExclusive(client.is_exclusive);

      // Fetch drivers
      const driverIds = client.is_exclusive 
        ? (client.driver_id ? [client.driver_id] : [])
        : (client.driver_ids || []);

      if (driverIds.length > 0) {
        const { data: driversData } = await supabase
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
            show_email,
            profiles:user_id(full_name, profile_photo_url, phone, email)
          `)
          .in("id", driverIds);

        if (driversData) {
          setDrivers(driversData as any);
        }
      } else {
        setDrivers([]);
      }

      // Fetch blocked drivers (blocked by client)
      const { data: blocksData } = await supabase
        .from("client_driver_blocks")
        .select(`
          id,
          driver_id,
          block_reason,
          created_at
        `)
        .eq("client_id", client.id)
        .eq("blocked_by", "client");

      if (blocksData && blocksData.length > 0) {
        const blockedDriverIds = blocksData.map(b => b.driver_id);
        const { data: blockedDriversData } = await supabase
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
            show_email,
            profiles:user_id(full_name, profile_photo_url, phone, email)
          `)
          .in("id", blockedDriverIds);

        if (blockedDriversData) {
          const blockedWithInfo = blockedDriversData.map(driver => {
            const block = blocksData.find(b => b.driver_id === driver.id);
            return {
              ...driver,
              block_id: block?.id || "",
              block_reason: block?.block_reason || null,
              blocked_at: block?.created_at || "",
            } as BlockedDriver;
          });
          setBlockedDrivers(blockedWithInfo);
        }
      } else {
        setBlockedDrivers([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const getDriverDisplayName = (driver: Driver | BlockedDriver): string => {
    const fullName = driver.profiles?.full_name?.trim();
    const companyName = driver.company_name?.trim();

    // Mask full name for non-exclusive display
    const maskedName = fullName ? (() => {
      const parts = fullName.split(/\s+/);
      if (parts.length <= 1) return parts[0] || "Chauffeur VTC";
      return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
    })() : null;

    if (driver.display_driver_name && maskedName) {
      return maskedName;
    }
    if (driver.display_company_name && companyName) {
      return companyName;
    }
    return maskedName || companyName || "Chauffeur VTC";
  };

  const handleRemoveDriver = async () => {
    if (!driverToRemove || !clientId) return;

    setIsProcessing(true);
    try {
      // Get current driver_ids
      const { data: client } = await supabase
        .from("clients")
        .select("driver_ids")
        .eq("id", clientId)
        .single();

      if (!client) throw new Error("Client not found");

      const currentIds = client.driver_ids || [];
      const newIds = currentIds.filter((id: string) => id !== driverToRemove.id);

      // Update client
      const { error } = await supabase
        .from("clients")
        .update({ driver_ids: newIds })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Chauffeur retiré de votre liste");
      setDriverToRemove(null);
      fetchData();
    } catch (error: any) {
      console.error("Error removing driver:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockDriver = async (reason: string) => {
    if (!driverToBlock || !clientId) return;

    setIsProcessing(true);
    try {
      // First remove from driver_ids
      const { data: client } = await supabase
        .from("clients")
        .select("driver_ids")
        .eq("id", clientId)
        .single();

      if (client) {
        const currentIds = client.driver_ids || [];
        const newIds = currentIds.filter((id: string) => id !== driverToBlock.id);

        await supabase
          .from("clients")
          .update({ driver_ids: newIds })
          .eq("id", clientId);
      }

      // Then add to blocks
      const { error } = await supabase
        .from("client_driver_blocks")
        .insert({
          client_id: clientId,
          driver_id: driverToBlock.id,
          blocked_by: "client",
          block_reason: reason,
        });

      if (error) throw error;

      toast.success("Chauffeur bloqué avec succès");
      setDriverToBlock(null);
      fetchData();
    } catch (error: any) {
      console.error("Error blocking driver:", error);
      toast.error("Erreur lors du blocage");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblockDriver = async () => {
    if (!driverToUnblock) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("client_driver_blocks")
        .delete()
        .eq("id", driverToUnblock.block_id);

      if (error) throw error;

      toast.success("Chauffeur débloqué");
      setDriverToUnblock(null);
      fetchData();
    } catch (error: any) {
      console.error("Error unblocking driver:", error);
      toast.error("Erreur lors du déblocage");
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
    // For exclusive clients, show simple driver list without management
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Mon chauffeur</h2>
          <Badge variant="secondary">Client exclusif</Badge>
        </div>
        {drivers.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun chauffeur associé</p>
          </Card>
        ) : (
          drivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              displayName={getDriverDisplayName(driver)}
              navigate={navigate}
              isExclusive
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold">Gestion de mes chauffeurs</h2>
        <Button onClick={() => navigate("/chauffeurs")} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un chauffeur
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <Users className="w-4 h-4" />
            Mes chauffeurs ({drivers.length})
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <ShieldOff className="w-4 h-4" />
            Bloqués ({blockedDrivers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {drivers.length === 0 ? (
            <Card className="p-8 text-center">
              <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de chauffeur
              </p>
              <Button onClick={() => navigate("/chauffeurs")} className="gap-2">
                <Plus className="w-4 h-4" />
                Découvrir des chauffeurs
              </Button>
            </Card>
          ) : (
            drivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                displayName={getDriverDisplayName(driver)}
                navigate={navigate}
                onRemove={() => setDriverToRemove(driver)}
                onBlock={() => setDriverToBlock(driver)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4 mt-4">
          {blockedDrivers.length === 0 ? (
            <Card className="p-8 text-center">
              <ShieldOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun chauffeur bloqué</p>
            </Card>
          ) : (
            blockedDrivers.map((driver) => (
              <BlockedDriverCard
                key={driver.id}
                driver={driver}
                displayName={getDriverDisplayName(driver)}
                onUnblock={() => setDriverToUnblock(driver)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Remove Driver Dialog */}
      <AlertDialog open={!!driverToRemove} onOpenChange={() => setDriverToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez retirer <strong>{driverToRemove && getDriverDisplayName(driverToRemove)}</strong> de votre liste.
              Vous pourrez le retrouver sur la vitrine publique et vous réinscrire à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDriver}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Driver Dialog */}
      <ClientBlockDriverDialog
        open={!!driverToBlock}
        onOpenChange={() => setDriverToBlock(null)}
        driverName={driverToBlock ? getDriverDisplayName(driverToBlock) : ""}
        onBlock={handleBlockDriver}
        isLoading={isProcessing}
      />

      {/* Unblock Driver Dialog */}
      <AlertDialog open={!!driverToUnblock} onOpenChange={() => setDriverToUnblock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débloquer ce chauffeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez débloquer <strong>{driverToUnblock && getDriverDisplayName(driverToUnblock)}</strong>.
              Ce chauffeur sera à nouveau visible dans la vitrine publique. 
              Vous pourrez vous réinscrire avec lui si vous le souhaitez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblockDriver}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
              Débloquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Driver Card Component
interface DriverCardProps {
  driver: Driver;
  displayName: string;
  navigate: (path: string) => void;
  onRemove?: () => void;
  onBlock?: () => void;
  isExclusive?: boolean;
}

const DriverCard = ({ driver, displayName, navigate, onRemove, onBlock, isExclusive }: DriverCardProps) => (
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-4">
      <Avatar className="w-16 h-16 border-2 border-primary/20">
        <AvatarImage src={driver.profiles?.profile_photo_url || undefined} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-lg">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h3 
                className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => navigate(`/chauffeur/${driver.id}`)}
              >
                {displayName}
              </h3>
              {(driver as any).is_pioneer && (
                <PioneerBadge size="xs" />
              )}
            </div>
            {driver.vehicle_brand && driver.vehicle_model && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Car className="w-3 h-3" />
                {driver.vehicle_brand} {driver.vehicle_model}
              </p>
            )}
          </div>
          {driver.rating && driver.rating > 0 && driver.show_rating_public && (
            <Badge variant="outline" className="flex items-center gap-1 shrink-0">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {driver.rating.toFixed(1)}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" onClick={() => navigate(`/create-course?driver_id=${driver.id}`)} className="gap-1">
            <CalendarPlus className="w-3 h-3" />
            Réserver
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/client-dashboard?tab=messages")} className="gap-1">
            <MessageSquare className="w-3 h-3" />
            Message
          </Button>
          {driver.show_phone && driver.profiles?.phone && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = `tel:${driver.profiles.phone}`}>
              <Phone className="w-3 h-3" />
            </Button>
          )}
          {driver.show_email && driver.profiles?.email && (
            <Button size="sm" variant="outline" onClick={() => window.location.href = `mailto:${driver.profiles.email}`}>
              <Mail className="w-3 h-3" />
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => navigate(`/chauffeur/${driver.id}`)} className="gap-1">
            <ExternalLink className="w-3 h-3" />
            Profil
          </Button>
          <ShareButtons
            title={`Découvrez ${displayName} sur SoloCab`}
            message={`Je vous recommande mon chauffeur VTC ${displayName} sur SoloCab ! 🚗✨`}
            url={`${window.location.origin}/chauffeur/${driver.id}`}
          />
        </div>

        {!isExclusive && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="ghost" onClick={onRemove} className="text-muted-foreground hover:text-destructive gap-1">
              <Trash2 className="w-3 h-3" />
              Retirer
            </Button>
            <Button size="sm" variant="ghost" onClick={onBlock} className="text-muted-foreground hover:text-destructive gap-1">
              <Ban className="w-3 h-3" />
              Bloquer
            </Button>
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Blocked Driver Card Component
interface BlockedDriverCardProps {
  driver: BlockedDriver;
  displayName: string;
  onUnblock: () => void;
}

const BlockedDriverCard = ({ driver, displayName, onUnblock }: BlockedDriverCardProps) => (
  <Card className="p-4 bg-muted/50 opacity-80">
    <div className="flex items-center gap-4">
      <Avatar className="w-12 h-12 grayscale">
        <AvatarImage src={driver.profiles?.profile_photo_url || undefined} alt={displayName} />
        <AvatarFallback className="bg-muted text-muted-foreground">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{displayName}</h3>
        {driver.block_reason && (
          <p className="text-sm text-muted-foreground truncate">
            Motif : {driver.block_reason}
          </p>
        )}
      </div>

      <Button size="sm" variant="outline" onClick={onUnblock} className="gap-1 shrink-0">
        <Unlock className="w-3 h-3" />
        Débloquer
      </Button>
    </div>
  </Card>
);

export default ClientDriverManagement;
