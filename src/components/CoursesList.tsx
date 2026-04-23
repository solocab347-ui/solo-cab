import { useEffect, useState, useMemo, useCallback, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { checkDriverStripeStatus } from "@/hooks/useDriverStripeStatus";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Calendar, Users, CheckCircle, XCircle, Clock, FileText, Play, StopCircle, Download, Share2, MessageCircle, Mail, Filter, X, AlertTriangle, Navigation, Handshake, Building2, Truck, User, Phone, Loader2 } from "lucide-react";
import { CourseNavigationButtons } from "@/components/course/CourseNavigationButtons";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import CourseShareButtons from "@/components/CourseShareButtons";
import CourseReportDialog from "@/components/CourseReportDialog";
import { ShareCourseWithPartnerDialog } from "@/components/driver/sharing/ShareCourseWithPartnerDialog";
import { CourseCompletionCommissionDialog } from "@/components/driver/courses/CourseCompletionCommissionDialog";
import { CourseShareStatusIndicator } from "@/components/driver/sharing/CourseShareStatusIndicator";
import { cn } from "@/lib/utils";
import { usePaginatedData } from "@/hooks/usePaginatedQuery";
import Pagination from "@/components/Pagination";
import { notificationService } from "@/lib/notificationService";
import { CourseType, CourseTypeInfo, getCourseType, getCourseTypeFilters, COURSE_TYPE_CONFIG } from "@/lib/courseTypeUtils";
import { CourseTypeBadge, CourseTypeIndicator } from "@/components/driver/courses/CourseTypeBadge";
import { PaymentMethodBadge } from "@/components/shared/CoursePaymentMethodSelector";
import { SharedCoursesInCoursesList } from "@/components/driver/sharing/SharedCoursesInCoursesList";
import { CompletedPartnerCoursesList } from "@/components/driver/sharing/CompletedPartnerCoursesList";
import { PendingCompanyQuotesInCoursesList } from "@/components/driver/company/PendingCompanyQuotesInCoursesList";
import { PendingFleetCoursesInCoursesList } from "@/components/driver/company/PendingFleetCoursesInCoursesList";
import { PendingPartnerCoursesInCoursesList } from "@/components/driver/sharing/PendingPartnerCoursesInCoursesList";
import { CourseClientContact } from "@/components/driver/courses/CourseClientContact";
import { CompanyCourseIndicator } from "@/components/driver/company/CompanyCourseIndicator";
import { FleetCourseIndicator } from "@/components/driver/company/FleetCourseIndicator";
import { ReturnToFleetManagerDialog } from "@/components/driver/company/ReturnToFleetManagerDialog";
import { CompanyPaymentStatusSelector } from "@/components/driver/company/CompanyPaymentStatusSelector";
import { CoursePaymentDialogContent } from "@/components/driver/courses/CoursePaymentDialogContent";
import { CancellationDialog } from "@/components/driver/courses/CancellationDialog";
import { buildDriverFilter } from "@/lib/driverQueryUtils";
import { CoursesFilters, type CoursesFiltersState } from "@/components/driver/courses/CoursesFilters";
import { applyAllFilters as applyFilters, sortByDate, sortConfirmedWithInProgressFirst, getClientDisplayName as getClientName, getClientPhone as getClientPhoneUtil, getLatestDevis as getLatestDevisUtil } from "@/lib/coursesFilterUtils";

interface CoursesListProps {
  driverId: string;
}

const isDriver = true; // Assuming this is driver dashboard

// État de chargement pour les boutons d'action
type ActionState = 'idle' | 'loading';

