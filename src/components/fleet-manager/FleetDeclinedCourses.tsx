import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Loader2,
  RefreshCw,
  Zap,
  UserCheck,
  Clock,
  ChevronRight,
  ArrowRight,
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
  const [autoReassigningId, setAutoReassigningId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
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
        const clientUserIds = declined
          .filter((d: any) => d.course?.client?.user_id)
          .map((d: any) => d.course.client.user_id);

        const driverIds = declined.map((d: any) => d.declined_by_driver_id);

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
      const { error: courseError } = await supabase
        .from("courses")
        .update({
          driver_id: selectedDriverId,
          status: "accepted",
        })
        .eq("id", selectedCourse.course_id);

      if (courseError) throw courseError;

      const { error: declinedError } = await supabase
        .from("fleet_driver_declined_courses")
        .update({
          status: "reassigned",
          reassigned_to_driver_id: selectedDriverId,
          reassigned_at: new Date().toISOString(),
        })
        .eq("id", selectedCourse.id);

      if (declinedError) throw declinedError;

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

    setAutoReassigningId(declinedCourse.id);
    try {
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

      const { error: courseError } = await supabase
        .from("courses")
        .update({
          driver_id: availableDriverId,
          status: "accepted",
        })
        .eq("id", declinedCourse.course_id);

      if (courseError) throw courseError;

      const { error: declinedError } = await supabase
        .from("fleet_driver_declined_courses")
        .update({
          status: "reassigned",
          reassigned_to_driver_id: availableDriverId,
          reassigned_at: new Date().toISOString(),
        })
        .eq("id", declinedCourse.id);

      if (declinedError) throw declinedError;

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
      setAutoReassigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (declinedCourses.length === 0) {
    return null;
  }

  return (
    <>
      {/* Section urgente - toujours visible */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warning/10 via-orange-500/5 to-red-500/5 border border-warning/30 backdrop-blur-xl mb-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warning/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-warning to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {declinedCourses.length}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Courses à redistribuer</h3>
              <p className="text-sm text-muted-foreground">
                {declinedCourses.length} course{declinedCourses.length > 1 ? "s" : ""} en attente d'un nouveau chauffeur
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData()}
            className="gap-2 border-warning/30 hover:bg-warning/10"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* Liste des courses */}
        <div className="p-4 space-y-3">
          {declinedCourses.map((declined) => (
            <div
              key={declined.id}
              className="relative bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden hover:border-warning/50 transition-all group"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar client */}
                  <Avatar className="w-12 h-12 border-2 border-warning/30 shrink-0">
                    <AvatarImage
                      src={declined.course?.client?.profile?.profile_photo_url || undefined}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-warning/20 to-orange-500/20 text-foreground font-bold">
                      {(declined.course?.client?.profile?.full_name || "C")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Infos course */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-foreground truncate">
                        {declined.course?.client?.profile?.full_name || "Client"}
                      </h4>
                      <Badge variant="outline" className="shrink-0 bg-warning/10 text-warning border-warning/30">
                        <Users className="w-3 h-3 mr-1" />
                        {declined.course?.passengers_count || 1}
                      </Badge>
                    </div>

                    {/* Date et heure */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-warning" />
                      <span className="font-medium">
                        {declined.course?.scheduled_date &&
                          format(
                            new Date(declined.course.scheduled_date),
                            "EEEE d MMMM à HH:mm",
                            { locale: fr }
                          )}
                      </span>
                    </div>

                    {/* Trajet compact */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="truncate max-w-[140px]">{declined.course?.pickup_address?.split(",")[0]}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="truncate max-w-[140px]">{declined.course?.destination_address?.split(",")[0]}</span>
                      </div>
                    </div>

                    {/* Raison du refus */}
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-sm">
                      <Clock className="w-4 h-4 text-destructive shrink-0" />
                      <span className="text-muted-foreground">
                        Refusé par <span className="font-medium text-foreground">{declined.declined_driver?.profile?.full_name || "Chauffeur"}</span>
                        {declined.reason && <span> • {declined.reason}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-warning to-orange-600 hover:from-warning/90 hover:to-orange-600/90 text-white shadow-lg"
                      onClick={() => handleAutoReassign(declined)}
                      disabled={autoReassigningId === declined.id}
                    >
                      {autoReassigningId === declined.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Auto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border/50 hover:bg-muted/50"
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
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog réassignation manuelle */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Réassigner la course
            </DialogTitle>
            <DialogDescription>
              Choisissez un chauffeur disponible pour cette course
            </DialogDescription>
          </DialogHeader>

          {selectedCourse?.course && (
            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {format(
                  new Date(selectedCourse.course.scheduled_date),
                  "EEEE d MMMM à HH:mm",
                  { locale: fr }
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{selectedCourse.course.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{selectedCourse.course.destination_address}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">Sélectionner un chauffeur</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un chauffeur" />
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
                        <span>{driver.driver?.profile?.full_name || "Chauffeur"}</span>
                        <span className="text-muted-foreground text-xs">
                          ({driver.driver?.vehicle_model})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignDialog(false);
                setSelectedCourse(null);
                setSelectedDriverId("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleManualReassign}
              disabled={!selectedDriverId || reassigning}
              className="gap-2"
            >
              {reassigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              Réassigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
