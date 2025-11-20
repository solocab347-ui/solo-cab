import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CoursesListProps {
  driverId: string;
}

const CoursesList = ({ driverId }: CoursesListProps) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
    setupRealtimeSubscription();
  }, [driverId]);

  const fetchCourses = async () => {
    try {
      // Dual association query
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          clients!inner(
            user_id,
            is_exclusive,
            profiles:user_id(full_name, phone, profile_photo_url)
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("courses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAccept = async (courseId: string) => {
    try {
      // Update course status
      const { error: updateError } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (updateError) throw updateError;

      // Generate course number
      const { data: courseNumber } = await supabase
        .rpc("generate_course_number", { _driver_id: driverId });

      await supabase
        .from("courses")
        .update({ course_number: courseNumber })
        .eq("id", courseId);

      // Create devis automatically
      const response = await supabase.functions.invoke("create-devis-auto", {
        body: {
          course_id: courseId,
          driver_id: driverId,
          use_hourly_rate: false,
        },
      });

      if (response.error) throw response.error;

      toast.success("Course acceptée ! Devis généré automatiquement.");
      fetchCourses();
    } catch (error: any) {
      console.error("Error accepting course:", error);
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleReject = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "cancelled" })
        .eq("id", courseId);

      if (error) throw error;
      toast.success("Course refusée");
      fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      toast.error("Erreur lors du refus");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-premium/10 text-premium border-premium/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };

    const labels = {
      pending: "En attente",
      accepted: "Acceptée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Chargement des courses...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Aucune course</h3>
        <p className="text-muted-foreground">
          Les demandes de réservation apparaîtront ici
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <Card key={course.id} className="p-6 hover:shadow-elegant transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {course.clients?.profiles?.profile_photo_url ? (
                <img
                  src={course.clients.profiles.profile_photo_url}
                  alt={course.clients.profiles.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-bold">{course.clients?.profiles?.full_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {course.clients?.is_exclusive && (
                    <Badge variant="outline" className="text-xs">Client exclusif</Badge>
                  )}
                  {course.course_number && (
                    <span className="text-xs text-premium">{course.course_number}</span>
                  )}
                </div>
              </div>
            </div>
            {getStatusBadge(course.status)}
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-premium mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Départ</p>
                <p className="text-muted-foreground">{course.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Arrivée</p>
                <p className="text-muted-foreground">{course.destination_address}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.passengers_count} passager{course.passengers_count > 1 ? "s" : ""}
              </div>
            </div>

            {course.distance_km && (
              <div className="text-sm text-muted-foreground">
                Distance estimée : {course.distance_km} km
                {course.duration_minutes && ` • Durée : ${course.duration_minutes} min`}
              </div>
            )}

            {course.notes && (
              <div className="text-sm bg-secondary p-3 rounded-lg">
                <p className="font-medium mb-1">Notes :</p>
                <p className="text-muted-foreground">{course.notes}</p>
              </div>
            )}
          </div>

          {course.status === "pending" && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={() => handleAccept(course.id)}
                className="flex-1 bg-gradient-premium"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accepter et créer devis
              </Button>
              <Button
                onClick={() => handleReject(course.id)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
            </div>
          )}

          {course.status === "accepted" && (
            <div className="pt-4 border-t border-border text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-premium" />
              Devis envoyé au client - En attente d'acceptation
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default CoursesList;
