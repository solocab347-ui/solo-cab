import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users,
  Eye,
  EyeOff,
  GripVertical,
  Car,
  Star,
  Loader2,
  Save,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FleetDriver {
  id: string;
  driver_id: string;
  visible_in_storefront: boolean;
  storefront_display_order: number;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand: string | null;
    rating: number | null;
    total_rides: number | null;
    status: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

interface FleetStorefrontManagerProps {
  fleetManagerId: string;
  onUpdate?: () => void;
}

export const FleetStorefrontManager = ({
  fleetManagerId,
  onUpdate,
}: FleetStorefrontManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, [fleetManagerId]);

  const fetchDrivers = async () => {
    try {
      const { data: fleetDrivers, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          id,
          driver_id,
          visible_in_storefront,
          storefront_display_order,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            rating,
            total_rides,
            status,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active")
        .order("storefront_display_order", { ascending: true });

      if (error) throw error;

      if (fleetDrivers && fleetDrivers.length > 0) {
        // Récupérer les profils
        const driverUserIds = fleetDrivers
          .filter((d: any) => d.driver)
          .map((d: any) => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", driverUserIds);

          const driversWithProfiles = fleetDrivers.map((d: any) => ({
            ...d,
            driver: d.driver
              ? {
                  ...d.driver,
                  profile: profiles?.find((p) => p.id === d.driver.user_id),
                }
              : undefined,
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(fleetDrivers);
        }
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? { ...d, visible_in_storefront: !d.visible_in_storefront }
          : d
      )
    );
  };

  const moveDriver = (index: number, direction: "up" | "down") => {
    const newDrivers = [...drivers];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newDrivers.length) return;

    // Swap
    [newDrivers[index], newDrivers[targetIndex]] = [
      newDrivers[targetIndex],
      newDrivers[index],
    ];

    // Update display order
    newDrivers.forEach((d, i) => {
      d.storefront_display_order = i;
    });

    setDrivers(newDrivers);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Mettre à jour chaque chauffeur
      for (const driver of drivers) {
        const { error } = await supabase
          .from("fleet_manager_drivers")
          .update({
            visible_in_storefront: driver.visible_in_storefront,
            storefront_display_order: driver.storefront_display_order,
          })
          .eq("id", driver.id);

        if (error) throw error;
      }

      toast.success("Modifications enregistrées");
      onUpdate?.();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const visibleCount = drivers.filter((d) => d.visible_in_storefront).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Gestion de la vitrine
        </CardTitle>
        <CardDescription>
          Choisissez quels chauffeurs apparaissent sur votre vitrine publique et dans quel ordre
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Chauffeurs visibles</p>
            <p className="text-2xl font-bold text-primary">
              {visibleCount} / {drivers.length}
            </p>
          </div>
        </div>

        {drivers.length === 0 ? (
          <div className="text-center py-8">
            <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Aucun chauffeur dans votre flotte</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver, index) => (
              <div
                key={driver.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  driver.visible_in_storefront
                    ? "bg-success/5 border-success/30"
                    : "bg-muted/30 border-border/50 opacity-60"
                }`}
              >
                {/* Order controls */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveDriver(index, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveDriver(index, "down")}
                    disabled={index === drivers.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Driver info */}
                <Avatar className="w-12 h-12 border-2 border-border">
                  <AvatarImage src={driver.driver?.profile?.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {(driver.driver?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">
                      {driver.driver?.profile?.full_name || "Chauffeur"}
                    </p>
                    {driver.driver?.rating && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3 fill-warning text-warning" />
                        {driver.driver.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                  </p>
                </div>

                {/* Status badge */}
                <Badge variant={driver.driver?.status === "validated" ? "default" : "secondary"}>
                  {driver.driver?.status === "validated" ? "Validé" : "En attente"}
                </Badge>

                {/* Visibility toggle */}
                <div className="flex items-center gap-2">
                  {driver.visible_in_storefront ? (
                    <Eye className="w-4 h-4 text-success" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={driver.visible_in_storefront}
                    onCheckedChange={() => toggleVisibility(driver.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        {drivers.length > 0 && (
          <div className="flex justify-end pt-4">
            <Button onClick={saveChanges} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
