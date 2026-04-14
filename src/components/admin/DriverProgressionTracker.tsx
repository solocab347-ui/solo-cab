import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  RefreshCw,
  Users,
  Loader2,
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
  Compass,
  Wallet,
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
  vehicle_plate: string | null;
  base_fare: number | null;
  per_km_rate: number | null;
  siret: string | null;
  status: string;
  documents_status: string | null;
  profile_photo_url: string | null;
  full_name: string;
  phone: string | null;
  email: string;
  free_access_granted: boolean;
  billing_type: string | null;
  stripe_connect_status: string | null;
  trial_started_at: string | null;
  trial_status: string | null;
  objectives_completed: boolean;
  onboarding_objectives_completed: boolean;
  onboarding_settings_completed: boolean;
  onboarding_profile_completed: boolean;
  onboarding_documents_completed: boolean;
  onboarding_step: string | null;
  onboarding_completed: boolean;
  last_seen_at: string | null;
  total_courses: number;
  total_clients: number;
  total_scans: number;
  last_activity: string | null;
  first_course_at: string | null;
  first_scan_at: string | null;
  first_client_at: string | null;
}

// Les 6 vraies étapes du tunnel d'onboarding (synchronisé avec SimplifiedOnboardingTunnel)
const TUNNEL_STEPS = [
  { id: "profile", label: "Profil", icon: User },
  { id: "vehicle", label: "Véhicule", icon: TrendingUp },
  { id: "pricing", label: "Tarifs", icon: Settings },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "stripe", label: "Paiements", icon: Wallet },
  { id: "validation", label: "Lancement", icon: PlayCircle },
];

interface OnboardingStep {
  id: string;
  label: string;
  isComplete: boolean;
  status: "complete" | "incomplete" | "current" | "pending";
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

// Calcul de l'étape actuelle basé sur onboarding_step
const getStepIndex = (stepId: string | null): number => {
  if (!stepId) return -1;
  
  const numericValue = parseInt(stepId, 10);
  if (!isNaN(numericValue) && numericValue >= 0 && numericValue < TUNNEL_STEPS.length) {
    return numericValue;
  }
  
  const idx = TUNNEL_STEPS.findIndex(s => s.id === stepId);
  if (idx >= 0) return idx;
  
  const stepMapping: Record<string, number> = {
    "profile": 0, "public_profile": 0,
    "vehicle": 1, "vehicule": 1,
    "pricing": 2, "tarifs": 2, "settings": 2,
    "documents": 3, "docs": 3,
    "stripe": 4, "payment": 4, "billing": 4, "encaissements": 4,
    "validation": 5, "launch": 5, "lancement": 5, "trial_start": 5, "trial": 5,
    "completed": 6, "complete": 6, "done": 6,
  };
  
  return stepMapping[stepId.toLowerCase()] ?? -1;
};

const DriverProgressionTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"onboarding" | "evolution">("onboarding");

