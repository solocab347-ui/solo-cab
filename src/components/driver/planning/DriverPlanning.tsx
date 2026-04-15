import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  X,
  Euro,
  Phone,
  Navigation,
  Route,
  ExternalLink,
  Info,
  MessageSquare,
  Handshake,
  AlertTriangle
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCourseType, getCourseTypeFilters, CourseType, CourseTypeInfo } from "@/lib/courseTypeUtils";
import { CourseTypeBadge, CourseTypeIndicator } from "@/components/driver/courses/CourseTypeBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DriverPlanningProps {
  driverId: string;
}

type ViewMode = "day" | "week" | "month";
type CourseStatus = "pending" | "accepted" | "driver_approaching" | "driver_arrived" | "in_progress" | "completed" | "cancelled" | "expired";

interface EnrichedCourse {
  id: string;
  scheduled_date: string;
  status: CourseStatus;
  pickup_address: string;
  destination_address: string;
  distance_km: number | null;
  duration_minutes: number | null;
  passengers_count: number;
  notes: string | null;
  course_number: string | null;
  driver_id: string | null;
  driver_ids: string[] | null;
  clients?: {
    user_id: string;
    is_exclusive: boolean;
    profiles?: {
      full_name: string;
      phone: string | null;
      profile_photo_url: string | null;
    };
  };
  devis?: Array<{
    id: string;
    amount: number;
    status: string;
    quote_number: string | null;
  }>;
  shared_courses?: any[];
  company_courses?: any[];
  courseType?: CourseTypeInfo;
  // New fields for received shared courses
  isReceivedSharedCourse?: boolean;
  sharedCourseId?: string;
  senderDriverName?: string;
  senderDriverPhoto?: string | null;
  senderSharingNumber?: number | null;
  commissionPercentage?: number;
  commissionAmount?: number;
  courseAmount?: number;
  // Fleet course specific fields
  isFleetCourse?: boolean;
  fleetPartnerCourseId?: string;
  earningsForDriver?: number;
  is_out_of_schedule?: boolean;
  out_of_schedule_action?: string | null;
}

