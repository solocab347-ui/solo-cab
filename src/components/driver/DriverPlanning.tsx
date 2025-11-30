import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar as CalendarIcon, MapPin, Clock, Users, ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { subscriptionManager } from "@/lib/subscriptionManager";

interface DriverPlanningProps {
  driverId: string;
}

type ViewMode = "day" | "week" | "month";
type CourseStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

const DriverPlanning = ({ driverId }: DriverPlanningProps) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");

  useEffect(() => {
    fetchCourses();
    const unsubscribe = setupRealtimeSubscription();
    return () => unsubscribe();
  }, [driverId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          clients!inner(
            user_id,
            is_exclusive,
            profiles:user_id(full_name, phone, profile_photo_url)
          ),
          devis:devis(
            id,
            amount,
            status,
            quote_number
          )
        `)
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement du planning");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    return subscriptionManager.subscribe(
      `planning-driver-${driverId}`,
      {
        table: "courses",
        event: "*",
        filter: `driver_id=eq.${driverId}`,
        debounceMs: 1000
      },
      () => {
        fetchCourses();
      }
    );
  };

  const getDateRange = () => {
    switch (viewMode) {
      case "day":
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case "week":
        return { start: startOfWeek(currentDate, { locale: fr }), end: endOfWeek(currentDate, { locale: fr }) };
      case "month":
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const filteredCourses = useMemo(() => {
    const { start, end } = getDateRange();
    
    return courses.filter(course => {
      const courseDate = parseISO(course.scheduled_date);
      const inDateRange = courseDate >= start && courseDate <= end;
      
      const matchesSearch = !searchQuery || 
        course.clients?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.pickup_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.destination_address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      
      return inDateRange && matchesSearch && matchesStatus;
    });
  }, [courses, currentDate, viewMode, searchQuery, statusFilter]);

  const navigatePeriod = (direction: "prev" | "next") => {
    const amount = direction === "prev" ? -1 : 1;
    switch (viewMode) {
      case "day":
        setCurrentDate(direction === "prev" ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case "week":
        setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case "month":
        setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const getStatusBadge = (status: CourseStatus) => {
    const config = {
      pending: { label: "En attente", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
      accepted: { label: "Confirmée", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      in_progress: { label: "En cours", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      completed: { label: "Terminée", className: "bg-green-500/10 text-green-600 border-green-500/20" },
      cancelled: { label: "Annulée", className: "bg-red-500/10 text-red-600 border-red-500/20" },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge variant="outline" className={cn("text-xs", className)}>{label}</Badge>;
  };

  const getPeriodLabel = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
      case "week":
        const weekStart = startOfWeek(currentDate, { locale: fr });
        const weekEnd = endOfWeek(currentDate, { locale: fr });
        return `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: fr });
    }
  };

  const groupCoursesByDay = () => {
    const grouped = new Map<string, any[]>();
    filteredCourses.forEach(course => {
      const dateKey = format(parseISO(course.scheduled_date), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(course);
    });
    return grouped;
  };

  const renderDayView = () => {
    const dayCourses = filteredCourses.sort((a, b) => 
      parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime()
    );

    if (dayCourses.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucune course prévue ce jour</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {dayCourses.map(course => (
          <Card 
            key={course.id}
            onClick={() => setSelectedCourse(course)}
            className="p-4 hover:shadow-lg transition-all cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-foreground">
                    {format(parseISO(course.scheduled_date), "HH:mm")}
                  </span>
                  {getStatusBadge(course.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground truncate">
                      {course.clients?.profiles?.full_name}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{course.pickup_address}</p>
                      <p className="text-xs text-muted-foreground truncate">→ {course.destination_address}</p>
                    </div>
                  </div>
                </div>
                {course.devis?.[0] && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-sm font-semibold text-primary">
                      {course.devis[0].amount.toFixed(2)}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const grouped = groupCoursesByDay();
    const weekStart = startOfWeek(currentDate, { locale: fr });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayCourses = grouped.get(dateKey) || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={dateKey}
              className={cn(
                "border rounded-lg p-3 min-h-[200px] bg-card/30 backdrop-blur-sm",
                isToday && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="text-center mb-3 pb-2 border-b border-border/50">
                <div className={cn(
                  "text-xs font-medium uppercase text-muted-foreground",
                  isToday && "text-primary"
                )}>
                  {format(day, "EEE", { locale: fr })}
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  isToday ? "text-primary" : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-2">
                {dayCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className="p-2 rounded bg-card hover:bg-accent cursor-pointer transition-colors text-xs border border-border/50"
                  >
                    <div className="font-medium text-foreground truncate mb-1">
                      {format(parseISO(course.scheduled_date), "HH:mm")}
                    </div>
                    <div className="text-muted-foreground truncate mb-1">
                      {course.clients?.profiles?.full_name}
                    </div>
                    {getStatusBadge(course.status)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const grouped = groupCoursesByDay();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: fr });
    const endDate = endOfWeek(monthEnd, { locale: fr });
    
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayCourses = grouped.get(dateKey) || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              className={cn(
                "border rounded-lg p-2 min-h-[80px] text-center transition-colors",
                !isCurrentMonth && "opacity-40 bg-muted/20",
                isCurrentMonth && "bg-card/30 backdrop-blur-sm",
                isToday && "border-primary/50 bg-primary/5"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday ? "text-primary font-bold" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              {dayCourses.length > 0 && (
                <div className="space-y-1">
                  {dayCourses.slice(0, 2).map(course => (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className="w-full h-5 rounded text-[10px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: course.status === "accepted" ? "hsl(var(--primary) / 0.2)" :
                                       course.status === "in_progress" ? "hsl(var(--purple-500) / 0.2)" :
                                       course.status === "completed" ? "hsl(var(--success) / 0.2)" :
                                       course.status === "cancelled" ? "hsl(var(--destructive) / 0.2)" :
                                       "hsl(var(--yellow-500) / 0.2)",
                        color: course.status === "accepted" ? "hsl(var(--primary))" :
                              course.status === "in_progress" ? "hsl(var(--purple-500))" :
                              course.status === "completed" ? "hsl(var(--success))" :
                              course.status === "cancelled" ? "hsl(var(--destructive))" :
                              "hsl(var(--yellow-600))"
                      }}
                    >
                      {format(parseISO(course.scheduled_date), "HH:mm")}
                    </div>
                  ))}
                  {dayCourses.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayCourses.length - 2}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec navigation et filtres */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod("prev")}
              className="h-9 w-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {getPeriodLabel()}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod("next")}
              className="h-9 w-9"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs"
            >
              Aujourd'hui
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(searchQuery || statusFilter !== "all") && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Vue Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtres */}
        {showFilters && (
          <Card className="p-4 space-y-3 bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Filtres avancés</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Réinitialiser
              </Button>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client, adresse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "pending", "accepted", "in_progress", "completed", "cancelled"] as const).map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="text-xs"
                  >
                    {status === "all" ? "Tous" :
                     status === "pending" ? "En attente" :
                     status === "accepted" ? "Confirmées" :
                     status === "in_progress" ? "En cours" :
                     status === "completed" ? "Terminées" :
                     "Annulées"}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Contenu du planning */}
      <div>
        {viewMode === "day" && renderDayView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      {/* Dialog détails course */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Détails de la course
            </DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Date et heure</div>
                  <div className="font-semibold text-foreground">
                    {format(parseISO(selectedCourse.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </div>
                {getStatusBadge(selectedCourse.status)}
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Client</div>
                <div className="font-medium text-foreground">
                  {selectedCourse.clients?.profiles?.full_name}
                </div>
                {selectedCourse.clients?.profiles?.phone && (
                  <div className="text-sm text-muted-foreground">
                    {selectedCourse.clients.profiles.phone}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Trajet</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">Départ</div>
                      <div className="text-muted-foreground">{selectedCourse.pickup_address}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-foreground">Arrivée</div>
                      <div className="text-muted-foreground">{selectedCourse.destination_address}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCourse.distance_km && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-medium text-foreground">{selectedCourse.distance_km} km</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Passagers</span>
                <span className="font-medium text-foreground">{selectedCourse.passengers_count}</span>
              </div>

              {selectedCourse.devis?.[0] && (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Montant</span>
                    <span className="text-xl font-bold text-primary">
                      {selectedCourse.devis[0].amount.toFixed(2)}€
                    </span>
                  </div>
                  {selectedCourse.devis[0].quote_number && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Devis {selectedCourse.devis[0].quote_number}
                    </div>
                  )}
                </div>
              )}

              {selectedCourse.notes && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Notes</div>
                  <div className="text-sm text-foreground bg-muted/50 rounded p-2">
                    {selectedCourse.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverPlanning;
