import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  Car,
  Loader2,
  RefreshCw,
  Zap,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeclinedCourse {
  id: string;
  course_id: string;
  declined_by_driver_id: string;
  declined_at: string;
  reason: string | null;
  status: string;
  course?: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    passengers_count: number;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    client?: {
      id: string;
      user_id: string;
      profile?: {
        full_name: string;
        profile_photo_url: string | null;
      };
    };
  };
  declined_driver?: {
    id: string;
    profile?: {
      full_name: string;
    };
  };
}

interface FleetDriver {
  driver_id: string;
  accept_auto_courses: boolean;
  driver?: {
    id: string;
    vehicle_model: string;
    status: string;
    user_id: string;
    home_latitude: number | null;
    home_longitude: number | null;
    profile?: {
      full_name: string;
    };
  };
}

interface FleetDeclinedCoursesProps {
  fleetManagerId: string;
}

export const FleetDeclinedCourses = ({ fleetManagerId }: FleetDeclinedCoursesProps) => {
  const [loading, setLoading] = useState(true);
  const [declinedCourses, setDeclinedCourses] = useState<DeclinedCourse[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<DeclinedCourse | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [autoReassigning, setAutoReassigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Récupérer les courses refusées en attente
      const { data: declined, error: declinedError } = await supabase
        .from("fleet_driver_declined_courses")
        .select(`
          *,
          course:courses(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            pickup_latitude,
            pickup_longitude,
            client:clients(id, user_id)
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "pending")
        .order("declined_at", { ascending: false });

      if (declinedError) throw declinedError;

      if (declined && declined.length > 0) {
        // Récupérer les profils des clients et chauffeurs
        const clientUserIds = declined
          .filter((d: any) => d.course?.client?.user_id)
          .map((d: any) => d.course.client.user_id);

        const driverIds = declined.map((d: any) => d.declined_by_driver_id);

        // Récupérer chauffeurs pour avoir leur user_id
        const { data: declinedDrivers } = await supabase
          .from("drivers")
          .select("id, user_id")
          .in("id", driverIds);

        const driverUserIds = declinedDrivers?.map((d) => d.user_id) || [];
        const allUserIds = [...new Set([...clientUserIds, ...driverUserIds])];

        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", allUserIds);

          const coursesWithProfiles = declined.map((d: any) => {
            const declinedDriverData = declinedDrivers?.find(
              (dr) => dr.id === d.declined_by_driver_id
            );
            return {
              ...d,
              course: d.course
                ? {
                    ...d.course,
                    client: d.course.client
                      ? {
                          ...d.course.client,
                          profile: profiles?.find((p) => p.id === d.course.client.user_id),
                        }
                      : undefined,
                  }
                : undefined,
              declined_driver: {
                id: d.declined_by_driver_id,
                profile: profiles?.find((p) => p.id === declinedDriverData?.user_id),
              },
            };
          });

          setDeclinedCourses(coursesWithProfiles);
        } else {
          setDeclinedCourses(declined);
        }
      } else {
        setDeclinedCourses([]);
      }

      // Récupérer les chauffeurs disponibles
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          accept_auto_courses,
          driver:drivers(
            id,
            vehicle_model,
            status,
            user_id,
            home_latitude,
            home_longitude
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (fleetDrivers && fleetDrivers.length > 0) {
        const driverUserIds = fleetDrivers
          .filter((d: any) => d.driver)
          .map((d: any) => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
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
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleManualReassign = async () => {
    if (!selectedCourse || !selectedDriverId) return;

    setReassigning(true);
    try {
      // Mettre à jour la course avec le nouveau chauffeur
      const { error: courseError } = await supabase
        .from("courses")
        .update({
          driver_id: selectedDriverId,
          status: "accepted",
        })
        .eq("id", selectedCourse.course_id);

      if (courseError) throw courseError;

      // Mettre à jour le status du refus
      const { error: declinedError } = await supabase
        .from("fleet_driver_declined_courses")
        .update({
          status: "reassigned",
          reassigned_to_driver_id: selectedDriverId,
          reassigned_at: new Date().toISOString(),
        })
        .eq("id", selectedCourse.id);

      if (declinedError) throw declinedError;

      // Notifier le nouveau chauffeur
      const driver = drivers.find((d) => d.driver_id === selectedDriverId);
      if (driver?.driver?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "🚗 Nouvelle course assignée",
          message: `Une course a été réassignée à votre planning pour le ${format(
            new Date(selectedCourse.course!.scheduled_date),
            "d MMMM à HH:mm",
            { locale: fr }
          )}`,
          type: "info",
          link: "/fleet-driver-dashboard",
        });
      }

      toast.success("Course réassignée avec succès");
      setShowReassignDialog(false);
      setSelectedCourse(null);
      setSelectedDriverId("");
      fetchData();
    } catch (error: any) {
      console.error("Error reassigning:", error);
      toast.error(error.message || "Erreur lors de la réassignation");
    } finally {
      setReassigning(false);
    }
  };

  const handleAutoReassign = async (declinedCourse: DeclinedCourse) => {
    if (!declinedCourse.course) return;

    setAutoReassigning(true);
    try {
      // Appeler la fonction de dispatch intelligent
      const { data: availableDriverId, error: fnError } = await supabase.rpc(
        "find_nearest_available_fleet_driver",
        {
          p_fleet_manager_id: fleetManagerId,
          p_scheduled_date: declinedCourse.course.scheduled_date,
          p_pickup_latitude: declinedCourse.course.pickup_latitude || 0,
          p_pickup_longitude: declinedCourse.course.pickup_longitude || 0,
          p_excluded_driver_id: declinedCourse.declined_by_driver_id,
          p_duration_minutes: 60,
        }
      );

      if (fnError) throw fnError;

      if (!availableDriverId) {
        toast.error("Aucun chauffeur disponible trouvé");
        return;
      }

      // Mettre à jour la course
      const { error: courseError } = await supabase
        .from("courses")
        .update({
          driver_id: availableDriverId,
          status: "accepted",
        })
        .eq("id", declinedCourse.course_id);

      if (courseError) throw courseError;

      // Mettre à jour le status
      const { error: declinedError } = await supabase
        .from("fleet_driver_declined_courses")
        .update({
          status: "reassigned",
          reassigned_to_driver_id: availableDriverId,
          reassigned_at: new Date().toISOString(),
        })
        .eq("id", declinedCourse.id);

      if (declinedError) throw declinedError;

      // Notifier le nouveau chauffeur
      const driver = drivers.find((d) => d.driver_id === availableDriverId);
      if (driver?.driver?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "⚡ Course assignée automatiquement",
          message: `Une course a été assignée à votre planning pour le ${format(
            new Date(declinedCourse.course!.scheduled_date),
            "d MMMM à HH:mm",
            { locale: fr }
          )}`,
          type: "info",
          link: "/fleet-driver-dashboard",
        });
      }

      toast.success("Course réassignée automatiquement");
      fetchData();
    } catch (error: any) {
      console.error("Error auto reassigning:", error);
      toast.error(error.message || "Erreur lors de la réassignation");
    } finally {
      setAutoReassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Courses à redistribuer
            {declinedCourses.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {declinedCourses.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Courses refusées ou repoussées par les chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {declinedCourses.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucune course à redistribuer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {declinedCourses.map((declined) => (
                <div
                  key={declined.id}
                  className="p-4 bg-warning/5 border border-warning/30 rounded-xl space-y-3"
                >
                  {/* Header avec client */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={declined.course?.client?.profile?.profile_photo_url || undefined}
                        />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {(declined.course?.client?.profile?.full_name || "C")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {declined.course?.client?.profile?.full_name || "Client"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {declined.course?.scheduled_date &&
                            format(
                              new Date(declined.course.scheduled_date),
                              "d MMMM à HH:mm",
                              { locale: fr }
                            )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning/50">
                      <Users className="w-3 h-3 mr-1" />
                      {declined.course?.passengers_count || 1} passager(s)
                    </Badge>
                  </div>

                  {/* Adresses */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{declined.course?.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{declined.course?.destination_address}</span>
                    </div>
                  </div>

                  {/* Refus info */}
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium text-destructive">Refusé par :</span>{" "}
                      {declined.declined_driver?.profile?.full_name || "Chauffeur"}
                    </p>
                    {declined.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Raison : {declined.reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleAutoReassign(declined)}
                      disabled={autoReassigning}
                    >
                      {autoReassigning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Auto
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setSelectedCourse(declined);
                        setShowReassignDialog(true);
                      }}
                    >
                      <UserCheck className="w-4 h-4" />
                      Choisir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog réassignation manuelle */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réassigner la course</DialogTitle>
            <DialogDescription>
              Choisissez un chauffeur pour cette course
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {drivers
                  .filter(
                    (d) =>
                      d.driver?.status === "validated" &&
                      d.driver_id !== selectedCourse?.declined_by_driver_id
                  )
                  .map((driver) => (
                    <SelectItem key={driver.driver_id} value={driver.driver_id}>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        {driver.driver?.profile?.full_name || "Chauffeur"} -{" "}
                        {driver.driver?.vehicle_model}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleManualReassign} disabled={!selectedDriverId || reassigning}>
              {reassigning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Réassigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
