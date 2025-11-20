import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, MessageSquare, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Driver {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_color: string | null;
  rating: number | null;
  working_sectors: string[] | null;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

const ClientDriversList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDrivers();
  }, [user]);

  const fetchClientDrivers = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("driver_id, driver_ids, is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) return;

      // For exclusive clients, show only their assigned driver
      if (client.is_exclusive && client.driver_id) {
        const { data: driver } = await supabase
          .from("drivers")
          .select(`
            id,
            company_name,
            vehicle_model,
            vehicle_color,
            rating,
            working_sectors,
            profiles:user_id(full_name, profile_photo_url)
          `)
          .eq("id", client.driver_id)
          .single();

        if (driver) {
          setDrivers([driver as any]);
        }
      } else {
        // For free clients, show all their drivers
        const driverIds = client.driver_ids || [];
        if (driverIds.length > 0) {
          const { data: driversData } = await supabase
            .from("drivers")
            .select(`
              id,
              company_name,
              vehicle_model,
              vehicle_color,
              rating,
              working_sectors,
              profiles:user_id(full_name, profile_photo_url)
            `)
            .in("id", driverIds);

          if (driversData) {
            setDrivers(driversData as any);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (driverId: string) => {
    navigate("/client-dashboard?tab=messages");
    // TODO: Open conversation with this driver
  };

  const handleBooking = (driverId: string) => {
    navigate(`/create-course?driver_id=${driverId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Aucun chauffeur associé</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver) => (
        <Card key={driver.id} className="p-6">
          <div className="flex items-start gap-4">
            {driver.profiles?.profile_photo_url ? (
              <img
                src={driver.profiles.profile_photo_url}
                alt={driver.profiles.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-dark rounded-full flex items-center justify-center">
                <Car className="w-8 h-8 text-primary-foreground" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    {driver.profiles?.full_name}
                  </h3>
                  {driver.company_name && (
                    <p className="text-sm text-muted-foreground">
                      {driver.company_name}
                    </p>
                  )}
                </div>
                {driver.rating && (
                  <Badge variant="outline">⭐ {driver.rating.toFixed(1)}</Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">
                  {driver.vehicle_model}
                  {driver.vehicle_color && ` - ${driver.vehicle_color}`}
                </Badge>
              </div>

              {driver.working_sectors && driver.working_sectors.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {driver.working_sectors.join(", ")}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handleBooking(driver.id)}>
                  Réserver une course
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMessage(driver.id)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ClientDriversList;
