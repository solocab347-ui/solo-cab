import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFleetDispatch } from "@/hooks/useFleetDispatch";
import {
  Loader2,
  MapPin,
  Calendar,
  Clock,
  User,
  UserCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Zap,
  Hand,
} from "lucide-react";

interface FleetDispatchQueueProps {
  fleetManagerId: string;
}

interface DispatchItem {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  notes: string | null;
  status: string;
  dispatch_mode: string;
  current_driver_id: string | null;
  assigned_driver_id: string | null;
  timeout_at: string | null;
  created_at: string;
  client?: {
    id: string;
    profile?: {
      full_name: string;
    };
  };
  current_driver?: {
    id: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

export const FleetDispatchQueue = ({ fleetManagerId }: FleetDispatchQueueProps) => {
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { manualAssign, loading: assigning } = useFleetDispatch();

  useEffect(() => {
    fetchData();
    
    // Realtime subscription
    const channel = supabase
      .channel("dispatch-queue-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fleet_dispatch_queue",
          filter: `fleet_manager_id=eq.${fleetManagerId}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Fetch dispatches
      const { data: dispatchData, error } = await supabase
        .from("fleet_dispatch_queue")
        .select(`
          *,
          client:clients(
            id,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .in("status", ["pending", "dispatching", "manual", "expired"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with profiles
      if (dispatchData && dispatchData.length > 0) {
        const clientUserIds = dispatchData
          .filter((d: any) => d.client?.user_id)
          .map((d: any) => d.client.user_id);

        const driverIds = dispatchData
          .filter((d: any) => d.current_driver_id)
          .map((d: any) => d.current_driver_id);

        const [{ data: clientProfiles }, { data: driverData }] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", clientUserIds),
          driverIds.length > 0
            ? supabase
                .from("drivers")
                .select("id, user_id")
                .in("id", driverIds)
            : { data: [] },
        ]);

        const driverUserIds = (driverData || []).map((d: any) => d.user_id);
        const { data: driverProfiles } = driverUserIds.length > 0
          ? await supabase.from("profiles").select("id, full_name, profile_photo_url").in("id", driverUserIds)
          : { data: [] };

        const enrichedDispatches = dispatchData.map((d: any) => ({
          ...d,
          client: d.client
            ? {
                ...d.client,
                profile: clientProfiles?.find((p) => p.id === d.client.user_id),
              }
            : null,
          current_driver: d.current_driver_id
            ? {
                id: d.current_driver_id,
                profile: driverProfiles?.find(
                  (p) => p.id === driverData?.find((dr: any) => dr.id === d.current_driver_id)?.user_id
                ),
              }
            : null,
        }));

        setDispatches(enrichedDispatches);
      } else {
        setDispatches([]);
      }

      // Fetch available drivers
      const [{ data: internal }, { data: partners }] = await Promise.all([
        supabase
          .from("fleet_manager_drivers")
          .select("driver_id, driver:drivers(id, user_id, is_available)")
          .eq("fleet_manager_id", fleetManagerId)
          .eq("status", "active"),
        supabase
          .from("fleet_driver_partnerships")
          .select("driver_id, driver:drivers(id, user_id, is_available)")
          .eq("fleet_manager_id", fleetManagerId)
          .eq("status", "accepted"),
      ]);

      const allDriverIds = [
        ...(internal || []).filter((d: any) => d.driver).map((d: any) => d.driver),
        ...(partners || []).filter((d: any) => d.driver).map((d: any) => d.driver),
      ];

      const uniqueDrivers = allDriverIds.filter(
        (d, i, self) => self.findIndex((dd) => dd.id === d.id) === i
      );

      const userIds = uniqueDrivers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", userIds);

      const driversWithProfiles = uniqueDrivers.map((d: any) => ({
        ...d,
        profile: profiles?.find((p) => p.id === d.user_id),
      }));

      setDrivers(driversWithProfiles);
    } catch (error) {
      console.error("Error fetching dispatch queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (dispatchId: string, driverId: string) => {
    const result = await manualAssign(dispatchId, driverId);
    if (result.success) {
      fetchData();
    }
  };

  const getStatusBadge = (status: string, mode: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning">En attente</Badge>;
      case "dispatching":
        return <Badge className="bg-info text-white gap-1"><Zap className="w-3 h-3" />En cours</Badge>;
      case "manual":
        return <Badge variant="outline" className="gap-1"><Hand className="w-3 h-3" />Manuel</Badge>;
      case "expired":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Expiré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (dispatches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-success mb-4" />
          <h3 className="text-lg font-semibold">File d'attente vide</h3>
          <p className="text-muted-foreground">
            Toutes les courses ont été assignées
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Courses en attente d'assignation
          <Badge variant="secondary">{dispatches.length}</Badge>
        </h3>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      <div className="space-y-4">
        {dispatches.map((dispatch) => (
          <Card key={dispatch.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Info client & course */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(dispatch.status, dispatch.dispatch_mode)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(dispatch.created_at), "dd/MM HH:mm", { locale: fr })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {dispatch.client?.profile?.full_name || "Client"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{dispatch.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{dispatch.destination_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(dispatch.scheduled_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(dispatch.scheduled_date), "HH:mm")}
                    </span>
                  </div>

                  {/* Status du dispatch automatique */}
                  {dispatch.status === "dispatching" && dispatch.current_driver && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10 text-info text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        En attente de réponse de{" "}
                        <strong>{dispatch.current_driver.profile?.full_name}</strong>
                      </span>
                      {dispatch.timeout_at && (
                        <Badge variant="outline" className="text-xs">
                          Expire à {format(new Date(dispatch.timeout_at), "HH:mm")}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignation manuelle */}
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(driverId) => handleAssign(dispatch.id, driverId)}
                    disabled={assigning}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assigner un chauffeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers
                        .filter((d) => d.is_available)
                        .map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(driver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{driver.profile?.full_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