const DriverPlanning = ({ driverId }: DriverPlanningProps) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<EnrichedCourse | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CourseType | "all">("all");

  const fetchCourses = useCallback(async () => {
    try {
      console.log('Planning - Fetching courses for driver:', driverId);
      
      // Fetch courses with basic relations
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          clients(
            user_id,
            is_exclusive,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          devis(
            id,
            amount,
            status,
            quote_number
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("scheduled_date", { ascending: true });

      if (coursesError) throw coursesError;

      // ALSO fetch received shared courses (courses shared TO this driver by other drivers)
      const { data: receivedSharedCourses } = await supabase
        .from('shared_courses')
        .select(`
          id,
          course_id,
          sender_driver_id,
          course_amount,
          commission_percentage,
          commission_amount,
          status,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            duration_minutes,
            status,
            course_number,
            notes,
            clients(
              user_id,
              is_exclusive,
              profiles:user_id(full_name, phone, profile_photo_url)
            )
          )
        `)
        .eq('receiver_driver_id', driverId)
        .in('status', ['accepted', 'in_progress']);

      // ALSO fetch fleet shared courses (courses shared TO this driver by fleet managers)
      const { data: fleetSharedCourses } = await supabase
        .from('fleet_partner_courses')
        .select(`
          id,
          course_id,
          fleet_manager_id,
          course_amount,
          commission_percentage,
          commission_amount,
          earnings_for_driver,
          equipment_type,
          status,
          courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            passengers_count,
            distance_km,
            duration_minutes,
            status,
            course_number,
            notes
          ),
          fleet_managers!inner(
            id,
            company_name,
            logo_url
          )
        `)
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'in_progress']);

      // Collect sender driver IDs for profiles
      const senderDriverIds = new Set<string>();
      receivedSharedCourses?.forEach(sc => senderDriverIds.add(sc.sender_driver_id));

      let senderProfiles: Record<string, { name: string; photo: string | null; sharing_number: number | null }> = {};
      if (senderDriverIds.size > 0) {
        const { data: senderDrivers } = await supabase
          .from("drivers")
          .select("id, user_id, card_photo_url, sharing_number, profiles:user_id(full_name, profile_photo_url)")
          .in("id", Array.from(senderDriverIds));
        
        senderDrivers?.forEach((d: any) => {
          senderProfiles[d.id] = {
            name: d.profiles?.full_name || 'Partenaire',
            photo: d.card_photo_url || d.profiles?.profile_photo_url,
            sharing_number: d.sharing_number
          };
        });
      }

      // Convert received shared courses to EnrichedCourse format
      const receivedCoursesEnriched: EnrichedCourse[] = (receivedSharedCourses || []).map(sc => {
        const course = sc.courses as any;
        const sender = senderProfiles[sc.sender_driver_id] || { name: 'Partenaire', photo: null, sharing_number: null };
        
        // Map shared_courses status to CourseStatus
        let mappedStatus: CourseStatus = 'accepted';
        if (sc.status === 'in_progress') mappedStatus = 'in_progress';
        
        return {
          id: course.id,
          scheduled_date: course.scheduled_date,
          status: mappedStatus,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          distance_km: course.distance_km,
          duration_minutes: course.duration_minutes,
          passengers_count: course.passengers_count,
          notes: course.notes,
          course_number: course.course_number,
          driver_id: null,
          driver_ids: null,
          clients: course.clients,
          devis: [],
          shared_courses: [],
          company_courses: [],
          courseType: {
            type: 'partner' as CourseType,
            label: 'Course partenaire reçue',
            shortLabel: 'Partenaire',
            icon: 'handshake',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30',
            partnerName: sender.name,
            partnerType: 'Reçue'
          },
          isReceivedSharedCourse: true,
          sharedCourseId: sc.id,
          senderDriverName: sender.name,
          senderDriverPhoto: sender.photo,
          senderSharingNumber: sender.sharing_number,
          commissionPercentage: sc.commission_percentage,
          commissionAmount: sc.commission_amount,
          courseAmount: sc.course_amount
        };
      });

      // Convert fleet shared courses to EnrichedCourse format
      const fleetCoursesEnriched: EnrichedCourse[] = (fleetSharedCourses || []).map(fsc => {
        const course = fsc.courses as any;
        const fleetManager = fsc.fleet_managers as any;
        
        // Map fleet_partner_courses status to CourseStatus
        let mappedStatus: CourseStatus = 'accepted';
        if (fsc.status === 'in_progress') mappedStatus = 'in_progress';
        
        return {
          id: course.id,
          scheduled_date: course.scheduled_date,
          status: mappedStatus,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          distance_km: course.distance_km,
          duration_minutes: course.duration_minutes,
          passengers_count: course.passengers_count,
          notes: course.notes,
          course_number: course.course_number,
          driver_id: null,
          driver_ids: null,
          clients: null,
          devis: [],
          shared_courses: [],
          company_courses: [],
          courseType: {
            type: 'fleet' as CourseType,
            label: 'Course gestionnaire',
            shortLabel: 'Gestionnaire',
            icon: 'building2',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            partnerName: fleetManager?.company_name || 'Gestionnaire',
            partnerType: 'Flotte'
          },
          isReceivedSharedCourse: true,
          isFleetCourse: true,
          fleetPartnerCourseId: fsc.id,
          senderDriverName: fleetManager?.company_name || 'Gestionnaire',
          senderDriverPhoto: fleetManager?.logo_url,
          commissionPercentage: fsc.commission_percentage,
          commissionAmount: fsc.commission_amount,
          courseAmount: fsc.course_amount,
          earningsForDriver: fsc.earnings_for_driver
        };
      });

      // Process own courses if any
      let enrichedOwnCourses: EnrichedCourse[] = [];
      
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map(c => c.id);

        // Fetch shared courses - simplified query
        const { data: sharedData } = await supabase
          .from("shared_courses")
          .select("id, course_id, sender_driver_id, receiver_driver_id, status")
          .in("course_id", courseIds);

        // Get sender/receiver driver names separately
        const driverIds = new Set<string>();
        sharedData?.forEach(sc => {
          driverIds.add(sc.sender_driver_id);
          driverIds.add(sc.receiver_driver_id);
        });
        
        let driverProfiles: Record<string, string> = {};
        if (driverIds.size > 0) {
          const { data: drivers } = await supabase
            .from("drivers")
            .select("id, user_id, profiles:user_id(full_name)")
            .in("id", Array.from(driverIds));
          
          drivers?.forEach((d: any) => {
            driverProfiles[d.id] = d.profiles?.full_name || 'Chauffeur';
          });
        }

        // Fetch company courses
        const { data: companyData } = await supabase
          .from("company_courses")
          .select("id, course_id, company_id")
          .in("course_id", courseIds);

        // Get company names
        const companyIds = [...new Set(companyData?.map(cc => cc.company_id) || [])];
        let companyNames: Record<string, string> = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, company_name")
            .in("id", companyIds);
          
          companies?.forEach(c => {
            companyNames[c.id] = c.company_name;
          });
        }

        // Fetch fleet driver partnerships
        const { data: fleetData } = await supabase
          .from("fleet_driver_partnerships")
          .select("id, fleet_manager_id, driver_id, status")
          .eq("driver_id", driverId)
          .eq("status", "active");

        // Get fleet manager names
        const fleetManagerIds = [...new Set(fleetData?.map(f => f.fleet_manager_id) || [])];
        let fleetManagerNames: Record<string, string> = {};
        if (fleetManagerIds.length > 0) {
          const { data: fleetManagers } = await supabase
            .from("fleet_managers")
            .select("id, company_name")
            .in("id", fleetManagerIds);
          
          fleetManagers?.forEach(fm => {
            fleetManagerNames[fm.id] = fm.company_name;
          });
        }

        // Enrich courses with type info
        enrichedOwnCourses = coursesData.map(course => {
          const courseSharedData = sharedData?.filter(sc => sc.course_id === course.id) || [];
          const courseCompanyData = companyData?.filter(cc => cc.course_id === course.id) || [];
          
          // Enrich shared courses with driver names
          const enrichedSharedCourses = courseSharedData.map(sc => ({
            ...sc,
            sender_driver: { profiles: { full_name: driverProfiles[sc.sender_driver_id] || 'Chauffeur' } },
            receiver_driver: { profiles: { full_name: driverProfiles[sc.receiver_driver_id] || 'Chauffeur' } }
          }));

          // Enrich company courses with company names
          const enrichedCompanyCourses = courseCompanyData.map(cc => ({
            ...cc,
            company: { company_name: companyNames[cc.company_id] || 'Entreprise' }
          }));

          // Check if this is a fleet course (driver has active fleet partnership and course was created by fleet)
          const activeFleetPartnership = fleetData?.[0];
          const isFleetCourse = activeFleetPartnership && course.driver_ids?.includes(driverId);

          const courseType = getCourseType(
            { ...course, shared_courses: enrichedSharedCourses, company_courses: enrichedCompanyCourses },
            driverId,
            {
              sharedCourses: enrichedSharedCourses,
              companyCourses: enrichedCompanyCourses,
              fleetDriverInfo: isFleetCourse && activeFleetPartnership ? {
                fleet_manager_id: activeFleetPartnership.fleet_manager_id,
                fleet_name: fleetManagerNames[activeFleetPartnership.fleet_manager_id]
              } : undefined
            }
          );

          return {
            ...course,
            shared_courses: enrichedSharedCourses,
            company_courses: enrichedCompanyCourses,
            courseType,
            isReceivedSharedCourse: false
          };
        });
      }
      
      // Merge own courses with received shared courses AND fleet courses
      // Avoid duplicates by filtering out own courses that are in receivedCoursesEnriched or fleetCoursesEnriched
      const receivedCourseIds = new Set(receivedCoursesEnriched.map(c => c.id));
      const fleetCourseIds = new Set(fleetCoursesEnriched.map(c => c.id));
      const filteredOwnCourses = enrichedOwnCourses.filter(c => 
        !receivedCourseIds.has(c.id) && !fleetCourseIds.has(c.id)
      );
      
      const allCourses = [...filteredOwnCourses, ...receivedCoursesEnriched, ...fleetCoursesEnriched];
      
      console.log('Planning - Fetched courses:', allCourses.length, '(own:', filteredOwnCourses.length, ', partner:', receivedCoursesEnriched.length, ', fleet:', fleetCoursesEnriched.length, ')');
      setCourses(allCourses);
    } catch (error: any) {
      console.error("Planning - Error:", error);
      toast.error("Erreur lors du chargement du planning");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const cleanup = subscriptionManager.subscribe(
      `planning-driver-${driverId}`,
      { table: 'courses', event: '*', debounceMs: 500 },
      (payload) => {
        const course = payload.new as any || payload.old as any;
        if (course) {
          const concernsDriver = 
            course.driver_id === driverId || 
            (course.driver_ids && Array.isArray(course.driver_ids) && course.driver_ids.includes(driverId));
          if (concernsDriver) {
            fetchCourses();
          }
        }
      }
    );

    return cleanup;
  }, [driverId, fetchCourses]);

  // Auto-navigate to first upcoming course
  useEffect(() => {
    if (courses.length > 0 && !loading) {
      const now = new Date();
      const upcomingCourses = courses
        .filter(c => parseISO(c.scheduled_date) >= now && c.status !== 'cancelled' && c.status !== 'completed')
        .sort((a, b) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime());
      
      if (upcomingCourses.length > 0) {
        setCurrentDate(parseISO(upcomingCourses[0].scheduled_date));
      }
    }
  }, [courses.length, loading]);

  const getDateRange = () => {
    switch (viewMode) {
      case "day":
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case "week":
        return { start: startOfWeek(currentDate, { locale: fr }), end: endOfWeek(currentDate, { locale: fr }) };
      case "month":
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const filteredCourses = useMemo(() => {
    const { start, end } = getDateRange();
    
    return courses.filter(course => {
      const courseDate = parseISO(course.scheduled_date);
      const inDateRange = courseDate >= start && courseDate <= end;
      
      const matchesSearch = !searchQuery || 
        course.clients?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.destination_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesType = typeFilter === "all" || course.courseType?.type === typeFilter;
      
      return inDateRange && matchesSearch && matchesStatus && matchesType;
    });
  }, [courses, currentDate, viewMode, searchQuery, statusFilter, typeFilter]);

  const navigatePeriod = (direction: "prev" | "next") => {
    switch (viewMode) {
      case "day":
        setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const getStatusConfig = (status: CourseStatus) => {
    const config = {
      pending: { label: "En attente", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", dotColor: "bg-yellow-500" },
      accepted: { label: "Confirmée", className: "bg-blue-500/10 text-blue-600 border-blue-500/20", dotColor: "bg-blue-500" },
      in_progress: { label: "En cours", className: "bg-purple-500/10 text-purple-600 border-purple-500/20", dotColor: "bg-purple-500" },
      completed: { label: "Terminée", className: "bg-green-500/10 text-green-600 border-green-500/20", dotColor: "bg-green-500" },
      cancelled: { label: "Annulée", className: "bg-red-500/10 text-red-600 border-red-500/20", dotColor: "bg-red-500" },
    };
    return config[status] || config.pending;
  };

  const getStatusBadge = (status: CourseStatus) => {
    const { label, className } = getStatusConfig(status);
    return <Badge variant="outline" className={cn("text-xs", className)}>{label}</Badge>;
  };

  const getPeriodLabel = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
      case "week":
        const weekStart = startOfWeek(currentDate, { locale: fr });
        const weekEnd = endOfWeek(currentDate, { locale: fr });
        return `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: fr });
    }
  };

  const groupCoursesByDay = () => {
    const grouped = new Map<string, EnrichedCourse[]>();
    filteredCourses.forEach(course => {
      const dateKey = format(parseISO(course.scheduled_date), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(course);
    });
    // Sort courses within each day by time
    grouped.forEach((dayCourses, key) => {
      grouped.set(key, dayCourses.sort((a, b) => 
        parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime()
      ));
    });
    return grouped;
  };

  const goToCourse = (courseId: string) => {
    // Navigate to courses tab with the course selected
    navigate(`/driver-dashboard?tab=courses&course=${courseId}`);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
    }
    return `${mins}min`;
  };

  const isUpcoming = (date: string) => {
    const courseDate = parseISO(date);
    const now = new Date();
    return courseDate > now && differenceInMinutes(courseDate, now) <= 60;
  };

  // Compact Course Card for week/month view
  const CompactCourseCard = ({ course }: { course: EnrichedCourse }) => {
    const statusConfig = getStatusConfig(course.status);
    const upcoming = isUpcoming(course.scheduled_date);
    
    return (
      <div
        onClick={() => setSelectedCourse(course)}
        className={cn(
          "relative flex items-stretch rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md border",
          "bg-card/80 backdrop-blur-sm",
          upcoming && "ring-2 ring-primary animate-pulse",
          course.courseType?.borderColor || "border-border/50"
        )}
      >
        {/* Type indicator bar */}
        <CourseTypeIndicator type={course.courseType?.type || 'personal'} className="w-1.5 min-h-full" />
        
        <div className="flex-1 p-2 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-sm text-foreground">
                {format(parseISO(course.scheduled_date), "HH:mm")}
              </span>
            </div>
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusConfig.dotColor)} />
          </div>
          
          <div className="text-xs text-muted-foreground truncate mb-1">
            {course.clients?.profiles?.full_name || "Client"}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {course.is_out_of_schedule && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-600 bg-amber-500/10">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                Hors planning
              </Badge>
            )}
            {course.courseType && (
              <CourseTypeBadge 
                typeInfo={course.courseType} 
                showLabel={false}
                size="sm"
              />
            )}
            {course.devis?.[0] && (
              <span className="text-xs font-semibold text-primary">
                {course.devis[0].amount.toFixed(2)}€
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Full Course Card for day view
  const FullCourseCard = ({ course }: { course: EnrichedCourse }) => {
    const statusConfig = getStatusConfig(course.status);
    const upcoming = isUpcoming(course.scheduled_date);
    
    return (
      <Card 
        onClick={() => setSelectedCourse(course)}
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg",
          "bg-card/80 backdrop-blur-sm",
          upcoming && "ring-2 ring-primary",
          course.courseType?.borderColor || "border-border/50"
        )}
      >
        {/* Top colored bar based on type */}
        <div className={cn("h-1 w-full", course.courseType?.type === 'personal' ? 'bg-primary' : 
          course.courseType?.type === 'partner' ? 'bg-purple-500' :
          course.courseType?.type === 'company' ? 'bg-blue-500' : 'bg-amber-500'
        )} />
        
        <div className="p-4">
          {/* Header with time, status, and type */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-bold text-lg text-foreground">
                {format(parseISO(course.scheduled_date), "HH:mm")}
              </span>
              {upcoming && (
                <Badge variant="secondary" className="text-xs animate-pulse bg-primary/20 text-primary">
                  Bientôt
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {course.is_out_of_schedule && (
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/10 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Hors planning
                </Badge>
              )}
              {course.courseType && (
                <CourseTypeBadge 
                  typeInfo={course.courseType} 
                  showLabel={true}
                  showPartnerName={true}
                  size="sm"
                />
              )}
              {getStatusBadge(course.status)}
            </div>
          </div>

          {/* Partner info for received shared courses */}
          {course.isReceivedSharedCourse && (
            <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                <AvatarImage src={course.senderDriverPhoto || undefined} />
                <AvatarFallback className="bg-purple-500/20 text-purple-600">
                  {course.senderDriverName?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <Handshake className="w-3 h-3" />
                  <span>Course partenaire de</span>
                </div>
                <div className="font-medium text-foreground truncate">
                  {course.senderDriverName || 'Partenaire'}
                </div>
                {course.senderSharingNumber && (
                  <div className="text-xs text-muted-foreground font-mono">
                    SOLO-{String(course.senderSharingNumber).padStart(6, '0')}
                  </div>
                )}
              </div>
              {course.courseAmount && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Vous gardez</div>
                  <div className="font-bold text-green-600 text-sm">
                    {((course.courseAmount || 0) - (course.commissionAmount || 0)).toFixed(2)}€
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client info */}
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-muted/30">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {course.clients?.profiles?.full_name || "Client"}
              </div>
              {course.clients?.profiles?.phone && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {course.clients.profiles.phone}
                </div>
              )}
            </div>
            {course.passengers_count > 1 && (
              <Badge variant="outline" className="text-xs">
                {course.passengers_count} pass.
              </Badge>
            )}
          </div>

          {/* Addresses */}
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Départ</div>
                <div className="text-sm text-foreground truncate">{course.pickup_address}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Arrivée</div>
                <div className="text-sm text-foreground truncate">{course.destination_address}</div>
              </div>
            </div>
          </div>

          {/* Course details */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-border/50">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {course.distance_km && (
                <div className="flex items-center gap-1">
                  <Route className="w-4 h-4" />
                  <span>{course.distance_km} km</span>
                </div>
              )}
              {course.duration_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(course.duration_minutes)}</span>
                </div>
              )}
            </div>
            {course.isReceivedSharedCourse && course.courseAmount ? (
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">
                  {((course.courseAmount || 0) - (course.commissionAmount || 0)).toFixed(2)}€
                </span>
                <span className="text-xs text-muted-foreground">
                  (-{course.commissionPercentage}%)
                </span>
              </div>
            ) : course.devis?.[0] && (
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-primary" />
                <span className="text-lg font-bold text-primary">
                  {course.devis[0].amount.toFixed(2)}€
                </span>
              </div>
            )}
          </div>

          {/* Notes indicator */}
          {course.notes && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                <span className="truncate">{course.notes}</span>
              </div>
            </div>
          )}

          {/* Course number */}
          {course.course_number && (
            <div className="mt-2 text-xs text-muted-foreground">
              N° {course.course_number}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderDayView = () => {
    const dayCourses = filteredCourses.sort((a, b) => 
      parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime()
    );

    if (dayCourses.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucune course prévue ce jour</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {dayCourses.map(course => (
          <FullCourseCard key={course.id} course={course} />
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const grouped = groupCoursesByDay();
    const weekStart = startOfWeek(currentDate, { locale: fr });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-2">
        {/* Mobile: Scrollable horizontal list */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
          {days.map(day => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayCourses = grouped.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={dateKey}
                className={cn(
                  "flex-shrink-0 w-[140px] snap-start border rounded-lg overflow-hidden bg-card/30 backdrop-blur-sm",
                  isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-center py-1.5 border-b",
                  isToday ? "bg-primary/10 border-primary/20" : "bg-muted/30 border-border/50"
                )}>
                  <div className={cn(
                    "text-[10px] font-medium uppercase",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE", { locale: fr })}
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  {dayCourses.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] mt-0.5 px-1.5 py-0">
                      {dayCourses.length}
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[150px] p-1.5">
                  <div className="space-y-1.5">
                    {dayCourses.map(course => (
                      <CompactCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>

        {/* Desktop: 7-column grid */}
        <div className="hidden md:grid md:grid-cols-7 gap-3">
          {days.map(day => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayCourses = grouped.get(dateKey) || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={dateKey}
                className={cn(
                  "border rounded-lg overflow-hidden min-h-[200px] bg-card/30 backdrop-blur-sm",
                  isToday && "border-primary/50 bg-primary/5"
                )}
              >
                <div className={cn(
                  "text-center py-2 border-b",
                  isToday ? "bg-primary/10 border-primary/20" : "bg-muted/30 border-border/50"
                )}>
                  <div className={cn(
                    "text-xs font-medium uppercase",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE", { locale: fr })}
                  </div>
                  <div className={cn(
                    "text-xl font-bold",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                  {dayCourses.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {dayCourses.length} course{dayCourses.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[200px] p-2">
                  <div className="space-y-2">
                    {dayCourses.map(course => (
                      <CompactCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const grouped = groupCoursesByDay();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: fr });
    const endDate = endOfWeek(monthEnd, { locale: fr });
    
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayCourses = grouped.get(dateKey) || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              onClick={() => {
                if (dayCourses.length > 0) {
                  setCurrentDate(day);
                  setViewMode("day");
                }
              }}
              className={cn(
                "border rounded-lg p-1 md:p-2 min-h-[60px] md:min-h-[80px] transition-colors",
                !isCurrentMonth && "opacity-40 bg-muted/20",
                isCurrentMonth && "bg-card/30 backdrop-blur-sm",
                isToday && "border-primary/50 bg-primary/5",
                dayCourses.length > 0 && "cursor-pointer hover:bg-accent/50"
              )}
            >
              <div className={cn(
                "text-xs md:text-sm font-medium mb-1",
                isToday ? "text-primary font-bold" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              {dayCourses.length > 0 && (
                <div className="space-y-0.5">
                  {dayCourses.slice(0, 3).map(course => (
                    <div
                      key={course.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourse(course);
                      }}
                      className={cn(
                        "w-full rounded text-[9px] md:text-[10px] px-1 py-0.5 flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                        course.courseType?.bgColor || "bg-primary/10",
                        course.courseType?.color || "text-primary"
                      )}
                    >
                      <span className="font-medium">
                        {format(parseISO(course.scheduled_date), "HH:mm")}
                      </span>
                      <span className="hidden md:inline truncate flex-1">
                        {course.clients?.profiles?.full_name?.split(' ')[0] || ''}
                      </span>
                    </div>
                  ))}
                  {dayCourses.length > 3 && (
                    <div className="text-[9px] md:text-[10px] text-muted-foreground text-center">
                      +{dayCourses.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const courseTypeFilters = getCourseTypeFilters();

  return (
    <div className="space-y-4">
      {/* Header with navigation and filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod("prev")}
              className="h-9 w-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-base md:text-lg font-semibold text-foreground capitalize">
              {getPeriodLabel()}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod("next")}
              className="h-9 w-9"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs"
            >
              Aujourd'hui
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4 space-y-3 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Filtres avancés</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher client, adresse, n° course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Type filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type de course</label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as CourseType | "all")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseTypeFilters.map(filter => (
                      <SelectItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Statut</label>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "accepted", "in_progress", "completed", "cancelled"] as const).map(status => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="text-xs"
                    >
                      {status === "all" ? "Tous" :
                       status === "accepted" ? "Confirmées" :
                       status === "in_progress" ? "En cours" :
                       status === "completed" ? "Terminées" :
                       "Annulées"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Planning stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: filteredCourses.length, color: "text-foreground" },
          { label: "Confirmées", value: filteredCourses.filter(c => c.status === 'accepted').length, color: "text-blue-600" },
          { label: "En cours", value: filteredCourses.filter(c => c.status === 'in_progress').length, color: "text-purple-600" },
          { label: "Terminées", value: filteredCourses.filter(c => c.status === 'completed').length, color: "text-green-600" }
        ].map((stat, i) => (
          <Card key={i} className="p-2 text-center bg-card/50">
            <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Planning content */}
      <div>
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* Course detail dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Détails de la course
              {selectedCourse?.course_number && (
                <Badge variant="outline" className="text-xs ml-2">
                  N° {selectedCourse.course_number}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              {/* Course type and status */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                {selectedCourse.courseType && (
                  <CourseTypeBadge 
                    typeInfo={selectedCourse.courseType} 
                    showLabel={true}
                    showPartnerName={true}
                    size="md"
                  />
                )}
                {getStatusBadge(selectedCourse.status)}
              </div>

              {/* Date and time */}
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">
                      {format(parseISO(selectedCourse.scheduled_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {format(parseISO(selectedCourse.scheduled_date), "HH:mm")}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Client */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Client</div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {selectedCourse.clients?.profiles?.full_name || "Client"}
                    </div>
                    {selectedCourse.clients?.profiles?.phone && (
                      <a 
                        href={`tel:${selectedCourse.clients.profiles.phone}`}
                        className="text-sm text-primary flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedCourse.clients.profiles.phone}
                      </a>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedCourse.passengers_count} pass.
                  </Badge>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Trajet</div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-green-600 font-medium">Départ</div>
                      <div className="text-sm text-foreground">{selectedCourse.pickup_address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-red-600 font-medium">Arrivée</div>
                      <div className="text-sm text-foreground">{selectedCourse.destination_address}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course details */}
              <div className="grid grid-cols-2 gap-3">
                {selectedCourse.distance_km && (
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <Route className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <div className="font-semibold text-foreground">{selectedCourse.distance_km} km</div>
                    <div className="text-xs text-muted-foreground">Distance</div>
                  </div>
                )}
                {selectedCourse.duration_minutes && (
                  <div className="p-3 rounded-lg bg-muted/30 text-center">
                    <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <div className="font-semibold text-foreground">{formatDuration(selectedCourse.duration_minutes)}</div>
                    <div className="text-xs text-muted-foreground">Durée estimée</div>
                  </div>
                )}
              </div>

              {/* Price */}
              {selectedCourse.devis?.[0] && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Montant</div>
                      {selectedCourse.devis[0].quote_number && (
                        <div className="text-xs text-muted-foreground">
                          Devis {selectedCourse.devis[0].quote_number}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {selectedCourse.devis[0].amount.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedCourse.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    Notes
                  </div>
                  <div className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                    {selectedCourse.notes}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedCourse(null)}
              className="flex-1"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                if (selectedCourse) {
                  goToCourse(selectedCourse.id);
                  setSelectedCourse(null);
                }
              }}
              className="flex-1 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Voir la course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverPlanning;
