import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

interface DriverOnboarding {
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
  total_courses: number;
  last_activity: string | null;
  free_access_granted: boolean;
}

interface OnboardingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  status: "complete" | "incomplete" | "warning";
}

const AdminDriverOnboardingTracker = () => {
  const [drivers, setDrivers] = useState<DriverOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
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
          profiles!inner(full_name, profile_photo_url, phone, email)
        `)
        .eq("is_demo_account", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch courses count for each driver
      const driversWithStats = await Promise.all(
        (data || []).map(async (driver: any) => {
          const { count } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })
            .eq("driver_id", driver.id);

          // Get last activity (last course or last login)
          const { data: lastCourse } = await supabase
            .from("courses")
            .select("created_at")
            .eq("driver_id", driver.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...driver,
            full_name: driver.profiles.full_name,
            profile_photo_url: driver.profiles.profile_photo_url,
            phone: driver.profiles.phone,
            email: driver.profiles.email,
            total_courses: count || 0,
            last_activity: lastCourse?.created_at || null,
          };
        })
      );

      setDrivers(driversWithStats);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateOnboardingProgress = (driver: DriverOnboarding): { 
    percentage: number; 
    steps: OnboardingStep[]; 
    currentStep: OnboardingStep | null;
    nextStep: OnboardingStep | null;
    blockedAt: string;
  } => {
    const steps: OnboardingStep[] = [
      {
        id: "inscription",
        label: "Inscription",
        icon: <User className="w-4 h-4" />,
        isComplete: true, // Always complete if they're in the DB
        status: "complete",
      },
      {
        id: "payment",
        label: "Paiement",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.subscription_paid || driver.free_access_granted,
        status: driver.subscription_paid || driver.free_access_granted ? "complete" : "incomplete",
      },
      {
        id: "documents",
        label: "Documents",
        icon: <FileText className="w-4 h-4" />,
        isComplete: driver.documents_status === "validated",
        status: driver.documents_status === "validated" 
          ? "complete" 
          : driver.documents_status === "submitted" || driver.documents_status === "pending"
            ? "warning"
            : "incomplete",
      },
      {
        id: "vehicle",
        label: "Véhicule",
        icon: <Car className="w-4 h-4" />,
        isComplete: !!driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && !!driver.vehicle_plate,
        status: (driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && driver.vehicle_plate) ? "complete" : "incomplete",
      },
      {
        id: "profile",
        label: "Profil",
        icon: <User className="w-4 h-4" />,
        isComplete: !!driver.profile_photo_url && !!driver.service_description,
        status: (driver.profile_photo_url && driver.service_description) ? "complete" : 
          (driver.profile_photo_url || driver.service_description) ? "warning" : "incomplete",
      },
      {
        id: "pricing",
        label: "Tarification",
        icon: <DollarSign className="w-4 h-4" />,
        isComplete: !!driver.base_fare && !!driver.per_km_rate,
        status: (driver.base_fare && driver.per_km_rate) ? "complete" : "incomplete",
      },
      {
        id: "nfc",
        label: "Plaque NFC",
        icon: <CreditCard className="w-4 h-4" />,
        isComplete: driver.has_nfc_plate,
        status: driver.has_nfc_plate ? "complete" : 
          driver.nfc_plate_ordered_at ? "warning" : "incomplete",
      },
      {
        id: "first_course",
        label: "1ère course",
        icon: <Activity className="w-4 h-4" />,
        isComplete: driver.total_courses > 0,
        status: driver.total_courses > 0 ? "complete" : "incomplete",
      },
    ];

    const completedSteps = steps.filter(s => s.isComplete).length;
    const percentage = Math.round((completedSteps / steps.length) * 100);
    
    // Find the first incomplete step (where the driver is blocked)
    const firstIncompleteIndex = steps.findIndex(s => !s.isComplete);
    const currentStep = firstIncompleteIndex > 0 ? steps[firstIncompleteIndex - 1] : null;
    const nextStep = firstIncompleteIndex >= 0 ? steps[firstIncompleteIndex] : null;
    
    // Create a clear message about where the driver is blocked
    let blockedAt = "";
    if (percentage === 100) {
      blockedAt = "✅ Profil complet";
    } else if (nextStep) {
      const stepMessages: Record<string, string> = {
        payment: "⏳ En attente du paiement",
        documents: driver.documents_status === "submitted" || driver.documents_status === "pending" 
          ? "📄 Documents en cours de validation"
          : "📄 Documents à soumettre",
        vehicle: "🚗 Véhicule à configurer",
        profile: driver.profile_photo_url 
          ? "👤 Description du profil manquante"
          : driver.service_description 
            ? "📷 Photo de profil manquante"
            : "👤 Profil à compléter",
        pricing: "💰 Tarification à configurer",
        nfc: driver.nfc_plate_ordered_at 
          ? "📦 Plaque NFC commandée (en attente)"
          : "🏷️ Plaque NFC à commander",
        first_course: "🚀 Prêt - en attente de la 1ère course",
      };
      blockedAt = stepMessages[nextStep.id] || `⏸️ Bloqué à: ${nextStep.label}`;
    }

    return { percentage, steps, currentStep, nextStep, blockedAt };
  };

  const getOnboardingStatus = (driver: DriverOnboarding): { label: string; color: string } => {
    const { percentage } = calculateOnboardingProgress(driver);
    
    if (driver.status === "rejected") return { label: "Refusé", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    if (percentage === 100) return { label: "Complet", color: "text-green-500 bg-green-500/10 border-green-500/20" };
    if (percentage >= 75) return { label: "Avancé", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
    if (percentage >= 50) return { label: "En cours", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" };
    if (percentage >= 25) return { label: "Débutant", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
    return { label: "Nouveau", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" };
  };

  const getBlockedStepColor = (nextStep: OnboardingStep | null): string => {
    if (!nextStep) return "text-green-600 bg-green-500/10";
    switch (nextStep.id) {
      case "payment": return "text-red-600 bg-red-500/10";
      case "documents": return nextStep.status === "warning" ? "text-yellow-600 bg-yellow-500/10" : "text-orange-600 bg-orange-500/10";
      case "vehicle": return "text-blue-600 bg-blue-500/10";
      case "profile": return "text-purple-600 bg-purple-500/10";
      case "pricing": return "text-amber-600 bg-amber-500/10";
      case "nfc": return nextStep.status === "warning" ? "text-yellow-600 bg-yellow-500/10" : "text-cyan-600 bg-cyan-500/10";
      case "first_course": return "text-green-600 bg-green-500/10";
      default: return "text-gray-600 bg-gray-500/10";
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      driver.full_name?.toLowerCase().includes(searchLower) ||
      driver.email?.toLowerCase().includes(searchLower) ||
      driver.company_name?.toLowerCase().includes(searchLower) ||
      driver.phone?.includes(searchTerm);

    // Status filter
    if (statusFilter === "all") return matchesSearch;
    
    const { percentage } = calculateOnboardingProgress(driver);
    switch (statusFilter) {
      case "new": return matchesSearch && percentage < 25;
      case "beginner": return matchesSearch && percentage >= 25 && percentage < 50;
      case "inprogress": return matchesSearch && percentage >= 50 && percentage < 75;
      case "advanced": return matchesSearch && percentage >= 75 && percentage < 100;
      case "complete": return matchesSearch && percentage === 100;
      case "rejected": return matchesSearch && driver.status === "rejected";
      default: return matchesSearch;
    }
  });

  // Stats
  const stats = {
    total: drivers.length,
    complete: drivers.filter(d => calculateOnboardingProgress(d).percentage === 100).length,
    inProgress: drivers.filter(d => {
      const p = calculateOnboardingProgress(d).percentage;
      return p > 0 && p < 100;
    }).length,
    notStarted: drivers.filter(d => calculateOnboardingProgress(d).percentage <= 25).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total chauffeurs</p>
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
                <p className="text-xs text-muted-foreground">Profils complets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">En progression</p>
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
                <p className="text-2xl font-bold">{stats.notStarted}</p>
                <p className="text-xs text-muted-foreground">À accompagner</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Suivi des inscriptions
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDrivers}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
          <CardDescription>
            Vue d'ensemble de la progression de chaque chauffeur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="new">Nouveau (&lt;25%)</SelectItem>
                <SelectItem value="beginner">Débutant (25-49%)</SelectItem>
                <SelectItem value="inprogress">En cours (50-74%)</SelectItem>
                <SelectItem value="advanced">Avancé (75-99%)</SelectItem>
                <SelectItem value="complete">Complet (100%)</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
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
                  const { percentage, steps, nextStep, blockedAt } = calculateOnboardingProgress(driver);
                  const onboardingStatus = getOnboardingStatus(driver);
                  const isExpanded = expandedDriver === driver.id;
                  const blockedColor = getBlockedStepColor(nextStep);

                  return (
                    <Collapsible
                      key={driver.id}
                      open={isExpanded}
                      onOpenChange={() => setExpandedDriver(isExpanded ? null : driver.id)}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Avatar */}
                            {driver.profile_photo_url ? (
                              <img
                                src={driver.profile_photo_url}
                                alt={driver.full_name}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold truncate text-sm sm:text-base">{driver.full_name}</h4>
                                <Badge variant="outline" className={`${onboardingStatus.color} text-xs`}>
                                  {onboardingStatus.label}
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{driver.email}</p>
                              
                              {/* Blocked Step - Visible directly */}
                              <div className={`mt-2 px-2 py-1.5 rounded-md text-xs sm:text-sm font-medium ${blockedColor}`}>
                                {blockedAt}
                              </div>
                              
                              <div className="flex items-center gap-3 sm:gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                {driver.company_name && (
                                  <span className="hidden sm:inline">🏢 {driver.company_name}</span>
                                )}
                                {driver.vehicle_brand && driver.vehicle_brand !== "À compléter" && (
                                  <span>🚗 {driver.vehicle_brand} {driver.vehicle_model}</span>
                                )}
                                <span>📅 {format(new Date(driver.created_at), "d MMM yyyy", { locale: fr })}</span>
                              </div>
                            </div>

                            {/* Progress */}
                            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-xl sm:text-2xl font-bold">{percentage}%</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Progression</p>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-1 sm:p-2">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          {/* Progress Bar - Always visible */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className="h-2 flex-1" />
                              <span className="text-[10px] text-muted-foreground w-16 text-right hidden sm:block">
                                {steps.filter(s => s.isComplete).length}/{steps.length} étapes
                              </span>
                            </div>
                            {/* Step indicators */}
                            <div className="flex justify-between mt-1.5">
                              {steps.map((step, idx) => (
                                <TooltipProvider key={step.id}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
                                          step.isComplete 
                                            ? "bg-green-500" 
                                            : step.status === "warning"
                                              ? "bg-yellow-500"
                                              : idx === steps.findIndex(s => !s.isComplete)
                                                ? "bg-orange-500 ring-2 ring-orange-500/30"
                                                : "bg-muted-foreground/30"
                                        }`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p className="font-medium">{step.label}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {step.isComplete ? "✓ Complété" : step.status === "warning" ? "⏳ En cours" : "✗ À faire"}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </div>
                        </CardContent>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t pt-4 bg-muted/30">
                            {/* Steps Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                              <TooltipProvider>
                                {steps.map(step => (
                                  <Tooltip key={step.id}>
                                    <TooltipTrigger asChild>
                                      <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                                        step.status === "complete" 
                                          ? "bg-green-500/10 border-green-500/20 text-green-600"
                                          : step.status === "warning"
                                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600"
                                            : "bg-muted border-border text-muted-foreground"
                                      }`}>
                                        {step.status === "complete" ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : step.status === "warning" ? (
                                          <Clock className="w-4 h-4" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        <span className="text-xs font-medium truncate">{step.label}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{step.label}: {step.status === "complete" ? "Complété" : step.status === "warning" ? "En cours" : "Non complété"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </TooltipProvider>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground mb-1">Contact</p>
                                <p className="font-medium">{driver.phone || "Non renseigné"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Abonnement</p>
                                <Badge variant={driver.subscription_paid ? "default" : "outline"}>
                                  {driver.subscription_paid ? "Payé" : driver.free_access_granted ? "Accès gratuit" : "Non payé"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Documents</p>
                                <Badge variant={
                                  driver.documents_status === "validated" ? "default" :
                                  driver.documents_status === "submitted" ? "secondary" : "outline"
                                }>
                                  {driver.documents_status === "validated" ? "Validés" :
                                   driver.documents_status === "submitted" ? "Soumis" :
                                   driver.documents_status === "pending" ? "En attente" : "Non soumis"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Courses effectuées</p>
                                <p className="font-medium">{driver.total_courses}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Plaque NFC</p>
                                <Badge variant={driver.has_nfc_plate ? "default" : "outline"}>
                                  {driver.has_nfc_plate ? "Reçue" : 
                                   driver.nfc_plate_ordered_at ? "Commandée" : "Non commandée"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1">Dernière activité</p>
                                <p className="font-medium">
                                  {driver.last_activity 
                                    ? formatDistanceToNow(new Date(driver.last_activity), { addSuffix: true, locale: fr })
                                    : "Aucune course"}
                                </p>
                              </div>
                            </div>

                            {/* Pricing info */}
                            {(driver.base_fare || driver.per_km_rate) && (
                              <div className="mt-4 p-3 rounded-lg bg-background border">
                                <p className="text-xs text-muted-foreground mb-2">Tarification configurée</p>
                                <div className="flex flex-wrap gap-3">
                                  {driver.base_fare && (
                                    <Badge variant="secondary">Base: {driver.base_fare}€</Badge>
                                  )}
                                  {driver.per_km_rate && (
                                    <Badge variant="secondary">{driver.per_km_rate}€/km</Badge>
                                  )}
                                  {driver.hourly_rate && (
                                    <Badge variant="secondary">{driver.hourly_rate}€/h</Badge>
                                  )}
                                </div>
                              </div>
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

export default AdminDriverOnboardingTracker;
