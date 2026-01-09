import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { 
  MapPin, 
  Calendar, 
  Users, 
  XCircle, 
  Car, 
  Clock, 
  CheckCircle, 
  FileText,
  Download,
  Plus,
  Euro,
  Phone,
  ExternalLink,
  Building2,
  Copy
} from "lucide-react";
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
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { notificationService } from "@/lib/notificationService";

interface CompanyCoursesListProps {
  companyId: string;
  onCreateCourse: () => void;
}

export const CompanyCoursesList = ({ companyId, onCreateCourse }: CompanyCoursesListProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");
  const [courses, setCourses] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchPendingRequests();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [companyId]);

  const fetchCourses = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      // Récupérer les courses liées à l'entreprise via company_courses
      const { data, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          invoice_to_company,
          employee_id,
          approved_at,
          course_id
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Récupérer les IDs des courses
      const courseIds = data.map((item: any) => item.course_id).filter(Boolean);
      
      if (courseIds.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Récupérer les courses séparément
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          drivers:driver_id(
            id,
            company_name,
            vehicle_model,
            vehicle_color,
            vehicle_brand,
            contact_phone,
            profiles:user_id(full_name, phone, profile_photo_url)
          )
        `)
        .in("id", courseIds);

      if (coursesError) throw coursesError;

      // Récupérer les devis et factures séparément
      const [devisRes, facturesRes] = await Promise.all([
        supabase.from("devis").select("*").in("course_id", courseIds),
        supabase.from("factures").select("*").in("course_id", courseIds)
      ]);

      // Récupérer les employés et leurs profils si nécessaire
      const employeeIds = data.map((item: any) => item.employee_id).filter(Boolean);
      let employeesData: any[] = [];
      if (employeeIds.length > 0) {
        const { data: empData } = await supabase
          .from("company_employees")
          .select("id, user_id")
          .in("id", employeeIds);
        
        // Fetch profiles separately for employees
        if (empData && empData.length > 0) {
          const userIds = empData.map(e => e.user_id).filter(Boolean);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          
          employeesData = empData.map(emp => ({
            ...emp,
            profile: profilesData?.find(p => p.id === emp.user_id)
          }));
        }
      }

      // Transformer les données pour les rendre plus faciles à utiliser
      const transformedCourses = data.map((item: any) => {
        const course = coursesData?.find((c: any) => c.id === item.course_id);
        const employee = employeesData?.find((e: any) => e.id === item.employee_id);
        const courseDevis = devisRes.data?.filter((d: any) => d.course_id === item.course_id) || [];
        const courseFactures = facturesRes.data?.filter((f: any) => f.course_id === item.course_id) || [];
        
        return {
          ...course,
          company_course_id: item.id,
          invoice_to_company: item.invoice_to_company,
          employee_name: employee?.profile?.full_name || null,
          approved_at: item.approved_at,
          devis: courseDevis,
          factures: courseFactures
        };
      }).filter((c: any) => c.id); // Filtrer les courses null

      setCourses(transformedCourses);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!companyId) return;
    
    try {
      // Récupérer les demandes en attente (pas encore confirmées par un chauffeur)
      // Inclure dispatched_to_fleet pour les courses envoyées au gestionnaire
      const { data: requests, error } = await supabase
        .from("company_course_requests")
        .select(`
          *,
          employee:company_employees(
            id,
            user_id,
            department
          ),
          fleet_manager:fleet_managers!company_course_requests_target_fleet_manager_id_fkey(
            id,
            company_name,
            contact_name,
            logo_url
          )
        `)
        .eq("company_id", companyId)
        .in("status", ["draft", "quotes_generated", "sent_to_drivers", "dispatched_to_fleet", "fleet_driver_assigned"])
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        setPendingRequests([]);
        return;
      }

      // Récupérer les invitations de suivi associées
      const requestIds = requests.map(r => r.id);
      const { data: invitations } = await supabase
        .from("company_employee_course_invitations")
        .select("id, token, request_id")
        .in("request_id", requestIds);

      const invitationsMap: Record<string, any> = {};
      invitations?.forEach(inv => {
        if (inv.request_id) invitationsMap[inv.request_id] = inv;
      });

      // Récupérer les profils des employés
      const userIds = requests
        .filter(r => r.employee?.user_id)
        .map(r => r.employee.user_id);
      
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = p;
        });
      }

      // Enrichir les demandes avec les infos des profils et invitations
      const enrichedRequests = requests.map(req => ({
        ...req,
        employee_name: req.employee?.user_id ? profilesMap[req.employee.user_id]?.full_name : null,
        employee_phone: req.employee?.user_id ? profilesMap[req.employee.user_id]?.phone : null,
        tracking_invitation: invitationsMap[req.id] || null,
      }));

      setPendingRequests(enrichedRequests);
    } catch (error: any) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!companyId) return () => {};

    // Subscribe to company_courses changes
    const unsubCompanyCourses = subscriptionManager.subscribe(
      `courses-company-${companyId}`,
      {
        table: "company_courses",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 1000
      },
      () => fetchCourses()
    );

    // Also subscribe to courses changes for status updates (in_progress, completed, etc.)
    const unsubCourses = subscriptionManager.subscribe(
      `courses-status-company-${companyId}`,
      {
        table: "courses",
        event: "UPDATE",
        debounceMs: 1000
      },
      () => fetchCourses()
    );

    // Subscribe to course requests changes
    const unsubRequests = subscriptionManager.subscribe(
      `course-requests-company-${companyId}`,
      {
        table: "company_course_requests",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 1000
      },
      () => fetchPendingRequests()
    );

    return () => {
      unsubCompanyCourses?.();
      unsubCourses?.();
      unsubRequests?.();
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

  const handleCancelRequestConfirm = async () => {
    if (!cancelRequestId) return;

    try {
      const { error } = await supabase
        .from("company_course_requests")
        .update({ status: "cancelled" })
        .eq("id", cancelRequestId);

      if (error) throw error;
      toast.success("Demande annulée");
      setCancelRequestId(null);
      fetchPendingRequests();
    } catch (error: any) {
      console.error("Error cancelling request:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      accepted: "bg-green-500/10 text-green-500 border-green-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      completed: "bg-premium/10 text-premium border-premium/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      draft: "bg-muted text-muted-foreground border-muted",
      quotes_generated: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      sent_to_drivers: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      dispatched_to_fleet: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      fleet_driver_assigned: "bg-green-500/10 text-green-500 border-green-500/20",
    };

    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Confirmée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
      draft: "Brouillon",
      quotes_generated: "Devis générés",
      sent_to_drivers: "Envoyé aux chauffeurs",
      dispatched_to_fleet: "Envoyé au gestionnaire",
      fleet_driver_assigned: "Chauffeur assigné",
    };

    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  const filterCourses = (tab: string) => {
    switch (tab) {
      case "pending":
        return courses.filter(c => c.status === "pending");
      case "upcoming":
        // Include accepted AND in_progress courses
        return courses.filter(c => 
          (c.status === "accepted" || c.status === "in_progress") && 
          c.status !== "completed" && 
          c.status !== "cancelled"
        );
      case "completed":
        return courses.filter(c => c.status === "completed");
      case "cancelled":
        return courses.filter(c => c.status === "cancelled");
      default:
        return courses;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mes réservations</h2>
          <p className="text-sm text-muted-foreground">Gérez les courses de votre entreprise</p>
        </div>
        <Button onClick={onCreateCourse} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle course
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="pending" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4">
            <span className="truncate">En attente</span>
            <span className="ml-1 shrink-0">({filterCourses("pending").length + pendingRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4">
            <span className="truncate">À venir</span>
            <span className="ml-1 shrink-0">({filterCourses("upcoming").length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4">
            <span className="truncate">Terminées</span>
            <span className="ml-1 shrink-0">({filterCourses("completed").length})</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4">
            <span className="truncate">Annulées</span>
            <span className="ml-1 shrink-0">({filterCourses("cancelled").length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Pending tab - includes both pending courses AND pending requests */}
        <TabsContent value="pending">
          {filterCourses("pending").length === 0 && pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucune course</h3>
                <p className="text-muted-foreground mb-4">
                  Aucune course en attente de confirmation.
                </p>
                <Button onClick={onCreateCourse}>
                  <Plus className="w-4 h-4 mr-2" />
                  Réserver une course
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Pending requests (from company_course_requests) */}
              {pendingRequests.map((request) => (
                <Card key={request.id} className={`overflow-hidden border-l-4 ${
                  request.status === 'dispatched_to_fleet' || request.status === 'fleet_driver_assigned' 
                    ? 'border-l-purple-500' 
                    : 'border-l-orange-500'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(request.status)}
                          {request.target_fleet_manager_id && request.fleet_manager && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <Building2 className="w-3 h-3 mr-1" />
                              {request.fleet_manager.company_name}
                            </Badge>
                          )}
                          {(request.employee_name || request.guest_employee_name) && (
                            <Badge variant="outline">
                              {request.is_guest_employee ? "Invité:" : "Pour:"} {request.guest_employee_name || request.employee_name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{request.pickup_address}</p>
                            <p className="text-xs text-muted-foreground">Départ</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-destructive mt-1 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{request.destination_address}</p>
                            <p className="text-xs text-muted-foreground">Arrivée</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(request.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                          {request.passengers_count && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {request.passengers_count} passager(s)
                            </span>
                          )}
                        </div>

                        {/* Info passager */}
                        {(request.guest_employee_name || request.guest_employee_phone) && (
                          <div className="flex items-center gap-3 pt-2 border-t">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <span className="text-sm font-semibold">
                                {request.guest_employee_name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{request.guest_employee_name || "Passager"}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.is_guest_employee ? "Invité" : "Collaborateur"}
                              </p>
                            </div>
                            {request.guest_employee_phone && (
                              <a 
                                href={`tel:${request.guest_employee_phone}`}
                                className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Lien de suivi */}
                        {request.tracking_invitation && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Lien de suivi:</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const trackingUrl = `${window.location.origin}/guest-employee-tracking?token=${request.tracking_invitation.token}`;
                                navigator.clipboard.writeText(trackingUrl);
                                toast.success("Lien copié!");
                              }}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const trackingUrl = `${window.location.origin}/guest-employee-tracking?token=${request.tracking_invitation.token}`;
                                window.open(trackingUrl, '_blank');
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ouvrir
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setCancelRequestId(request.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pending courses (from courses with status pending) */}
              {filterCourses("pending").map((course) => renderCourseCard(course))}
            </div>
          )}
        </TabsContent>

        {/* Other tabs */}
        {["upcoming", "completed", "cancelled"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {filterCourses(tab).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Aucune course</h3>
                  <p className="text-muted-foreground mb-4">
                    {tab === "upcoming" && "Aucune course à venir."}
                    {tab === "completed" && "Aucune course terminée."}
                    {tab === "cancelled" && "Aucune course annulée."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filterCourses(tab).map((course) => renderCourseCard(course))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialog de confirmation d'annulation de course */}
      <AlertDialog open={!!cancelCourseId} onOpenChange={() => setCancelCourseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette course ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le chauffeur sera notifié de l'annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation d'annulation de demande */}
      <AlertDialog open={!!cancelRequestId} onOpenChange={() => setCancelRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette demande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La demande sera annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelRequestConfirm} className="bg-destructive text-destructive-foreground">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderCourseCard(course: any) {
    return (
      <Card key={course.id} className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(course.status)}
                {course.employee_name && (
                  <Badge variant="outline">
                    Réservé par {course.employee_name}
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{course.pickup_address}</p>
                  <p className="text-xs text-muted-foreground">Départ</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-destructive mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{course.destination_address}</p>
                  <p className="text-xs text-muted-foreground">Arrivée</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {course.passengers_count} passager(s)
                </span>
                {course.distance_km != null && (
                  <span className="flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    {Number(course.distance_km).toFixed(1)} km
                  </span>
                )}
              </div>

              {/* Info passager */}
              {(course.guest_name || course.guest_phone) && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {course.guest_name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{course.guest_name || "Passager"}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.is_guest_booking ? "Invité" : "Collaborateur"}
                    </p>
                  </div>
                  {course.guest_phone && (
                    <a 
                      href={`tel:${course.guest_phone}`}
                      className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Info chauffeur */}
              {course.drivers && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {course.drivers.profiles?.profile_photo_url ? (
                      <img 
                        src={course.drivers.profiles.profile_photo_url} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Car className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {course.drivers.profiles?.full_name || course.drivers.company_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {course.drivers.vehicle_brand && course.drivers.vehicle_brand}
                      {course.drivers.vehicle_model && ` ${course.drivers.vehicle_model}`}
                      {course.drivers.vehicle_color && ` - ${course.drivers.vehicle_color}`}
                      {!course.drivers.vehicle_brand && !course.drivers.vehicle_model && course.drivers.company_name}
                    </p>
                  </div>
                  {(course.drivers.contact_phone || course.drivers.profiles?.phone) && (
                    <a 
                      href={`tel:${course.drivers.contact_phone || course.drivers.profiles?.phone}`}
                      className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {/* Devis */}
              {course.devis && course.devis.length > 0 && course.devis[0]?.amount != null && (
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {Number(course.devis[0].amount).toFixed(2)} €
                  </p>
                  {course.devis[0]?.quote_number && (
                    <Badge variant="outline" className="text-xs">
                      Devis n°{course.devis[0].quote_number}
                    </Badge>
                  )}
                </div>
              )}

              {/* Facture */}
              {course.factures && course.factures.length > 0 && (
                <Badge 
                  variant="outline" 
                  className={course.factures[0].payment_status === 'paid' 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-yellow-500/10 text-yellow-500"
                  }
                >
                  {course.factures[0].payment_status === 'paid' ? 'Payée' : 'À payer'}
                </Badge>
              )}

              {/* Actions */}
              {course.status === "pending" && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setCancelCourseId(course.id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
};
