import { useState, useEffect } from "react";
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
  Settings,
  AlertTriangle,
  Plus,
  List,
  User,
  Phone,
  Mail,
} from "lucide-react";

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

export const FleetCoursesManager = ({
  fleetManagerId,
  autoValidate,
  onAutoValidateChange,
}: FleetCoursesManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  
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
    // Client manuel
    guestName: "",
    guestPhone: "",
    guestEmail: "",
  });

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Récupérer les chauffeurs de la flotte
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

      if (fleetDrivers && fleetDrivers.length > 0) {
        // Récupérer les profils des chauffeurs
        const driverUserIds = fleetDrivers
          .filter(d => d.driver)
          .map(d => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", driverUserIds);

          const driversWithProfiles = fleetDrivers.map(d => ({
            ...d,
            driver: d.driver ? {
              ...d.driver,
              profile: profiles?.find(p => p.id === d.driver.user_id)
            } : undefined
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(fleetDrivers);
        }

        const driverIds = fleetDrivers.map(d => d.driver_id);

        // Récupérer les courses
        const { data: courses } = await supabase
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
          .in("driver_id", driverIds)
          .order("scheduled_date", { ascending: false });

        if (courses) {
          // Récupérer les profils
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
            setPendingCourses(coursesWithProfiles.filter(c => c.status === "pending"));
          } else {
            setAllCourses(courses);
            setPendingCourses(courses.filter(c => c.status === "pending"));
          }
        }
      } else {
        setDrivers([]);
        setPendingCourses([]);
        setAllCourses([]);
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

      // Notifier le client
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

      // Notifier le chauffeur
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-warning/20 text-warning">En attente</Badge>;
      case "accepted":
        return <Badge variant="secondary" className="bg-info/20 text-info">Confirmée</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-primary/20 text-primary">En cours</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-success/20 text-success">Terminée</Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-destructive/20 text-destructive">Annulée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      {/* En-tête avec création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des courses</h2>
          <p className="text-muted-foreground">Créez et gérez les courses de votre flotte</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle course
        </Button>
      </div>

      {/* Paramètres de validation */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Paramètres de validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-validate" className="text-base font-medium">
                Validation automatique
              </Label>
              <p className="text-sm text-muted-foreground">
                {autoValidate 
                  ? "Les courses sont automatiquement confirmées"
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
        </CardContent>
      </Card>

      {/* Onglets courses */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 gap-2">
            <Clock className="w-4 h-4" />
            En attente
            {pendingCourses.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCourses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 gap-2">
            <List className="w-4 h-4" />
            Toutes les courses
          </TabsTrigger>
        </TabsList>

        {/* Courses en attente */}
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {pendingCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune course en attente de validation</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {pendingCourses.map(course => (
                      <CourseCard 
                        key={course.id}
                        course={course}
                        showActions
                        onApprove={() => {
                          setSelectedCourse(course);
                          setActionType("approve");
                        }}
                        onReject={() => {
                          setSelectedCourse(course);
                          setActionType("reject");
                        }}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Toutes les courses */}
        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              {allCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune course pour le moment</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {allCourses.map(course => (
                      <CourseCard 
                        key={course.id}
                        course={course}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog création de course */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une course</DialogTitle>
            <DialogDescription>
              Créez une course pour un client existant ou un nouveau client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Type de client */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Label className="flex-1">Type de client</Label>
              <div className="flex gap-2">
                <Button
                  variant={!isManualClient ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsManualClient(false)}
                >
                  Client existant
                </Button>
                <Button
                  variant={isManualClient ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsManualClient(true)}
                >
                  Client manuel
                </Button>
              </div>
            </div>

            {/* Sélection client existant */}
            {!isManualClient && (
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
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun client enregistré. Utilisez un client manuel.
                  </p>
                )}
              </div>
            )}

            {/* Client manuel */}
            {isManualClient && (
              <div className="space-y-4 p-4 border border-dashed rounded-lg">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nom du client *
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
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </Label>
                    <Input
                      value={newCourse.guestPhone}
                      onChange={(e) => setNewCourse({ ...newCourse, guestPhone: e.target.value })}
                      placeholder="06 XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={newCourse.guestEmail}
                      onChange={(e) => setNewCourse({ ...newCourse, guestEmail: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce client pourra s'inscrire via votre lien pour retrouver ses informations
                </p>
              </div>
            )}

            {/* Chauffeur */}
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

            {/* Adresses */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Adresse de prise en charge *</Label>
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
                <Label>Adresse de destination *</Label>
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

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {/* Passagers */}
            <div className="space-y-2">
              <Label>Nombre de passagers</Label>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
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
            <Button onClick={handleCreateCourse} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Créer la course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
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
    </div>
  );
};

// Composant CourseCard
interface CourseCardProps {
  course: Course;
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

const CourseCard = ({ course, showActions, onApprove, onReject, getStatusBadge }: CourseCardProps) => {
  const clientName = course.client?.profile?.full_name || course.guest_name || "Client";
  const isGuest = !!course.guest_name;

  return (
    <div className="p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Client + Status */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={course.client?.profile?.profile_photo_url || ""} />
              <AvatarFallback>
                {clientName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{clientName}</p>
              <p className="text-xs text-muted-foreground">
                {isGuest ? "Client manuel" : "Client"}
              </p>
            </div>
            {getStatusBadge(course.status)}
          </div>

          {/* Itinéraire */}
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{course.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <span className="text-sm">{course.destination_address}</span>
            </div>
          </div>

          {/* Détails */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(course.scheduled_date), "d MMM à HH:mm", { locale: fr })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {course.passengers_count} passager(s)
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              {course.driver?.profile?.full_name || "Non assigné"}
            </span>
          </div>

          {course.notes && (
            <p className="text-sm text-muted-foreground italic">"{course.notes}"</p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approuver
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onReject}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Refuser
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
