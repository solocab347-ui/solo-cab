import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Users, Percent, Briefcase } from "lucide-react";

interface FleetDriverCommissionsProps {
  fleetManagerId: string;
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

export const FleetDriverCommissions = ({ fleetManagerId }: FleetDriverCommissionsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverCommission[]>([]);
  const [defaultCommission, setDefaultCommission] = useState(0);

  useEffect(() => {
    fetchData();
  }, [fleetManagerId]);

  const fetchData = async () => {
    try {
      // Get default commission
      const { data: fmData } = await supabase
        .from("fleet_managers")
        .select("default_commission_percentage")
        .eq("id", fleetManagerId)
        .single();

      if (fmData) {
        setDefaultCommission(fmData.default_commission_percentage || 0);
      }

      // Get drivers with commissions
      const { data: fmdData, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          commission_type,
          commission_percentage,
          is_salaried,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (error) throw error;

      if (fmdData && fmdData.length > 0) {
        const driverUserIds = fmdData
          .filter(d => d.driver)
          .map(d => (d.driver as any).user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        const driversWithProfiles = fmdData.map(d => ({
          ...d,
          driver: d.driver ? {
            ...(d.driver as any),
            profile: profiles?.find(p => p.id === (d.driver as any).user_id)
          } : undefined
        }));

        setDrivers(driversWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDriver = async (driverId: string, updates: Partial<DriverCommission>) => {
    setSaving(driverId);
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

      setDrivers(drivers.map(d => 
        d.driver_id === driverId ? { ...d, ...updates } : d
      ));
      
      toast.success("Commission mise à jour");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const updateDriver = (driverId: string, field: string, value: any) => {
    setDrivers(drivers.map(d => 
      d.driver_id === driverId ? { ...d, [field]: value } : d
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground">Aucun chauffeur dans votre flotte</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Commission par chauffeur</h3>
          <p className="text-sm text-muted-foreground">
            Commission par défaut : {defaultCommission}%
          </p>
        </div>
      </div>

      {drivers.map((driver) => (
        <Card key={driver.driver_id}>
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src={driver.driver?.profile?.profile_photo_url || ""} />
                <AvatarFallback>
                  {(driver.driver?.profile?.full_name || "C").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      {driver.driver?.profile?.full_name || "Chauffeur"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {driver.driver?.vehicle_brand} {driver.driver?.vehicle_model}
                    </p>
                  </div>
                  {driver.is_salaried && (
                    <Badge variant="secondary" className="bg-info/20 text-info">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Salarié
                    </Badge>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Type de rémunération</Label>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Commission (%)</SelectItem>
                        <SelectItem value="none">Pas de commission</SelectItem>
                        <SelectItem value="salaried">Salarié (vous gardez tout)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!driver.is_salaried && driver.commission_type === "percentage" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        Commission (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={driver.commission_percentage || defaultCommission}
                        onChange={(e) => updateDriver(
                          driver.driver_id, 
                          "commission_percentage", 
                          parseFloat(e.target.value) || 0
                        )}
                      />
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={() => handleSaveDriver(driver.driver_id, {
                        commission_type: driver.commission_type,
                        commission_percentage: driver.commission_percentage,
                        is_salaried: driver.is_salaried,
                      })}
                      disabled={saving === driver.driver_id}
                      className="gap-1"
                    >
                      {saving === driver.driver_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
