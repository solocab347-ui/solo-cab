import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  Loader2, 
  LogOut, 
  Car, 
  Star, 
  MapPin,
  Calendar,
  Users,
  Heart,
  Building2,
  Route,
  FileText,
  MessageCircle,
  Clock,
  CheckCircle,
  ChevronRight,
  Plus,
  Home,
  StickyNote,
  User,
  Menu,
  Phone,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoSolocab from "@/assets/logo-solocab.png";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MessagingInterface } from "@/components/messaging/MessagingInterface";
import ClientNotes from "@/components/client/ClientNotes";
import ClientProfile from "@/components/client/ClientProfile";
import { FleetClientDevisFactures } from "@/components/fleet-client/FleetClientDevisFactures";
import { NotificationBell } from "@/components/NotificationBell";

interface FleetInfo {
  id: string;
  company_name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string;
}

interface FleetDriver {
  id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  vehicle_photos: string[] | null;
  rating: number | null;
  total_rides: number | null;
  bio: string | null;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface ClientCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  driver_id: string | null;
}

const FleetClientDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("accueil");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fleetInfo, setFleetInfo] = useState<FleetInfo | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [courses, setCourses] = useState<ClientCourse[]>([]);
  const [clientData, setClientData] = useState<{ id: string; favorite_driver_id: string | null; preferred_fleet_driver_id: string | null } | null>(null);
  const [stats, setStats] = useState({
    upcomingCourses: 0,
    pendingDevis: 0,
    completedCourses: 0,
  });

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();
      setUserProfile(profileData);

      // 1. Get client data
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, fleet_manager_id, favorite_driver_id, preferred_fleet_driver_id")
        .eq("user_id", user.id)
        .single();

      if (clientError) throw clientError;
      if (!client?.fleet_manager_id) {
        toast.error("Vous n'êtes pas lié à un gestionnaire de flotte");
        navigate("/");
        return;
      }

      setClientData({ 
        id: client.id, 
        favorite_driver_id: client.favorite_driver_id,
        preferred_fleet_driver_id: client.preferred_fleet_driver_id 
      });

      // 2. Get fleet manager info
      const { data: fleet, error: fleetError } = await supabase
        .from("fleet_managers")
        .select("id, company_name, logo_url, contact_phone, contact_email")
        .eq("id", client.fleet_manager_id)
        .single();

      if (fleetError) throw fleetError;
      setFleetInfo(fleet);

      // 3. Get fleet drivers
      const { data: fmDrivers, error: driversError } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            vehicle_color,
            vehicle_photos,
            rating,
            total_rides,
            bio,
            user_id
          )
        `)
        .eq("fleet_manager_id", client.fleet_manager_id)
        .eq("status", "active");

      if (driversError) throw driversError;

      if (fmDrivers && fmDrivers.length > 0) {
        const driverUserIds = fmDrivers
          .filter((d: any) => d.driver)
          .map((d: any) => d.driver.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        const driversWithProfiles: FleetDriver[] = fmDrivers
          .filter((d: any) => d.driver)
          .map((d: any) => ({
            ...d.driver,
            profile: profiles?.find((p) => p.id === d.driver.user_id),
          }));

        setDrivers(driversWithProfiles);
      }

      // 4. Get client courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          id,
          pickup_address,
          destination_address,
          scheduled_date,
          status,
          driver_id
        `)
        .eq("client_id", client.id)
        .order("scheduled_date", { ascending: false })
        .limit(50);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // 5. Calculate stats
      const upcoming = (coursesData || []).filter(c => 
        ["pending", "accepted", "in_progress"].includes(c.status)
      ).length;
      const completed = (coursesData || []).filter(c => c.status === "completed").length;

      // Pending devis
      const { count: devisCount } = await supabase
        .from("devis")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "pending");

      setStats({
        upcomingCourses: upcoming,
        completedCourses: completed,
        pendingDevis: devisCount || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleSetFavoriteDriver = async (driverId: string) => {
    if (!clientData) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          favorite_driver_id: driverId,
          preferred_fleet_driver_id: driverId 
        })
        .eq("id", clientData.id);

      if (error) throw error;

      setClientData({ 
        ...clientData, 
        favorite_driver_id: driverId,
        preferred_fleet_driver_id: driverId 
      });
      toast.success("Chauffeur favori mis à jour");
    } catch (error) {
      console.error("Error setting favorite driver:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const upcomingCourses = useMemo(() => 
    courses.filter(c => ["pending", "accepted", "in_progress"].includes(c.status)),
  [courses]);

  const completedCourses = useMemo(() => 
    courses.filter(c => c.status === "completed"),
  [courses]);

  const menuItems = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "chauffeurs", label: "Chauffeurs", icon: Car },
    { id: "courses", label: "Mes courses", icon: Calendar },
    { id: "devis-factures", label: "Devis & Factures", icon: FileText },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "notes", label: "Notes", icon: StickyNote },
    { id: "compte", label: "Mon compte", icon: User },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fleetInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const renderNavigation = () => (
    <nav className="space-y-1 flex-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
              activeTab === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "accueil":
        return (
          <div className="space-y-6">
            {/* Fleet Manager Info Banner */}
            <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-card rounded-2xl p-2 border border-border/50 shadow-lg flex-shrink-0">
                    {fleetInfo.logo_url ? (
                      <img src={fleetInfo.logo_url} alt={fleetInfo.company_name} className="w-full h-full object-contain" />
                    ) : (
                      <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="secondary" className="mb-2">Votre gestionnaire</Badge>
                    <h3 className="text-lg font-bold truncate">{fleetInfo.company_name}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                      {fleetInfo.contact_phone && (
                        <a href={`tel:${fleetInfo.contact_phone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{fleetInfo.contact_phone}</span>
                        </a>
                      )}
                      <a href={`mailto:${fleetInfo.contact_email}`} className="flex items-center gap-1 hover:text-primary">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{fleetInfo.contact_email}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card 
                className="bg-gradient-to-br from-blue-500 to-blue-600 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTabChange("courses")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-white" />
                    <h3 className="text-sm font-semibold text-white">Courses à venir</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.upcomingCourses}</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-orange-500 to-orange-600 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTabChange("devis-factures")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-white" />
                    <h3 className="text-sm font-semibold text-white">Devis en attente</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.pendingDevis}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success to-emerald-600">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <h3 className="text-sm font-semibold text-white">Courses effectuées</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.completedCourses}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => navigate("/create-fleet-course")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/20 rounded-2xl">
                      <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Réserver un trajet</h3>
                      <p className="text-sm text-muted-foreground">
                        Planifiez votre prochaine course
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {clientData?.favorite_driver_id && (
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate(`/create-fleet-course?driver=${clientData.favorite_driver_id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-warning/20 rounded-2xl">
                        <Heart className="w-8 h-8 text-warning fill-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Chauffeur favori</h3>
                        <p className="text-sm text-muted-foreground">
                          Réserver avec votre chauffeur préféré
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Upcoming Courses */}
            {upcomingCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Courses à venir
                </h2>
                <div className="space-y-3">
                  {upcomingCourses.slice(0, 3).map((course) => (
                    <Card key={course.id} className="hover:border-primary/30 transition-all">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={course.status === "accepted" ? "default" : "secondary"}>
                                {course.status === "pending" && "En attente"}
                                {course.status === "accepted" && "Confirmée"}
                                {course.status === "in_progress" && "En cours"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(course.scheduled_date), "dd MMM à HH:mm", { locale: fr })}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-success rounded-full" />
                                <span className="truncate max-w-xs">{course.pickup_address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-destructive rounded-full" />
                                <span className="truncate max-w-xs">{course.destination_address}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "chauffeurs":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Chauffeurs de {fleetInfo.company_name}
              </h2>
            </div>

            {drivers.length === 0 ? (
              <Card className="p-12 text-center">
                <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucun chauffeur disponible</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {drivers.map((driver) => {
                  const isFavorite = clientData?.favorite_driver_id === driver.id || clientData?.preferred_fleet_driver_id === driver.id;
                  return (
                    <Card 
                      key={driver.id} 
                      className={`overflow-hidden transition-all ${isFavorite ? 'border-warning' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16 border-2 border-border">
                            <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                              {(driver.profile?.full_name || "C")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{driver.profile?.full_name || "Chauffeur"}</h3>
                              {isFavorite && (
                                <Heart className="w-4 h-4 text-warning fill-warning" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Car className="w-4 h-4" />
                              <span>{driver.vehicle_brand} {driver.vehicle_model}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {driver.rating && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="w-4 h-4 text-warning fill-warning" />
                                  <span>{driver.rating.toFixed(1)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Users className="w-4 h-4" />
                                <span>{driver.total_rides || 0} courses</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          {!isFavorite && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-1"
                              onClick={() => handleSetFavoriteDriver(driver.id)}
                            >
                              <Heart className="w-4 h-4" />
                              Favori
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            className="gap-1"
                            onClick={() => navigate(`/create-fleet-course?driver=${driver.id}`)}
                          >
                            <Calendar className="w-4 h-4" />
                            Réserver
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "courses":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Mes courses
              </h2>
              <Button size="sm" onClick={() => navigate("/create-fleet-course")}>
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="p-12 text-center">
                <Route className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-4">Aucune course pour le moment</p>
                <Button onClick={() => navigate("/create-fleet-course")}>
                  Réserver un trajet
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:border-primary/30 transition-all">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge 
                              variant={
                                course.status === "completed" ? "default" :
                                course.status === "cancelled" ? "destructive" :
                                course.status === "accepted" ? "default" : "secondary"
                              }
                            >
                              {course.status === "pending" && "En attente"}
                              {course.status === "accepted" && "Confirmée"}
                              {course.status === "in_progress" && "En cours"}
                              {course.status === "completed" && "Terminée"}
                              {course.status === "cancelled" && "Annulée"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(course.scheduled_date), "dd MMM yyyy à HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-success rounded-full flex-shrink-0" />
                              <span className="truncate">{course.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-destructive rounded-full flex-shrink-0" />
                              <span className="truncate">{course.destination_address}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "devis-factures":
        return clientData?.id ? (
          <FleetClientDevisFactures clientId={clientData.id} />
        ) : null;

      case "messages":
        return <MessagingInterface />;

      case "notes":
        return <ClientNotes />;

      case "compte":
        return <ClientProfile />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/50 p-4 flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-card rounded-xl p-2 border border-border/50 shadow">
              {fleetInfo.logo_url ? (
                <img src={fleetInfo.logo_url} alt={fleetInfo.company_name} className="w-full h-full object-contain" />
              ) : (
                <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{fleetInfo.company_name}</h1>
              <p className="text-xs text-muted-foreground truncate">Espace client</p>
            </div>
          </div>
        </div>
        {renderNavigation()}
        <div className="mt-auto pt-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-4">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-card rounded-xl p-1.5 border border-border/50">
                {fleetInfo.logo_url ? (
                  <img src={fleetInfo.logo_url} alt={fleetInfo.company_name} className="w-full h-full object-contain" />
                ) : (
                  <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm truncate">{fleetInfo.company_name}</h1>
                <p className="text-xs text-muted-foreground">Espace client</p>
              </div>
            </div>
          </div>
          {renderNavigation()}
          <div className="mt-auto pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-2">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden flex-shrink-0"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="hidden sm:block">
                <h2 className="font-semibold">
                  Bonjour, {userProfile?.full_name || "Client"}
                </h2>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button 
                size="sm"
                className="gap-2"
                onClick={() => navigate("/create-fleet-course")}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Réserver</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default FleetClientDashboard;
