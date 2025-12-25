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
  Brain,
  Navigation,
  Save,
  Info,
} from "lucide-react";

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
  const [savingDispatch, setSavingDispatch] = useState(false);
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

  useEffect(() => {
    fetchPendingCourses();
    fetchDispatchSettings();
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

  const isLoading = loadingCourses || loadingDispatch;

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
            Gestion Dispatch
          </CardTitle>
          <CardDescription>
            Configurez la validation des courses et l'attribution automatique à vos chauffeurs
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
                            <div>
                              <p className="font-medium text-sm">{course.client?.profile?.full_name || "Client"}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(course.scheduled_date), "d MMM yyyy à HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-success" />
                              {course.pickup_address.length > 40 ? course.pickup_address.slice(0, 40) + "..." : course.pickup_address}
                            </p>
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-destructive" />
                              {course.destination_address.length > 40 ? course.destination_address.slice(0, 40) + "..." : course.destination_address}
                            </p>
                          </div>
                          {course.driver && (
                            <Badge variant="outline" className="text-xs">
                              <Car className="w-3 h-3 mr-1" />
                              {course.driver.profile?.full_name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" className="gap-1" onClick={() => { setSelectedCourse(course); setActionType("approve"); }}>
                            <CheckCircle className="w-3 h-3" />
                            Approuver
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => { setSelectedCourse(course); setActionType("reject"); }}>
                            <XCircle className="w-3 h-3" />
                            Refuser
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

      {/* ===== SECTION 2: DISPATCH ===== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="w-5 h-5 text-info" />
            Attribution automatique
          </CardTitle>
          <CardDescription>
            Configurez comment les courses sont assignées à vos chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto dispatch toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                Dispatch automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                Attribuer automatiquement les courses aux chauffeurs disponibles
              </p>
            </div>
            <Switch
              checked={dispatchSettings.auto_dispatch_enabled}
              onCheckedChange={(v) => setDispatchSettings({ ...dispatchSettings, auto_dispatch_enabled: v })}
            />
          </div>

          <SettingExplanation>
            <strong>Dispatch automatique :</strong> Le système assigne automatiquement les courses aux chauffeurs selon les critères ci-dessous. 
            Désactivé, vous devrez manuellement attribuer chaque course à un chauffeur.
          </SettingExplanation>

          {dispatchSettings.auto_dispatch_enabled && (
            <>
              <Separator />

              {/* Priority */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Critère de priorité</Label>
                <RadioGroup
                  value={dispatchSettings.dispatch_priority}
                  onValueChange={(v) => setDispatchSettings({ ...dispatchSettings, dispatch_priority: v as DispatchSettings["dispatch_priority"] })}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <Label htmlFor="proximity" className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="proximity" id="proximity" />
                    <div>
                      <p className="font-medium">Proximité</p>
                      <p className="text-xs text-muted-foreground">Chauffeur le plus proche</p>
                    </div>
                  </Label>
                  <Label htmlFor="availability" className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="availability" id="availability" />
                    <div>
                      <p className="font-medium">Disponibilité</p>
                      <p className="text-xs text-muted-foreground">Chauffeur le plus libre</p>
                    </div>
                  </Label>
                  <Label htmlFor="rating" className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5">
                    <RadioGroupItem value="rating" id="rating" />
                    <div>
                      <p className="font-medium">Note</p>
                      <p className="text-xs text-muted-foreground">Meilleure note client</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <SettingExplanation>
                <strong>Proximité :</strong> Le chauffeur le plus proche du lieu de prise en charge sera assigné. 
                <strong> Disponibilité :</strong> Le chauffeur avec le moins de courses planifiées sera priorisé. 
                <strong> Note :</strong> Le chauffeur ayant la meilleure note client sera sélectionné en priorité.
              </SettingExplanation>

              {/* Favorite driver priority */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Priorité au chauffeur favori</Label>
                  <p className="text-sm text-muted-foreground">
                    Si le client a un chauffeur préféré, lui proposer en premier
                  </p>
                </div>
                <Switch
                  checked={dispatchSettings.favorite_driver_priority}
                  onCheckedChange={(v) => setDispatchSettings({ ...dispatchSettings, favorite_driver_priority: v })}
                />
              </div>

              <SettingExplanation>
                <strong>Chauffeur favori :</strong> Lorsqu'un client a défini un chauffeur préféré, celui-ci sera sollicité en premier avant d'appliquer les autres critères de sélection.
              </SettingExplanation>

              <Separator />

              {/* Buffer time */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Brain className="w-4 h-4 text-accent" />
                      Buffer intelligent
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Calculer automatiquement le temps entre les courses
                    </p>
                  </div>
                  <Switch
                    checked={dispatchSettings.smart_buffer_enabled}
                    onCheckedChange={(v) => setDispatchSettings({ ...dispatchSettings, smart_buffer_enabled: v })}
                  />
                </div>

                {dispatchSettings.smart_buffer_enabled ? (
                  <div className="space-y-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
                    <div className="space-y-2">
                      <Label>Durée minimum (minutes)</Label>
                      <Input
                        type="number"
                        value={dispatchSettings.smart_buffer_min_minutes}
                        onChange={(e) => setDispatchSettings({ ...dispatchSettings, smart_buffer_min_minutes: parseInt(e.target.value) || 15 })}
                        min={5}
                        max={60}
                      />
                      <p className="text-xs text-muted-foreground">
                        Temps minimum entre deux courses, même si le calcul intelligent suggère moins
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Action si aucun chauffeur disponible</Label>
                      <Select
                        value={dispatchSettings.smart_buffer_fallback_action}
                        onValueChange={(v) => setDispatchSettings({ ...dispatchSettings, smart_buffer_fallback_action: v as DispatchSettings["smart_buffer_fallback_action"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notify_manager">Notifier le gestionnaire</SelectItem>
                          <SelectItem value="assign_available">Assigner au premier disponible</SelectItem>
                          <SelectItem value="auto_reject">Refuser automatiquement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Temps fixe entre les courses (minutes)</Label>
                    <Input
                      type="number"
                      value={dispatchSettings.course_buffer_minutes}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, course_buffer_minutes: parseInt(e.target.value) || 60 })}
                      min={15}
                      max={180}
                    />
                    <p className="text-xs text-muted-foreground">
                      Un chauffeur ne sera pas assigné si une autre course est prévue dans ce délai
                    </p>
                  </div>
                )}
              </div>

              <SettingExplanation>
                <strong>Buffer intelligent :</strong> Calcule le temps nécessaire entre les courses en tenant compte de la distance, du trafic et du temps de préparation. 
                Le buffer fixe impose un délai constant entre chaque course.
              </SettingExplanation>
            </>
          )}

          {/* Save button */}
          <Button onClick={handleSaveDispatch} disabled={savingDispatch} className="w-full gap-2">
            {savingDispatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder les paramètres
          </Button>
        </CardContent>
      </Card>

      {/* Note about commissions */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Commissions :</strong> Les commissions sont définies lors de la création ou modification d'un partenariat avec chaque chauffeur.
          Rendez-vous dans l'onglet <strong>Partenariats</strong> pour gérer les termes de vos collaborations.
        </AlertDescription>
      </Alert>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedCourse && !!actionType} onOpenChange={() => { setSelectedCourse(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Confirmer la course ?" : "Refuser la course ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? "La course sera confirmée et le chauffeur sera notifié."
                : "La course sera annulée et le client sera notifié du refus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCourseAction} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {actionType === "approve" ? "Confirmer" : "Refuser"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
