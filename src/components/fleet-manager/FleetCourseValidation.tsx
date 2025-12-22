import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Users,
  Car,
  Loader2,
  Settings,
  AlertTriangle,
} from "lucide-react";

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  status: string;
  notes: string | null;
  client?: {
    id: string;
    user_id: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand: string | null;
    user_id: string;
    profile?: {
      full_name: string;
    };
  };
}

interface FleetCourseValidationProps {
  fleetManagerId: string;
  autoValidate: boolean;
  onAutoValidateChange: (value: boolean) => void;
}

export const FleetCourseValidation = ({
  fleetManagerId,
  autoValidate,
  onAutoValidateChange,
}: FleetCourseValidationProps) => {
  const [loading, setLoading] = useState(true);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingCourses();
  }, [fleetManagerId]);

  const fetchPendingCourses = async () => {
    try {
      // Récupérer les chauffeurs de la flotte
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select("driver_id")
        .eq("fleet_manager_id", fleetManagerId);

      if (!fleetDrivers || fleetDrivers.length === 0) {
        setPendingCourses([]);
        setLoading(false);
        return;
      }

      const driverIds = fleetDrivers.map(d => d.driver_id);

      // Récupérer les courses en attente de validation
      const { data: courses } = await supabase
        .from("courses")
        .select(`
          *,
          client:clients(
            id,
            user_id
          ),
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id
          )
        `)
        .in("driver_id", driverIds)
        .eq("status", "pending")
        .order("scheduled_date", { ascending: true });

      if (courses) {
        // Récupérer les profils
        const clientUserIds = courses
          .filter(c => c.client)
          .map(c => c.client.user_id);
        const driverUserIds = courses
          .filter(c => c.driver)
          .map(c => c.driver.user_id);
        const allUserIds = [...new Set([...clientUserIds, ...driverUserIds])];

        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", allUserIds);

          const coursesWithProfiles = courses.map(c => ({
            ...c,
            client: c.client ? {
              ...c.client,
              profile: profiles?.find(p => p.id === c.client.user_id)
            } : undefined,
            driver: c.driver ? {
              ...c.driver,
              profile: profiles?.find(p => p.id === c.driver.user_id)
            } : undefined
          }));

          setPendingCourses(coursesWithProfiles);
        } else {
          setPendingCourses(courses);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedCourse || !actionType) return;

    setProcessing(true);
    try {
      const newStatus = actionType === "approve" ? "accepted" : "cancelled";
      
      const { error } = await supabase
        .from("courses")
        .update({ status: newStatus })
        .eq("id", selectedCourse.id);

      if (error) throw error;

      // Notifier le client
      if (selectedCourse.client?.user_id) {
        await supabase.from("notifications").insert({
          user_id: selectedCourse.client.user_id,
          title: actionType === "approve" 
            ? "Course confirmée" 
            : "Course refusée",
          message: actionType === "approve"
            ? `Votre course du ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })} a été confirmée`
            : `Votre course du ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })} a été refusée`,
          type: actionType === "approve" ? "success" : "warning",
          link: "/fleet-client-dashboard"
        });
      }

      // Notifier le chauffeur
      if (selectedCourse.driver?.user_id) {
        await supabase.from("notifications").insert({
          user_id: selectedCourse.driver.user_id,
          title: actionType === "approve" 
            ? "Nouvelle course assignée" 
            : "Course annulée",
          message: actionType === "approve"
            ? `Course confirmée pour le ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })}`
            : `Course annulée pour le ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })}`,
          type: actionType === "approve" ? "success" : "warning",
          link: "/fleet-driver-dashboard"
        });
      }

      toast.success(
        actionType === "approve" 
          ? "Course approuvée avec succès" 
          : "Course refusée"
      );

      setPendingCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
    } catch (error) {
      console.error("Error processing course:", error);
      toast.error("Erreur lors du traitement");
    } finally {
      setProcessing(false);
      setSelectedCourse(null);
      setActionType(null);
    }
  };

  const handleAutoValidateChange = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({ auto_validate_courses: enabled })
        .eq("id", fleetManagerId);

      if (error) throw error;

      onAutoValidateChange(enabled);
      toast.success(
        enabled 
          ? "Validation automatique activée" 
          : "Validation manuelle activée"
      );
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
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
    <div className="space-y-6">
      {/* Paramètres de validation */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Paramètres de validation
          </CardTitle>
          <CardDescription>
            Configurez comment les courses sont validées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-validate" className="text-base font-medium">
                Validation automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                {autoValidate 
                  ? "Les courses sont automatiquement confirmées"
                  : "Vous devez approuver chaque course manuellement"
                }
              </p>
            </div>
            <Switch
              id="auto-validate"
              checked={autoValidate}
              onCheckedChange={handleAutoValidateChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des courses en attente */}
      {!autoValidate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Courses en attente de validation
              {pendingCourses.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCourses.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune course en attente de validation</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {pendingCourses.map(course => (
                    <div 
                      key={course.id}
                      className="p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Client */}
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={course.client?.profile?.profile_photo_url || ""} />
                              <AvatarFallback>
                                {course.client?.profile?.full_name?.charAt(0) || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {course.client?.profile?.full_name || "Client"}
                              </p>
                              <p className="text-xs text-muted-foreground">Client</p>
                            </div>
                          </div>

                          {/* Itinéraire */}
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <span className="text-sm">{course.pickup_address}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                              <span className="text-sm">{course.destination_address}</span>
                            </div>
                          </div>

                          {/* Détails */}
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(course.scheduled_date), "d MMM à HH:mm", { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {course.passengers_count} passager(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="w-4 h-4" />
                              {course.driver?.profile?.full_name || "Non assigné"}
                            </span>
                          </div>

                          {course.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              "{course.notes}"
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCourse(course);
                              setActionType("approve");
                            }}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedCourse(course);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation */}
      <AlertDialog 
        open={!!selectedCourse && !!actionType}
        onOpenChange={() => {
          setSelectedCourse(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-success" />
                  Approuver cette course ?
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Refuser cette course ?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? "La course sera confirmée et le chauffeur sera notifié."
                : "La course sera annulée. Le client et le chauffeur seront notifiés."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={processing}
              className={actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
