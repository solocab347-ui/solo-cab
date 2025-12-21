import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface FleetDriverPlanningProps {
  fleetManagerId: string;
}

export const FleetDriverPlanning = ({ fleetManagerId }: FleetDriverPlanningProps) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDriver, setSelectedDriver] = useState<string>("all");

  useEffect(() => {
    fetchDrivers();
  }, [fleetManagerId]);

  useEffect(() => {
    if (drivers.length > 0) {
      fetchData();
    }
  }, [drivers]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          *,
          driver:drivers(
            id,
            vehicle_model,
            status,
            user_id
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      if (error) throw error;

      // Fetch profiles for drivers
      if (data && data.length > 0) {
        const driverUserIds = data.filter((d) => d.driver).map((d) => d.driver.user_id);

        if (driverUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", driverUserIds);

          const driversWithProfiles = data.map((d) => ({
            ...d,
            driver: d.driver
              ? {
                  ...d.driver,
                  profile: profiles?.find((p) => p.id === d.driver.user_id),
                }
              : undefined,
          }));

          setDrivers(driversWithProfiles);
        } else {
          setDrivers(data);
        }
      } else {
        setDrivers([]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const driverIds = drivers.map((d) => d.driver_id);
      
      if (driverIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch courses for all fleet drivers
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          clients(
            user_id,
            profiles:user_id(full_name)
          ),
          drivers!courses_driver_id_fkey(
            id,
            user_id,
            vehicle_model
          )
        `)
        .in("driver_id", driverIds)
        .in("status", ["pending", "accepted", "in_progress"])
        .order("scheduled_date", { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch blocked schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("driver_schedules")
        .select("*")
        .in("driver_id", driverIds)
        .eq("is_available", false);

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { locale: fr });
  const weekEnd = endOfWeek(currentDate, { locale: fr });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.driver_id === driverId);
    return driver?.driver?.profile?.full_name || "Chauffeur";
  };

  const getCoursesForDay = (date: Date, driverId?: string) => {
    return courses.filter((course) => {
      const courseDate = parseISO(course.scheduled_date);
      const sameDay = isSameDay(courseDate, date);
      const matchesDriver = !driverId || driverId === "all" || course.driver_id === driverId;
      return sameDay && matchesDriver;
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: "En attente", className: "bg-yellow-500/10 text-yellow-600" },
      accepted: { label: "Confirmée", className: "bg-blue-500/10 text-blue-600" },
      in_progress: { label: "En cours", className: "bg-purple-500/10 text-purple-600" },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge variant="outline" className={cn("text-xs", className)}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {format(weekStart, "d MMM", { locale: fr })} - {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Aujourd'hui
          </Button>
        </div>

        <Select value={selectedDriver} onValueChange={setSelectedDriver}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tous les chauffeurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les chauffeurs</SelectItem>
            {drivers.map((driver) => (
              <SelectItem key={driver.driver_id} value={driver.driver_id}>
                {driver.driver?.profile?.full_name || "Chauffeur"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayCourses = getCoursesForDay(day, selectedDriver);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-h-[200px]",
                isToday && "border-primary bg-primary/5"
              )}
            >
              <CardHeader className="py-2 px-3">
                <CardTitle className={cn(
                  "text-sm",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {format(day, "EEE d", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 py-1 space-y-2">
                {dayCourses.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucune course
                  </p>
                ) : (
                  dayCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-2 bg-card border rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium">
                          {format(parseISO(course.scheduled_date), "HH:mm")}
                        </span>
                        {getStatusBadge(course.status)}
                      </div>
                      
                      {selectedDriver === "all" && (
                        <p className="text-muted-foreground truncate">
                          {getDriverName(course.driver_id)}
                        </p>
                      )}
                      
                      <p className="truncate">
                        {course.clients?.profiles?.full_name || "Client"}
                      </p>
                      
                      <div className="flex items-start gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{course.pickup_address}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-muted-foreground">
                Créneaux avec 1h de buffer avant/après chaque course (blocage automatique)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
