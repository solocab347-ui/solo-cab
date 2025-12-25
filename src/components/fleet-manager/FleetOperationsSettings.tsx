import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
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
  Settings2,
  AlertTriangle,
  Zap,
  Percent,
  Brain,
  Navigation,
  Save,
  Briefcase,
  Info,
  HelpCircle,
} from "lucide-react";
import { FleetCommissionTracker } from "./FleetCommissionTracker";

interface FleetOperationsSettingsProps {
  fleetManagerId: string;
  autoValidate: boolean;
  onAutoValidateChange: (value: boolean) => void;
}

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  passengers_count: number;
  status: string;
  notes: string | null;
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

interface DispatchSettings {
  auto_dispatch_enabled: boolean;
  dispatch_priority: "proximity" | "availability" | "rating";
  favorite_driver_priority: boolean;
  course_buffer_minutes: number;
  smart_buffer_enabled: boolean;
  smart_buffer_min_minutes: number;
  smart_buffer_fallback_action: "notify_manager" | "assign_available" | "auto_reject";
}

interface DriverCommission {
  driver_id: string;
  commission_type: string;
  commission_percentage: number;
  is_salaried: boolean;
  driver?: {
    id: string;
    vehicle_model: string;
    vehicle_brand: string | null;
    user_id: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

// Helper component for setting explanations
const SettingExplanation = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-muted">
    <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

export const FleetOperationsSettings = ({
  fleetManagerId,
  autoValidate,
  onAutoValidateChange,
}: FleetOperationsSettingsProps) => {
  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDispatch, setLoadingDispatch] = useState(true);
  const [loadingCommissions, setLoadingCommissions] = useState(true);
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [savingCommission, setSavingCommission] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Validation state
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  // Dispatch state
  const [dispatchSettings, setDispatchSettings] = useState<DispatchSettings>({
    auto_dispatch_enabled: false,
    dispatch_priority: "proximity",
    favorite_driver_priority: true,
    course_buffer_minutes: 60,
    smart_buffer_enabled: false,
    smart_buffer_min_minutes: 15,
    smart_buffer_fallback_action: "notify_manager",
  });

  // Commission state
  const [drivers, setDrivers] = useState<DriverCommission[]>([]);
  const [defaultCommission, setDefaultCommission] = useState(0);

  useEffect(() => {
    fetchPendingCourses();
    fetchDispatchSettings();
    fetchCommissions();
  }, [fleetManagerId]);

  // ===== FETCH FUNCTIONS =====
  const fetchPendingCourses = async () => {
    try {
      const { data: fleetDrivers } = await supabase
        .from("fleet_manager_drivers")
        .select("driver_id")
        .eq("fleet_manager_id", fleetManagerId);

      if (!fleetDrivers || fleetDrivers.length === 0) {
        setPendingCourses([]);
        setLoadingCourses(false);
        return;
      }

      const driverIds = fleetDrivers.map(d => d.driver_id);

      const { data: courses } = await supabase
        .from("courses")
        .select(`
          *,
          client:clients(id, user_id),
          driver:drivers(id, vehicle_model, vehicle_brand, user_id)
        `)
        .in("driver_id", driverIds)
        .eq("status", "pending")
        .order("scheduled_date", { ascending: true });

      if (courses) {
        const clientUserIds = courses.filter(c => c.client).map(c => c.client.user_id);
        const driverUserIds = courses.filter(c => c.driver).map(c => c.driver.user_id);
        const allUserIds = [...new Set([...clientUserIds, ...driverUserIds])];

        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", allUserIds);

          const coursesWithProfiles = courses.map(c => ({
            ...c,
            client: c.client ? { ...c.client, profile: profiles?.find(p => p.id === c.client.user_id) } : undefined,
            driver: c.driver ? { ...c.driver, profile: profiles?.find(p => p.id === c.driver.user_id) } : undefined
          }));
          setPendingCourses(coursesWithProfiles);
        } else {
          setPendingCourses(courses);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchDispatchSettings = async () => {
    try {
      const { data } = await supabase
        .from("fleet_managers")
        .select("auto_dispatch_enabled, dispatch_priority, favorite_driver_priority, course_buffer_minutes, smart_buffer_enabled, smart_buffer_min_minutes, smart_buffer_fallback_action")
        .eq("id", fleetManagerId)
        .single();

      if (data) {
        setDispatchSettings({
          auto_dispatch_enabled: data.auto_dispatch_enabled || false,
          dispatch_priority: (data.dispatch_priority as DispatchSettings["dispatch_priority"]) || "proximity",
          favorite_driver_priority: data.favorite_driver_priority !== false,
          course_buffer_minutes: data.course_buffer_minutes || 60,
          smart_buffer_enabled: data.smart_buffer_enabled || false,
          smart_buffer_min_minutes: data.smart_buffer_min_minutes || 15,
          smart_buffer_fallback_action: (data.smart_buffer_fallback_action as DispatchSettings["smart_buffer_fallback_action"]) || "notify_manager",
        });
      }
    } catch (error) {
      console.error("Error fetching dispatch settings:", error);
    } finally {
      setLoadingDispatch(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("default_commission_percentage")
        .eq("id", fleetManagerId)
        .single();

      if (fmData) setDefaultCommission(fmData.default_commission_percentage || 0);

      const { data: fmdData } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id, commission_type, commission_percentage, is_salaried,
          driver:drivers(id, vehicle_model, vehicle_brand, user_id)
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (fmdData && fmdData.length > 0) {
        const driverUserIds = fmdData.filter(d => d.driver).map(d => (d.driver as any).user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        const driversWithProfiles = fmdData.map(d => ({
          ...d,
          driver: d.driver ? { ...(d.driver as any), profile: profiles?.find(p => p.id === (d.driver as any).user_id) } : undefined
        }));
        setDrivers(driversWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching commissions:", error);
    } finally {
      setLoadingCommissions(false);
    }
  };

  // ===== ACTION HANDLERS =====
  const handleAutoValidateChange = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({ auto_validate_courses: enabled })
        .eq("id", fleetManagerId);

      if (error) throw error;
      onAutoValidateChange(enabled);
      toast.success(enabled ? "Validation automatique activée" : "Validation manuelle activée");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleCourseAction = async () => {
    if (!selectedCourse || !actionType) return;
    setProcessing(true);
    try {
      const newStatus = actionType === "approve" ? "accepted" : "cancelled";
      const { error } = await supabase.from("courses").update({ status: newStatus }).eq("id", selectedCourse.id);
      if (error) throw error;

      if (selectedCourse.client?.user_id) {
        await supabase.from("notifications").insert({
          user_id: selectedCourse.client.user_id,
          title: actionType === "approve" ? "Course confirmée" : "Course refusée",
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
          title: actionType === "approve" ? "Nouvelle course assignée" : "Course annulée",
          message: actionType === "approve"
            ? `Course confirmée pour le ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })}`
            : `Course annulée pour le ${format(new Date(selectedCourse.scheduled_date), "d MMMM à HH:mm", { locale: fr })}`,
          type: actionType === "approve" ? "success" : "warning",
          link: "/fleet-driver-dashboard"
        });
      }

      toast.success(actionType === "approve" ? "Course approuvée" : "Course refusée");
      setPendingCourses(prev => prev.filter(c => c.id !== selectedCourse.id));
    } catch (error) {
      console.error("Error processing course:", error);
      toast.error("Erreur lors du traitement");
    } finally {
      setProcessing(false);
      setSelectedCourse(null);
      setActionType(null);
    }
  };

  const handleSaveDispatch = async () => {
    setSavingDispatch(true);
    try {
      const { error } = await supabase
        .from("fleet_managers")
        .update({
          auto_dispatch_enabled: dispatchSettings.auto_dispatch_enabled,
          dispatch_priority: dispatchSettings.dispatch_priority,
          favorite_driver_priority: dispatchSettings.favorite_driver_priority,
          assignment_mode: dispatchSettings.auto_dispatch_enabled ? "automatic" : "manual",
          course_buffer_minutes: dispatchSettings.course_buffer_minutes,
          smart_buffer_enabled: dispatchSettings.smart_buffer_enabled,
          smart_buffer_min_minutes: dispatchSettings.smart_buffer_min_minutes,
          smart_buffer_fallback_action: dispatchSettings.smart_buffer_fallback_action,
        })
        .eq("id", fleetManagerId);

      if (error) throw error;
      toast.success("Paramètres de dispatch sauvegardés");
    } catch (error) {
      console.error("Error saving dispatch settings:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingDispatch(false);
    }
  };

  const handleSaveDriverCommission = async (driverId: string, updates: Partial<DriverCommission>) => {
    setSavingCommission(driverId);
    try {
      const { error } = await supabase
        .from("fleet_manager_drivers")
        .update({
          commission_type: updates.commission_type,
          commission_percentage: updates.commission_percentage,
          is_salaried: updates.is_salaried,
        })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("driver_id", driverId);

      if (error) throw error;
      setDrivers(drivers.map(d => d.driver_id === driverId ? { ...d, ...updates } : d));
      toast.success("Commission mise à jour");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingCommission(null);
    }
  };

  const updateDriver = (driverId: string, field: string, value: any) => {
    setDrivers(drivers.map(d => d.driver_id === driverId ? { ...d, [field]: value } : d));
  };

  const isLoading = loadingCourses || loadingDispatch || loadingCommissions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-info/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            Opérations & Gestion
          </CardTitle>
          <CardDescription>
            Configurez la validation des courses, l'attribution automatique et les commissions de vos chauffeurs
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ===== SECTION 1: VALIDATION ===== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-primary" />
            Validation des courses
          </CardTitle>
          <CardDescription>
            Gérez comment les nouvelles courses sont validées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="auto-validate" className="text-base font-medium">
                Validation automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                {autoValidate 
                  ? "Les courses sont automatiquement confirmées dès leur création"
                  : "Vous devez approuver chaque course manuellement"
                }
              </p>
            </div>
            <Switch
              id="auto-validate"
              checked={autoValidate}
              onCheckedChange={handleAutoValidateChange}
            />
          </div>

          <SettingExplanation>
            <strong>Validation automatique :</strong> Lorsqu'activée, toute nouvelle course créée par un client est immédiatement confirmée et le chauffeur est notifié. 
            En mode manuel, vous recevez une notification pour chaque demande et devez l'approuver ou la refuser.
          </SettingExplanation>

          {/* Pending courses list */}
          {!autoValidate && pendingCourses.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-warning" />
                <h4 className="font-medium">Courses en attente</h4>
                <Badge variant="secondary">{pendingCourses.length}</Badge>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {pendingCourses.map(course => (
                    <div key={course.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={course.client?.profile?.profile_photo_url || ""} />
                              <AvatarFallback>{course.client?.profile?.full_name?.charAt(0) || "C"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{course.client?.profile?.full_name || "Client"}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span className="truncate">{course.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-destructive" />
                              <span className="truncate">{course.destination_address}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(course.scheduled_date), "d MMM HH:mm", { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {course.driver?.profile?.full_name || "Non assigné"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => { setSelectedCourse(course); setActionType("approve"); }}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => { setSelectedCourse(course); setActionType("reject"); }}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ===== SECTION 2: DISPATCH ===== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Attribution des courses
          </CardTitle>
          <CardDescription>
            Configurez comment les courses sont attribuées à vos chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto dispatch toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div>
              <Label htmlFor="auto_dispatch" className="text-base font-medium">Dispatch automatique</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Attribuer automatiquement les courses aux chauffeurs
              </p>
            </div>
            <Switch
              id="auto_dispatch"
              checked={dispatchSettings.auto_dispatch_enabled}
              onCheckedChange={(checked) => setDispatchSettings({ ...dispatchSettings, auto_dispatch_enabled: checked })}
            />
          </div>

          <SettingExplanation>
            <strong>Dispatch automatique :</strong> Le système analyse les disponibilités de vos chauffeurs et leur assigne automatiquement les courses 
            selon vos critères de priorité. Désactivé, vous devez assigner manuellement chaque course.
          </SettingExplanation>

          {dispatchSettings.auto_dispatch_enabled && (
            <div className="space-y-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
              {/* Priority criteria */}
              <div className="space-y-3">
                <Label className="font-medium">Critère de priorité</Label>
                <RadioGroup
                  value={dispatchSettings.dispatch_priority}
                  onValueChange={(value) => setDispatchSettings({ ...dispatchSettings, dispatch_priority: value as DispatchSettings["dispatch_priority"] })}
                  className="grid gap-2"
                >
                  <div className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${dispatchSettings.dispatch_priority === "proximity" ? "border-primary bg-background" : "border-border"}`}>
                    <RadioGroupItem value="proximity" id="proximity" />
                    <MapPin className="w-4 h-4 text-primary" />
                    <div>
                      <Label htmlFor="proximity" className="cursor-pointer font-medium">Proximité</Label>
                      <p className="text-xs text-muted-foreground">Chauffeur le plus proche du lieu de prise en charge</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${dispatchSettings.dispatch_priority === "availability" ? "border-primary bg-background" : "border-border"}`}>
                    <RadioGroupItem value="availability" id="availability" />
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <Label htmlFor="availability" className="cursor-pointer font-medium">Disponibilité</Label>
                      <p className="text-xs text-muted-foreground">Chauffeur avec le moins de courses programmées</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${dispatchSettings.dispatch_priority === "rating" ? "border-primary bg-background" : "border-border"}`}>
                    <RadioGroupItem value="rating" id="rating" />
                    <Navigation className="w-4 h-4 text-primary" />
                    <div>
                      <Label htmlFor="rating" className="cursor-pointer font-medium">Note</Label>
                      <p className="text-xs text-muted-foreground">Chauffeur avec la meilleure note client</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Favorite driver priority */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div>
                  <Label htmlFor="favorite_priority" className="font-medium">Priorité chauffeur favori</Label>
                  <p className="text-xs text-muted-foreground">Si le client a un chauffeur favori disponible, il sera choisi en premier</p>
                </div>
                <Switch
                  id="favorite_priority"
                  checked={dispatchSettings.favorite_driver_priority}
                  onCheckedChange={(checked) => setDispatchSettings({ ...dispatchSettings, favorite_driver_priority: checked })}
                />
              </div>
            </div>
          )}

          {/* Buffer configuration */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="font-medium">Temps de buffer entre courses</Label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <div>
                  <Label htmlFor="smart_buffer" className="font-medium">Buffer intelligent</Label>
                  <p className="text-xs text-muted-foreground">Calcule automatiquement le temps nécessaire selon les trajets</p>
                </div>
              </div>
              <Switch
                id="smart_buffer"
                checked={dispatchSettings.smart_buffer_enabled}
                onCheckedChange={(checked) => setDispatchSettings({ ...dispatchSettings, smart_buffer_enabled: checked })}
              />
            </div>

            <SettingExplanation>
              <strong>Buffer :</strong> Temps minimum entre la fin d'une course et le début de la suivante. 
              Le buffer intelligent analyse le trajet entre la dépose et le prochain lieu de prise en charge pour calculer un temps réaliste.
            </SettingExplanation>

            {dispatchSettings.smart_buffer_enabled ? (
              <div className="p-4 rounded-lg border border-dashed space-y-4">
                <div className="flex items-center gap-3">
                  <Label>Buffer minimum :</Label>
                  <Select
                    value={dispatchSettings.smart_buffer_min_minutes.toString()}
                    onValueChange={(value) => setDispatchSettings({ ...dispatchSettings, smart_buffer_min_minutes: parseInt(value) })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min (recommandé)</SelectItem>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Si timing trop serré :</Label>
                  <Select
                    value={dispatchSettings.smart_buffer_fallback_action}
                    onValueChange={(value) => setDispatchSettings({ ...dispatchSettings, smart_buffer_fallback_action: value as DispatchSettings["smart_buffer_fallback_action"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notify_manager">Vous notifier pour décision manuelle</SelectItem>
                      <SelectItem value="assign_available">Chercher un autre chauffeur</SelectItem>
                      <SelectItem value="auto_reject">Mettre en attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Label>Buffer fixe :</Label>
                <Select
                  value={dispatchSettings.course_buffer_minutes.toString()}
                  onValueChange={(value) => setDispatchSettings({ ...dispatchSettings, course_buffer_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1h (recommandé)</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={handleSaveDispatch} disabled={savingDispatch} className="w-full">
            {savingDispatch ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder les paramètres de dispatch
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* ===== SECTION 3: COMMISSIONS ===== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="w-5 h-5 text-primary" />
            Commissions chauffeurs
          </CardTitle>
          <CardDescription>
            Définissez la commission que vous prenez sur chaque course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingExplanation>
            <strong>Commission :</strong> Pourcentage du montant de chaque course que vous conservez. Le reste revient au chauffeur.
            Les chauffeurs salariés n'ont pas de commission car vous gardez 100% des revenus et les payez par salaire.
          </SettingExplanation>

          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun chauffeur dans votre flotte</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Commission par défaut : <strong>{defaultCommission}%</strong></p>
              
              {drivers.map((driver) => (
                <div key={driver.driver_id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={driver.driver?.profile?.profile_photo_url || ""} />
                      <AvatarFallback>{(driver.driver?.profile?.full_name || "C").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{driver.driver?.profile?.full_name || "Chauffeur"}</h4>
                          <p className="text-xs text-muted-foreground">{driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}</p>
                        </div>
                        {driver.is_salaried && (
                          <Badge variant="secondary" className="bg-info/20 text-info">
                            <Briefcase className="w-3 h-3 mr-1" />
                            Salarié
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={driver.is_salaried ? "salaried" : driver.commission_type || "percentage"}
                            onValueChange={(value) => {
                              if (value === "salaried") {
                                updateDriver(driver.driver_id, "is_salaried", true);
                                updateDriver(driver.driver_id, "commission_type", "none");
                              } else {
                                updateDriver(driver.driver_id, "is_salaried", false);
                                updateDriver(driver.driver_id, "commission_type", value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-[140px] h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Commission %</SelectItem>
                              <SelectItem value="none">Pas de commission</SelectItem>
                              <SelectItem value="salaried">Salarié</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {!driver.is_salaried && driver.commission_type === "percentage" && (
                          <div className="space-y-1">
                            <Label className="text-xs">%</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-20 h-9"
                              value={driver.commission_percentage || defaultCommission}
                              onChange={(e) => updateDriver(driver.driver_id, "commission_percentage", parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveDriverCommission(driver.driver_id, {
                            commission_type: driver.commission_type,
                            commission_percentage: driver.commission_percentage,
                            is_salaried: driver.is_salaried,
                          })}
                          disabled={savingCommission === driver.driver_id}
                        >
                          {savingCommission === driver.driver_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission tracker */}
      <FleetCommissionTracker fleetManagerId={fleetManagerId} />

      {/* Confirmation dialog */}
      <AlertDialog open={!!selectedCourse && !!actionType} onOpenChange={() => { setSelectedCourse(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <><CheckCircle className="w-5 h-5 text-success" /> Approuver cette course ?</>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-destructive" /> Refuser cette course ?</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? "La course sera confirmée et le chauffeur sera notifié."
                : "La course sera annulée. Le client et le chauffeur seront notifiés."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCourseAction}
              disabled={processing}
              className={actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
