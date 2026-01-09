import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Realtime subscription sur les courses
    const channel = supabase
      .channel("dispatch-queue-courses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
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
      // Récupérer les courses en pending sans chauffeur assigné (directement depuis courses)
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select(`
          *,
          client:clients(
            id,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .is("driver_id", null)
        .eq("status", "pending")
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      // Enrichir avec les profils clients
      if (coursesData && coursesData.length > 0) {
        const clientUserIds = coursesData
          .filter((c: any) => c.client?.user_id)
          .map((c: any) => c.client.user_id);

        const { data: clientProfiles } = clientUserIds.length > 0
          ? await supabase.from("profiles").select("id, full_name, phone").in("id", clientUserIds)
          : { data: [] };

        const enrichedCourses = coursesData.map((c: any) => ({
          ...c,
          client: c.client
            ? {
                ...c.client,
                profile: clientProfiles?.find((p) => p.id === c.client.user_id),
              }
            : null,
        }));

        setPendingCourses(enrichedCourses);
      } else {
        setPendingCourses([]);
      }

      // Récupérer les chauffeurs disponibles
      const [{ data: internal }, { data: partners }] = await Promise.all([
        supabase
          .from("fleet_manager_drivers")
          .select("driver_id, driver:drivers(id, user_id)")
          .eq("fleet_manager_id", fleetManagerId)
          .eq("status", "active"),
        supabase
          .from("fleet_driver_partnerships")
          .select("driver_id, driver:drivers(id, user_id)")
          .eq("fleet_manager_id", fleetManagerId)
          .eq("status", "accepted"),
      ]);

      const allDriversList = [
        ...(internal || []).filter((d: any) => d.driver).map((d: any) => d.driver),
        ...(partners || []).filter((d: any) => d.driver).map((d: any) => d.driver),
      ];

      const uniqueDrivers = allDriversList.filter(
        (d, i, self) => self.findIndex((dd) => dd.id === d.id) === i
      );

      const userIds = uniqueDrivers.map((d: any) => d.user_id);
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, profile_photo_url").in("id", userIds)
        : { data: [] };

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

  const handleAssign = async (courseId: string, driverId: string) => {
    setAssigning(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ 
          driver_id: driverId, 
          status: "accepted" 
        })
        .eq("id", courseId);

      if (error) throw error;
      toast.success("Chauffeur assigné avec succès");
      fetchData();
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pendingCourses.length === 0) {
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
          <Badge variant="secondary">{pendingCourses.length}</Badge>
        </h3>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      <div className="space-y-4">
        {pendingCourses.map((course) => (
          <Card key={course.id} className="overflow-hidden border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Info client & course */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-warning/10 text-warning">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      En attente
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(course.created_at), "dd/MM HH:mm", { locale: fr })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {course.client?.profile?.full_name || course.guest_name || "Client"}
                    </span>
                    {course.client?.profile?.phone && (
                      <a href={`tel:${course.client.profile.phone}`} className="text-primary hover:underline">
                        {course.client.profile.phone}
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{course.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{course.destination_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(course.scheduled_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(course.scheduled_date), "HH:mm")}
                    </span>
                    {course.passengers_count && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4" />
                        {course.passengers_count} passager{course.passengers_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {course.notes && (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                      {course.notes}
                    </p>
                  )}
                </div>

                {/* Assignation manuelle */}
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(driverId) => handleAssign(course.id, driverId)}
                    disabled={assigning}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assigner un chauffeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
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
