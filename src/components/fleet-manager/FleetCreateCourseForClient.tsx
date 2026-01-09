import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  MapPin, 
  Calendar,
  Clock,
  Users,
  Car,
  User,
  ArrowLeft,
  Send,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface FleetClient {
  id: string;
  user_id: string;
  total_rides: number;
  favorite_driver_id: string | null;
  preferred_fleet_driver_id: string | null;
  profile?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface FleetDriver {
  id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  user_id: string;
  rating: number | null;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface FleetCreateCourseForClientProps {
  fleetManagerId: string;
  onClose: () => void;
  preselectedClientId?: string;
}

export const FleetCreateCourseForClient = ({ 
  fleetManagerId, 
  onClose,
  preselectedClientId 
}: FleetCreateCourseForClientProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<FleetClient[]>([]);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  
  const [selectedClient, setSelectedClient] = useState<string>(preselectedClientId || "");
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [passengers, setPassengers] = useState("1");

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  useEffect(() => {
    // Auto-select preferred driver when client changes
    if (selectedClient) {
      const client = clients.find(c => c.id === selectedClient);
      if (client?.preferred_fleet_driver_id) {
        setSelectedDriver(client.preferred_fleet_driver_id);
      } else if (client?.favorite_driver_id) {
        setSelectedDriver(client.favorite_driver_id);
      }
    }
  }, [selectedClient, clients]);

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: fmClients, error: clientsError } = await supabase
        .from("fleet_manager_clients")
        .select(`
          client_id,
          client:clients(
            id,
            user_id,
            total_rides,
            favorite_driver_id,
            preferred_fleet_driver_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId);

      if (clientsError) throw clientsError;

      if (fmClients && fmClients.length > 0) {
        const userIds = fmClients
          .filter((c: any) => c.client)
          .map((c: any) => c.client.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        const clientsWithProfiles: FleetClient[] = fmClients
          .filter((c: any) => c.client)
          .map((c: any) => ({
            ...c.client,
            profile: profiles?.find((p) => p.id === c.client.user_id),
          }));

        setClients(clientsWithProfiles);
      }

      // Fetch internal drivers from fleet_manager_drivers
      const { data: fmDrivers, error: driversError } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id,
            rating
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (driversError) throw driversError;

      // Fetch partner drivers from fleet_driver_partnerships
      const { data: partnerDrivers, error: partnersError } = await supabase
        .from("fleet_driver_partnerships")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id,
            rating
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted");

      if (partnersError) throw partnersError;

      // Combine both sources, avoiding duplicates
      const allDriversMap = new Map<string, any>();
      
      // Add internal drivers
      fmDrivers?.forEach((d: any) => {
        if (d.driver) {
          allDriversMap.set(d.driver.id, d.driver);
        }
      });
      
      // Add partner drivers
      partnerDrivers?.forEach((d: any) => {
        if (d.driver && !allDriversMap.has(d.driver.id)) {
          allDriversMap.set(d.driver.id, d.driver);
        }
      });

      const allDriversList = Array.from(allDriversMap.values());

      if (allDriversList.length > 0) {
        const driverUserIds = allDriversList.map((d: any) => d.user_id);

        const { data: driverProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        const driversWithProfiles: FleetDriver[] = allDriversList.map((d: any) => ({
          ...d,
          profile: driverProfiles?.find((p) => p.id === d.user_id),
        }));

        setDrivers(driversWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !pickupAddress || !destinationAddress || !scheduledDate || !scheduledTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmitting(true);

    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      // Create the course request
      const { data: courseRequest, error: requestError } = await supabase
        .from("fleet_manager_course_requests")
        .insert({
          fleet_manager_id: fleetManagerId,
          client_id: selectedClient,
          pickup_address: pickupAddress,
          destination_address: destinationAddress,
          scheduled_date: scheduledDateTime.toISOString(),
          notes: notes || null,
          assigned_driver_id: selectedDriver || null,
          status: selectedDriver ? "assigned" : "pending",
          created_by_fleet_manager: true,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // If driver is assigned, create the actual course
      if (selectedDriver) {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .insert({
            client_id: selectedClient,
            driver_id: selectedDriver,
            pickup_address: pickupAddress,
            destination_address: destinationAddress,
            scheduled_date: scheduledDateTime.toISOString(),
            notes: notes || null,
            status: "pending",
            passengers_count: parseInt(passengers) || 1,
            fleet_manager_id: fleetManagerId, // Marquer la course comme appartenant à ce gestionnaire
          })
          .select()
          .single();

        if (courseError) throw courseError;

        // Update the request with the course ID
        await supabase
          .from("fleet_manager_course_requests")
          .update({ course_id: courseData.id })
          .eq("id", courseRequest.id);
      }

      toast.success("Course créée avec succès !");
      onClose();
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Erreur lors de la création de la course");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <CardTitle>Créer une course pour un client</CardTitle>
            <CardDescription>
              Planifiez un trajet pour l'un de vos clients
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Client *
            </Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {(client.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{client.profile?.full_name || "Client"}</span>
                      <Badge variant="outline" className="text-xs">
                        {client.total_rides || 0} courses
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientData?.profile?.phone && (
              <p className="text-sm text-muted-foreground">
                Tél: {selectedClientData.profile.phone}
              </p>
            )}
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label htmlFor="driver" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Chauffeur assigné
            </Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un chauffeur (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun (dispatch automatique)</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(driver.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{driver.profile?.full_name}</span>
                      {driver.rating && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Star className="w-3 h-3" />
                          {driver.rating.toFixed(1)}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {driver.vehicle_brand} {driver.vehicle_model}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Addresses */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-success" />
                Adresse de départ *
              </Label>
              <Input
                id="pickup"
                placeholder="123 rue de Paris, 75001 Paris"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-destructive" />
                Adresse d'arrivée *
              </Label>
              <Input
                id="destination"
                placeholder="Aéroport CDG"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Heure *
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Passengers */}
          <div className="space-y-2">
            <Label htmlFor="passengers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Nombre de passagers
            </Label>
            <Select value={passengers} onValueChange={setPassengers}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} passager{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Instructions particulières, numéro de vol, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Créer la course
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
