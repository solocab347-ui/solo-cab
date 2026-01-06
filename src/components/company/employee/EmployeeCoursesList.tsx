import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Phone,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Timer
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmployeeCoursesListProps {
  employeeId: string;
  userId: string;
  companyId: string;
  onCreateCourse: () => void;
}

interface CourseData {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  distance_km: number | null;
  duration_minutes: number | null;
  passengers_count: number;
  notes: string | null;
  created_by_user_id: string | null;
  driver: {
    id: string;
    company_name: string | null;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    profile: {
      full_name: string | null;
      phone: string | null;
      profile_photo_url: string | null;
    } | null;
  } | null;
  devis: {
    id: string;
    quote_number: string;
    amount: number;
    status: string;
    valid_until: string;
  } | null;
  facture: {
    id: string;
    invoice_number: string;
    amount: number;
    payment_status: string;
  } | null;
}

export function EmployeeCoursesList({ 
  employeeId, 
  userId, 
  companyId, 
  onCreateCourse 
}: EmployeeCoursesListProps) {
  const [activeTab, setActiveTab] = useState("pending");
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelCourseId, setCancelCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe?.();
  }, [employeeId, userId]);

  const fetchCourses = async () => {
    try {
      console.log("[EmployeeCoursesList] Fetching courses for employee:", employeeId, "user:", userId);
      
      // Utiliser une edge function pour contourner les problèmes RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("[EmployeeCoursesList] No session");
        return;
      }

      // Récupérer les company_courses liées à cet utilisateur
      const { data: companyCourses, error: ccError } = await supabase
        .from("company_courses")
        .select("course_id, employee_id")
        .eq("company_id", companyId);

      if (ccError) {
        console.error("[EmployeeCoursesList] Error fetching company_courses:", ccError);
        throw ccError;
      }

      console.log("[EmployeeCoursesList] Company courses found:", companyCourses?.length);

      if (!companyCourses || companyCourses.length === 0) {
        setCourses([]);
        return;
      }

      // Récupérer les détails des courses
      const courseIds = companyCourses.map(cc => cc.course_id);
      
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          distance_km,
          duration_minutes,
          passengers_count,
          notes,
          created_by_user_id,
          driver_id
        `)
        .in("id", courseIds)
        .order("scheduled_date", { ascending: false });

      if (coursesError) {
        console.error("[EmployeeCoursesList] Error fetching courses:", coursesError);
        throw coursesError;
      }

      console.log("[EmployeeCoursesList] Courses found:", coursesData?.length);

      // Filtrer pour ne garder que les courses créées par cet utilisateur
      const myCourses = coursesData?.filter(c => 
        c.created_by_user_id === userId ||
        companyCourses.find(cc => cc.course_id === c.id)?.employee_id === employeeId
      ) || [];

      console.log("[EmployeeCoursesList] My courses after filter:", myCourses.length);

      // Enrichir avec driver, devis, facture
      const enrichedCourses: CourseData[] = [];

      for (const course of myCourses) {
        let driver = null;
        let devis = null;
        let facture = null;

        // Get driver info
        if (course.driver_id) {
          const { data: driverData } = await supabase
            .from("drivers")
            .select("id, company_name, vehicle_brand, vehicle_model, vehicle_color, user_id")
            .eq("id", course.driver_id)
            .single();

          if (driverData) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, phone, profile_photo_url")
              .eq("id", driverData.user_id)
              .single();

            driver = {
              id: driverData.id,
              company_name: driverData.company_name,
              vehicle_brand: driverData.vehicle_brand,
              vehicle_model: driverData.vehicle_model,
              vehicle_color: driverData.vehicle_color,
              profile: profileData
            };
          }
        }

        // Get devis
        const { data: devisData } = await supabase
          .from("devis")
          .select("id, quote_number, amount, status, valid_until")
          .eq("course_id", course.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (devisData) {
          devis = devisData;
        }

        // Get facture
        const { data: factureData } = await supabase
          .from("factures")
          .select("id, invoice_number, amount, payment_status")
          .eq("course_id", course.id)
          .maybeSingle();

        if (factureData) {
          facture = factureData;
        }

        enrichedCourses.push({
          ...course,
          driver,
          devis,
          facture
        });
      }

      setCourses(enrichedCourses);
    } catch (error: any) {
      console.error("[EmployeeCoursesList] Error:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    return subscriptionManager.subscribe(
      `employee-courses-${employeeId}`,
      {
        table: "company_courses",
        event: "*",
        filter: `company_id=eq.${companyId}`,
        debounceMs: 1000
      },
      () => fetchCourses()
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourses();
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

  const handleAcceptDevis = async (devisId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Marquer le devis comme accepté
      const { error: devisError } = await supabase
        .from("devis")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", devisId);

      if (devisError) throw devisError;

      // Récupérer le devis pour notifier le chauffeur
      const { data: devisData } = await supabase
        .from("devis")
        .select("course_id, driver_id, quote_number")
        .eq("id", devisId)
        .single();

      if (devisData) {
        // Récupérer le chauffeur pour envoyer une notification
        const { data: driver } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", devisData.driver_id)
          .single();

        if (driver?.user_id) {
          await supabase.from("notifications").insert({
            user_id: driver.user_id,
            title: "Devis accepté par l'entreprise",
            message: `Le devis ${devisData.quote_number} a été accepté. Confirmez la course.`,
            type: "devis_accepted",
            link: "/driver-dashboard?tab=courses"
          });
        }
      }

      toast.success("Devis accepté ! En attente de confirmation du chauffeur.");
      fetchCourses();
    } catch (error: any) {
      console.error("Error accepting devis:", error);
      toast.error("Erreur lors de l'acceptation du devis");
    }
  };

  const handleRejectDevis = async (devisId: string) => {
    try {
      const { error } = await supabase
        .from("devis")
        .update({ status: "rejected" })
        .eq("id", devisId);

      if (error) throw error;

      toast.success("Devis refusé");
      fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting devis:", error);
      toast.error("Erreur lors du refus du devis");
    }
  };

  const handleRegenerateDevis = async (courseId: string) => {
    try {
      // Récupérer la course pour avoir le driver_id
      const course = courses.find(c => c.id === courseId);
      if (!course?.driver?.id) {
        toast.error("Chauffeur non trouvé pour cette course");
        return;
      }

      toast.info("Génération du devis en cours...");

      const { data, error } = await supabase.functions.invoke("create-devis-auto", {
        body: { course_id: courseId, driver_id: course.driver.id }
      });

      if (error) {
        console.error("Error generating devis:", error);
        toast.error("Erreur lors de la génération du devis");
        return;
      }

      toast.success("Devis généré avec succès !");
      fetchCourses();
    } catch (error: any) {
      console.error("Error regenerating devis:", error);
      toast.error("Erreur lors de la génération du devis");
    }
  };

  const handleDownloadDevis = (course: CourseData) => {
    if (!course.devis) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text("DEVIS", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Référence: ${course.devis.quote_number}`, pageWidth / 2, 26, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    let yPos = 50;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, yPos);
    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.text(course.driver?.profile?.full_name || "N/A", 20, yPos);
    
    yPos = 80;
    doc.text("Départ: " + course.pickup_address, 20, yPos);
    yPos += 6;
    doc.text("Arrivée: " + course.destination_address, 20, yPos);
    yPos += 6;
    doc.text("Date: " + format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr }), 20, yPos);
    
    yPos += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL TTC: ${course.devis.amount.toFixed(2)} €`, 20, yPos);
    
    doc.save(`devis-${course.devis.quote_number}.pdf`);
    toast.success("Devis téléchargé");
  };

  const getStatusConfig = (status: string, devisStatus?: string) => {
    if (status === "pending") {
      if (devisStatus === "accepted") {
        return {
          label: "En attente du chauffeur",
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          icon: Timer
        };
      }
      if (devisStatus === "pending") {
        return {
          label: "Devis à valider",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          icon: FileText
        };
      }
      return {
        label: "En attente de devis",
        color: "text-gray-500",
        bgColor: "bg-gray-500/10",
        icon: Clock
      };
    }

    const configs: Record<string, any> = {
      accepted: { label: "Confirmée", color: "text-green-500", bgColor: "bg-green-500/10", icon: CheckCircle },
      in_progress: { label: "En cours", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Car },
      completed: { label: "Terminée", color: "text-purple-500", bgColor: "bg-purple-500/10", icon: CheckCircle },
      cancelled: { label: "Annulée", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle }
    };

    return configs[status] || configs.pending;
  };

  // Filtrer les courses par catégorie
  // Devis à valider: course pending avec devis pending
  const pendingQuotes = courses.filter(c => 
    c.status === "pending" && c.devis?.status === "pending"
  );
  // En attente du chauffeur: devis accepté, course pending
  const awaitingDriver = courses.filter(c => 
    c.status === "pending" && c.devis?.status === "accepted"
  );
  // Courses sans devis (en attente de génération)
  const awaitingQuote = courses.filter(c => 
    c.status === "pending" && !c.devis
  );
  // Combiner les devis à valider avec ceux en attente de génération
  const allPendingQuotes = [...pendingQuotes, ...awaitingQuote];
  
  const confirmedCourses = courses.filter(c => 
    c.status === "accepted" || c.status === "in_progress"
  );
  const completedCourses = courses.filter(c => c.status === "completed");
  const cancelledCourses = courses.filter(c => c.status === "cancelled");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderCourseCard = (course: CourseData) => {
    const statusConfig = getStatusConfig(course.status, course.devis?.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card key={course.id} className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          {/* Header avec statut */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              </div>
              <div>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                  {statusConfig.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(course.scheduled_date), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
            {course.devis && (
              <div className="text-right">
                <p className="text-lg font-bold">{course.devis.amount.toFixed(2)} €</p>
                <p className="text-xs text-muted-foreground">{course.devis.quote_number}</p>
              </div>
            )}
          </div>

          {/* Adresses */}
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-sm">{course.pickup_address}</p>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm">{course.destination_address}</p>
            </div>
          </div>

          {/* Info chauffeur */}
          {course.driver && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={course.driver.profile?.profile_photo_url || undefined} />
                <AvatarFallback className="bg-primary/10">
                  <Car className="w-5 h-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {course.driver.profile?.full_name || course.driver.company_name || "Chauffeur"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {course.driver.vehicle_brand} {course.driver.vehicle_model}
                </p>
              </div>
              {course.driver.profile?.phone && (
                <a 
                  href={`tel:${course.driver.profile.phone}`}
                  className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Actions selon le statut */}
          <div className="flex flex-wrap gap-2">
            {/* Course sans devis - proposer de régénérer */}
            {course.status === "pending" && !course.devis && (
              <div className="w-full space-y-2">
                <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    En attente de génération du devis...
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleRegenerateDevis(course.id)}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Générer le devis
                </Button>
              </div>
            )}

            {/* Devis en attente de validation */}
            {course.status === "pending" && course.devis?.status === "pending" && (
              <>
                <Button 
                  onClick={() => handleAcceptDevis(course.devis!.id)}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accepter le devis
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleRejectDevis(course.devis!.id)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
              </>
            )}

            {/* Course en attente du chauffeur */}
            {course.status === "pending" && course.devis?.status === "accepted" && (
              <div className="w-full p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Le chauffeur doit confirmer la course
                </p>
              </div>
            )}

            {/* Télécharger devis */}
            {course.devis && (
              <Button variant="outline" size="sm" onClick={() => handleDownloadDevis(course)}>
                <Download className="w-4 h-4 mr-2" />
                Devis
              </Button>
            )}

            {/* Annuler (seulement si pending) */}
            {course.status === "pending" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCancelCourseId(course.id)}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Mes courses
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez et suivez vos déplacements professionnels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={onCreateCourse} className="bg-gradient-to-r from-primary to-accent">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle course
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="pending" className="text-xs py-2 flex flex-col gap-1">
            <span>Devis</span>
            <Badge variant="secondary" className="text-xs">{allPendingQuotes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="awaiting" className="text-xs py-2 flex flex-col gap-1">
            <span>En attente</span>
            <Badge variant="secondary" className="text-xs">{awaitingDriver.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs py-2 flex flex-col gap-1">
            <span>Confirmées</span>
            <Badge variant="secondary" className="text-xs">{confirmedCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs py-2 flex flex-col gap-1">
            <span>Terminées</span>
            <Badge variant="secondary" className="text-xs">{completedCourses.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs py-2 flex flex-col gap-1">
            <span>Annulées</span>
            <Badge variant="secondary" className="text-xs">{cancelledCourses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {allPendingQuotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucun devis en attente</h3>
                <p className="text-muted-foreground mb-4">
                  Réservez une course pour recevoir un devis automatique
                </p>
                <Button onClick={onCreateCourse}>
                  <Plus className="w-4 h-4 mr-2" />
                  Réserver une course
                </Button>
              </CardContent>
            </Card>
          ) : (
            allPendingQuotes.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="awaiting" className="space-y-4 mt-4">
          {awaitingDriver.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Timer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucune course en attente</h3>
                <p className="text-muted-foreground">
                  Les courses acceptées par vous en attente de confirmation du chauffeur apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            awaitingDriver.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4 mt-4">
          {confirmedCourses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucune course confirmée</h3>
                <p className="text-muted-foreground">
                  Vos prochaines courses confirmées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            confirmedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedCourses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucune course terminée</h3>
                <p className="text-muted-foreground">
                  Votre historique de courses apparaîtra ici
                </p>
              </CardContent>
            </Card>
          ) : (
            completedCourses.map(renderCourseCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4 mt-4">
          {cancelledCourses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Aucune course annulée</h3>
                <p className="text-muted-foreground">
                  Les courses annulées apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            cancelledCourses.map(renderCourseCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog annulation */}
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
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
