import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Calendar, Users, XCircle, MessageSquare, Car, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

interface ClientCoursesListProps {
  clientId: string;
}

const ClientCoursesList = ({ clientId }: ClientCoursesListProps) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    setupRealtimeSubscription();
  }, [clientId]);

  useEffect(() => {
    let filtered = courses;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((course) => course.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.course_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.destination_address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  }, [searchTerm, statusFilter, courses]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          drivers!inner(
            company_name,
            vehicle_model,
            vehicle_color,
            profiles:user_id(full_name, phone, profile_photo_url)
          )
        `)
        .eq("client_id", clientId)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
      setFilteredCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("client-courses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `client_id=eq.${clientId}`,
        },
        () => fetchCourses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCancelConfirm = async () => {
    if (!cancelCourseId) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ status: "cancelled" })
        .eq("id", cancelCourseId);

      if (error) throw error;
      toast.success("Course annulée");
      setCancelCourseId(null);
      fetchCourses();
    } catch (error: any) {
      console.error("Error cancelling course:", error);
      toast.error("Erreur lors de l'annulation");
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

  const stats = {
    total: courses.length,
    pending: courses.filter((c) => c.status === "pending").length,
    completed: courses.filter((c) => c.status === "completed").length,
    cancelled: courses.filter((c) => c.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-premium">{stats.total}</h3>
            <p className="text-sm text-muted-foreground">Courses totales</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-yellow-500">{stats.pending}</h3>
            <p className="text-sm text-muted-foreground">En attente</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-green-500">{stats.completed}</h3>
            <p className="text-sm text-muted-foreground">Terminées</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-muted-foreground">{stats.cancelled}</h3>
            <p className="text-sm text-muted-foreground">Annulées</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par adresse ou numéro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptées</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <Card className="p-8 text-center">
          <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Aucune course</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "Aucune course ne correspond à vos critères"
              : "Vos courses apparaîtront ici après réservation"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="p-6 hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {course.drivers?.profiles?.profile_photo_url ? (
                    <img
                      src={course.drivers.profiles.profile_photo_url}
                      alt={course.drivers.profiles.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-dark rounded-full flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold">{course.drivers?.profiles?.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{course.drivers?.vehicle_model}</span>
                      {course.course_number && (
                        <>
                          <span>•</span>
                          <span className="text-premium">{course.course_number}</span>
                        </>
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
                    {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.passengers_count} passager{course.passengers_count > 1 ? "s" : ""}
                  </div>
                </div>

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
                    onClick={() => toast.info("Messagerie en cours de développement")}
                    variant="outline"
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contacter
                  </Button>
                  <Button
                    onClick={() => setCancelCourseId(course.id)}
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelCourseId} onOpenChange={(open) => !open && setCancelCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette course ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera définitivement votre réservation. Le chauffeur en sera informé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientCoursesList;
