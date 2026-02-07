import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  User,
  CreditCard,
  FileText,
  Car,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  RefreshCw,
  Users,
  Loader2,
  Eye,
  Target,
  PlayCircle,
  ScanLine,
  UserPlus,
  TrendingUp,
  Star,
  Zap,
  Award,
  Flame,
  Minus,
  Settings,
  Image,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverFullData {
  id: string;
  user_id: string;
  company_name: string | null;
  created_at: string;
  subscription_status: string | null;
  subscription_paid: boolean;
  has_nfc_plate: boolean;
  nfc_plate_ordered_at: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  base_fare: number | null;
  per_km_rate: number | null;
  hourly_rate: number | null;
  working_sectors: string[] | null;
  service_description: string | null;
  siret: string | null;
  company_address: string | null;
  max_passengers: number | null;
  registration_step: number | null;
  status: string;
  documents_status: string | null;
  profile_photo_url: string | null;
  full_name: string;
  phone: string | null;
  email: string;
  free_access_granted: boolean;
  billing_type: string | null;
  stripe_connect_status: string | null;
  wants_tpe_affiliate: boolean;
  tpe_received_at: string | null;
  trial_started_at: string | null;
  trial_ready_to_start: boolean;
  objectives_completed: boolean;
  onboarding_objectives_completed: boolean;
  onboarding_step: string | null;
  total_courses: number;
  total_clients: number;
  total_scans: number;
  last_activity: string | null;
  first_course_at: string | null;
  first_scan_at: string | null;
  first_client_at: string | null;
}

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  status: "complete" | "incomplete" | "warning" | "pending";
  completedAt?: string | null;
  details?: string;
}

const getEvolutionLevel = (count: number): { level: string; icon: React.ReactNode; color: string } => {
  if (count === 0) return { level: "Inactif", icon: <Minus className="w-3 h-3" />, color: "text-muted-foreground" };
  if (count <= 5) return { level: "Débutant", icon: <Zap className="w-3 h-3" />, color: "text-blue-500" };
  if (count <= 15) return { level: "Progression", icon: <TrendingUp className="w-3 h-3" />, color: "text-cyan-500" };
  if (count <= 30) return { level: "Confirmé", icon: <Star className="w-3 h-3" />, color: "text-yellow-500" };
  if (count <= 50) return { level: "Avancé", icon: <Award className="w-3 h-3" />, color: "text-orange-500" };
  return { level: "Expert", icon: <Flame className="w-3 h-3" />, color: "text-red-500" };
};

// Skeleton loader for cards
const DriverCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>
      <Skeleton className="h-2 w-full mt-3" />
    </CardContent>
  </Card>
);

const DriverProgressionTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"onboarding" | "evolution">("onboarding");

  // Optimized single-query fetch
  const { data: drivers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-driver-progression-optimized"],
    queryFn: async () => {
      // Use new optimized RPC function
      const { data, error } = await supabase.rpc('get_admin_drivers_with_stats');
      
      if (!error && data && data.length > 0) {
        return data as DriverFullData[];
      }
      
      // Fallback to basic query without stats if RPC fails
      console.warn("Optimized RPC failed, using basic fallback:", error?.message);
      
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select(`
          id, user_id, company_name, created_at, subscription_status, subscription_paid,
          has_nfc_plate, nfc_plate_ordered_at, vehicle_brand, vehicle_model, vehicle_plate,
          vehicle_color, base_fare, per_km_rate, hourly_rate, working_sectors,
          service_description, siret, company_address, max_passengers, registration_step,
          status, documents_status, free_access_granted, billing_type, stripe_connect_status,
          wants_tpe_affiliate, tpe_received_at, trial_activated_at, trial_ready_to_start,
          objectives_completed, onboarding_objectives_completed, onboarding_step
        `)
        .eq("is_demo_account", false)
        .order("created_at", { ascending: false })
        .limit(100);
        
      if (driversError) throw driversError;
      
      const userIds = driversData?.map(d => d.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url, phone, email")
        .in("id", userIds);
        
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return (driversData || []).map(driver => ({
        ...driver,
        trial_started_at: driver.trial_activated_at,
        full_name: profilesMap.get(driver.user_id)?.full_name || 'Non renseigné',
        profile_photo_url: profilesMap.get(driver.user_id)?.profile_photo_url,
        phone: profilesMap.get(driver.user_id)?.phone,
        email: profilesMap.get(driver.user_id)?.email || 'email@inconnu.com',
        total_courses: 0,
        total_clients: 0,
        total_scans: 0,
        last_activity: null,
        first_course_at: null,
        first_scan_at: null,
        first_client_at: null,
      })) as DriverFullData[];
    },
    staleTime: 60000, // 1 minute cache
    retry: 1,
  });

  const calculateOnboardingSteps = (driver: DriverFullData): OnboardingStep[] => {
    return [
      {
        id: "inscription",
        label: "Inscription",
        description: "Compte créé",
        icon: <User className="w-4 h-4" />,
        isComplete: true,
        status: "complete",
        completedAt: driver.created_at,
      },
      {
        id: "profile_basic",
        label: "Infos",
        description: "Nom, téléphone",
        icon: <User className="w-4 h-4" />,
        isComplete: !!driver.full_name && !!driver.phone,
        status: (driver.full_name && driver.phone) ? "complete" : "incomplete",
        details: !driver.phone ? "Téléphone manquant" : undefined,
      },
      {
        id: "profile_photo",
        label: "Photo",
        description: "Photo profil",
        icon: <Image className="w-4 h-4" />,
        isComplete: !!driver.profile_photo_url,
        status: driver.profile_photo_url ? "complete" : "incomplete",
      },
      {
        id: "company_info",
        label: "Entreprise",
        description: "SIRET",
        icon: <FileText className="w-4 h-4" />,
        isComplete: !!driver.siret && !!driver.company_address,
        status: (driver.siret && driver.company_address) ? "complete" : 
          (driver.siret || driver.company_address) ? "warning" : "incomplete",
        details: !driver.siret ? "SIRET manquant" : !driver.company_address ? "Adresse manquante" : undefined,
      },
      {
        id: "vehicle",
        label: "Véhicule",
        description: "Immatriculation",
        icon: <Car className="w-4 h-4" />,
        isComplete: !!driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && !!driver.vehicle_plate,
        status: (driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && driver.vehicle_plate) ? "complete" :
          (driver.vehicle_brand || driver.vehicle_plate) ? "warning" : "incomplete",
        details: !driver.vehicle_plate ? "Immat. manquante" : undefined,
      },
      {
        id: "sectors",
        label: "Secteurs",
        description: "Zones travail",
        icon: <MapPin className="w-4 h-4" />,
        isComplete: !!driver.working_sectors && driver.working_sectors.length > 0,
        status: (driver.working_sectors && driver.working_sectors.length > 0) ? "complete" : "incomplete",
      },
      {
        id: "billing_choice",
        label: "Paiement",
        description: "Mode facturation",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: !!driver.billing_type,
        status: driver.billing_type ? "complete" : "incomplete",
        details: driver.billing_type === "stripe_connect" ? "Stripe" : 
          driver.billing_type === "own_equipment" ? "TPE" : undefined,
      },
      {
        id: "stripe_setup",
        label: "Stripe",
        description: "Configuration",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.billing_type !== "stripe_connect" || driver.stripe_connect_status === "active",
        status: driver.billing_type !== "stripe_connect" ? "complete" :
          driver.stripe_connect_status === "active" ? "complete" :
          driver.stripe_connect_status === "pending" ? "pending" : "incomplete",
        details: driver.billing_type === "stripe_connect" ? 
          (driver.stripe_connect_status === "active" ? "Actif" : "En attente") : "N/A",
      },
      {
        id: "pricing",
        label: "Tarifs",
        description: "Prix configurés",
        icon: <DollarSign className="w-4 h-4" />,
        isComplete: !!driver.base_fare || !!driver.per_km_rate || !!driver.hourly_rate,
        status: (driver.base_fare || driver.per_km_rate || driver.hourly_rate) ? "complete" : "incomplete",
      },
      {
        id: "documents",
        label: "Documents",
        description: "Pièces",
        icon: <FileText className="w-4 h-4" />,
        isComplete: driver.documents_status === "validated",
        status: driver.documents_status === "validated" ? "complete" :
          driver.documents_status === "submitted" || driver.documents_status === "pending" ? "pending" : "incomplete",
        details: driver.documents_status === "validated" ? "Validés" :
          driver.documents_status === "submitted" ? "Soumis" : "À soumettre",
      },
      {
        id: "objectives",
        label: "Objectifs",
        description: "Définis",
        icon: <Target className="w-4 h-4" />,
        isComplete: driver.objectives_completed || driver.onboarding_objectives_completed,
        status: (driver.objectives_completed || driver.onboarding_objectives_completed) ? "complete" : "incomplete",
      },
      {
        id: "nfc",
        label: "NFC",
        description: "Plaque",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.has_nfc_plate,
        status: driver.has_nfc_plate ? "complete" : driver.nfc_plate_ordered_at ? "pending" : "incomplete",
        details: driver.has_nfc_plate ? "Reçue" : driver.nfc_plate_ordered_at ? "Commandée" : "Non",
      },
      {
        id: "trial",
        label: "Essai",
        description: "Période",
        icon: <PlayCircle className="w-4 h-4" />,
        isComplete: !!driver.trial_started_at,
        status: driver.trial_started_at ? "complete" : driver.trial_ready_to_start ? "pending" : "incomplete",
        completedAt: driver.trial_started_at,
        details: driver.trial_started_at ? "Démarré" : driver.trial_ready_to_start ? "Prêt" : "En attente",
      },
      {
        id: "payment",
        label: "Abo",
        description: "Payé",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.subscription_paid || driver.free_access_granted,
        status: (driver.subscription_paid || driver.free_access_granted) ? "complete" : "incomplete",
        details: driver.subscription_paid ? "Payé" : driver.free_access_granted ? "Gratuit" : "Non",
      },
      {
        id: "first_scan",
        label: "1er scan",
        description: "QR",
        icon: <ScanLine className="w-4 h-4" />,
        isComplete: !!driver.first_scan_at,
        status: driver.first_scan_at ? "complete" : "incomplete",
        completedAt: driver.first_scan_at,
      },
      {
        id: "first_client",
        label: "1er client",
        description: "Ajouté",
        icon: <UserPlus className="w-4 h-4" />,
        isComplete: !!driver.first_client_at,
        status: driver.first_client_at ? "complete" : "incomplete",
        completedAt: driver.first_client_at,
      },
      {
        id: "first_course",
        label: "1re course",
        description: "Réalisée",
        icon: <Activity className="w-4 h-4" />,
        isComplete: !!driver.first_course_at,
        status: driver.first_course_at ? "complete" : "incomplete",
        completedAt: driver.first_course_at,
      },
    ];
  };

  const getBlockedInfo = (steps: OnboardingStep[]): { step: OnboardingStep | null; message: string } => {
    const incompleteStep = steps.find(s => !s.isComplete && s.status !== "pending");
    const pendingStep = steps.find(s => s.status === "pending");
    
    if (!incompleteStep && !pendingStep) {
      return { step: null, message: "✅ Parcours complet" };
    }
    
    if (pendingStep && (!incompleteStep || steps.indexOf(pendingStep) < steps.indexOf(incompleteStep))) {
      return { step: pendingStep, message: `⏳ ${pendingStep.label} - ${pendingStep.details || "En attente"}` };
    }
    
    if (incompleteStep) {
      return { step: incompleteStep, message: `⏸️ ${incompleteStep.label} - ${incompleteStep.details || "À compléter"}` };
    }
    
    return { step: null, message: "✅ Parcours complet" };
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        driver.full_name?.toLowerCase().includes(searchLower) ||
        driver.email?.toLowerCase().includes(searchLower) ||
        driver.company_name?.toLowerCase().includes(searchLower) ||
        driver.phone?.includes(searchTerm);

      if (statusFilter === "all") return matchesSearch;

      const steps = calculateOnboardingSteps(driver);
      const completedCount = steps.filter(s => s.isComplete).length;
      const percentage = Math.round((completedCount / steps.length) * 100);

      switch (statusFilter) {
        case "new": return matchesSearch && percentage < 25;
        case "beginner": return matchesSearch && percentage >= 25 && percentage < 50;
        case "inprogress": return matchesSearch && percentage >= 50 && percentage < 75;
        case "advanced": return matchesSearch && percentage >= 75 && percentage < 100;
        case "complete": return matchesSearch && percentage === 100;
        case "active": return matchesSearch && driver.total_courses > 0;
        case "inactive": return matchesSearch && driver.total_courses === 0 && differenceInDays(new Date(), new Date(driver.created_at)) > 7;
        default: return matchesSearch;
      }
    });
  }, [drivers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const complete = drivers.filter(d => {
      const steps = calculateOnboardingSteps(d);
      return steps.every(s => s.isComplete);
    }).length;
    const active = drivers.filter(d => d.total_courses > 0).length;
    const pendingPayment = drivers.filter(d => !d.subscription_paid && !d.free_access_granted).length;
    
    return { total, complete, active, pendingPayment };
  }, [drivers]);

  return (
    <div className="space-y-4">
      {/* Stats Cards - Compact Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{isLoading ? "-" : stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{isLoading ? "-" : stats.complete}</p>
              <p className="text-[10px] text-muted-foreground">Complets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{isLoading ? "-" : stats.active}</p>
              <p className="text-[10px] text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{isLoading ? "-" : stats.pendingPayment}</p>
              <p className="text-[10px] text-muted-foreground">Sans paiement</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              Suivi complet des chauffeurs
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Parcours d'inscription et évolution
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-3">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="onboarding" className="text-xs gap-1 px-2">
                <Settings className="w-3 h-3" />
                <span className="hidden xs:inline">Parcours</span> inscription
              </TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs gap-1 px-2">
                <TrendingUp className="w-3 h-3" />
                Évolution <span className="hidden xs:inline">activité</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters - Compact */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 sm:w-36 h-8 text-xs">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">&lt;25%</SelectItem>
                <SelectItem value="beginner">25-49%</SelectItem>
                <SelectItem value="inprogress">50-74%</SelectItem>
                <SelectItem value="advanced">75-99%</SelectItem>
                <SelectItem value="complete">100%</SelectItem>
                <SelectItem value="active">Avec courses</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drivers List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <>
                <DriverCardSkeleton />
                <DriverCardSkeleton />
                <DriverCardSkeleton />
              </>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Aucun chauffeur trouvé
              </div>
            ) : (
              filteredDrivers.map(driver => {
                const steps = calculateOnboardingSteps(driver);
                const completedCount = steps.filter(s => s.isComplete).length;
                const percentage = Math.round((completedCount / steps.length) * 100);
                const { message: blockedMessage } = getBlockedInfo(steps);
                const isExpanded = expandedDriver === driver.id;

                const coursesLevel = getEvolutionLevel(driver.total_courses);
                const clientsLevel = getEvolutionLevel(driver.total_clients);
                const scansLevel = getEvolutionLevel(driver.total_scans);

                return (
                  <Collapsible
                    key={driver.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedDriver(isExpanded ? null : driver.id)}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {/* Avatar - Smaller */}
                          {driver.profile_photo_url ? (
                            <img
                              src={driver.profile_photo_url}
                              alt={driver.full_name}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}

                          {/* Info - Compact */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="font-medium truncate text-sm leading-tight">{driver.full_name}</h4>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {percentage}%
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate leading-tight">{driver.email}</p>
                            
                            {/* Blocked step or Evolution */}
                            {activeTab === "onboarding" ? (
                              <div className={`mt-1.5 px-1.5 py-1 rounded text-[10px] font-medium leading-tight ${
                                percentage === 100 ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                              }`}>
                                {blockedMessage}
                              </div>
                            ) : (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                <Badge variant="secondary" className={`${coursesLevel.color} text-[9px] px-1 py-0 h-4 gap-0.5`}>
                                  {coursesLevel.icon}
                                  {coursesLevel.level}
                                </Badge>
                                <Badge variant="secondary" className={`${clientsLevel.color} text-[9px] px-1 py-0 h-4 gap-0.5`}>
                                  {clientsLevel.icon}
                                  {clientsLevel.level}
                                </Badge>
                                <Badge variant="secondary" className={`${scansLevel.color} text-[9px] px-1 py-0 h-4 gap-0.5`}>
                                  {scansLevel.icon}
                                  {scansLevel.level}
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Expand */}
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        {/* Progress Bar - Compact */}
                        <div className="mt-2">
                          <Progress value={percentage} className="h-1.5" />
                          <div className="flex justify-between mt-0.5">
                            {steps.map((step, idx) => (
                              <TooltipProvider key={step.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={`w-1 h-1 rounded-full ${
                                        step.isComplete ? "bg-green-500" :
                                        step.status === "pending" ? "bg-yellow-500" :
                                        idx === steps.findIndex(s => !s.isComplete && s.status !== "pending")
                                          ? "bg-orange-500"
                                          : "bg-muted-foreground/30"
                                      }`}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    <p className="font-medium">{step.label}</p>
                                    {step.details && <p className="text-muted-foreground">{step.details}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </div>
                      </CardContent>

                      <CollapsibleContent>
                        <div className="px-3 pb-3 border-t pt-3 bg-muted/30">
                          {activeTab === "onboarding" ? (
                            <>
                              <p className="text-xs font-medium mb-2">Étapes ({completedCount}/{steps.length})</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                                {steps.map(step => (
                                  <TooltipProvider key={step.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={`flex items-center gap-1 p-1.5 rounded border text-[10px] ${
                                          step.isComplete ? "bg-green-500/10 border-green-500/20 text-green-600" :
                                          step.status === "pending" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600" :
                                          "bg-muted border-border text-muted-foreground"
                                        }`}>
                                          {step.isComplete ? <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" /> :
                                           step.status === "pending" ? <Clock className="w-2.5 h-2.5 flex-shrink-0" /> :
                                           <XCircle className="w-2.5 h-2.5 flex-shrink-0" />}
                                          <span className="truncate">{step.label}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">{step.label}</p>
                                        <p className="text-xs">{step.description}</p>
                                        {step.details && <p className="text-xs text-muted-foreground">{step.details}</p>}
                                        {step.completedAt && (
                                          <p className="text-xs text-muted-foreground">
                                            {format(new Date(step.completedAt), "d MMM yyyy", { locale: fr })}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-medium mb-2">Activité</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 rounded border bg-background text-center">
                                  <Activity className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                                  <Badge className={`${coursesLevel.color} bg-transparent border text-[9px] px-1`}>
                                    {coursesLevel.level}
                                  </Badge>
                                  {driver.first_course_at && (
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                      {format(new Date(driver.first_course_at), "d/MM", { locale: fr })}
                                    </p>
                                  )}
                                </div>
                                <div className="p-2 rounded border bg-background text-center">
                                  <UserPlus className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                                  <Badge className={`${clientsLevel.color} bg-transparent border text-[9px] px-1`}>
                                    {clientsLevel.level}
                                  </Badge>
                                  {driver.first_client_at && (
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                      {format(new Date(driver.first_client_at), "d/MM", { locale: fr })}
                                    </p>
                                  )}
                                </div>
                                <div className="p-2 rounded border bg-background text-center">
                                  <ScanLine className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                                  <Badge className={`${scansLevel.color} bg-transparent border text-[9px] px-1`}>
                                    {scansLevel.level}
                                  </Badge>
                                  {driver.first_scan_at && (
                                    <p className="text-[9px] text-muted-foreground mt-1">
                                      {format(new Date(driver.first_scan_at), "d/MM", { locale: fr })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                Dernière activité: {driver.last_activity 
                                  ? formatDistanceToNow(new Date(driver.last_activity), { addSuffix: true, locale: fr })
                                  : "Aucune"}
                              </div>
                            </>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProgressionTracker;
