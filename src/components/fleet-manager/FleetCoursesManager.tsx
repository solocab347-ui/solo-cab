import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
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
  Plus,
  User,
  Phone,
  Mail,
  AlertCircle,
  ArrowRight,
  Send,
  Route,
  TrendingUp,
  Filter,
  Search,
  Eye,
  ChevronRight,
  Zap,
  Timer,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  XOctagon,
  RefreshCw,
  LayoutGrid,
  List,
  FileText,
  Radio,
} from "lucide-react";
import { FleetDispatchQueue } from "./FleetDispatchQueue";

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  status: string;
  notes: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
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

interface FleetDriver {
  driver_id: string;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand: string | null;
    user_id: string;
    max_passengers: number;
    profile?: {
      full_name: string;
    };
  };
}

interface FleetClient {
  client_id: string;
  client?: {
    id: string;
    user_id: string;
    profile?: {
      full_name: string;
      email: string;
      phone: string;
    };
  };
}

interface FleetCoursesManagerProps {
  fleetManagerId: string;
  autoValidate: boolean;
  onAutoValidateChange: (value: boolean) => void;
}

type ViewMode = "grid" | "list";
type FilterStatus = "all" | "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

export const FleetCoursesManager = ({
  fleetManagerId,
  autoValidate,
  onAutoValidateChange,
}: FleetCoursesManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "pending" | "today" | "upcoming" | "history" | "unassigned" | "dispatch">("overview");
  const [activeMainTab, setActiveMainTab] = useState<"courses" | "dispatch">("courses");
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  
  // Courses non affectées
  const [unassignedCourses, setUnassignedCourses] = useState<any[]>([]);
  
  // Forçage assignation
  const [showForceAssignDialog, setShowForceAssignDialog] = useState(false);
  const [selectedCourseForForce, setSelectedCourseForForce] = useState<Course | null>(null);
  const [forceDriverId, setForceDriverId] = useState("");
  const [forceAssigning, setForceAssigning] = useState(false);
  
  // Création de course
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isManualClient, setIsManualClient] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({
    clientId: "",
    driverId: "",
    pickupAddress: "",
    pickupLatitude: null as number | null,
    pickupLongitude: null as number | null,
    destinationAddress: "",
    destinationLatitude: null as number | null,
    destinationLongitude: null as number | null,
    scheduledDate: "",
    scheduledTime: "",
    passengersCount: 1,
    notes: "",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
  });

  // Détail course
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);

  // Stats calculées
  const stats = useMemo(() => {
    const pending = allCourses.filter(c => c.status === "pending").length;
    const today = allCourses.filter(c => isToday(new Date(c.scheduled_date)) && ["accepted", "pending"].includes(c.status)).length;
    const upcoming = allCourses.filter(c => !isPast(new Date(c.scheduled_date)) && !isToday(new Date(c.scheduled_date)) && ["accepted", "pending"].includes(c.status)).length;
    const completed = allCourses.filter(c => c.status === "completed").length;
    const inProgress = allCourses.filter(c => c.status === "in_progress").length;
    const cancelled = allCourses.filter(c => c.status === "cancelled").length;
    return { pending, today, upcoming, completed, inProgress, cancelled, unassigned: unassignedCourses.length };
  }, [allCourses, unassignedCourses]);

  // Filtrage des courses
  const filteredCourses = useMemo(() => {
    let filtered = [...allCourses];

    // Filtre par section
    switch (activeSection) {
      case "pending":
        filtered = filtered.filter(c => c.status === "pending");
        break;
      case "today":
        filtered = filtered.filter(c => isToday(new Date(c.scheduled_date)) && ["accepted", "pending", "in_progress"].includes(c.status));
        break;
      case "upcoming":
        filtered = filtered.filter(c => !isPast(new Date(c.scheduled_date)) && !isToday(new Date(c.scheduled_date)) && ["accepted", "pending"].includes(c.status));
        break;
      case "history":
        filtered = filtered.filter(c => c.status === "completed" || c.status === "cancelled" || isPast(new Date(c.scheduled_date)));
        break;
    }

    // Filtre par statut
    if (filterStatus !== "all") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Filtre par chauffeur
    if (filterDriver !== "all") {
      filtered = filtered.filter(c => c.driver?.id === filterDriver);
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.pickup_address.toLowerCase().includes(query) ||
        c.destination_address.toLowerCase().includes(query) ||
        c.client?.profile?.full_name?.toLowerCase().includes(query) ||
        c.guest_name?.toLowerCase().includes(query) ||
        c.driver?.profile?.full_name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  }, [allCourses, activeSection, filterStatus, filterDriver, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Récupérer les chauffeurs internes de la flotte
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id,
            max_passengers
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      // Récupérer les chauffeurs partenaires
      const { data: partnerDrivers } = await supabase
        .from("fleet_driver_partnerships")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id,
            max_passengers
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted");

      // Combiner les deux sources sans doublons
      const allDriversMap = new Map<string, any>();
      
      fleetDrivers?.forEach((d: any) => {
        if (d.driver) {
          allDriversMap.set(d.driver.id, { driver_id: d.driver.id, driver: d.driver });
        }
      });
      
      partnerDrivers?.forEach((d: any) => {
        if (d.driver && !allDriversMap.has(d.driver.id)) {
          allDriversMap.set(d.driver.id, { driver_id: d.driver.id, driver: d.driver });
        }
      });

      const combinedDrivers = Array.from(allDriversMap.values());

      if (combinedDrivers.length > 0) {
        const driverUserIds = combinedDrivers
          .filter(d => d.driver)
          .map(d => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", driverUserIds);

          const driversWithProfiles = combinedDrivers.map(d => ({
            ...d,
            driver: d.driver ? {
              ...d.driver,
              profile: profiles?.find(p => p.id === d.driver.user_id)
            } : undefined
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(combinedDrivers);
        }

        const driverIds = combinedDrivers.map(d => d.driver_id);

        // SÉCURITÉ: Isolation stricte des courses
        // Le gestionnaire ne voit QUE :
        // 1. Les courses qu'il a lui-même créées (fleet_manager_id = fleetManagerId)
        // 2. Les courses partagées avec lui via fleet_partner_courses
        // JAMAIS les courses personnelles des chauffeurs partenaires
        
        // 1. Récupérer les courses créées PAR le gestionnaire
        const { data: fleetCreatedCourses } = await supabase
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
          .eq("fleet_manager_id", fleetManagerId)
          .order("scheduled_date", { ascending: false });

        // 2. Récupérer les courses partagées PAR les chauffeurs AU gestionnaire
        const { data: sharedCourseLinks } = await supabase
          .from("fleet_partner_courses")
          .select("course_id")
          .eq("fleet_manager_id", fleetManagerId)
          .not("status", "eq", "cancelled");
        
        const sharedCourseIds = sharedCourseLinks?.map(sc => sc.course_id) || [];
        
        let sharedCourses: any[] = [];
        if (sharedCourseIds.length > 0) {
          const { data: sharedCoursesData } = await supabase
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
            .in("id", sharedCourseIds)
            .order("scheduled_date", { ascending: false });
          
          sharedCourses = sharedCoursesData || [];
        }

        // Combiner sans doublons
        const coursesMap = new Map<string, any>();
        fleetCreatedCourses?.forEach(c => coursesMap.set(c.id, { ...c, source: 'created' }));
        sharedCourses.forEach(c => {
          if (!coursesMap.has(c.id)) {
            coursesMap.set(c.id, { ...c, source: 'shared' });
          }
        });
        
        const courses = Array.from(coursesMap.values());

        if (courses) {
          const clientUserIds = courses
            .filter(c => c.client)
            .map(c => c.client.user_id);
          const courseDriverUserIds = courses
            .filter(c => c.driver)
            .map(c => c.driver.user_id);
          const allUserIds = [...new Set([...clientUserIds, ...courseDriverUserIds])];

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

            setAllCourses(coursesWithProfiles);
          } else {
            setAllCourses(courses);
          }
        }
      } else {
        setDrivers([]);
        setAllCourses([]);
      }

      // Récupérer les courses non affectées
      const { data: unassigned } = await supabase
        .from("unassigned_fleet_courses")
        .select(`
          *,
          course:courses(
            *,
            client:clients(id, user_id)
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false });

      if (unassigned && unassigned.length > 0) {
        const clientUserIds = unassigned
          .filter(u => u.course?.client)
          .map(u => u.course.client.user_id);

        if (clientUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", clientUserIds);

          const unassignedWithProfiles = unassigned.map(u => ({
            ...u,
            course: u.course ? {
              ...u.course,
              client: u.course.client ? {
                ...u.course.client,
                profile: profiles?.find(p => p.id === u.course.client.user_id)
              } : undefined
            } : undefined
          }));

          setUnassignedCourses(unassignedWithProfiles);
        } else {
          setUnassignedCourses(unassigned);
        }
      } else {
        setUnassignedCourses([]);
      }

      // Récupérer les clients de la flotte
      const { data: fleetClients } = await supabase
        .from("fleet_manager_clients")
        .select(`
          client_id,
          client:clients(
            id,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId);

      if (fleetClients && fleetClients.length > 0) {
        const clientUserIds = fleetClients
          .filter(c => c.client)
          .map(c => c.client.user_id);

        if (clientUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", clientUserIds);

          const clientsWithProfiles = fleetClients.map(c => ({
            ...c,
            client: c.client ? {
              ...c.client,
              profile: profiles?.find(p => p.id === c.client.user_id)
            } : undefined
          }));

          setClients(clientsWithProfiles);
        } else {
          setClients(fleetClients);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
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

      fetchData();
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

  const handleForceAssign = async () => {
    if (!selectedCourseForForce || !forceDriverId) return;

    setForceAssigning(true);
    try {
      const { error: courseError } = await supabase
        .from("courses")
        .update({ 
          driver_id: forceDriverId,
          status: "accepted"
        })
        .eq("id", selectedCourseForForce.id);

      if (courseError) throw courseError;

      const unassignedEntry = unassignedCourses.find(
        u => u.course_id === selectedCourseForForce.id
      );
      if (unassignedEntry) {
        await supabase
          .from("unassigned_fleet_courses")
          .update({ resolved_at: new Date().toISOString() })
          .eq("id", unassignedEntry.id);
      }

      const driver = drivers.find(d => d.driver_id === forceDriverId);
      if (driver?.driver?.user_id) {
        await supabase.from("notifications").insert({
          user_id: driver.driver.user_id,
          title: "⚡ Course assignée manuellement",
          message: `Une course a été assignée à votre planning pour le ${format(new Date(selectedCourseForForce.scheduled_date), "d MMMM à HH:mm", { locale: fr })}`,
          type: "warning",
          link: "/fleet-driver-dashboard"
        });
      }

      toast.success("Course assignée avec succès");
      setShowForceAssignDialog(false);
      setSelectedCourseForForce(null);
      setForceDriverId("");
      fetchData();
    } catch (error: any) {
      console.error("Error force assigning:", error);
      toast.error(error.message || "Erreur lors de l'assignation");
    } finally {
      setForceAssigning(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.driverId) {
      toast.error("Veuillez sélectionner un chauffeur");
      return;
    }
    if (!newCourse.pickupAddress || !newCourse.destinationAddress) {
      toast.error("Veuillez renseigner les adresses");
      return;
    }
    if (!newCourse.scheduledDate || !newCourse.scheduledTime) {
      toast.error("Veuillez renseigner la date et l'heure");
      return;
    }
    if (!isManualClient && !newCourse.clientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }
    if (isManualClient && !newCourse.guestName) {
      toast.error("Veuillez renseigner le nom du client");
      return;
    }

    setCreating(true);
    try {
      const scheduledDate = new Date(`${newCourse.scheduledDate}T${newCourse.scheduledTime}`);
      const status = autoValidate ? "accepted" : "pending";

      const courseData: any = {
        driver_id: newCourse.driverId,
        pickup_address: newCourse.pickupAddress,
        pickup_latitude: newCourse.pickupLatitude,
        pickup_longitude: newCourse.pickupLongitude,
        destination_address: newCourse.destinationAddress,
        destination_latitude: newCourse.destinationLatitude,
        destination_longitude: newCourse.destinationLongitude,
        scheduled_date: scheduledDate.toISOString(),
        passengers_count: newCourse.passengersCount,
        notes: newCourse.notes || null,
        status,
        fleet_manager_id: fleetManagerId, // Marquer la course comme appartenant à ce gestionnaire
        guest_tracking_token: crypto.randomUUID(), // Token pour suivi invité
      };

      if (isManualClient) {
        courseData.is_guest_booking = true;
        courseData.guest_name = newCourse.guestName;
        courseData.guest_phone = newCourse.guestPhone || null;
        courseData.guest_email = newCourse.guestEmail || null;
      } else {
        const selectedClient = clients.find(c => c.client_id === newCourse.clientId);
        if (selectedClient?.client?.id) {
          courseData.client_id = selectedClient.client.id;
        }
      }

      const { error } = await supabase
        .from("courses")
        .insert(courseData);

      if (error) throw error;

      toast.success("Course créée avec succès");
      setShowCreateDialog(false);
      resetNewCourse();
      fetchData();
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const resetNewCourse = () => {
    setNewCourse({
      clientId: "",
      driverId: "",
      pickupAddress: "",
      pickupLatitude: null,
      pickupLongitude: null,
      destinationAddress: "",
      destinationLatitude: null,
      destinationLongitude: null,
      scheduledDate: "",
      scheduledTime: "",
      passengersCount: 1,
      notes: "",
      guestName: "",
      guestPhone: "",
      guestEmail: "",
    });
    setIsManualClient(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "En attente", color: "bg-warning/20 text-warning border-warning/30", icon: Clock };
      case "accepted":
        return { label: "Confirmée", color: "bg-info/20 text-info border-info/30", icon: CalendarCheck };
      case "in_progress":
        return { label: "En cours", color: "bg-primary/20 text-primary border-primary/30", icon: Route };
      case "completed":
        return { label: "Terminée", color: "bg-success/20 text-success border-success/30", icon: CheckCheck };
      case "cancelled":
        return { label: "Annulée", color: "bg-destructive/20 text-destructive border-destructive/30", icon: XOctagon };
      default:
        return { label: status, color: "bg-muted text-muted-foreground", icon: Clock };
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
      {/* Onglets principaux Courses / Dispatch */}
      <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as any)} className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Route className="w-7 h-7 text-primary" />
              Centre de Gestion des Courses
            </h2>
            <p className="text-muted-foreground mt-1">Pilotez toutes vos courses en temps réel</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="courses" className="gap-2">
                <Route className="w-4 h-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="dispatch" className="gap-2">
                <Radio className="w-4 h-4" />
                Dispatch en direct
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-gradient-to-r from-primary to-accent text-white">
              <Plus className="w-4 h-4" />
              Nouvelle course
            </Button>
          </div>
        </div>

        {/* Onglet Courses */}
        <TabsContent value="courses" className="space-y-6 mt-0">
          {/* Cartes de navigation rapide */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <NavigationCard
          title="Vue d'ensemble"
          count={allCourses.length}
          icon={LayoutGrid}
          color="from-primary/20 to-primary/5"
          iconColor="text-primary"
          active={activeSection === "overview"}
          onClick={() => setActiveSection("overview")}
        />
        <NavigationCard
          title="En attente"
          count={stats.pending}
          icon={Clock}
          color="from-warning/20 to-warning/5"
          iconColor="text-warning"
          active={activeSection === "pending"}
          onClick={() => setActiveSection("pending")}
          urgent={stats.pending > 0}
        />
        <NavigationCard
          title="Aujourd'hui"
          count={stats.today}
          icon={CalendarCheck}
          color="from-info/20 to-info/5"
          iconColor="text-info"
          active={activeSection === "today"}
          onClick={() => setActiveSection("today")}
        />
        <NavigationCard
          title="À venir"
          count={stats.upcoming}
          icon={CalendarClock}
          color="from-accent/20 to-accent/5"
          iconColor="text-accent"
          active={activeSection === "upcoming"}
          onClick={() => setActiveSection("upcoming")}
        />
        <NavigationCard
          title="Non affectées"
          count={stats.unassigned}
          icon={AlertCircle}
          color="from-destructive/20 to-destructive/5"
          iconColor="text-destructive"
          active={activeSection === "unassigned"}
          onClick={() => setActiveSection("unassigned")}
          urgent={stats.unassigned > 0}
        />
        <NavigationCard
          title="Historique"
          count={stats.completed + stats.cancelled}
          icon={FileText}
          color="from-muted to-muted/50"
          iconColor="text-muted-foreground"
          active={activeSection === "history"}
          onClick={() => setActiveSection("history")}
        />
      </div>

      {/* Section Vue d'ensemble */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          {/* Alertes urgentes */}
          {(stats.pending > 0 || stats.unassigned > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.pending > 0 && (
                <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveSection("pending")}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-warning/20 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-warning" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{stats.pending} course{stats.pending > 1 ? 's' : ''} en attente</h3>
                        <p className="text-sm text-muted-foreground">Nécessitent votre validation</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-warning" />
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.unassigned > 0 && (
                <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setActiveSection("unassigned")}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{stats.unassigned} course{stats.unassigned > 1 ? 's' : ''} non affectée{stats.unassigned > 1 ? 's' : ''}</h3>
                        <p className="text-sm text-muted-foreground">Requièrent une assignation manuelle</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Courses du jour */}
          {stats.today > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarCheck className="w-5 h-5 text-info" />
                    Courses d'aujourd'hui
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSection("today")} className="text-info">
                    Voir tout <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allCourses
                    .filter(c => isToday(new Date(c.scheduled_date)) && ["accepted", "pending", "in_progress"].includes(c.status))
                    .slice(0, 3)
                    .map(course => (
                      <CompactCourseCard 
                        key={course.id} 
                        course={course} 
                        getStatusConfig={getStatusConfig}
                        onView={() => {
                          setDetailCourse(course);
                          setShowCourseDetail(true);
                        }}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Section En attente */}
      {activeSection === "pending" && (
        <CoursesSection
          title="Courses en attente de validation"
          description="Ces courses nécessitent votre approbation"
          icon={Clock}
          iconColor="text-warning"
          courses={allCourses.filter(c => c.status === "pending")}
          emptyMessage="Aucune course en attente"
          emptyIcon={CheckCircle}
          getStatusConfig={getStatusConfig}
          showActions
          onApprove={(course) => {
            setSelectedCourse(course);
            setActionType("approve");
          }}
          onReject={(course) => {
            setSelectedCourse(course);
            setActionType("reject");
          }}
          onView={(course) => {
            setDetailCourse(course);
            setShowCourseDetail(true);
          }}
        />
      )}

      {/* Section Aujourd'hui */}
      {activeSection === "today" && (
        <CoursesSection
          title="Courses d'aujourd'hui"
          description="Toutes les courses programmées pour aujourd'hui"
          icon={CalendarCheck}
          iconColor="text-info"
          courses={allCourses.filter(c => isToday(new Date(c.scheduled_date)) && ["accepted", "pending", "in_progress"].includes(c.status))}
          emptyMessage="Aucune course aujourd'hui"
          emptyIcon={Calendar}
          getStatusConfig={getStatusConfig}
          onView={(course) => {
            setDetailCourse(course);
            setShowCourseDetail(true);
          }}
        />
      )}

      {/* Section À venir */}
      {activeSection === "upcoming" && (
        <CoursesSection
          title="Courses à venir"
          description="Courses programmées pour les prochains jours"
          icon={CalendarClock}
          iconColor="text-accent"
          courses={allCourses.filter(c => !isPast(new Date(c.scheduled_date)) && !isToday(new Date(c.scheduled_date)) && ["accepted", "pending"].includes(c.status))}
          emptyMessage="Aucune course programmée"
          emptyIcon={Calendar}
          getStatusConfig={getStatusConfig}
          onView={(course) => {
            setDetailCourse(course);
            setShowCourseDetail(true);
          }}
        />
      )}

      {/* Section Non affectées */}
      {activeSection === "unassigned" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Courses sans chauffeur
            </CardTitle>
            <CardDescription>
              Ces courses n'ont pas pu être assignées automatiquement. Assignez-les manuellement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unassignedCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-success/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <p className="text-lg font-medium">Toutes les courses sont assignées</p>
                <p className="text-muted-foreground">Excellent travail !</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unassignedCourses.map(item => (
                  <Card key={item.id} className="border-destructive/20 bg-destructive/5">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-destructive/30">
                            <AvatarImage src={item.course?.client?.profile?.profile_photo_url || ""} />
                            <AvatarFallback className="bg-destructive/20 text-destructive">
                              {(item.course?.guest_name || item.course?.client?.profile?.full_name || "C").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.course?.guest_name || item.course?.client?.profile?.full_name || "Client"}
                            </p>
                            <Badge variant="destructive" className="text-xs">
                              {item.reason === "no_available_driver" ? "Aucun chauffeur dispo" : item.reason}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 p-3 bg-background/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-sm line-clamp-1">{item.course?.pickup_address}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                            <span className="text-sm line-clamp-1">{item.course?.destination_address}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {item.course?.scheduled_date && format(new Date(item.course.scheduled_date), "d MMM HH:mm", { locale: fr })}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCourseForForce(item.course);
                              setShowForceAssignDialog(true);
                            }}
                            className="gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Assigner
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section Historique */}
      {activeSection === "history" && (
        <div className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Terminées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDriver} onValueChange={setFilterDriver}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les chauffeurs</SelectItem>
                    {drivers.map(d => (
                      <SelectItem key={d.driver_id} value={d.driver?.id || d.driver_id}>
                        {d.driver?.profile?.full_name || "Chauffeur"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <CoursesSection
            title="Historique des courses"
            description={`${filteredCourses.length} course(s) trouvée(s)`}
            icon={FileText}
            iconColor="text-muted-foreground"
            courses={filteredCourses}
            emptyMessage="Aucune course dans l'historique"
            emptyIcon={FileText}
            getStatusConfig={getStatusConfig}
            onView={(course) => {
              setDetailCourse(course);
              setShowCourseDetail(true);
            }}
          />
        </div>
      )}

      {/* Dialog création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Créer une nouvelle course
            </DialogTitle>
            <DialogDescription>
              Planifiez une course pour un client existant ou nouveau
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Type de client */}
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${!isManualClient ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => setIsManualClient(false)}
              >
                <CardContent className="pt-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Client existant</p>
                  <p className="text-xs text-muted-foreground">Sélectionner un client</p>
                </CardContent>
              </Card>
              <Card 
                className={`cursor-pointer transition-all ${isManualClient ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => setIsManualClient(true)}
              >
                <CardContent className="pt-4 text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Nouveau client</p>
                  <p className="text-xs text-muted-foreground">Saisie manuelle</p>
                </CardContent>
              </Card>
            </div>

            {!isManualClient ? (
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={newCourse.clientId}
                  onValueChange={(v) => setNewCourse({ ...newCourse, clientId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.client_id} value={c.client_id}>
                        {c.client?.profile?.full_name || "Client"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4 p-4 border border-dashed rounded-xl bg-muted/30">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Nom *
                  </Label>
                  <Input
                    value={newCourse.guestName}
                    onChange={(e) => setNewCourse({ ...newCourse, guestName: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Téléphone
                    </Label>
                    <Input
                      value={newCourse.guestPhone}
                      onChange={(e) => setNewCourse({ ...newCourse, guestPhone: e.target.value })}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </Label>
                    <Input
                      type="email"
                      value={newCourse.guestEmail}
                      onChange={(e) => setNewCourse({ ...newCourse, guestEmail: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Chauffeur *</Label>
              <Select
                value={newCourse.driverId}
                onValueChange={(v) => setNewCourse({ ...newCourse, driverId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.driver_id} value={d.driver_id}>
                      {d.driver?.profile?.full_name || "Chauffeur"} - {d.driver?.vehicle_brand} {d.driver?.vehicle_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Prise en charge *</Label>
                <AddressAutocomplete
                  value={newCourse.pickupAddress}
                  onChange={(address, coordinates) => setNewCourse({
                    ...newCourse,
                    pickupAddress: address,
                    pickupLatitude: coordinates?.latitude || null,
                    pickupLongitude: coordinates?.longitude || null,
                  })}
                  placeholder="Adresse de départ"
                />
              </div>
              <div className="space-y-2">
                <Label>Destination *</Label>
                <AddressAutocomplete
                  value={newCourse.destinationAddress}
                  onChange={(address, coordinates) => setNewCourse({
                    ...newCourse,
                    destinationAddress: address,
                    destinationLatitude: coordinates?.latitude || null,
                    destinationLongitude: coordinates?.longitude || null,
                  })}
                  placeholder="Adresse d'arrivée"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newCourse.scheduledDate}
                  onChange={(e) => setNewCourse({ ...newCourse, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure *</Label>
                <Input
                  type="time"
                  value={newCourse.scheduledTime}
                  onChange={(e) => setNewCourse({ ...newCourse, scheduledTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passagers</Label>
                <Select
                  value={newCourse.passengersCount.toString()}
                  onValueChange={(v) => setNewCourse({ ...newCourse, passengersCount: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newCourse.notes}
                onChange={(e) => setNewCourse({ ...newCourse, notes: e.target.value })}
                placeholder="Instructions particulières..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCourse} disabled={creating} className="gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer la course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation action */}
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
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog force assign */}
      <Dialog open={showForceAssignDialog} onOpenChange={(open) => {
        setShowForceAssignDialog(open);
        if (!open) {
          setSelectedCourseForForce(null);
          setForceDriverId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Assigner manuellement
            </DialogTitle>
            <DialogDescription>
              Forcez l'assignation de cette course à un chauffeur
            </DialogDescription>
          </DialogHeader>

          {selectedCourseForForce && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{selectedCourseForForce.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm">{selectedCourseForForce.destination_address}</span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedCourseForForce.scheduled_date), "EEEE d MMMM à HH:mm", { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sélectionnez un chauffeur</Label>
                <Select value={forceDriverId} onValueChange={setForceDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un chauffeur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.driver_id} value={d.driver_id}>
                        {d.driver?.profile?.full_name || "Chauffeur"} - {d.driver?.vehicle_brand} {d.driver?.vehicle_model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForceAssignDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleForceAssign} disabled={forceAssigning || !forceDriverId}>
              {forceAssigning && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog détail course */}
      <Dialog open={showCourseDetail} onOpenChange={setShowCourseDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Détail de la course
            </DialogTitle>
          </DialogHeader>

          {detailCourse && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={detailCourse.client?.profile?.profile_photo_url || ""} />
                    <AvatarFallback>
                      {(detailCourse.guest_name || detailCourse.client?.profile?.full_name || "C").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{detailCourse.guest_name || detailCourse.client?.profile?.full_name || "Client"}</p>
                    <p className="text-sm text-muted-foreground">{detailCourse.guest_name ? "Client manuel" : "Client enregistré"}</p>
                  </div>
                </div>
                <Badge className={getStatusConfig(detailCourse.status).color}>
                  {getStatusConfig(detailCourse.status).label}
                </Badge>
              </div>

              <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="text-sm">{detailCourse.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="text-sm">{detailCourse.destination_address}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{format(new Date(detailCourse.scheduled_date), "d MMM", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground">Date</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Timer className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{format(new Date(detailCourse.scheduled_date), "HH:mm", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground">Heure</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{detailCourse.passengers_count}</p>
                  <p className="text-xs text-muted-foreground">Passager(s)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Car className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{detailCourse.driver?.profile?.full_name || "Non assigné"}</p>
                  {detailCourse.driver && (
                    <p className="text-sm text-muted-foreground">{detailCourse.driver.vehicle_brand} {detailCourse.driver.vehicle_model}</p>
                  )}
                </div>
              </div>

              {detailCourse.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{detailCourse.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCourseDetail(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Onglet Dispatch en direct */}
        <TabsContent value="dispatch" className="space-y-6 mt-0">
          <FleetDispatchQueue fleetManagerId={fleetManagerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant carte de navigation
interface NavigationCardProps {
  title: string;
  count: number;
  icon: any;
  color: string;
  iconColor: string;
  active: boolean;
  onClick: () => void;
  urgent?: boolean;
}

const NavigationCard = ({ title, count, icon: Icon, color, iconColor, active, onClick, urgent }: NavigationCardProps) => (
  <Card 
    className={`cursor-pointer transition-all hover:scale-[1.02] ${active ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
    onClick={onClick}
  >
    <CardContent className={`pt-4 bg-gradient-to-br ${color} relative overflow-hidden`}>
      {urgent && count > 0 && (
        <div className="absolute top-2 right-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
        </div>
      )}
      <div className="flex flex-col items-center text-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${active ? "bg-primary text-white" : "bg-background/50"}`}>
          <Icon className={`w-5 h-5 ${active ? "text-white" : iconColor}`} />
        </div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-xs text-muted-foreground truncate w-full">{title}</p>
      </div>
    </CardContent>
  </Card>
);

// Composant section de courses
interface CoursesSectionProps {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  courses: Course[];
  emptyMessage: string;
  emptyIcon: any;
  getStatusConfig: (status: string) => { label: string; color: string; icon: any };
  showActions?: boolean;
  onApprove?: (course: Course) => void;
  onReject?: (course: Course) => void;
  onView: (course: Course) => void;
}

const CoursesSection = ({ 
  title, 
  description, 
  icon: Icon, 
  iconColor, 
  courses, 
  emptyMessage, 
  emptyIcon: EmptyIcon,
  getStatusConfig,
  showActions,
  onApprove,
  onReject,
  onView
}: CoursesSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle className={`flex items-center gap-2 ${iconColor}`}>
        <Icon className="w-5 h-5" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <EmptyIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <ModernCourseCard
              key={course.id}
              course={course}
              getStatusConfig={getStatusConfig}
              showActions={showActions}
              onApprove={onApprove ? () => onApprove(course) : undefined}
              onReject={onReject ? () => onReject(course) : undefined}
              onView={() => onView(course)}
            />
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

// Carte de course compacte
interface CompactCourseCardProps {
  course: Course;
  getStatusConfig: (status: string) => { label: string; color: string; icon: any };
  onView: () => void;
}

const CompactCourseCard = ({ course, getStatusConfig, onView }: CompactCourseCardProps) => {
  const statusConfig = getStatusConfig(course.status);
  const StatusIcon = statusConfig.icon;
  
  return (
    <Card className="hover:shadow-md transition-all cursor-pointer" onClick={onView}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={course.client?.profile?.profile_photo_url || ""} />
              <AvatarFallback className="text-xs">
                {(course.guest_name || course.client?.profile?.full_name || "C").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{course.guest_name || course.client?.profile?.full_name || "Client"}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(course.scheduled_date), "HH:mm", { locale: fr })}</p>
            </div>
          </div>
          <Badge className={`text-xs ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <span className="text-xs line-clamp-1">{course.pickup_address}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
            <span className="text-xs line-clamp-1">{course.destination_address}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Carte de course moderne
interface ModernCourseCardProps {
  course: Course;
  getStatusConfig: (status: string) => { label: string; color: string; icon: any };
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onView: () => void;
}

const ModernCourseCard = ({ course, getStatusConfig, showActions, onApprove, onReject, onView }: ModernCourseCardProps) => {
  const statusConfig = getStatusConfig(course.status);
  const StatusIcon = statusConfig.icon;
  const clientName = course.guest_name || course.client?.profile?.full_name || "Client";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all group">
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-border group-hover:border-primary/50 transition-colors">
                <AvatarImage src={course.client?.profile?.profile_photo_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                  {clientName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{clientName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(course.scheduled_date), "d MMM à HH:mm", { locale: fr })}
                </div>
              </div>
            </div>
            <Badge className={`${statusConfig.color} shrink-0`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Itinéraire */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm line-clamp-1">{course.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-destructive" />
              </div>
              <span className="text-sm line-clamp-1">{course.destination_address}</span>
            </div>
          </div>

          {/* Info chauffeur */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Car className="w-4 h-4" />
            <span className="truncate">{course.driver?.profile?.full_name || "Non assigné"}</span>
            <span className="text-muted-foreground/50">•</span>
            <Users className="w-4 h-4" />
            <span>{course.passengers_count}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <Button variant="ghost" size="sm" className="flex-1" onClick={onView}>
              <Eye className="w-4 h-4 mr-1" />
              Détails
            </Button>
            {showActions && (
              <>
                <Button size="sm" className="bg-success hover:bg-success/90" onClick={onApprove}>
                  <CheckCircle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={onReject}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