const CoursesList = ({ driverId }: CoursesListProps) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [companyPaymentStatus, setCompanyPaymentStatus] = useState<string>("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [courseToReject, setCourseToReject] = useState<string | null>(null);
  
  // État pour l'annulation des courses en attente (devis non accepté)
  const [cancelPendingDialogOpen, setCancelPendingDialogOpen] = useState(false);
  const [pendingCancellationReason, setPendingCancellationReason] = useState<string>("");
  const [customPendingReason, setCustomPendingReason] = useState<string>("");
  const [courseToCancelPending, setCourseToCancelPending] = useState<string | null>(null);
  
  // États pour les filtres avancés
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [courseTypeFilter, setCourseTypeFilter] = useState<CourseType | "all">("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination par onglet pour performance mobile
  const COURSES_PER_PAGE = 10;
  const [pendingPage, setPendingPage] = useState(1);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  
  // État pour les informations de type de course
  const [sharedCoursesData, setSharedCoursesData] = useState<any[]>([]);
  const [companyCoursesData, setCompanyCoursesData] = useState<any[]>([]);
  
  // État pour le compteur de courses partagées reçues (acceptées/en cours)
  const [receivedSharedCoursesCount, setReceivedSharedCoursesCount] = useState(0);
  // État pour le compteur de courses partagées terminées (sender side + receiver side)
  const [completedPartnerCoursesCount, setCompletedPartnerCoursesCount] = useState(0);
  // État pour le compteur de devis entreprise en attente
  const [pendingCompanyQuotesCount, setPendingCompanyQuotesCount] = useState(0);
  // État pour le compteur de courses flotte en attente
  const [pendingFleetCoursesCount, setPendingFleetCoursesCount] = useState(0);
  // État pour le compteur de courses partenaires en attente
  const [pendingPartnerCoursesCount, setPendingPartnerCoursesCount] = useState(0);
  const [fleetDriverInfo, setFleetDriverInfo] = useState<any>(null);
  
  // État pour le signalement
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [courseToReport, setCourseToReport] = useState<any>(null);
  
  // État pour le partage avec partenaire
  const [sharePartnerDialogOpen, setSharePartnerDialogOpen] = useState(false);
  const [courseToShareWithPartner, setCourseToShareWithPartner] = useState<any>(null);
  
  // État pour le renvoi au gestionnaire
  const [returnToFleetDialogOpen, setReturnToFleetDialogOpen] = useState(false);
  const [courseToReturnToFleet, setCourseToReturnToFleet] = useState<any>(null);
  
  // État pour le rappel de commission après complétion
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [completedCourseInfo, setCompletedCourseInfo] = useState<{
    courseId: string;
    courseAmount: number;
    pickupAddress: string;
    destinationAddress: string;
    scheduledDate: string;
  } | null>(null);
  
  // SYSTÈME DE FIGEMENT: Capture l'ordre initial des courses pour maintenir leur position
  const [confirmedCoursesOrder, setConfirmedCoursesOrder] = useState<Map<string, number>>(new Map());
  
  // OPTIMISATION RÉACTIVITÉ: État de chargement par course pour feedback visuel immédiat
  const [actionInProgress, setActionInProgress] = useState<Map<string, ActionState>>(new Map());
  const [isPending, startTransition] = useTransition();
  
  // Helpers pour gérer l'état de chargement par course
  const setActionLoading = useCallback((courseId: string, loading: boolean) => {
    setActionInProgress(prev => {
      const next = new Map(prev);
      if (loading) {
        next.set(courseId, 'loading');
      } else {
        next.delete(courseId);
      }
      return next;
    });
  }, []);
  
  const isActionLoading = useCallback((courseId: string) => {
    return actionInProgress.get(courseId) === 'loading';
  }, [actionInProgress]);

  useEffect(() => {
    fetchCourses();
    // Désactivation de la souscription temps réel pour éviter que les courses bougent automatiquement
    // setupRealtimeSubscription();
  }, [driverId]);

  // SYSTÈME DE FIGEMENT: Capture l'ordre initial quand les courses changent
  useEffect(() => {
    const confirmed = courses.filter(c => c.status === "accepted" || c.status === "in_progress");
    const sorted = [...confirmed].sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
    
    const newOrder = new Map<string, number>();
    sorted.forEach((course, index) => {
      // Si la course n'a pas encore d'ordre assigné, on lui donne son index actuel
      if (!confirmedCoursesOrder.has(course.id)) {
        newOrder.set(course.id, index);
      } else {
        // Sinon on garde son ordre existant
        newOrder.set(course.id, confirmedCoursesOrder.get(course.id)!);
      }
    });
    
    setConfirmedCoursesOrder(newOrder);
  }, [courses.length]); // Seulement quand le nombre de courses change (ajout/suppression)

  const fetchCourses = async () => {
    try {
      // Lancer les requêtes principales en parallèle pour réduire la latence
      const [driverResult, initialCoursesResult] = await Promise.all([
        // Fetch driver info for PDF generation
        supabase
          .from("drivers")
          .select(`
            *,
            profiles:user_id(full_name, phone),
            fleet_manager_id
          `)
          .eq("id", driverId)
          .single(),
        (async () => {
          const dateWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const driverFilter = buildDriverFilter(driverId);

          const coursesSelectWithRelations = `
            *,
            clients(
              user_id,
              is_exclusive,
              profiles:user_id(full_name, phone, profile_photo_url)
            ),
            fleet_managers:fleet_manager_id(
              id,
              company_name,
              logo_url,
              contact_phone
            ),
            devis:devis(
              id,
              amount,
              status,
              quote_number,
              valid_until,
              base_price,
              distance_price,
              time_price,
              evening_surcharge_amount,
              weekend_surcharge_amount,
              discount_amount,
              promo_code,
              created_at
            ),
            factures:factures(
              id,
              invoice_number,
              invoice_number_generated,
              amount,
              payment_status,
              payment_method,
              paid_at,
              discount_amount,
              promo_code,
              created_at
            )
          `;

          const coursesSelectFallback = `
            *,
            fleet_managers:fleet_manager_id(
              id,
              company_name,
              logo_url,
              contact_phone
            ),
            devis:devis(
              id,
              amount,
              status,
              quote_number,
              valid_until,
              base_price,
              distance_price,
              time_price,
              evening_surcharge_amount,
              weekend_surcharge_amount,
              discount_amount,
              promo_code,
              created_at
            ),
            factures:factures(
              id,
              invoice_number,
              invoice_number_generated,
              amount,
              payment_status,
              payment_method,
              paid_at,
              discount_amount,
              promo_code,
              created_at
            )
          `;

          const runCoursesQuery = async (options: { withRelations: boolean; withDateWindow: boolean }) => {
            const select = options.withRelations ? coursesSelectWithRelations : coursesSelectFallback;

            let query = supabase
              .from("courses")
              .select(select)
              .or(driverFilter)
              .order("scheduled_date", { ascending: true })
              .limit(200);

            if (options.withDateWindow) {
              query = query.gte("scheduled_date", dateWindowStart);
            }

            return query;
          };

          // 1) Requête complète, fenêtre 30 jours
          let result = await runCoursesQuery({ withRelations: true, withDateWindow: true });

          // 2) Repli sécurisé si jointures clients/profiles bloquées
          if (result.error) {
            console.warn("[CoursesList] Primary query failed, retrying with secure fallback", {
              message: result.error.message,
            });
            result = await runCoursesQuery({ withRelations: false, withDateWindow: true });
          }

          // 3) Si vide sur 30 jours, élargir pour inclure les données démo/historiques
          if (!result.error && (!result.data || result.data.length === 0)) {
            const expanded = await runCoursesQuery({ withRelations: true, withDateWindow: false });
            if (expanded.error) {
              console.warn("[CoursesList] Expanded query with relations failed, using secure fallback", {
                message: expanded.error.message,
              });
              result = await runCoursesQuery({ withRelations: false, withDateWindow: false });
            } else {
              result = expanded;
            }
          }

          return result;
        })()
      ]);

      const driverData = driverResult.data;
      const coursesData = (initialCoursesResult.data ?? []) as any[];
      const error = initialCoursesResult.error;

      if (error) throw error;
      
      // Mettre à jour les courses IMMÉDIATEMENT pour réduire la latence perçue
      setCourses(coursesData || []);
      setDriverInfo(driverData);
      setLoading(false); // Afficher les courses plus tôt

      // Fetch fleet info si le chauffeur appartient à une flotte (en arrière-plan)
      if (driverData?.fleet_manager_id) {
        supabase
          .from("fleet_managers")
          .select("id, company_name")
          .eq("id", driverData.fleet_manager_id)
          .single()
          .then(({ data: fleetData }) => {
            if (fleetData) {
              setFleetDriverInfo({
                fleet_manager_id: fleetData.id,
                fleet_name: fleetData.company_name
              });
            }
          });
      }

      // Fetch les données supplémentaires en parallèle (en arrière-plan)
      const courseIds = (coursesData || []).map((c: any) => c?.id).filter((id): id is string => typeof id === "string");
      const chunkBy = <T,>(items: T[], size: number): T[][] => {
        if (items.length === 0) return [];
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
          chunks.push(items.slice(i, i + size));
        }
        return chunks;
      };

      if (courseIds.length > 0) {
        const COURSE_ID_CHUNK_SIZE = 60;
        const courseIdChunks = chunkBy(courseIds, COURSE_ID_CHUNK_SIZE);

        const [sharedChunksResults, companyChunksResults, requestsChunksResults, receivedCountResult, completedCountResult] = await Promise.all([
          Promise.all(
            courseIdChunks.map((chunk) =>
              supabase
                .from("shared_courses")
                .select(`
                  course_id,
                  sender_driver_id,
                  receiver_driver_id,
                  status,
                  receiver:drivers!shared_courses_receiver_driver_id_fkey(
                    id,
                    company_name,
                    card_photo_url,
                    profiles(full_name, profile_photo_url)
                  )
                `)
                .in("course_id", chunk)
            )
          ),
          Promise.all(
            courseIdChunks.map((chunk) =>
              supabase
                .from("company_courses")
                .select(`
                  course_id,
                  company_id,
                  employee_id,
                  company:companies(
                    id,
                    company_name,
                    logo_url,
                    siret,
                    siren,
                    tva_number,
                    address,
                    billing_address,
                    contact_email,
                    contact_phone
                  )
                `)
                .in("course_id", chunk)
            )
          ),
          Promise.all(
            courseIdChunks.map((chunk) =>
              supabase
                .from("company_course_requests")
                .select(`
                  final_course_id,
                  guest_employee_name,
                  guest_employee_phone,
                  is_guest_employee,
                  employee_id
                `)
                .in("final_course_id", chunk)
            )
          ),
          supabase
            .from("shared_courses")
            .select("*", { count: "exact", head: true })
            .eq("receiver_driver_id", driverId)
            .in("status", ["accepted", "in_progress"]),
          supabase
            .from("partner_order_documents")
            .select("*", { count: "exact", head: true })
            .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        ]);

        const sharedErrors = sharedChunksResults.filter((result) => result.error);
        const companyErrors = companyChunksResults.filter((result) => result.error);
        const requestErrors = requestsChunksResults.filter((result) => result.error);

        if (sharedErrors.length > 0 || companyErrors.length > 0 || requestErrors.length > 0) {
          console.warn("Some secondary course queries failed", {
            sharedErrors: sharedErrors.map((r) => r.error?.message),
            companyErrors: companyErrors.map((r) => r.error?.message),
            requestErrors: requestErrors.map((r) => r.error?.message),
          });
        }

        const sharedData = sharedChunksResults.flatMap((result) => result.data || []);
        const companyData = companyChunksResults.flatMap((result) => result.data || []);
        const requestsData = requestsChunksResults.flatMap((result) => result.data || []);

        setSharedCoursesData(sharedData);
        setReceivedSharedCoursesCount(receivedCountResult.count || 0);
        setCompletedPartnerCoursesCount(completedCountResult.count || 0);
        
        // Collecter tous les employee_ids pour récupérer leurs profils
        const employeeIdsFromRequests = requestsData?.filter(r => r.employee_id && !r.is_guest_employee).map(r => r.employee_id) || [];
        const employeeIdsFromCompanyCourses = companyData?.filter(cc => cc.employee_id).map(cc => cc.employee_id) || [];
        const allEmployeeIds = [...new Set([...employeeIdsFromRequests, ...employeeIdsFromCompanyCourses])];
        
        // Fetch employee profiles en parallèle si nécessaire
        let employeeProfilesMap: Record<string, { name: string; phone: string | null }> = {};
        
        if (allEmployeeIds.length > 0) {
          const employeePromises = allEmployeeIds.map(async (empId) => {
            const { data } = await supabase.rpc('get_employee_profile_for_course', { 
              p_employee_id: empId 
            });
            if (data && data.length > 0) {
              return { 
                id: empId, 
                name: data[0].full_name || '', 
                phone: data[0].phone || null 
              };
            }
            return null;
          });
          
          const employeeResults = await Promise.all(employeePromises);
          employeeResults.forEach(result => {
            if (result) {
              employeeProfilesMap[result.id] = { 
                name: result.name, 
                phone: result.phone 
              };
            }
          });
        }
        
        // Fetch profiles for created_by_user_id
        const createdByUserIds = coursesData
          ?.filter(c => c.created_by_user_id && companyData?.some(cc => cc.course_id === c.id))
          .map(c => c.created_by_user_id)
          .filter(Boolean) || [];
        
        let createdByProfiles: Record<string, { name: string; phone?: string }> = {};
        
        if (createdByUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", createdByUserIds);
          
          if (profiles) {
            profiles.forEach(p => {
              createdByProfiles[p.id] = { name: p.full_name || '', phone: p.phone || undefined };
            });
          }
        }
        
        // Merge company data with employee info
        const enrichedCompanyData = companyData?.map(cc => {
          const request = requestsData?.find(r => r.final_course_id === cc.course_id);
          const course = coursesData?.find(c => c.id === cc.course_id);
          let employeeName: string | null = null;
          let employeePhone: string | null = null;
          
          if (request) {
            if (request.is_guest_employee) {
              employeeName = request.guest_employee_name;
              employeePhone = request.guest_employee_phone;
            } else if (request.employee_id && employeeProfilesMap[request.employee_id]) {
              employeeName = employeeProfilesMap[request.employee_id].name;
              employeePhone = employeeProfilesMap[request.employee_id].phone;
            }
          }
          
          if (!employeeName && cc.employee_id && employeeProfilesMap[cc.employee_id]) {
            employeeName = employeeProfilesMap[cc.employee_id].name;
            employeePhone = employeeProfilesMap[cc.employee_id].phone;
          }
          
          if (!employeeName && course?.created_by_user_id && createdByProfiles[course.created_by_user_id]) {
            employeeName = createdByProfiles[course.created_by_user_id].name;
            employeePhone = createdByProfiles[course.created_by_user_id].phone || null;
          }
          
          return { ...cc, employeeName, employeePhone };
        }) || [];
        
        setCompanyCoursesData(enrichedCompanyData);
      } else {
        // Pas de courses - mettre à jour les compteurs quand même
        const [receivedCountResult, completedCountResult] = await Promise.all([
          supabase
            .from("shared_courses")
            .select("*", { count: "exact", head: true })
            .eq("receiver_driver_id", driverId)
            .in("status", ["accepted", "in_progress"]),
          supabase
            .from("partner_order_documents")
            .select("*", { count: "exact", head: true })
            .or(`sender_driver_id.eq.${driverId},receiver_driver_id.eq.${driverId}`)
        ]);
        setReceivedSharedCoursesCount(receivedCountResult.count || 0);
        setCompletedPartnerCoursesCount(completedCountResult.count || 0);
      }
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des courses");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get course type info
  const getCourseTypeInfo = useMemo(() => {
    return (course: any): CourseTypeInfo => {
      const sharedCourse = sharedCoursesData.find(sc => sc.course_id === course.id);
      const companyCourse = companyCoursesData.find(cc => cc.course_id === course.id);
      
      // Priorité: Si la course a un fleet_manager_id avec des données, c'est une course flotte
      const courseFleetInfo = course.fleet_managers ? {
        fleet_manager_id: course.fleet_managers.id,
        fleet_name: course.fleet_managers.company_name,
        fleet_logo: course.fleet_managers.logo_url,
        fleet_phone: course.fleet_managers.contact_phone
      } : null;
      
      return getCourseType(course, driverId, {
        sharedCourses: sharedCourse ? [sharedCourse] : [],
        companyCourses: companyCourse ? [companyCourse] : [],
        fleetDriverInfo: courseFleetInfo || fleetDriverInfo
      });
    };
  }, [sharedCoursesData, companyCoursesData, fleetDriverInfo, driverId]);

  // Helper pour récupérer les infos entreprise complètes d'une course (pour facturation)
  const getCompanyCourseInfo = (courseId: string): { 
    companyId: string;
    companyName: string; 
    logoUrl?: string | null; 
    siret?: string | null;
    siren?: string | null;
    tvaNumber?: string | null;
    address?: string | null;
    billingAddress?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    employeeName?: string | null;
    employeePhone?: string | null;
  } | null => {
    const companyCourse = companyCoursesData.find(cc => cc.course_id === courseId);
    if (!companyCourse?.company) return null;
    return {
      companyId: companyCourse.company.id,
      companyName: companyCourse.company.company_name,
      logoUrl: companyCourse.company.logo_url,
      siret: companyCourse.company.siret,
      siren: companyCourse.company.siren,
      tvaNumber: companyCourse.company.tva_number,
      address: companyCourse.company.address,
      billingAddress: companyCourse.company.billing_address,
      contactEmail: companyCourse.company.contact_email,
      contactPhone: companyCourse.company.contact_phone,
      employeeName: companyCourse.employeeName,
      employeePhone: companyCourse.employeePhone
    };
  };

  // Helper pour récupérer les infos du gestionnaire de flotte d'une course
  const getFleetCourseInfo = (course: any): {
    fleetManagerName: string;
    fleetManagerLogo?: string | null;
    fleetManagerPhone?: string | null;
    clientName?: string | null;
    clientPhone?: string | null;
  } | null => {
    if (!course.fleet_managers) return null;
    return {
      fleetManagerName: course.fleet_managers.company_name,
      fleetManagerLogo: course.fleet_managers.logo_url,
      fleetManagerPhone: course.fleet_managers.contact_phone,
      clientName: course.clients?.profiles?.full_name,
      clientPhone: course.clients?.profiles?.phone
    };
  }

  // Helper to check if course is being handled by a partner (sender can't act on it)
  const isCourseHandledByPartner = (courseId: string): boolean => {
    const sharedCourse = sharedCoursesData.find(sc => 
      sc.course_id === courseId && 
      sc.sender_driver_id === driverId &&
      ['accepted', 'in_progress', 'completed'].includes(sc.status)
    );
    return !!sharedCourse;
  };

  // Helper to check if course has a pending share request (sender can't start but can cancel share)
  const hasCoursePendingShare = (courseId: string): boolean => {
    const pendingShare = sharedCoursesData.find(sc => 
      sc.course_id === courseId && 
      sc.sender_driver_id === driverId &&
      sc.status === 'pending'
    );
    return !!pendingShare;
  };

  // Combined check: course is locked if it has pending OR active share
  const isCourseShareLocked = (courseId: string): 'pending' | 'active' | null => {
    const share = sharedCoursesData.find(sc => 
      sc.course_id === courseId && 
      sc.sender_driver_id === driverId
    );
    if (!share) return null;
    if (share.status === 'pending') return 'pending';
    if (['accepted', 'in_progress', 'completed'].includes(share.status)) return 'active';
    return null;
  };

  // Helper to get partner info for a shared course
  const getSharePartnerInfo = (courseId: string): { name: string; photo: string | null; company: string | null } | null => {
    const share = sharedCoursesData.find(sc => 
      sc.course_id === courseId && 
      sc.sender_driver_id === driverId &&
      ['pending', 'accepted', 'in_progress'].includes(sc.status)
    );
    if (!share || !share.receiver) return null;
    
    const receiver = share.receiver;
    const fullName = receiver.profiles?.full_name || receiver.company_name || 'Partenaire';
    const photo = receiver.profiles?.profile_photo_url || receiver.card_photo_url || null;
    const company = receiver.company_name;
    
    return { name: fullName, photo, company };
  };

  const setupRealtimeSubscription = () => {
    if (!driverId) return () => {};

    return subscriptionManager.subscribe(
      `courses-driver-${driverId}`,
      {
        table: "courses",
        event: "*",
        filter: `driver_id=eq.${driverId}`,
        debounceMs: 1000
      },
      () => {
        fetchCourses();
      }
    );
  };

  // Helper pour notifier l'entreprise liée à une course
  const notifyCompanyForCourse = async (courseId: string, action: 'accepted' | 'started' | 'completed' | 'cancelled', amount?: number) => {
    try {
      // Récupérer les infos de la course et de l'entreprise
      const companyCourse = companyCoursesData.find(cc => cc.course_id === courseId);
      if (!companyCourse?.company_id) return;

      const { data: companyData } = await supabase
        .from("companies")
        .select("user_id")
        .eq("id", companyCourse.company_id)
        .single();

      if (!companyData?.user_id) return;

      const course = courses.find(c => c.id === courseId);
      const courseDate = course?.scheduled_date 
        ? format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })
        : '';
      const clientName = course?.clients?.profiles?.full_name || 'Collaborateur';
      const driverName = driverInfo?.profiles?.full_name || driverInfo?.company_name || 'Votre chauffeur';

      switch (action) {
        case 'accepted':
          await notificationService.notifyCompanyCourseAccepted(companyData.user_id, driverName, courseDate);
          break;
        case 'completed':
          await notificationService.notifyCompanyCourseCompleted(companyData.user_id, clientName, amount || 0);
          break;
        case 'cancelled':
          await notificationService.notifyCompanyCourseCancelled(companyData.user_id, clientName, courseDate);
          break;
      }
    } catch (error) {
      console.error("Error notifying company:", error);
    }
  };

  const handleAcceptCourse = useCallback(async (courseId: string) => {
    if (isActionLoading(courseId)) return;
    setActionLoading(courseId, true);
    
    try {
      // Mise à jour optimiste IMMÉDIATE - feedback visuel instantané
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "accepted" as const } : c
      ));

      // Exécution en background sans bloquer l'UI
      const { error } = await supabase
        .from("courses")
        .update({ status: "accepted" })
        .eq("id", courseId);

      if (error) throw error;

      // Pour les guest bookings, accepter aussi le devis associé
      const course = courses.find(c => c.id === courseId);
      if (course?.is_guest_booking) {
        await supabase
          .from("devis")
          .update({ status: "accepted" })
          .eq("course_id", courseId)
          .eq("status", "pending");
      }

      if (error) throw error;

      // Notifier l'entreprise en background (ne bloque pas)
      notifyCompanyForCourse(courseId, 'accepted').catch(console.error);

      // Check schedule conflict in background
      if (course?.driver_id) {
        supabase.functions.invoke('check-schedule-conflict', {
          body: { course_id: courseId, driver_id: course.driver_id }
        }).catch(console.error);
      }

      toast.success("Course confirmée !");
      
      // Refresh en background avec transition pour éviter le freeze
      startTransition(() => {
        fetchCourses();
      });
    } catch (error: any) {
      console.error("Error accepting course:", error);
      toast.error("Erreur lors de la confirmation de la course");
      // Revert en cas d'erreur
      fetchCourses();
    } finally {
      setActionLoading(courseId, false);
    }
  }, [isActionLoading, setActionLoading, notifyCompanyForCourse, courses]);

  const handleStartCourse = useCallback(async (courseId: string) => {
    if (isActionLoading(courseId)) return;
    setActionLoading(courseId, true);
    
    try {
      // 🔒 SÉCURITÉ: Vérifier l'empreinte bancaire avant de démarrer
      const courseToStart = courses.find(c => c.id === courseId);
      if (courseToStart) {
        const courseData = courseToStart as any;
        // Check if driver uses Stripe Connect
        const driverHasStripe = await checkDriverStripeStatus(courseData.driver_id);
        
        // If driver uses Stripe and the client chose card, ensure payment is secured
        const requiresCardAuthorization = driverHasStripe && (
          courseData.payment_method === 'stripe' ||
          courseData.payment_method_requested === 'card'
        );

        if (requiresCardAuthorization) {
          const hasValidPayment = courseData.payment_status === 'bank_imprint_captured' || 
            courseData.payment_status === 'paid' ||
            courseData.card_hold_status === 'confirmed' ||
            courseData.stripe_payment_intent_id ||
            courseData.stripe_hold_payment_intent_id;
          
          if (!hasValidPayment) {
            toast.error("⚠️ Impossible de démarrer : aucun blocage carte valide n'existe pour cette course. Le client doit d'abord confirmer son paiement.");
            setActionLoading(courseId, false);
            return;
          }
        }
      }

      // Mise à jour optimiste IMMÉDIATE
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "in_progress" as const } : c
      ));

      const { error } = await supabase
        .from("courses")
        .update({ status: "in_progress", course_started_at: new Date().toISOString() })
        .eq("id", courseId);

      if (error) throw error;

      toast.success("Course démarrée !");
    } catch (error: any) {
      console.error("Error starting course:", error);
      toast.error("Erreur lors du démarrage de la course");
      // Revert sans re-fetch pour garder la position
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, status: "accepted" as const } : c
      ));
    } finally {
      setActionLoading(courseId, false);
    }
  }, [isActionLoading, setActionLoading, courses]);

  const handleEndCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    // Réinitialiser les états
    setPaymentMethod("");
    setCompanyPaymentStatus("");
    setShowPaymentDialog(true);
  };

  // Vérifier si la course sélectionnée est une course entreprise
  const isSelectedCourseCompany = useMemo(() => {
    if (!selectedCourseId) return false;
    return companyCoursesData.some(cc => cc.course_id === selectedCourseId);
  }, [selectedCourseId, companyCoursesData]);

  const selectedCourseCompanyName = useMemo(() => {
    if (!selectedCourseId) return "";
    const companyCourse = companyCoursesData.find(cc => cc.course_id === selectedCourseId);
    return companyCourse?.company?.company_name || "";
  }, [selectedCourseId, companyCoursesData]);

  // Vérifier si la course sélectionnée a une invitation (guest employee)
  const selectedCourseHasInvitation = useMemo(() => {
    if (!selectedCourseId) return false;
    // Une course a une invitation si elle a un employeeName via company_course_requests
    const companyCourse = companyCoursesData.find(cc => cc.course_id === selectedCourseId);
    return !!(companyCourse?.employeeName);
  }, [selectedCourseId, companyCoursesData]);

  // Récupérer les infos détaillées de la course sélectionnée pour le paiement Stripe
  const selectedCourseDetails = useMemo(() => {
    if (!selectedCourseId) return null;
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;
    
    const acceptedDevis = course.devis?.find((d: any) => d.status === 'accepted');
    const amount = acceptedDevis?.amount || course.final_payment_amount || course.guest_estimated_price || 0;
    
    return {
      id: course.id,
      amount,
      depositPaid: course.deposit_status === 'paid' ? (course.deposit_amount || 0) : 0,
      depositStatus: course.deposit_status,
      clientEmail: course.clients?.profiles?.email,
      clientName: course.clients?.profiles?.full_name,
      guestName: course.guest_name,
      isGuestBooking: course.is_guest_booking,
    };
  }, [selectedCourseId, courses]);

  const handleCompleteCourse = async () => {
    if (!selectedCourseId || !paymentMethod) {
      toast.error("Veuillez sélectionner un moyen de paiement");
      return;
    }

    // Pour les courses entreprise, vérifier le statut de paiement
    if (isSelectedCourseCompany && !companyPaymentStatus) {
      toast.error("Veuillez indiquer si le paiement a été reçu ou est en attente");
      return;
    }

    // Récupérer les infos de la course AVANT de la compléter
    const courseToComplete = courses.find(c => c.id === selectedCourseId);
    const courseAmount = courseToComplete?.devis?.find((d: any) => d.status === 'accepted')?.amount || 
                         courseToComplete?.devis?.[0]?.amount || 0;

    try {
      // Optimistic update - keep course in place
      setCourses(prev => prev.map(c => 
        c.id === selectedCourseId ? { ...c, status: "completed" as const } : c
      ));

      // Préparer les données de mise à jour
      const updateData: any = { status: "completed" };
      
      // Pour les courses entreprise, enregistrer le statut de paiement
      if (isSelectedCourseCompany) {
        const isPaidOnSpot = companyPaymentStatus === "received";
        updateData.company_payment_status = isPaidOnSpot ? "paid_on_spot" : "company_will_pay";
        updateData.driver_declared_payment_received = isPaidOnSpot;
        updateData.driver_declared_payment_at = new Date().toISOString();
      }

      // Update course status to completed
      const { error: courseError } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", selectedCourseId);

      if (courseError) throw courseError;

      // Mettre à jour company_courses si c'est une course entreprise
      if (isSelectedCourseCompany) {
        const isPaidOnSpot = companyPaymentStatus === "received";
        await supabase
          .from("company_courses")
          .update({
            actual_payment_method: isPaidOnSpot ? "employee_paid_spot" : "company_deferred",
            payment_declared_at: new Date().toISOString(),
            payment_declared_by: "driver"
          })
          .eq("course_id", selectedCourseId);
      }

      // First, get the course to find the most recent devis
      const { data: courseData } = await supabase
        .from("courses")
        .select("*, devis(*), clients(user_id)")
        .eq("id", selectedCourseId)
        .single();

      // Accept the most recent devis if not already accepted
      if (courseData?.devis && courseData.devis.length > 0) {
        const mostRecentDevis = courseData.devis.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        if (mostRecentDevis.status !== "accepted") {
          await supabase
            .from("devis")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", mostRecentDevis.id);
        }
      }

      // Generate facture automatically avec retry
      let factureData = null;
      let factureCreated = false;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`[handleCompleteCourse] Tentative création facture ${attempt + 1}/3`);
          const { data, error: factureError } = await supabase.functions.invoke("create-facture-auto", {
            body: {
              course_id: selectedCourseId,
              payment_method: paymentMethod
            }
          });

          if (factureError) {
            console.error(`[handleCompleteCourse] Erreur tentative ${attempt + 1}:`, factureError);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            throw factureError;
          }
          
          factureData = data;
          factureCreated = true;
          console.log("[handleCompleteCourse] Facture créée:", data?.facture?.id);
          break;
        } catch (err: any) {
          console.error(`[handleCompleteCourse] Exception tentative ${attempt + 1}:`, err);
          if (attempt >= 2) {
            // Après 3 tentatives, on continue quand même (course complétée mais facture manquante)
            console.error("[handleCompleteCourse] Échec création facture après 3 tentatives");
            toast.warning("Course terminée mais facture non générée. Contactez le support.");
          }
        }
      }

      // Si paiement reçu sur place pour course entreprise, marquer la facture comme payée ET créer note de frais
      if (isSelectedCourseCompany && companyPaymentStatus === "received") {
        await supabase
          .from("factures")
          .update({ 
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("course_id", selectedCourseId);

        // Créer automatiquement une note de frais pour l'employé (double confirmation)
        // Le chauffeur déclare avoir reçu le paiement = 1ère confirmation
        // L'employé devra ensuite confirmer = 2ème confirmation
        const { data: companyCourseData } = await supabase
          .from("company_courses")
          .select("company_id, employee_id")
          .eq("course_id", selectedCourseId)
          .maybeSingle();
        
        if (companyCourseData?.employee_id && companyCourseData?.company_id) {
          // Créer note de frais automatiquement
          const { error: expenseError } = await supabase
            .from("expense_reports")
            .insert({
              company_id: companyCourseData.company_id,
              employee_id: companyCourseData.employee_id,
              course_id: selectedCourseId,
              amount: courseAmount,
              description: `Course VTC - ${courseToComplete?.pickup_address?.split(",")[0] || 'Départ'} → ${courseToComplete?.destination_address?.split(",")[0] || 'Arrivée'}`,
              payment_method: paymentMethod || "card",
              status: "pending", // En attente de confirmation de l'employé + validation admin
              submitted_at: new Date().toISOString(),
            } as any);

          if (expenseError) {
            console.error("Error creating expense report:", expenseError);
          } else {
            console.log("[CoursesList] Expense report created automatically for employee:", companyCourseData.employee_id);
          }
        }
      }

      // ═══ STRIPE CONNECT: déclencher le paiement automatique si le chauffeur utilise Stripe ═══
      if (paymentMethod === "stripe" || paymentMethod === "card_online") {
        try {
          console.log("[handleCompleteCourse] Tentative finalisation paiement Stripe...");
          const { data: stripeResult, error: stripeError } = await supabase.functions.invoke("finalize-course-payment", {
            body: { course_id: selectedCourseId }
          });

          if (stripeError) {
            console.error("[handleCompleteCourse] Erreur Stripe:", stripeError);
            toast.warning("Course terminée mais le paiement Stripe nécessite une action manuelle.");
          } else if (stripeResult?.status === "requires_action") {
            toast.info("Le paiement nécessite une authentification 3D Secure du client.");
          } else if (stripeResult?.success) {
            console.log("[handleCompleteCourse] Paiement Stripe encaissé:", stripeResult);
            toast.success(`Paiement de ${stripeResult.amount_charged?.toFixed(2)}€ encaissé avec succès.`);
          }
        } catch (stripeErr: any) {
          console.error("[handleCompleteCourse] Exception Stripe:", stripeErr);
          // La course est terminée, le paiement pourra être relancé manuellement
          toast.warning("Course terminée. Le paiement Stripe pourra être relancé manuellement.");
        }
      }

      // Note: Les notifications sont gérées par les triggers de base de données (unified_notify_course_status_change)

      // Notifier l'entreprise si la course est liée à une entreprise
      await notifyCompanyForCourse(selectedCourseId, 'completed', courseAmount);

      // Fermer le dialog de paiement
      setShowPaymentDialog(false);
      setPaymentMethod("");
      setCompanyPaymentStatus("");

      // Refetch courses to get the new facture data
      await fetchCourses();

      // AFFICHER LE RAPPEL DE COMMISSION
      if (courseToComplete) {
        setCompletedCourseInfo({
          courseId: selectedCourseId,
          courseAmount: courseAmount,
          pickupAddress: courseToComplete.pickup_address,
          destinationAddress: courseToComplete.destination_address,
          scheduledDate: courseToComplete.scheduled_date,
        });
        setShowCommissionDialog(true);
      } else {
        toast.success("Course terminée ! Facture générée automatiquement.");
      }
      
    } catch (error: any) {
      console.error("Error completing course:", error);
      toast.error("Erreur lors de la finalisation: " + error.message);
      // Revert on error
      await fetchCourses();
    }
  };

  const handleCancelCourse = (courseId: string) => {
    setCourseToReject(courseId);
    setRejectDialogOpen(true);
  };

  const handleRejectCourse = async () => {
    if (!courseToReject) return;

    const finalReason = rejectionReason === "custom" ? customReason : rejectionReason;
    
    if (!finalReason) {
      toast.error("Veuillez sélectionner ou saisir un motif");
      return;
    }

    try {
      // Récupérer les infos du client pour la notification
      const course = courses.find(c => c.id === courseToReject);

      // Optimistic update - keep course in place
      setCourses(prev => prev.map(c => 
        c.id === courseToReject 
          ? { 
              ...c, 
              status: "cancelled" as const,
              notes: `\n\nMotif de refus: ${finalReason}${c.notes || ''}`
            } 
          : c
      ));

      const { error } = await supabase
        .from("courses")
        .update({ 
          status: "cancelled",
          cancelled_by: "driver",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: finalReason,
          notes: `\n\nMotif de refus: ${finalReason}${courses.find(c => c.id === courseToReject)?.notes || ''}`
        })
        .eq("id", courseToReject);

      if (error) throw error;

      // Note: Les notifications sont gérées par les triggers de base de données (unified_notify_course_status_change)

      // Notifier l'entreprise si la course est liée à une entreprise
      await notifyCompanyForCourse(courseToReject, 'cancelled');

      toast.success("Course annulée");
      setRejectDialogOpen(false);
      setRejectionReason("");
      setCustomReason("");
      setCourseToReject(null);
      
      // Ne PAS recharger pour garder la course à sa place
      // fetchCourses();
    } catch (error: any) {
      console.error("Error rejecting course:", error);
      toast.error("Erreur lors de l'annulation");
      // Revert on error
      await fetchCourses();
    }
  };

  // Fonction pour annuler une course en attente (devis non accepté)
  const handleCancelPendingCourse = (courseId: string) => {
    setCourseToCancelPending(courseId);
    setCancelPendingDialogOpen(true);
  };

  const handleConfirmCancelPendingCourse = async () => {
    if (!courseToCancelPending) return;

    const finalReason = pendingCancellationReason === "custom" ? customPendingReason : pendingCancellationReason;
    
    if (!finalReason) {
      toast.error("Veuillez sélectionner ou saisir un motif d'annulation");
      return;
    }

    try {
      const course = courses.find(c => c.id === courseToCancelPending);

      // Optimistic update
      setCourses(prev => prev.map(c => 
        c.id === courseToCancelPending 
          ? { 
              ...c, 
              status: "cancelled" as const,
              notes: `\n\nAnnulé par le chauffeur - ${finalReason}${c.notes || ''}`
            } 
          : c
      ));

      // Annuler la course
      const { error: courseError } = await supabase
        .from("courses")
        .update({ 
          status: "cancelled",
          cancelled_by: "driver",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: finalReason,
          notes: `\n\nAnnulé par le chauffeur - ${finalReason}${course?.notes || ''}`
        })
        .eq("id", courseToCancelPending);

      if (courseError) throw courseError;

      // Annuler le devis associé
      const { error: devisError } = await supabase
        .from("devis")
        .update({ status: "rejected" })
        .eq("course_id", courseToCancelPending);

      if (devisError) {
        console.error("Error cancelling devis:", devisError);
      }

      // Notifier le client si c'est une course client
      if (course?.clients?.user_id && driverInfo) {
        const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || 'Votre chauffeur';
        await supabase.from('notifications').insert({
          user_id: course.clients.user_id,
          title: '❌ Course annulée',
          message: `${driverName} a annulé votre demande de course. Motif: ${finalReason}`,
          type: 'warning',
          link: '/client-dashboard',
        });
      }

      toast.success("Course annulée avec succès");
      setCancelPendingDialogOpen(false);
      setPendingCancellationReason("");
      setCustomPendingReason("");
      setCourseToCancelPending(null);
    } catch (error: any) {
      console.error("Error cancelling pending course:", error);
      toast.error("Erreur lors de l'annulation de la course");
      await fetchCourses();
    }
  };

  const handleShareDevis = (course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const devis = course.devis?.[0];
    if (!devis) {
      toast.error("Aucun devis disponible");
      return;
    }
    
    // Récupérer le nom du client (enregistré ou invité)
    const shareClientName = course.is_guest_booking || !course.clients?.profiles?.full_name
      ? (course.guest_name || "Client invité")
      : course.clients.profiles.full_name;

    const message = `\nDevis ${devis.quote_number} - ${shareClientName}` +
                   `\nTrajet: ${course.pickup_address} → ${course.destination_address}` +
                   `\nDate: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}` +
                   `\nMontant: ${devis.amount.toFixed(2)}€` +
                   `Valable jusqu'au: ${format(new Date(devis.valid_until), "d MMMM yyyy", { locale: fr })}`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Devis ${devis.quote_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const handleDownloadDevis = async (course: any, forClient: boolean = false) => {
    const devis = course.devis?.[0];
    if (!devis || !driverInfo) {
      toast.error("Informations incomplètes pour générer le PDF (devis ou infos chauffeur manquants)");
      return;
    }
    
    // Vérifier si c'est une course entreprise et récupérer les infos
    const companyInfo = getCompanyCourseInfo(course.id);
    const isCompanyCourse = !!companyInfo;
    
    // Récupérer le nom du client (enregistré ou invité) - seulement si pas une course entreprise
    const clientName = course.is_guest_booking || !course.clients?.profiles?.full_name 
      ? (course.guest_name || "Client invité") 
      : course.clients.profiles.full_name;

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header with blue background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("DEVIS", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Référence: ${devis.quote_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(devis.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, 81);
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, 81);
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client/Company info (right side) - adapté selon le type de course
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    if (isCompanyCourse) {
      // Afficher les informations de l'entreprise
      doc.text("ENTREPRISE", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      doc.text(companyInfo.companyName || "N/A", pageWidth - 20, 71, { align: 'right' });
      
      let companyInfoY = 76;
      
      if (companyInfo.siret) {
        doc.text(`SIRET: ${companyInfo.siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      } else if (companyInfo.siren) {
        doc.text(`SIREN: ${companyInfo.siren}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      if (companyInfo.tvaNumber) {
        doc.text(`TVA: ${companyInfo.tvaNumber}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      const companyAddress = companyInfo.billingAddress || companyInfo.address;
      if (companyAddress) {
        const addressLines = doc.splitTextToSize(companyAddress, 75);
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
        });
        companyInfoY += addressLines.length * 4;
      }
      
      if (companyInfo.contactEmail) {
        doc.text(companyInfo.contactEmail, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      // Afficher le collaborateur
      if (companyInfo.employeeName) {
        companyInfoY += 2;
        doc.setFont(undefined, 'bold');
        doc.text("COLLABORATEUR", pageWidth - 20, companyInfoY, { align: 'right' });
        doc.setFont(undefined, 'normal');
        companyInfoY += 5;
        doc.text(companyInfo.employeeName, pageWidth - 20, companyInfoY, { align: 'right' });
        if (companyInfo.employeePhone) {
          companyInfoY += 4;
          doc.text(`Tél: ${companyInfo.employeePhone}`, pageWidth - 20, companyInfoY, { align: 'right' });
        }
      }
    } else {
      // Client classique
      doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
      
      if (course.clients?.profiles?.email) {
        doc.text(course.clients.profiles.email, pageWidth - 20, 76, { align: 'right' });
      }
      
      if (course.clients?.profiles?.phone) {
        doc.text(`Tél: ${course.clients.profiles.phone}`, pageWidth - 20, 81, { align: 'right' });
      }
    }

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${course.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${course.distance_km} km`, 105, currentY + 5);

    // Pricing table
    let yPos = 180;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    const subtotal = (devis.base_price || 0) + (devis.distance_price || 0) + (devis.time_price || 0) +
      (devis.peak_hours_surcharge_amount || 0) + (devis.evening_surcharge_amount || 0) + (devis.weekend_surcharge_amount || 0);
    const tvaRate = devis.time_price > 0 ? 20 : 10;
    const tvaAmount = subtotal * (tvaRate / 100);
    
    // Déterminer le type de course
    const isMiseADisposition = devis.time_price > 0 && devis.distance_price === 0;

    if (!forClient) {
      // Driver version - detailed breakdown
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant HT", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      if (isMiseADisposition) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = course.duration_minutes / 60;
        const hourlyRate = devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${devis.base_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        // Calculer le prix/km pour afficher le détail
        const distanceKm = course.distance_km || 0;
        const perKmRate = distanceKm > 0 ? (devis.distance_price / distanceKm) : 0;
        const priceLabel = distanceKm > 0 && perKmRate > 0 
          ? `Prix au kilomètre (${distanceKm.toFixed(2)} km × ${perKmRate.toFixed(2)} €/km)`
          : "Prix au kilomètre";
        doc.text(priceLabel, 25, yPos + 5);
        doc.text(`${devis.distance_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      }
      
      // Afficher les augmentations heures de pointe/soir/weekend si présentes (version chauffeur uniquement)
      if (devis.peak_hours_surcharge_amount && devis.peak_hours_surcharge_amount > 0) {
        doc.setFillColor(255, 240, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Heures de pointe", 25, yPos + 5);
        doc.text(`+${devis.peak_hours_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée sans le détail des tarifs.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotal.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.text(`TVA (${tvaRate}%)`, 25, yPos + 5);
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(41, 128, 185);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${devis.amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Validity
    yPos += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text(`Devis valable jusqu'au ${format(new Date(devis.valid_until), "dd/MM/yyyy", { locale: fr })}`, 20, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`devis-${devis.quote_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Devis téléchargé");
  };

  const handleDownloadFacture = async (course: any, forClient: boolean = false) => {
    const facture = course.factures?.[0];
    const devis = course.devis?.[0];
    
    if (!facture) {
      toast.error("Aucune facture disponible pour cette course");
      return;
    }
    
    if (!driverInfo || !driverInfo.company_name || (!driverInfo.siret && !driverInfo.siren)) {
      toast.error("Informations de l'entreprise incomplètes. Veuillez compléter vos paramètres (Nom d'entreprise, SIRET ou SIREN, Adresse)");
      return;
    }
    
    // Vérifier si c'est une course entreprise et récupérer les infos
    const companyInfo = getCompanyCourseInfo(course.id);
    const isCompanyCourse = !!companyInfo;
    
    // Récupérer le nom du client (enregistré ou invité) - seulement si pas une course entreprise
    const clientName = course.is_guest_booking || !course.clients?.profiles?.full_name 
      ? (course.guest_name || "Client invité") 
      : course.clients.profiles.full_name;

    const jsPDF = (await import("jspdf")).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Green color for invoices
    const headerColor: [number, number, number] = [46, 204, 113]; // Green

    // Header
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`N°: ${facture.invoice_number_generated || facture.invoice_number}`, pageWidth / 2, 35, { align: "center" });
    doc.text(`Date: ${format(new Date(facture.created_at), "dd/MM/yyyy", { locale: fr })}`, pageWidth / 2, 42, { align: "center" });

    // Driver info (left side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("CHAUFFEUR VTC", 20, 65);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const driverName = driverInfo.profiles?.full_name || driverInfo.company_name || "N/A";
    doc.text(driverName, 20, 71);
    if (driverInfo.company_name && driverInfo.company_name !== driverName) {
      doc.text(driverInfo.company_name, 20, 76);
    }
    if (driverInfo.siret) {
      doc.text(`SIRET: ${driverInfo.siret}`, 20, 81);
    } else if (driverInfo.siren) {
      doc.text(`SIREN: ${driverInfo.siren}`, 20, 81);
    }
    doc.text(`Tél: ${driverInfo.profiles?.phone || 'N/A'}`, 20, 86);
    
    if (driverInfo.company_address) {
      const addressLines = doc.splitTextToSize(driverInfo.company_address, 75);
      doc.text(addressLines, 20, 91);
    }

    // Client/Company info (right side) - adapté selon le type de course
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    
    if (isCompanyCourse) {
      // Afficher les informations de l'entreprise
      doc.text("ENTREPRISE", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      doc.text(companyInfo.companyName || "N/A", pageWidth - 20, 71, { align: 'right' });
      
      let companyInfoY = 76;
      
      if (companyInfo.siret) {
        doc.text(`SIRET: ${companyInfo.siret}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      } else if (companyInfo.siren) {
        doc.text(`SIREN: ${companyInfo.siren}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      if (companyInfo.tvaNumber) {
        doc.text(`TVA: ${companyInfo.tvaNumber}`, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      const companyAddress = companyInfo.billingAddress || companyInfo.address;
      if (companyAddress) {
        const addressLines = doc.splitTextToSize(companyAddress, 75);
        addressLines.forEach((line: string, index: number) => {
          doc.text(line, pageWidth - 20, companyInfoY + (index * 4), { align: 'right' });
        });
        companyInfoY += addressLines.length * 4;
      }
      
      if (companyInfo.contactEmail) {
        doc.text(companyInfo.contactEmail, pageWidth - 20, companyInfoY, { align: 'right' });
        companyInfoY += 5;
      }
      
      // Afficher le collaborateur
      if (companyInfo.employeeName) {
        companyInfoY += 2;
        doc.setFont(undefined, 'bold');
        doc.text("COLLABORATEUR", pageWidth - 20, companyInfoY, { align: 'right' });
        doc.setFont(undefined, 'normal');
        companyInfoY += 5;
        doc.text(companyInfo.employeeName, pageWidth - 20, companyInfoY, { align: 'right' });
        if (companyInfo.employeePhone) {
          companyInfoY += 4;
          doc.text(`Tél: ${companyInfo.employeePhone}`, pageWidth - 20, companyInfoY, { align: 'right' });
        }
      }
    } else {
      // Client classique
      doc.text("CLIENT", pageWidth - 20, 65, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(clientName, pageWidth - 20, 71, { align: 'right' });
      
      if (course.clients?.profiles?.email) {
        doc.text(course.clients.profiles.email, pageWidth - 20, 76, { align: 'right' });
      }
      
      if (course.clients?.profiles?.phone) {
        doc.text(`Tél: ${course.clients.profiles.phone}`, pageWidth - 20, 81, { align: 'right' });
      }
    }

    // Service details box
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 110, 170, 55);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("DÉTAILS DE LA PRESTATION", 25, 118);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    const pickupLines = doc.splitTextToSize(course.pickup_address, 140);
    const destLines = doc.splitTextToSize(course.destination_address, 140);
    
    doc.text("Départ:", 25, 126);
    doc.text(pickupLines, 50, 126);
    
    let currentY = 126 + (pickupLines.length * 5);
    doc.text("Arrivée:", 25, currentY);
    doc.text(destLines, 50, currentY);
    
    currentY += (destLines.length * 5);
    doc.text(`Date: ${format(new Date(course.scheduled_date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, 25, currentY);
    doc.text(`Passagers: ${course.passengers_count}`, 25, currentY + 5);
    doc.text(`Distance: ${course.distance_km} km`, 105, currentY + 5);

    // Payment info
    let yPos = 175;
    doc.text(`Mode de paiement: ${facture.payment_method || 'N/A'}`, 20, yPos);

    // Pricing table
    yPos += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text("TARIFICATION", 20, yPos);
    yPos += 8;

    // Calculate TVA - use devis time_price if available, otherwise default to 10%
    const amount = facture.amount;
    const tvaRate = devis?.time_price && devis.time_price > 0 ? 20 : 10;
    const subtotalHT = amount / (1 + tvaRate / 100);
    const tvaAmount = amount - subtotalHT;

    if (!forClient) {
      // Driver version - with payment details
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      // Afficher les composantes de prix depuis le devis (version détaillée chauffeur)
      const isMiseADisposition = devis?.time_price && devis.time_price > 0 && (!devis?.distance_price || devis.distance_price === 0);
      
      if (isMiseADisposition && devis) {
        // Mise à disposition - afficher durée et tarif horaire
        const hours = course.duration_minutes / 60;
        const hourlyRate = devis.time_price / hours;
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text(`Mise à disposition (${hours.toFixed(1)}h à ${hourlyRate.toFixed(2)}€/h)`, 25, yPos + 5);
        doc.text(`${devis.time_price.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else if (devis) {
        // Course classique - afficher base + distance
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Forfait de base", 25, yPos + 5);
        doc.text(`${(devis.base_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 7;
        // Calculer le prix/km pour afficher le détail
        const distanceKm2 = course.distance_km || 0;
        const perKmRate2 = distanceKm2 > 0 ? ((devis.distance_price || 0) / distanceKm2) : 0;
        const priceLabel2 = distanceKm2 > 0 && perKmRate2 > 0 
          ? `Prix au kilomètre (${distanceKm2.toFixed(2)} km × ${perKmRate2.toFixed(2)} €/km)`
          : "Prix au kilomètre";
        doc.text(priceLabel2, 25, yPos + 5);
        doc.text(`${(devis.distance_price || 0).toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        
        yPos += 9;
      } else {
        // Fallback sans devis
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.text("Montant HT", 25, yPos + 5);
        doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 9;
      }
      
      // Afficher les augmentations soir/weekend si présentes (version chauffeur uniquement)
      if (devis?.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis?.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      // Afficher la réduction si code promo appliqué
      if ((facture.promo_code || devis?.promo_code) && (facture.discount_amount > 0 || devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || devis?.discount_amount || 0;
        const promoCode = facture.promo_code || devis?.promo_code || '';
        doc.setTextColor(46, 125, 50);
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
      
      yPos += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      const noteLines = doc.splitTextToSize("Note: Le client reçoit une version simplifiée.", 170);
      doc.text(noteLines, 20, yPos);
    } else {
      // Client version - simplified
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("Description", 25, yPos + 5.5);
      doc.text("Montant", 175, yPos + 5.5, { align: 'right' });
      
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFillColor(245, 245, 245);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      
      // Afficher la réduction si code promo appliqué
      if ((facture.promo_code || devis?.promo_code) && (facture.discount_amount > 0 || devis?.discount_amount > 0)) {
        const discountAmount = facture.discount_amount || devis?.discount_amount || 0;
        const promoCode = facture.promo_code || devis?.promo_code || '';
        doc.setTextColor(46, 125, 50);
        doc.text(`Réduction (${promoCode})`, 25, yPos + 5);
        doc.text(`-${discountAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      // Afficher les augmentations soir/weekend si présentes
      if (devis?.evening_surcharge_amount && devis.evening_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Soir", 25, yPos + 5);
        doc.text(`+${devis.evening_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      if (devis?.weekend_surcharge_amount && devis.weekend_surcharge_amount > 0) {
        doc.setFillColor(255, 245, 220);
        doc.rect(20, yPos, 170, 7, 'F');
        doc.setTextColor(204, 102, 0);
        doc.text("Augmentation Weekend", 25, yPos + 5);
        doc.text(`+${devis.weekend_surcharge_amount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 7, 'F');
      doc.setFont(undefined, 'bold');
      doc.text("Sous-total HT", 25, yPos + 5);
      doc.text(`${subtotalHT.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 7;
      doc.setFont(undefined, 'normal');
      doc.text(`${tvaAmount.toFixed(2)} €`, 175, yPos + 5, { align: 'right' });
      
      yPos += 9;
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.rect(20, yPos, 170, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL TTC", 25, yPos + 6);
      doc.text(`${amount.toFixed(2)} €`, 175, yPos + 6, { align: 'right' });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(240, 240, 240);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Merci de votre confiance", pageWidth / 2, pageHeight - 8, { align: "center" });

    doc.save(`facture-${facture.invoice_number_generated || facture.invoice_number}${forClient ? '-client' : ''}.pdf`);
    toast.success("Facture téléchargée");
  };

  const handleShareFacture = (course: any, method: 'whatsapp' | 'sms' | 'email' | 'facebook') => {
    const facture = course.factures?.[0];
    if (!facture) {
      toast.error("Aucune facture disponible");
      return;
    }
    
    // Récupérer le nom du client (enregistré ou invité)
    const shareClientName = course.is_guest_booking || !course.clients?.profiles?.full_name
      ? (course.guest_name || "Client invité")
      : course.clients.profiles.full_name;

    const message = `\nFacture ${facture.invoice_number_generated || facture.invoice_number} - ${shareClientName}` +
                   `\nTrajet: ${course.pickup_address} → ${course.destination_address}` +
                   `\nDate: ${format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}` +
                   `\nMontant: ${facture.amount.toFixed(2)}€` +
                   `Statut: ${facture.payment_status === 'paid' ? 'Payée' : 'En attente'}`;

    const encodedMessage = encodeURIComponent(message);

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodedMessage}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=Facture ${facture.invoice_number_generated || facture.invoice_number}&body=${encodedMessage}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodedMessage}`, '_blank');
        break;
    }
    toast.success("Partage ouvert");
  };

  const getDevisStatus = (course: any) => {
    const devis = course.devis?.[0];
    
    if (course.status === "pending") {
      if (devis?.status === "accepted") {
        return {
          icon: Clock,
          text: "Client validé - en attente de votre confirmation",
          color: "text-warning"
        };
      }

      return {
        icon: Clock,
        text: "En attente d'acceptation du chauffeur",
        color: "text-yellow-500"
      };
    }
    
    if (course.status === "accepted") {
      if (devis?.status === "pending") {
        return {
          icon: CheckCircle,
          text: "Confirmée - Devis envoyé au client",
          color: "text-green-500"
        };
      }
      return {
        icon: CheckCircle,
        text: "Confirmée",
        color: "text-green-500"
      };
    }
    
    if (course.status === "in_progress") {
      return {
        icon: CheckCircle,
        text: "Confirmée - En cours",
        color: "text-green-500"
      };
    }
    
    if (course.status === "completed") {
      return {
        icon: CheckCircle,
        text: "Terminée",
        color: "text-green-500"
      };
    }
    
    if (course.status === "cancelled") {
      return {
        icon: XCircle,
        text: "Course annulée",
        color: "text-destructive"
      };
    }

    return {
      icon: Clock,
      text: "En attente",
      color: "text-muted-foreground"
    };
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-primary/10 text-primary border-primary/20 border",
      accepted: "bg-success/10 text-success border-success/20 border",
      in_progress: "bg-info/10 text-info border-info/20 border",
      completed: "bg-accent/10 text-accent border-accent/20 border",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20 border",
    };

    const labels = {
      pending: "En attente",
      accepted: "Acceptée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };

    return (
      <Badge className={`${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // Use extracted filter/sort/helper utilities
  const getClientDisplayName = (course: any): string => {
    return getClientName(course, getCompanyCourseInfo(course.id));
  };

  const getClientPhone = (course: any): string | null => {
    return getClientPhoneUtil(course, getCompanyCourseInfo(course.id));
  };

  const getLatestDevis = (course: any): any | null => {
    return getLatestDevisUtil(course);
  };

  const filterParams = {
    dateFilter, customStartDate, customEndDate,
    searchQuery, minAmount, maxAmount,
    paymentStatusFilter, courseTypeFilter,
  };

  const applyAllFilters = (coursesList: any[]) => applyFilters(coursesList, filterParams, getCourseTypeInfo);

  const resetAllFilters = () => {
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
    setMinAmount("");
    setMaxAmount("");
    setPaymentStatusFilter("all");
    setCourseTypeFilter("all");
    setPendingPage(1);
    setConfirmedPage(1);
    setCompletedPage(1);
    setCancelledPage(1);
  };

  // Une course reste dans "En attente" tant que le chauffeur ne l'a pas explicitement acceptée
  const allPendingCourses = applyAllFilters(courses.filter(c => c.status === "pending"));
  const pendingCourses = sortByDate(allPendingCourses);
  const acceptedCourses = applyAllFilters(courses.filter(c => c.status === "accepted"));
  const inProgressCourses = applyAllFilters(courses.filter(c => c.status === "in_progress"));
  const confirmedCoursesCombined = sortConfirmedWithInProgressFirst([...acceptedCourses, ...inProgressCourses]);
  const completedCourses = sortByDate(applyAllFilters(courses.filter(c => c.status === "completed")));
  const cancelledCourses = sortByDate(applyAllFilters(courses.filter(c => c.status === "cancelled")));

  // Pagination helpers
  const paginatedPending = pendingCourses.slice(0, pendingPage * COURSES_PER_PAGE);
  const paginatedConfirmed = confirmedCoursesCombined.slice(0, confirmedPage * COURSES_PER_PAGE);
  const paginatedCompleted = completedCourses.slice(0, completedPage * COURSES_PER_PAGE);
  const paginatedCancelled = cancelledCourses.slice(0, cancelledPage * COURSES_PER_PAGE);

  const hasActiveFilters = dateFilter !== "all" || searchQuery.trim() !== "" || minAmount !== "" || maxAmount !== "" || paymentStatusFilter !== "all" || courseTypeFilter !== "all";

  const filtersState: CoursesFiltersState = {
    searchQuery, dateFilter, customStartDate, customEndDate,
    minAmount, maxAmount, paymentStatusFilter, courseTypeFilter,
  };

  const LoadMoreButton = ({ total, loaded, onLoadMore }: { total: number; loaded: number; onLoadMore: () => void }) => {
    if (loaded >= total) return null;
    return (
      <Button variant="outline" className="w-full mt-3" onClick={onLoadMore}>
        Voir plus ({loaded}/{total})
      </Button>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <CoursesFilters
        filters={filtersState}
        onFiltersChange={(partial) => {
          if (partial.searchQuery !== undefined) setSearchQuery(partial.searchQuery);
          if (partial.dateFilter !== undefined) setDateFilter(partial.dateFilter);
          if (partial.customStartDate !== undefined) setCustomStartDate(partial.customStartDate);
          if (partial.customEndDate !== undefined) setCustomEndDate(partial.customEndDate);
          if (partial.minAmount !== undefined) setMinAmount(partial.minAmount);
          if (partial.maxAmount !== undefined) setMaxAmount(partial.maxAmount);
          if (partial.paymentStatusFilter !== undefined) setPaymentStatusFilter(partial.paymentStatusFilter);
          if (partial.courseTypeFilter !== undefined) setCourseTypeFilter(partial.courseTypeFilter);
        }}
        onReset={resetAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 mb-6 h-auto bg-transparent p-0">
          <TabsTrigger 
            value="pending" 
            className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-200 data-[state=active]:border-yellow-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-yellow-500/10 transition-all"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">En attente</span>
            <Badge className="bg-yellow-500/30 text-yellow-200 text-xs font-bold">{pendingCourses.length + pendingCompanyQuotesCount + pendingFleetCoursesCount + pendingPartnerCoursesCount}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="confirmed"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-200 data-[state=active]:border-blue-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-blue-500/10 transition-all"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Confirmée</span>
            <Badge className="bg-blue-500/30 text-blue-200 text-xs font-bold">{confirmedCoursesCombined.length + receivedSharedCoursesCount}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-200 data-[state=active]:border-green-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-green-500/10 transition-all"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Terminée</span>
            <Badge className="bg-green-500/30 text-green-200 text-xs font-bold">{completedCourses.length + completedPartnerCoursesCount}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="rejected"
            className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-200 data-[state=active]:border-red-500 border-2 border-white/10 bg-card/50 text-white h-auto py-3 px-2 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 hover:bg-red-500/10 transition-all"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-bold">Refusé</span>
            <Badge className="bg-red-500/30 text-red-200 text-xs font-bold">{cancelledCourses.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 sm:space-y-4 mt-4">
          {/* Courses gestionnaire de flotte en attente */}
          <PendingFleetCoursesInCoursesList 
            driverId={driverId} 
            onCountChange={setPendingFleetCoursesCount}
            onCourseAccepted={fetchCourses}
          />
          
          {/* Demandes entreprises en attente */}
          <PendingCompanyQuotesInCoursesList 
            driverId={driverId} 
            onCountChange={setPendingCompanyQuotesCount}
            onCourseAccepted={fetchCourses}
          />
          
          {/* Courses partenaires en attente */}
          <PendingPartnerCoursesInCoursesList 
            driverId={driverId} 
            onCountChange={setPendingPartnerCoursesCount}
            onCourseAccepted={fetchCourses}
          />
          
          {pendingCourses.length === 0 && pendingCompanyQuotesCount === 0 && pendingFleetCoursesCount === 0 && pendingPartnerCoursesCount === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course en attente</p>
          ) : pendingCourses.length > 0 ? (
            <>
            {paginatedPending.map((course) => {
              const courseTypeInfo = getCourseTypeInfo(course);
              return (
              <Card key={course.id} className={cn(
                "relative overflow-hidden p-3 sm:p-4 backdrop-blur-sm border bg-card/95 hover:shadow-lg transition-all",
                courseTypeInfo.borderColor
              )}>
                {/* Indicateur de type de course - barre latérale colorée */}
                <CourseTypeIndicator type={courseTypeInfo.type} className="absolute left-0 top-0 bottom-0 w-1" />
                
                <div className="space-y-3 pl-2">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {getClientDisplayName(course)}
                            {course.is_guest_booking && !course.fleet_manager_id && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">Non inscrit</Badge>
                            )}
                          </h3>
                          {getStatusBadge(course.status)}
                          <CourseTypeBadge typeInfo={courseTypeInfo} size="sm" />
                          <PaymentMethodBadge paymentMethod={course.payment_method_requested} size="sm" />
                          <CourseShareStatusIndicator 
                            courseId={course.id} 
                            driverId={driverId} 
                            onCancelSuccess={fetchCourses}
                          />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70" />
                          <span className="truncate">{format(new Date(course.scheduled_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
                        </p>
                        {/* Indicateur gestionnaire flotte si applicable - EN HAUT pour visibilité */}
                        {getFleetCourseInfo(course) && !getCompanyCourseInfo(course.id) && (
                          <FleetCourseIndicator 
                            fleetManagerName={getFleetCourseInfo(course)!.fleetManagerName}
                            fleetManagerLogo={getFleetCourseInfo(course)!.fleetManagerLogo}
                            fleetManagerPhone={getFleetCourseInfo(course)!.fleetManagerPhone}
                            clientName={getFleetCourseInfo(course)!.clientName}
                            clientPhone={getFleetCourseInfo(course)!.clientPhone}
                          />
                        )}
                        {/* Indicateur entreprise si applicable - EN HAUT pour visibilité */}
                        {getCompanyCourseInfo(course.id) && (
                          <CompanyCourseIndicator 
                            companyName={getCompanyCourseInfo(course.id)!.companyName}
                            companyLogo={getCompanyCourseInfo(course.id)!.logoUrl}
                            employeeName={getCompanyCourseInfo(course.id)!.employeeName}
                            employeePhone={getCompanyCourseInfo(course.id)!.employeePhone}
                          />
                        )}
                      </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-xs sm:text-sm min-w-0 flex-1">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground break-words">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-xs sm:text-sm min-w-0 flex-1">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground break-words">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/70" />
                      {course.passengers_count} passager(s)
                    </div>
                    {/* Contact du passager */}
                    <CourseClientContact course={course} employeePhone={getCompanyCourseInfo(course.id)?.employeePhone} driverId={driverId} />
                  </div>

                  {(() => {
                    const devis = getLatestDevis(course);
                    if (course.devis && course.devis.length > 0 && devis) {
                      return (
                        <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-medium text-foreground">Montant du devis</span>
                            <span className="text-2xl sm:text-3xl font-bold text-primary">{devis.amount.toFixed(2)}€</span>
                          </div>
                          {devis.quote_number && (
                            <p className="text-xs text-muted-foreground mt-1">Réf: {devis.quote_number}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* FLUX SYSTÉMATIQUE D'ACCEPTATION */}
                  {(() => {
                    const devis = getLatestDevis(course);
                    
                    // CAS SPÉCIAL: Pas de devis → Erreur lors de la création
                    if (!devis) {
                      return (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                          <p className="text-sm text-destructive font-medium">⚠️ Devis manquant</p>
                          <p className="text-xs text-muted-foreground">
                            Le devis n'a pas pu être généré automatiquement. Veuillez le générer manuellement.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.functions.invoke('create-devis-auto', {
                                  body: {
                                    course_id: course.id,
                                    driver_id: driverId,
                                    use_hourly_rate: false
                                  }
                                });
                                if (error) throw error;
                                toast.success("Devis généré avec succès !");
                                fetchCourses();
                              } catch (err: any) {
                                console.error("Error generating devis:", err);
                                toast.error("Erreur lors de la génération du devis");
                              }
                            }}
                            className="w-full border-destructive/30 hover:bg-destructive/10"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Générer le devis
                          </Button>
                        </div>
                      );
                    }
                    
                    // Déterminer qui a créé la course
                    const isDriverCreated = user && course.created_by_user_id === user.id;
                    
                    // ========== CAS 1: CHAUFFEUR CRÉÉ LA COURSE ==========
                    // Flux: Chauffeur crée → Client accepte → Confirmée DIRECTEMENT
                    // Note: Quand client accepte, DevisList.tsx change course.status à "accepted"
                    // donc la course ne sera plus en "pending" et n'apparaîtra plus ici
                    if (isDriverCreated) {
                      if (devis.status === "pending") {
                        return (
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground italic">
                              ⏳ En attente de l'acceptation du client
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelPendingCourse(course.id)}
                              className="w-full border-destructive/30 hover:bg-destructive/10 text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Annuler cette course
                            </Button>
                          </div>
                        );
                      }
                      // Si devis accepté et course encore pending, c'est anormal
                      // mais ne devrait jamais arriver car DevisList.tsx change status à "accepted"
                      return null;
                    }
                    
                    // ========== CAS 2: GUEST BOOKING (client non inscrit) ==========
                    // Le guest a validé le prix lors de la réservation, le chauffeur doit accepter directement
                    if (course.is_guest_booking) {
                      return (
                        <div className="space-y-2">
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              👤 Réservation client non inscrit
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {course.guest_name} a demandé cette course. Acceptez ou refusez la demande.
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAcceptCourse(course.id)}
                              className="flex-1 bg-success/90 hover:bg-success text-success-foreground border-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accepter
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelCourse(course.id)}
                              className="flex-1 border-border hover:bg-muted"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    
                    // ========== CAS 3: CLIENT INSCRIT CRÉÉ LA COURSE ==========
                    // Flux: Client crée → Client accepte devis → Chauffeur accepte course → Confirmée
                    
                    // Client n'a pas encore accepté le devis
                    if (devis.status === "pending") {
                      return (
                        <div className="space-y-2">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                            <p className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">
                              ⏳ En attente de l'acceptation du devis par le client
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Le client doit d'abord accepter le devis avant que vous puissiez accepter la course.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelPendingCourse(course.id)}
                            className="w-full border-destructive/30 hover:bg-destructive/10 text-destructive"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Annuler (devis non accepté)
                          </Button>
                        </div>
                      );
                    }
                    
                    // Client a accepté le devis, maintenant le CHAUFFEUR doit accepter la course
                    if (devis.status === "accepted" && course.status === "pending") {
                      return (
                        <div className="space-y-2">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                            <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                              ✅ Devis accepté par le client
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Vous pouvez maintenant accepter ou refuser cette course.
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAcceptCourse(course.id)}
                              className="flex-1 bg-success/90 hover:bg-success text-success-foreground border-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accepter la course
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelCourse(course.id)}
                              className="flex-1 border-border hover:bg-muted"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1 border-border hover:bg-muted"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  {/* Bouton Partager avec Partenaire - DÉSACTIVÉ temporairement (fonctionnalité bientôt disponible) */}
                  {/* TODO: Réactiver quand les partenariats seront disponibles
                  {course.status === 'accepted' && !course.fleet_manager_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToShareWithPartner(course);
                        setSharePartnerDialogOpen(true);
                      }}
                      className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Partager avec un partenaire
                    </Button>
                  )}
                  */}
                  
                  {/* Bouton Renvoyer au gestionnaire - uniquement pour courses flotte acceptées */}
                  {course.status === 'accepted' && course.fleet_manager_id && course.fleet_managers && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToReturnToFleet(course);
                        setReturnToFleetDialogOpen(true);
                      }}
                      className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Renvoyer au gestionnaire
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })}
            <LoadMoreButton total={pendingCourses.length} loaded={paginatedPending.length} onLoadMore={() => setPendingPage(p => p + 1)} />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedCoursesCombined.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course confirmée</p>
          ) : (
            <>
            {paginatedConfirmed.map((course) => {
              const handledByPartner = isCourseHandledByPartner(course.id);
              const shareLockStatus = isCourseShareLocked(course.id);
              const isPendingShare = shareLockStatus === 'pending';
              const isActivelySharingOrHandled = shareLockStatus === 'active' || handledByPartner;
              const courseTypeInfo = getCourseTypeInfo(course);
              const companyCourseInfo = getCompanyCourseInfo(course.id);
              const sharePartnerInfo = getSharePartnerInfo(course.id);
              
              return (
              <Card key={course.id} className={cn(
                "relative overflow-hidden p-4 backdrop-blur-sm border bg-card/95 hover:shadow-lg transition-all",
                isPendingShare ? "border-amber-500/30" : courseTypeInfo.borderColor
              )}>
                {/* Indicateur de type de course - barre latérale colorée */}
                <CourseTypeIndicator type={courseTypeInfo.type} className="absolute left-0 top-0 bottom-0 w-1" />
                
                <div className="space-y-3 pl-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {companyCourseInfo?.employeeName || getClientDisplayName(course)}
                            {course.is_guest_booking && !companyCourseInfo && !course.fleet_manager_id && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">Non inscrit</Badge>
                            )}
                          </h3>
                          {getStatusBadge(course.status)}
                          <CourseTypeBadge typeInfo={courseTypeInfo} size="sm" />
                          <PaymentMethodBadge paymentMethod={course.payment_method_requested} size="sm" />
                          <CourseShareStatusIndicator 
                            courseId={course.id} 
                            driverId={driverId} 
                            onCancelSuccess={fetchCourses}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      {/* Indicateur gestionnaire flotte si applicable - EN HAUT pour visibilité */}
                      {getFleetCourseInfo(course) && !companyCourseInfo && (
                        <FleetCourseIndicator 
                          fleetManagerName={getFleetCourseInfo(course)!.fleetManagerName}
                          fleetManagerLogo={getFleetCourseInfo(course)!.fleetManagerLogo}
                          fleetManagerPhone={getFleetCourseInfo(course)!.fleetManagerPhone}
                          clientName={getFleetCourseInfo(course)!.clientName}
                          clientPhone={getFleetCourseInfo(course)!.clientPhone}
                        />
                      )}
                      {/* Indicateur entreprise si applicable - EN HAUT pour visibilité */}
                      {companyCourseInfo && (
                        <CompanyCourseIndicator 
                          companyName={companyCourseInfo.companyName}
                          companyLogo={companyCourseInfo.logoUrl}
                          employeeName={companyCourseInfo.employeeName}
                          employeePhone={companyCourseInfo.employeePhone}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 text-muted-foreground/70" />
                      {course.passengers_count} passager(s)
                    </div>
                    {/* Contact du client/passager */}
                    <CourseClientContact course={course} employeePhone={getCompanyCourseInfo(course.id)?.employeePhone} driverId={driverId} />
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Montant du devis</span>
                        <span className="text-3xl font-bold text-white drop-shadow-glow">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

                  {/* Boutons de navigation GPS */}
                  <CourseNavigationButtons
                    status={course.status}
                    pickupAddress={course.pickup_address}
                    pickupLatitude={course.pickup_latitude}
                    pickupLongitude={course.pickup_longitude}
                    destinationAddress={course.destination_address}
                    destinationLatitude={course.destination_latitude}
                    destinationLongitude={course.destination_longitude}
                  />

                  {/* Message de verrouillage si partage en attente */}
                  {isPendingShare && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        {sharePartnerInfo && (
                          <Avatar className="h-10 w-10 border-2 border-amber-500/30">
                            <AvatarImage src={sharePartnerInfo.photo || undefined} />
                            <AvatarFallback className="bg-amber-500/20 text-amber-600">
                              {sharePartnerInfo.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">Partage en attente de réponse</span>
                          </div>
                          {sharePartnerInfo && (
                            <p className="text-sm text-foreground mt-0.5 font-medium">
                              {sharePartnerInfo.name}
                              {sharePartnerInfo.company && sharePartnerInfo.company !== sharePartnerInfo.name && (
                                <span className="text-xs text-muted-foreground ml-1">({sharePartnerInfo.company})</span>
                              )}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Annulez le partage via le badge ci-dessus pour récupérer la course.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message si course gérée par un partenaire (acceptée/en cours) */}
                  {isActivelySharingOrHandled && !isPendingShare && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        {sharePartnerInfo && (
                          <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                            <AvatarImage src={sharePartnerInfo.photo || undefined} />
                            <AvatarFallback className="bg-purple-500/20 text-purple-600">
                              {sharePartnerInfo.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <Handshake className="w-4 h-4" />
                            <span className="text-sm font-medium">Course confiée à un partenaire</span>
                          </div>
                          {sharePartnerInfo && (
                            <p className="text-sm text-foreground mt-0.5 font-medium">
                              {sharePartnerInfo.name}
                              {sharePartnerInfo.company && sharePartnerInfo.company !== sharePartnerInfo.name && (
                                <span className="text-xs text-muted-foreground ml-1">({sharePartnerInfo.company})</span>
                              )}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Le partenaire gère cette course. Vous recevrez vos frais de transaction à la fin.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action - masqués si la course est partagée (pending ou active) */}
                  {!isPendingShare && !isActivelySharingOrHandled && (
                    <div className="flex gap-2 flex-wrap">
                      {course.status === "accepted" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStartCourse(course.id)}
                          disabled={isActionLoading(course.id)}
                          className="flex-1"
                        >
                          {isActionLoading(course.id) ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          Commencer
                        </Button>
                      )}
                      {course.status === "in_progress" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEndCourse(course.id)}
                          disabled={isActionLoading(course.id)}
                          className="flex-1"
                        >
                          {isActionLoading(course.id) ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <StopCircle className="w-4 h-4 mr-2" />
                          )}
                          Terminer
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelCourse(course.id)}
                        disabled={isActionLoading(course.id)}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  {/* Bouton Partager avec Partenaire - DÉSACTIVÉ temporairement (fonctionnalité bientôt disponible) */}
                  {/* TODO: Réactiver quand les partenariats seront disponibles
                  {course.status === 'accepted' && !shareLockStatus && !course.fleet_manager_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToShareWithPartner(course);
                        setSharePartnerDialogOpen(true);
                      }}
                      className="w-full border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Partager avec un partenaire
                    </Button>
                  )}
                  */}
                  
                  {/* Bouton Renvoyer au gestionnaire - uniquement pour courses flotte acceptées */}
                  {course.status === 'accepted' && course.fleet_manager_id && course.fleet_managers && !isActivelySharingOrHandled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCourseToReturnToFleet(course);
                        setReturnToFleetDialogOpen(true);
                      }}
                      className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Renvoyer au gestionnaire
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })}
            <LoadMoreButton total={confirmedCoursesCombined.length} loaded={paginatedConfirmed.length} onLoadMore={() => setConfirmedPage(p => p + 1)} />
            </>
          )}
          
          {/* Courses partagées reçues et acceptées */}
          <SharedCoursesInCoursesList driverId={driverId} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedCourses.length === 0 && completedPartnerCoursesCount === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course terminée</p>
          ) : (
            <>
            {paginatedCompleted.map((course) => {
              const courseTypeInfo = getCourseTypeInfo(course);
              // Check if this course was shared and completed by a partner
              const sharedCourseInfo = sharedCoursesData.find(sc => 
                sc.course_id === course.id && 
                sc.sender_driver_id === driverId &&
                sc.status === 'completed'
              );
              const wasHandledByPartner = !!sharedCourseInfo;
              
              return (
              <Card key={course.id} className={cn(
                "relative overflow-hidden p-4 backdrop-blur-sm border bg-card/95 hover:shadow-lg transition-all",
                courseTypeInfo.borderColor,
                wasHandledByPartner && "border-purple-500/30"
              )}>
                {/* Indicateur de type de course - barre latérale colorée */}
                <CourseTypeIndicator type={wasHandledByPartner ? 'partner' : courseTypeInfo.type} className="absolute left-0 top-0 bottom-0 w-1" />
                
                <div className="space-y-3 pl-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {getClientDisplayName(course)}
                          {course.is_guest_booking && !course.fleet_manager_id && (
                            <Badge variant="outline" className="ml-2 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">Non inscrit</Badge>
                          )}
                        </h3>
                        {getStatusBadge(course.status)}
                        {wasHandledByPartner ? (
                          <Badge className="bg-purple-500/20 text-purple-600 text-xs flex items-center gap-1">
                            <Handshake className="w-3 h-3" />
                            Partenaire
                          </Badge>
                        ) : (
                          <CourseTypeBadge typeInfo={courseTypeInfo} size="sm" />
                        )}
                        <PaymentMethodBadge paymentMethod={course.payment_method_requested} size="sm" />
                        <CourseShareStatusIndicator 
                          courseId={course.id} 
                          driverId={driverId} 
                          onCancelSuccess={fetchCourses}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      {/* Indicateur gestionnaire flotte si applicable - EN HAUT pour visibilité */}
                      {getFleetCourseInfo(course) && !getCompanyCourseInfo(course.id) && (
                        <FleetCourseIndicator 
                          fleetManagerName={getFleetCourseInfo(course)!.fleetManagerName}
                          fleetManagerLogo={getFleetCourseInfo(course)!.fleetManagerLogo}
                          fleetManagerPhone={getFleetCourseInfo(course)!.fleetManagerPhone}
                          clientName={getFleetCourseInfo(course)!.clientName}
                          clientPhone={getFleetCourseInfo(course)!.clientPhone}
                        />
                      )}
                      {/* Indicateur entreprise si applicable - EN HAUT pour visibilité */}
                      {getCompanyCourseInfo(course.id) && (
                        <CompanyCourseIndicator 
                          companyName={getCompanyCourseInfo(course.id)!.companyName}
                          companyLogo={getCompanyCourseInfo(course.id)!.logoUrl}
                          employeeName={getCompanyCourseInfo(course.id)!.employeeName}
                          employeePhone={getCompanyCourseInfo(course.id)!.employeePhone}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    {/* Contact du passager */}
                    <CourseClientContact course={course} employeePhone={getCompanyCourseInfo(course.id)?.employeePhone} driverId={driverId} />
                  </div>

                  {/* Affichage SYSTÉMATIQUE du prix - Facture en priorité, sinon Devis */}
                  {(() => {
                    const facture = course.factures?.[0];
                    const devis = course.devis?.[0];
                    const amount = facture?.amount || devis?.amount;
                    const reference = facture?.invoice_number_generated || devis?.quote_number;

                    if (!amount) {
                      return (
                        <div className="p-4 bg-destructive/20 backdrop-blur-sm rounded-lg border border-destructive/30">
                          <p className="text-sm text-destructive font-medium">⚠️ Prix non disponible</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Aucun devis ou facture n'a été généré pour cette course.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="p-4 bg-primary/10 backdrop-blur-sm rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {facture ? "Montant de la facture" : "Montant du devis"}
                          </span>
                          <span className="text-3xl font-bold text-primary">{amount.toFixed(2)}€</span>
                        </div>
                        {reference && (
                          <p className="text-xs text-muted-foreground mt-1">Réf: {reference}</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFacture(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Facture Détaillée
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFacture(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Facture Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareFacture(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
            );
            })}
            <LoadMoreButton total={completedCourses.length} loaded={paginatedCompleted.length} onLoadMore={() => setCompletedPage(p => p + 1)} />
            <LoadMoreButton total={completedCourses.length} loaded={paginatedCompleted.length} onLoadMore={() => setCompletedPage(p => p + 1)} />
            </>
          )}
          
          {/* Courses partenaires terminées */}
          <CompletedPartnerCoursesList driverId={driverId} limit={20} />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {cancelledCourses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune course refusée</p>
          ) : (
            <>
            {paginatedCancelled.map((course) => {
              return (
              <Card key={course.id} className="p-4 backdrop-blur-sm border border-primary/10 bg-card/95 hover:shadow-lg transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {getClientDisplayName(course)}
                          {course.is_guest_booking && !course.fleet_manager_id && (
                            <Badge variant="outline" className="ml-2 text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">Non inscrit</Badge>
                          )}
                        </h3>
                        {getStatusBadge(course.status)}
                        <PaymentMethodBadge paymentMethod={course.payment_method_requested} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-muted-foreground/70" />
                        {format(new Date(course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      {/* Indicateur gestionnaire flotte si applicable - EN HAUT pour visibilité */}
                      {getFleetCourseInfo(course) && !getCompanyCourseInfo(course.id) && (
                        <FleetCourseIndicator 
                          fleetManagerName={getFleetCourseInfo(course)!.fleetManagerName}
                          fleetManagerLogo={getFleetCourseInfo(course)!.fleetManagerLogo}
                          fleetManagerPhone={getFleetCourseInfo(course)!.fleetManagerPhone}
                          clientName={getFleetCourseInfo(course)!.clientName}
                          clientPhone={getFleetCourseInfo(course)!.clientPhone}
                        />
                      )}
                      {/* Indicateur entreprise si applicable - EN HAUT pour visibilité */}
                      {getCompanyCourseInfo(course.id) && (
                        <CompanyCourseIndicator 
                          companyName={getCompanyCourseInfo(course.id)!.companyName}
                          companyLogo={getCompanyCourseInfo(course.id)!.logoUrl}
                          employeeName={getCompanyCourseInfo(course.id)!.employeeName}
                          employeePhone={getCompanyCourseInfo(course.id)!.employeePhone}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Départ</p>
                        <p className="text-muted-foreground">{course.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-1" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Arrivée</p>
                        <p className="text-muted-foreground">{course.destination_address}</p>
                      </div>
                    </div>
                    {/* Contact du passager */}
                    <CourseClientContact course={course} employeePhone={getCompanyCourseInfo(course.id)?.employeePhone} driverId={driverId} />
                  </div>

                  {course.devis && course.devis.length > 0 && (
                    <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Montant du devis</span>
                        <span className="text-3xl font-bold text-white drop-shadow-glow">{course.devis[0].amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, false)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Détaillé
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDevis(course, true)}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'whatsapp')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'sms')}
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'email')}
                      className="flex-1"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareDevis(course, 'facebook')}
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCourseToReport(course);
                      setReportDialogOpen(true);
                    }}
                    className="w-full border-warning text-warning hover:bg-warning/10"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Signaler un problème
                  </Button>
                </div>
              </Card>
              );
            })}
            <LoadMoreButton total={cancelledCourses.length} loaded={paginatedCancelled.length} onLoadMore={() => setCancelledPage(p => p + 1)} />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setPaymentMethod("");
          setCompanyPaymentStatus("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finaliser la course</DialogTitle>
            <DialogDescription>
              {isSelectedCourseCompany 
                ? "Indiquez le moyen de paiement et si le paiement a été reçu"
                : "Sélectionnez le moyen de paiement utilisé par le client"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourseDetails && (
            <CoursePaymentDialogContent
              courseId={selectedCourseId!}
              driverId={driverId}
              courseAmount={selectedCourseDetails.amount}
              depositPaid={selectedCourseDetails.depositPaid}
              depositStatus={selectedCourseDetails.depositStatus}
              clientEmail={selectedCourseDetails.clientEmail}
              clientName={selectedCourseDetails.clientName}
              guestName={selectedCourseDetails.guestName}
              isGuestBooking={selectedCourseDetails.isGuestBooking}
              isCompanyCourse={isSelectedCourseCompany}
              companyName={selectedCourseCompanyName}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              companyPaymentStatus={companyPaymentStatus}
              onCompanyPaymentStatusChange={setCompanyPaymentStatus}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCompleteCourse} 
              disabled={!paymentMethod || (isSelectedCourseCompany && !companyPaymentStatus)}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la course</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison de l'annulation
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Horaire non disponible" id="schedule" />
              <Label htmlFor="schedule">Horaire non disponible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Distance trop importante" id="distance" />
              <Label htmlFor="distance">Distance trop importante</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Problème technique" id="technical" />
              <Label htmlFor="technical">Problème technique</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Autre raison</Label>
            </div>
          </RadioGroup>
          {rejectionReason === "custom" && (
            <Textarea
              placeholder="Précisez la raison..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectCourse}>
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'annulation pour course en attente (devis non accepté) */}
      <Dialog open={cancelPendingDialogOpen} onOpenChange={setCancelPendingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Annuler la course en attente
            </DialogTitle>
            <DialogDescription>
              Le client n'a pas encore accepté le devis. Sélectionnez un motif pour annuler cette demande.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={pendingCancellationReason} onValueChange={setPendingCancellationReason}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Délai d'acceptation dépassé" id="pending-timeout" />
              <Label htmlFor="pending-timeout">Délai d'acceptation dépassé</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Client non réactif" id="pending-unresponsive" />
              <Label htmlFor="pending-unresponsive">Client non réactif</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Indisponibilité imprévue" id="pending-unavailable" />
              <Label htmlFor="pending-unavailable">Indisponibilité imprévue</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Erreur dans la demande" id="pending-error" />
              <Label htmlFor="pending-error">Erreur dans la demande</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Demande de tarif inacceptable" id="pending-price" />
              <Label htmlFor="pending-price">Demande de tarif inacceptable</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="pending-custom" />
              <Label htmlFor="pending-custom">Autre raison</Label>
            </div>
          </RadioGroup>
          {pendingCancellationReason === "custom" && (
            <Textarea
              placeholder="Précisez la raison d'annulation..."
              value={customPendingReason}
              onChange={(e) => setCustomPendingReason(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCancelPendingDialogOpen(false);
              setPendingCancellationReason("");
              setCustomPendingReason("");
              setCourseToCancelPending(null);
            }}>
              Retour
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancelPendingCourse}>
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      {courseToReport && (
        <CourseReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          courseId={courseToReport.id}
          reportedAgainstUserId={courseToReport.clients?.user_id}
          isDriver={true}
          currentUserId={user?.id || ""}
        />
      )}

      {/* Share with Partner Dialog */}
      <ShareCourseWithPartnerDialog
        open={sharePartnerDialogOpen}
        onOpenChange={setSharePartnerDialogOpen}
        course={courseToShareWithPartner}
        driverId={driverId}
        onSuccess={fetchCourses}
      />

      {/* Return to Fleet Manager Dialog */}
      {courseToReturnToFleet && courseToReturnToFleet.fleet_managers && (
        <ReturnToFleetManagerDialog
          open={returnToFleetDialogOpen}
          onOpenChange={setReturnToFleetDialogOpen}
          courseId={courseToReturnToFleet.id}
          fleetManagerId={courseToReturnToFleet.fleet_manager_id}
          fleetManagerName={courseToReturnToFleet.fleet_managers.company_name}
          onSuccess={() => {
            setCourseToReturnToFleet(null);
            fetchCourses();
          }}
        />
      )}

      {/* Commission Reminder Dialog après complétion */}
      {completedCourseInfo && (
        <CourseCompletionCommissionDialog
          open={showCommissionDialog}
          onOpenChange={setShowCommissionDialog}
          courseId={completedCourseInfo.courseId}
          driverId={driverId}
          courseAmount={completedCourseInfo.courseAmount}
          pickupAddress={completedCourseInfo.pickupAddress}
          destinationAddress={completedCourseInfo.destinationAddress}
          scheduledDate={completedCourseInfo.scheduledDate}
          onConfirm={() => {
            setCompletedCourseInfo(null);
            toast.success("Course terminée ! Facture générée automatiquement.");
          }}
        />
      )}
    </div>
  );
};

export default CoursesList;
