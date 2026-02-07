import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  ArrowUpRight,
  ArrowDownRight,
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
  // Stats (no numbers shown, just levels)
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

// Evolution level helper
const getEvolutionLevel = (count: number): { level: string; icon: React.ReactNode; color: string } => {
  if (count === 0) return { level: "Inactif", icon: <Minus className="w-3 h-3" />, color: "text-muted-foreground" };
  if (count <= 5) return { level: "Débutant", icon: <Zap className="w-3 h-3" />, color: "text-blue-500" };
  if (count <= 15) return { level: "En progression", icon: <TrendingUp className="w-3 h-3" />, color: "text-cyan-500" };
  if (count <= 30) return { level: "Confirmé", icon: <Star className="w-3 h-3" />, color: "text-yellow-500" };
  if (count <= 50) return { level: "Avancé", icon: <Award className="w-3 h-3" />, color: "text-orange-500" };
  return { level: "Expert", icon: <Flame className="w-3 h-3" />, color: "text-red-500" };
};

// Trend helper (comparing current activity to past)
const getTrend = (recentCount: number, olderCount: number): { icon: React.ReactNode; color: string; label: string } => {
  if (recentCount > olderCount) return { icon: <ArrowUpRight className="w-3 h-3" />, color: "text-green-500", label: "En hausse" };
  if (recentCount < olderCount) return { icon: <ArrowDownRight className="w-3 h-3" />, color: "text-red-500", label: "En baisse" };
  return { icon: <Minus className="w-3 h-3" />, color: "text-muted-foreground", label: "Stable" };
};

const DriverProgressionTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"onboarding" | "evolution">("onboarding");

  const { data: drivers = [], isLoading, refetch, isRefetching, error: queryError } = useQuery({
    queryKey: ["admin-driver-progression"],
    queryFn: async () => {
      // Essayer d'abord avec la fonction RPC
      try {
        const { data, error } = await supabase.rpc('get_admin_drivers_progression');
        
        if (!error && data && data.length > 0) {
          return await enrichDriversWithStats(data);
        }
        
        // Si RPC échoue ou retourne vide, utiliser requête directe
        console.warn("RPC failed or empty, using direct query:", error?.message);
      } catch (rpcError) {
        console.warn("RPC exception, falling back to direct query:", rpcError);
      }
      
      // FALLBACK: Requête directe (admin vérifié côté frontend)
      const { data: driversData, error: driversError } = await supabase
        .from("drivers")
        .select(`
          id,
          user_id,
          company_name,
          created_at,
          subscription_status,
          subscription_paid,
          has_nfc_plate,
          nfc_plate_ordered_at,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          vehicle_color,
          base_fare,
          per_km_rate,
          hourly_rate,
          working_sectors,
          service_description,
          siret,
          company_address,
          max_passengers,
          registration_step,
          status,
          documents_status,
          free_access_granted,
          billing_type,
          stripe_connect_status,
          wants_tpe_affiliate,
          tpe_received_at,
          trial_activated_at,
          trial_ready_to_start,
          objectives_completed,
          onboarding_objectives_completed,
          onboarding_step
        `)
        .eq("is_demo_account", false)
        .order("created_at", { ascending: false });
        
      if (driversError) {
        console.error("Direct query failed:", driversError);
        throw driversError;
      }
      
      // Récupérer les profils séparément
      const userIds = driversData?.map(d => d.user_id).filter(Boolean) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url, phone, email")
        .in("id", userIds);
        
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      // Fusionner les données
      const mergedData = (driversData || []).map(driver => {
        const profile = profilesMap.get(driver.user_id);
        return {
          ...driver,
          trial_started_at: driver.trial_activated_at, // Mapper le nom de colonne
          full_name: profile?.full_name || 'Non renseigné',
          profile_photo_url: profile?.profile_photo_url,
          phone: profile?.phone,
          email: profile?.email || 'email@inconnu.com',
        };
      });
      
      return await enrichDriversWithStats(mergedData);
    },
    staleTime: 30000,
    retry: 2,
  });
  
  // Fonction helper pour enrichir avec les stats
  const enrichDriversWithStats = async (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    const driversWithStats = await Promise.all(
      data.map(async (driver: any) => {
        // Courses count
        const { count: coursesCount } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("driver_id", driver.id);

        // Clients count
        const { count: clientsCount } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("driver_id", driver.id);

        // QR codes count
        const { count: qrCount } = await supabase
          .from("qr_codes")
          .select("*", { count: "exact", head: true })
          .eq("driver_id", driver.id);

        // First course
        const { data: firstCourse } = await supabase
          .from("courses")
          .select("created_at")
          .eq("driver_id", driver.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        // Last activity
        const { data: lastCourse } = await supabase
          .from("courses")
          .select("created_at")
          .eq("driver_id", driver.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // First QR code
        const { data: firstQr } = await supabase
          .from("qr_codes")
          .select("created_at")
          .eq("driver_id", driver.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        // First client
        const { data: firstClient } = await supabase
          .from("clients")
          .select("created_at")
          .eq("driver_id", driver.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        return {
          ...driver,
          total_courses: coursesCount || 0,
          total_clients: clientsCount || 0,
          total_scans: qrCount || 0,
          last_activity: lastCourse?.created_at || null,
          first_course_at: firstCourse?.created_at || null,
          first_scan_at: firstQr?.created_at || null,
          first_client_at: firstClient?.created_at || null,
        };
      })
    );

    return driversWithStats as DriverFullData[];
  };

  // Calculate ALL onboarding steps
  const calculateOnboardingSteps = (driver: DriverFullData): OnboardingStep[] => {
    const steps: OnboardingStep[] = [
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
        label: "Infos de base",
        description: "Nom, téléphone, email",
        icon: <User className="w-4 h-4" />,
        isComplete: !!driver.full_name && !!driver.phone,
        status: (driver.full_name && driver.phone) ? "complete" : "incomplete",
        details: !driver.phone ? "Téléphone manquant" : undefined,
      },
      {
        id: "profile_photo",
        label: "Photo de profil",
        description: "Photo professionnelle",
        icon: <Image className="w-4 h-4" />,
        isComplete: !!driver.profile_photo_url,
        status: driver.profile_photo_url ? "complete" : "incomplete",
      },
      {
        id: "company_info",
        label: "Entreprise",
        description: "SIRET, adresse",
        icon: <FileText className="w-4 h-4" />,
        isComplete: !!driver.siret && !!driver.company_address,
        status: (driver.siret && driver.company_address) ? "complete" : 
          (driver.siret || driver.company_address) ? "warning" : "incomplete",
        details: !driver.siret ? "SIRET manquant" : !driver.company_address ? "Adresse manquante" : undefined,
      },
      {
        id: "vehicle",
        label: "Véhicule",
        description: "Marque, modèle, immatriculation",
        icon: <Car className="w-4 h-4" />,
        isComplete: !!driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && !!driver.vehicle_plate,
        status: (driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && driver.vehicle_plate) ? "complete" :
          (driver.vehicle_brand || driver.vehicle_plate) ? "warning" : "incomplete",
        details: !driver.vehicle_plate ? "Immatriculation manquante" : !driver.vehicle_brand ? "Marque manquante" : undefined,
      },
      {
        id: "sectors",
        label: "Secteurs",
        description: "Zones de travail",
        icon: <MapPin className="w-4 h-4" />,
        isComplete: !!driver.working_sectors && driver.working_sectors.length > 0,
        status: (driver.working_sectors && driver.working_sectors.length > 0) ? "complete" : "incomplete",
      },
      {
        id: "description",
        label: "Description",
        description: "Présentation du service",
        icon: <FileText className="w-4 h-4" />,
        isComplete: !!driver.service_description,
        status: driver.service_description ? "complete" : "incomplete",
      },
      {
        id: "billing_choice",
        label: "Facturation",
        description: "Choix du mode de paiement",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: !!driver.billing_type,
        status: driver.billing_type ? "complete" : "incomplete",
        details: driver.billing_type === "stripe_connect" ? "Stripe Connect" : 
          driver.billing_type === "own_equipment" ? (driver.wants_tpe_affiliate ? "TPE affilié" : "Matériel propre") : undefined,
      },
      {
        id: "stripe_setup",
        label: "Config Stripe",
        description: "Compte Stripe Connect",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.billing_type !== "stripe_connect" || driver.stripe_connect_status === "active",
        status: driver.billing_type !== "stripe_connect" ? "complete" :
          driver.stripe_connect_status === "active" ? "complete" :
          driver.stripe_connect_status === "pending" ? "pending" : "incomplete",
        details: driver.billing_type === "stripe_connect" ? 
          (driver.stripe_connect_status === "active" ? "Actif" : 
           driver.stripe_connect_status === "pending" ? "En attente de validation" : "À configurer") : "Non requis",
      },
      {
        id: "tpe_received",
        label: "Réception TPE",
        description: "Matériel de paiement reçu",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.billing_type !== "own_equipment" || !driver.wants_tpe_affiliate || !!driver.tpe_received_at,
        status: (driver.billing_type !== "own_equipment" || !driver.wants_tpe_affiliate) ? "complete" :
          driver.tpe_received_at ? "complete" : "pending",
        completedAt: driver.tpe_received_at,
        details: driver.wants_tpe_affiliate ? 
          (driver.tpe_received_at ? "Reçu" : "En attente de réception") : "Non requis",
      },
      {
        id: "pricing",
        label: "Tarification",
        description: "Tarifs configurés",
        icon: <DollarSign className="w-4 h-4" />,
        isComplete: !!driver.base_fare || !!driver.per_km_rate || !!driver.hourly_rate,
        status: (driver.base_fare || driver.per_km_rate || driver.hourly_rate) ? "complete" : "incomplete",
      },
      {
        id: "documents",
        label: "Documents",
        description: "Pièces justificatives",
        icon: <FileText className="w-4 h-4" />,
        isComplete: driver.documents_status === "validated",
        status: driver.documents_status === "validated" ? "complete" :
          driver.documents_status === "submitted" || driver.documents_status === "pending" ? "pending" : "incomplete",
        details: driver.documents_status === "validated" ? "Validés" :
          driver.documents_status === "submitted" ? "En attente validation" :
          driver.documents_status === "pending" ? "Soumis" : "À soumettre",
      },
      {
        id: "objectives",
        label: "Objectifs",
        description: "Définition des objectifs",
        icon: <Target className="w-4 h-4" />,
        isComplete: driver.objectives_completed || driver.onboarding_objectives_completed,
        status: (driver.objectives_completed || driver.onboarding_objectives_completed) ? "complete" : "incomplete",
      },
      {
        id: "nfc_ordered",
        label: "Plaque NFC commandée",
        description: "Commande de la plaque",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: !!driver.nfc_plate_ordered_at || driver.has_nfc_plate,
        status: driver.has_nfc_plate ? "complete" : driver.nfc_plate_ordered_at ? "pending" : "incomplete",
        completedAt: driver.nfc_plate_ordered_at,
        details: driver.has_nfc_plate ? "Reçue" : driver.nfc_plate_ordered_at ? "En livraison" : "Non commandée",
      },
      {
        id: "nfc_received",
        label: "Plaque NFC reçue",
        description: "Réception et activation",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.has_nfc_plate,
        status: driver.has_nfc_plate ? "complete" : "incomplete",
      },
      {
        id: "trial_started",
        label: "Essai démarré",
        description: "Période d'essai 14 jours",
        icon: <PlayCircle className="w-4 h-4" />,
        isComplete: !!driver.trial_started_at,
        status: driver.trial_started_at ? "complete" :
          driver.trial_ready_to_start ? "pending" : "incomplete",
        completedAt: driver.trial_started_at,
        details: driver.trial_started_at ? 
          `Démarré le ${format(new Date(driver.trial_started_at), "d MMM", { locale: fr })}` :
          driver.trial_ready_to_start ? "Prêt à démarrer" : "En attente",
      },
      {
        id: "payment",
        label: "Paiement",
        description: "Abonnement activé",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.subscription_paid || driver.free_access_granted,
        status: (driver.subscription_paid || driver.free_access_granted) ? "complete" : "incomplete",
        details: driver.subscription_paid ? "Payé" : driver.free_access_granted ? "Accès gratuit" : "Non payé",
      },
      {
        id: "first_scan",
        label: "Premier scan",
        description: "QR code scanné",
        icon: <ScanLine className="w-4 h-4" />,
        isComplete: !!driver.first_scan_at,
        status: driver.first_scan_at ? "complete" : "incomplete",
        completedAt: driver.first_scan_at,
      },
      {
        id: "first_client",
        label: "Premier client",
        description: "Client ajouté",
        icon: <UserPlus className="w-4 h-4" />,
        isComplete: !!driver.first_client_at,
        status: driver.first_client_at ? "complete" : "incomplete",
        completedAt: driver.first_client_at,
      },
      {
        id: "first_course",
        label: "Première course",
        description: "Course réalisée",
        icon: <Activity className="w-4 h-4" />,
        isComplete: !!driver.first_course_at,
        status: driver.first_course_at ? "complete" : "incomplete",
        completedAt: driver.first_course_at,
      },
    ];

    return steps;
  };

  // Find where driver is blocked
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

  // Filter drivers
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

  // Stats
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.complete}</p>
                <p className="text-xs text-muted-foreground">Complets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayment}</p>
                <p className="text-xs text-muted-foreground">Sans paiement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Suivi complet des chauffeurs
              </CardTitle>
              <CardDescription>
                Parcours d'inscription et évolution
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="onboarding">
                <Settings className="w-4 h-4 mr-2" />
                Parcours inscription
              </TabsTrigger>
              <TabsTrigger value="evolution">
                <TrendingUp className="w-4 h-4 mr-2" />
                Évolution activité
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">Nouveaux (&lt;25%)</SelectItem>
                <SelectItem value="beginner">Débutants (25-49%)</SelectItem>
                <SelectItem value="inprogress">En cours (50-74%)</SelectItem>
                <SelectItem value="advanced">Avancés (75-99%)</SelectItem>
                <SelectItem value="complete">Complets (100%)</SelectItem>
                <SelectItem value="active">Avec courses</SelectItem>
                <SelectItem value="inactive">Inactifs (+7j)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drivers List */}
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun chauffeur trouvé
                </div>
              ) : (
                filteredDrivers.map(driver => {
                  const steps = calculateOnboardingSteps(driver);
                  const completedCount = steps.filter(s => s.isComplete).length;
                  const percentage = Math.round((completedCount / steps.length) * 100);
                  const { message: blockedMessage } = getBlockedInfo(steps);
                  const isExpanded = expandedDriver === driver.id;

                  // Evolution levels
                  const coursesLevel = getEvolutionLevel(driver.total_courses);
                  const clientsLevel = getEvolutionLevel(driver.total_clients);
                  const scansLevel = getEvolutionLevel(driver.total_scans);

                  return (
                    <Collapsible
                      key={driver.id}
                      open={isExpanded}
                      onOpenChange={() => setExpandedDriver(isExpanded ? null : driver.id)}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            {driver.profile_photo_url ? (
                              <img
                                src={driver.profile_photo_url}
                                alt={driver.full_name}
                                className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold truncate text-sm">{driver.full_name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {percentage}%
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{driver.email}</p>
                              
                              {/* Blocked step or Evolution based on tab */}
                              {activeTab === "onboarding" ? (
                                <div className={`mt-2 px-2 py-1.5 rounded-md text-xs font-medium ${
                                  percentage === 100 ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                                }`}>
                                  {blockedMessage}
                                </div>
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="secondary" className={`${coursesLevel.color} flex items-center gap-1`}>
                                          {coursesLevel.icon}
                                          Courses: {coursesLevel.level}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>Niveau d'activité courses</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="secondary" className={`${clientsLevel.color} flex items-center gap-1`}>
                                          {clientsLevel.icon}
                                          Clients: {clientsLevel.level}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>Niveau de clientèle</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="secondary" className={`${scansLevel.color} flex items-center gap-1`}>
                                          {scansLevel.icon}
                                          Scans: {scansLevel.level}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>Niveau de scans QR</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </div>

                            {/* Progress/Expand */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-2">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-3">
                            <Progress value={percentage} className="h-2" />
                            <div className="flex justify-between mt-1">
                              {steps.map((step, idx) => (
                                <TooltipProvider key={step.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          step.isComplete ? "bg-green-500" :
                                          step.status === "pending" ? "bg-yellow-500" :
                                          idx === steps.findIndex(s => !s.isComplete && s.status !== "pending")
                                            ? "bg-orange-500 ring-2 ring-orange-500/30"
                                            : "bg-muted-foreground/30"
                                        }`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <p className="font-medium">{step.label}</p>
                                      <p className="text-xs text-muted-foreground">{step.description}</p>
                                      {step.details && <p className="text-xs mt-1">{step.details}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </div>
                        </CardContent>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t pt-4 bg-muted/30">
                            {activeTab === "onboarding" ? (
                              <>
                                {/* All Steps Grid */}
                                <p className="text-sm font-medium mb-3">Toutes les étapes ({completedCount}/{steps.length})</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                                  {steps.map(step => (
                                    <TooltipProvider key={step.id}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs ${
                                            step.isComplete ? "bg-green-500/10 border-green-500/20 text-green-600" :
                                            step.status === "pending" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600" :
                                            "bg-muted border-border text-muted-foreground"
                                          }`}>
                                            {step.isComplete ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> :
                                             step.status === "pending" ? <Clock className="w-3 h-3 flex-shrink-0" /> :
                                             <XCircle className="w-3 h-3 flex-shrink-0" />}
                                            <span className="truncate">{step.label}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-medium">{step.label}</p>
                                          <p className="text-xs">{step.description}</p>
                                          {step.details && <p className="text-xs text-muted-foreground mt-1">{step.details}</p>}
                                          {step.completedAt && (
                                            <p className="text-xs text-muted-foreground mt-1">
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
                                {/* Evolution Details */}
                                <p className="text-sm font-medium mb-3">Progression d'activité</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="p-3 rounded-lg border bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Activity className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">Courses</span>
                                    </div>
                                    <Badge className={`${coursesLevel.color} bg-transparent border`}>
                                      {coursesLevel.icon}
                                      <span className="ml-1">{coursesLevel.level}</span>
                                    </Badge>
                                    {driver.first_course_at && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        1ère: {format(new Date(driver.first_course_at), "d MMM", { locale: fr })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="p-3 rounded-lg border bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <UserPlus className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">Clients</span>
                                    </div>
                                    <Badge className={`${clientsLevel.color} bg-transparent border`}>
                                      {clientsLevel.icon}
                                      <span className="ml-1">{clientsLevel.level}</span>
                                    </Badge>
                                    {driver.first_client_at && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        1er: {format(new Date(driver.first_client_at), "d MMM", { locale: fr })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="p-3 rounded-lg border bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ScanLine className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium">Scans</span>
                                    </div>
                                    <Badge className={`${scansLevel.color} bg-transparent border`}>
                                      {scansLevel.icon}
                                      <span className="ml-1">{scansLevel.level}</span>
                                    </Badge>
                                    {driver.first_scan_at && (
                                      <p className="text-xs text-muted-foreground mt-2">
                                        1er: {format(new Date(driver.first_scan_at), "d MMM", { locale: fr })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Last activity */}
                                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProgressionTracker;