  // Fetch optimisé
  const { data: drivers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-driver-progression-v2"],
    queryFn: async () => {
      // D'abord, essayer la RPC optimisée
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_drivers_with_stats');
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData as unknown as DriverFullData[];
      }
      
      // Fallback: requête directe
      console.warn("RPC failed, using fallback query:", rpcError?.message);
      
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select(`
          id, user_id, company_name, created_at, subscription_status, subscription_paid,
          has_nfc_plate, nfc_plate_ordered_at, vehicle_brand, vehicle_plate,
          base_fare, per_km_rate, siret, status, documents_status, free_access_granted, 
          billing_type, stripe_connect_status, trial_activated_at, trial_status,
          objectives_completed, onboarding_objectives_completed, onboarding_settings_completed,
          onboarding_profile_completed, onboarding_documents_completed, onboarding_step, onboarding_completed
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
        trial_status: (driver as any).trial_status || 'pending',
        onboarding_settings_completed: (driver as any).onboarding_settings_completed || false,
        onboarding_profile_completed: (driver as any).onboarding_profile_completed || false,
        onboarding_documents_completed: (driver as any).onboarding_documents_completed || false,
        onboarding_completed: (driver as any).onboarding_completed || false,
        full_name: profilesMap.get(driver.user_id)?.full_name || 'Non renseigné',
        profile_photo_url: profilesMap.get(driver.user_id)?.profile_photo_url,
        phone: profilesMap.get(driver.user_id)?.phone,
        email: profilesMap.get(driver.user_id)?.email || 'email@inconnu.com',
        last_seen_at: (driver as any).last_seen_at || null,
        total_courses: 0,
        total_clients: 0,
        total_scans: 0,
        last_activity: null,
        first_course_at: null,
        first_scan_at: null,
        first_client_at: null,
      })) as unknown as DriverFullData[];
    },
    staleTime: 60000,
    retry: 1,
  });

  // Calculer les étapes basées sur le vrai tunnel
  const calculateOnboardingSteps = (driver: DriverFullData): OnboardingStep[] => {
    const currentStepIndex = getStepIndex(driver.onboarding_step);
    const isComplete = driver.onboarding_completed;
    
    // Le paiement réel = trial démarré OU abonnement actif avec subscription_paid ET pas en trial pending
    const hasRealPayment = !!driver.trial_started_at || 
      (driver.subscription_paid && driver.trial_status === 'active') ||
      driver.free_access_granted;
    
    // Déterminer l'étape actuelle
    // currentStepIndex: -1 = pas commencé, 0-7 = en cours, 8+ = terminé
    const stepIdx = currentStepIndex;
    const hasStarted = stepIdx >= 0;
    
    return [
      {
        id: "vision",
        label: "Vision",
        isComplete: isComplete || stepIdx > 0 || driver.onboarding_objectives_completed,
        status: (!hasStarted && !driver.onboarding_objectives_completed) ? "current" :
          stepIdx === 0 && !isComplete ? "current" : 
          (stepIdx > 0 || isComplete || driver.onboarding_objectives_completed) ? "complete" : "incomplete",
      },
      {
        id: "goals",
        label: "Objectifs",
        isComplete: isComplete || stepIdx > 1 || driver.objectives_completed,
        status: stepIdx === 1 && !isComplete ? "current" :
          (isComplete || stepIdx > 1 || driver.objectives_completed) ? "complete" : "incomplete",
      },
      {
        id: "settings",
        label: "Tarifs",
        isComplete: isComplete || stepIdx > 2 || driver.onboarding_settings_completed || !!(driver.base_fare && driver.per_km_rate),
        status: stepIdx === 2 && !isComplete ? "current" :
          (isComplete || stepIdx > 2 || driver.onboarding_settings_completed || !!(driver.base_fare && driver.per_km_rate)) ? "complete" : "incomplete",
        details: driver.base_fare ? `${driver.base_fare}€ base` : undefined,
      },
      {
        id: "profile",
        label: "Profil",
        isComplete: isComplete || stepIdx > 3 || driver.onboarding_profile_completed || !!driver.profile_photo_url,
        status: stepIdx === 3 && !isComplete ? "current" :
          (isComplete || stepIdx > 3 || driver.onboarding_profile_completed || !!driver.profile_photo_url) ? "complete" : "incomplete",
      },
      {
        id: "documents",
        label: "Documents",
        isComplete: driver.documents_status === "validated",
        status: driver.documents_status === "validated" ? "complete" :
          driver.documents_status === "submitted" ? "pending" :
          stepIdx === 4 && !isComplete ? "current" : "incomplete",
        details: driver.documents_status === "validated" ? "Validés" :
          driver.documents_status === "submitted" ? "En attente admin" : "À déposer",
      },
      {
        id: "nfc",
        label: "NFC",
        isComplete: driver.has_nfc_plate,
        status: driver.has_nfc_plate ? "complete" : 
          driver.nfc_plate_ordered_at ? "pending" :
          stepIdx === 5 && !isComplete ? "current" : "incomplete",
        details: driver.has_nfc_plate ? "Reçue" : driver.nfc_plate_ordered_at ? "Commandée" : "Non",
      },
      {
        id: "billing",
        label: "Encaissements",
        isComplete: !!driver.billing_type,
        status: driver.billing_type ? "complete" :
          stepIdx === 6 && !isComplete ? "current" : "incomplete",
        details: driver.billing_type === "solocab_stripe" ? "Stripe" : 
          driver.billing_type === "own_equipment" ? "TPE propre" : undefined,
      },
      {
        id: "trial_start",
        label: "Lancement",
        isComplete: hasRealPayment,
        status: hasRealPayment ? "complete" :
          stepIdx === 7 && !isComplete ? "current" :
          driver.documents_status !== "validated" ? "incomplete" : "pending",
        details: hasRealPayment ? (driver.free_access_granted ? "Gratuit" : "Essai actif") : 
          driver.documents_status !== "validated" ? "Docs requis" : "Prêt à lancer",
      },
    ];
  };

  // Calculer les étapes post-onboarding
  const calculatePostSteps = (driver: DriverFullData): OnboardingStep[] => {
    return [
      {
        id: "first_scan",
        label: "1er scan",
        isComplete: !!driver.first_scan_at || driver.total_scans > 0,
        status: (driver.first_scan_at || driver.total_scans > 0) ? "complete" : "incomplete",
      },
      {
        id: "first_client",
        label: "1er client",
        isComplete: !!driver.first_client_at || driver.total_clients > 0,
        status: (driver.first_client_at || driver.total_clients > 0) ? "complete" : "incomplete",
      },
      {
        id: "first_course",
        label: "1re course",
        isComplete: !!driver.first_course_at || driver.total_courses > 0,
        status: (driver.first_course_at || driver.total_courses > 0) ? "complete" : "incomplete",
      },
    ];
  };

  const getBlockedInfo = (steps: OnboardingStep[]): { step: OnboardingStep | null; message: string } => {
    const currentStep = steps.find(s => s.status === "current");
    const pendingStep = steps.find(s => s.status === "pending");
    const allComplete = steps.every(s => s.isComplete);
    
    if (allComplete) {
      return { step: null, message: "✅ Tunnel complet" };
    }
    
    if (currentStep) {
      return { step: currentStep, message: `📍 ${currentStep.label}${currentStep.details ? ` - ${currentStep.details}` : ""}` };
    }
    
    if (pendingStep) {
      return { step: pendingStep, message: `⏳ ${pendingStep.label} - ${pendingStep.details || "En attente"}` };
    }
    
    // Fallback: trouver la première étape incomplète
    const firstIncomplete = steps.find(s => !s.isComplete);
    if (firstIncomplete) {
      return { step: firstIncomplete, message: `📍 ${firstIncomplete.label}${firstIncomplete.details ? ` - ${firstIncomplete.details}` : " - À compléter"}` };
    }
    
    return { step: null, message: "✅ Tunnel complet" };
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
      
      // Vrai calcul du paiement
      const hasRealPayment = !!driver.trial_started_at || 
        (driver.subscription_paid && driver.trial_status === 'active') ||
        driver.free_access_granted;

      switch (statusFilter) {
        case "new": return matchesSearch && percentage < 25;
        case "inprogress": return matchesSearch && percentage >= 25 && percentage < 100;
        case "complete": return matchesSearch && percentage === 100;
        case "paid": return matchesSearch && hasRealPayment;
        case "unpaid": return matchesSearch && !hasRealPayment;
        case "docs_pending": return matchesSearch && driver.documents_status === "submitted";
        case "docs_missing": return matchesSearch && driver.documents_status === "pending";
        default: return matchesSearch;
      }
    });
  }, [drivers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = drivers.length;
    const tunnelComplete = drivers.filter(d => {
      const steps = calculateOnboardingSteps(d);
      return steps.every(s => s.isComplete);
    }).length;
    
    // VRAI calcul du paiement
    const realPaid = drivers.filter(d => 
      !!d.trial_started_at || 
      (d.subscription_paid && d.trial_status === 'active') ||
      d.free_access_granted
    ).length;
    
    const unpaid = total - realPaid;
    const docsPending = drivers.filter(d => d.documents_status === "submitted").length;
    
    return { total, tunnelComplete, realPaid, unpaid, docsPending };
  }, [drivers]);

  return (
    <div className="space-y-4">
      {/* Stats Cards - 4 colonnes sur desktop, 2 sur mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="bg-card/50">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{isLoading ? "-" : stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{isLoading ? "-" : stats.realPaid}</p>
              <p className="text-[10px] text-muted-foreground">Payés réels</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{isLoading ? "-" : stats.unpaid}</p>
              <p className="text-[10px] text-muted-foreground">Sans paiement</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{isLoading ? "-" : stats.docsPending}</p>
              <p className="text-[10px] text-muted-foreground">Docs à valider</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Suivi complet des chauffeurs
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Parcours d'inscription et évolution
          </p>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2 h-9">
              <TabsTrigger value="onboarding" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                inscription
              </TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                Évolution
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="Filtre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">Nouveaux</SelectItem>
                <SelectItem value="inprogress">En cours</SelectItem>
                <SelectItem value="complete">Terminé</SelectItem>
                <SelectItem value="paid">Payés</SelectItem>
                <SelectItem value="unpaid">Non payés</SelectItem>
                <SelectItem value="docs_pending">Docs en attente</SelectItem>
                <SelectItem value="docs_missing">Docs manquants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Légende des étapes */}
          <div className="flex flex-wrap gap-1">
            {TUNNEL_STEPS.map((step, idx) => (
              <Badge 
                key={step.id} 
                variant="outline" 
                className="text-[9px] px-1.5 py-0.5 gap-0.5"
              >
                <span className="w-3 h-3 rounded-full bg-muted inline-flex items-center justify-center text-[8px] font-bold">
                  {idx + 1}
                </span>
                {step.label}
              </Badge>
            ))}
          </div>

          {/* Driver List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
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
                const postSteps = calculatePostSteps(driver);
                const completedCount = steps.filter(s => s.isComplete).length;
                const percentage = Math.round((completedCount / steps.length) * 100);
                const blockedInfo = getBlockedInfo(steps);
                const isExpanded = expandedDriver === driver.id;
                
                // Vrai calcul du paiement
                const hasRealPayment = !!driver.trial_started_at || 
                  (driver.subscription_paid && driver.trial_status === 'active') ||
                  driver.free_access_granted;

                return (
                  <Card key={driver.id} className="overflow-hidden">
                    <Collapsible open={isExpanded} onOpenChange={() => setExpandedDriver(isExpanded ? null : driver.id)}>
                      <CardContent className="p-2.5">
                        <div className="flex items-start gap-2">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {driver.profile_photo_url ? (
                              <img 
                                src={driver.profile_photo_url} 
                                alt={driver.full_name}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            {/* Indicateur paiement */}
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center ${
                              hasRealPayment ? 'bg-green-500' : 'bg-amber-500'
                            }`}>
                              {hasRealPayment ? (
                                <CheckCircle2 className="w-2 h-2 text-white" />
                              ) : (
                                <XCircle className="w-2 h-2 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">{driver.full_name}</span>
                              <Badge 
                                variant={percentage === 100 ? "default" : "secondary"} 
                                className="text-[9px] px-1 py-0 h-4"
                              >
                                {percentage}%
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {driver.email}
                            </p>
                            {/* Bloqué où */}
                            <p className={`text-[10px] mt-0.5 ${
                              blockedInfo.step?.status === 'pending' ? 'text-amber-500' :
                              blockedInfo.step?.status === 'current' ? 'text-blue-500' :
                              'text-green-500'
                            }`}>
                              {blockedInfo.message}
                            </p>
                          </div>

                          {/* Toggle */}
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        {/* Progress bar avec points colorés */}
                        <div className="mt-2 relative">
                          <Progress value={percentage} className="h-1.5" />
                          <div className="absolute top-0 left-0 w-full flex justify-between" style={{ transform: 'translateY(-2px)' }}>
                            {steps.map((step, idx) => (
                              <TooltipProvider key={step.id}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={`w-2.5 h-2.5 rounded-full border-2 border-background ${
                                        step.status === 'complete' ? 'bg-green-500' :
                                        step.status === 'current' ? 'bg-blue-500' :
                                        step.status === 'pending' ? 'bg-amber-500' :
                                        'bg-muted'
                                      }`}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
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
                        <div className="px-2.5 pb-2.5 space-y-2">
                          {/* Étapes détaillées */}
                          <div className="text-[10px] font-medium text-muted-foreground">
                            Étapes ({completedCount}/{steps.length})
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {steps.map(step => {
                              const StepIcon = TUNNEL_STEPS.find(s => s.id === step.id)?.icon || Target;
                              return (
                                <div 
                                  key={step.id}
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded ${
                                    step.status === 'complete' ? 'bg-green-500/10 text-green-600' :
                                    step.status === 'current' ? 'bg-blue-500/10 text-blue-600 font-medium' :
                                    step.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                                    'bg-muted/50 text-muted-foreground'
                                  }`}
                                >
                                  {step.status === 'complete' ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : step.status === 'pending' ? (
                                    <Clock className="w-3 h-3" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  {step.label}
                                </div>
                              );
                            })}
                          </div>

                          {/* Évolution (si tab active) */}
                          {activeTab === "evolution" && (
                            <>
                              <div className="text-[10px] font-medium text-muted-foreground mt-2">
                                Après onboarding
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                {postSteps.map(step => (
                                  <div 
                                    key={step.id}
                                    className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded ${
                                      step.isComplete ? 'bg-green-500/10 text-green-600' : 'bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    {step.isComplete ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    {step.label}
                                  </div>
                                ))}
                              </div>

                              {/* Stats activité */}
                              <div className="flex gap-2 mt-1 text-[10px]">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Activity className="w-3 h-3" />
                                  {driver.total_courses} courses
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  {driver.total_clients} clients
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <ScanLine className="w-3 h-3" />
                                  {driver.total_scans} scans
                                </div>
                              </div>
                            </>
                          )}

                          {/* Infos supplémentaires */}
                          <div className="flex flex-wrap gap-2 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
                            <span>Inscrit {formatDistanceToNow(new Date(driver.created_at), { locale: fr, addSuffix: true })}</span>
                            {driver.last_seen_at && (
                              <span className="text-primary font-medium">
                                • Vu {formatDistanceToNow(new Date(driver.last_seen_at), { locale: fr, addSuffix: true })}
                              </span>
                            )}
                            {driver.company_name && <span>• {driver.company_name}</span>}
                            {driver.phone && <span>• {driver.phone}</span>}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
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
