import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CourseRating } from "@/components/CourseRating";

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  client_rating: number | null;
  course_number: string | null;
  client_id: string | null;
  driver_id: string | null;
  driver: {
    user_id: string;
    profiles: {
      full_name: string;
      profile_photo_url: string | null;
    };
  } | null;
}

const ClientNotes = () => {
  const { user } = useAuth();
  const [completedCourses, setCompletedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCompletedCourses();
    }
  }, [user]);

  const fetchCompletedCourses = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (clientError) throw clientError;

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          client_rating,
          course_number,
          client_id,
          driver_id,
          driver:drivers!courses_driver_id_fkey (
            user_id,
            profiles:profiles!drivers_user_id_fkey (
              full_name,
              profile_photo_url
            )
          )
        `)
        .eq("client_id", clientData.id)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false });

      if (coursesError) throw coursesError;

      setCompletedCourses(coursesData || []);
    } catch (error) {
      console.error("Error fetching completed courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmitted = () => {
    fetchCompletedCourses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Noter mes courses</h2>
        <p className="text-muted-foreground">
          Notez vos courses terminées pour aider à améliorer le service
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {completedCourses.length === 0 ? (
          <Card className="p-8 text-center col-span-full">
            <p className="text-muted-foreground">Aucune course terminée à noter</p>
          </Card>
        ) : (
          completedCourses.map((course) => (
            <Card key={course.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {course.driver && (
                  <div className="flex items-center gap-2 pb-3 border-b">
                    {course.driver.profiles?.profile_photo_url ? (
                      <img
                        src={course.driver.profiles.profile_photo_url}
                        alt={course.driver.profiles?.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {course.driver.profiles?.full_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-medium">
                      {course.driver.profiles?.full_name}
                    </span>
                  </div>
                )}

                {course.course_number && (
                  <div className="text-xs font-mono text-muted-foreground">
                    {course.course_number}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Départ</p>
                    <p className="text-sm truncate">{course.pickup_address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-destructive flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Arrivée</p>
                    <p className="text-sm truncate">{course.destination_address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(course.scheduled_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="pt-3 border-t">
                  <CourseRating
                    courseId={course.id}
                    clientId={course.client_id || undefined}
                    driverId={course.driver_id || undefined}
                    currentRating={course.client_rating}
                    onRatingSubmitted={handleRatingSubmitted}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientNotes;
