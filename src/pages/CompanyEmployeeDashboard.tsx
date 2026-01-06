import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Building2, 
  Car, 
  LogOut, 
  User, 
  Clock,
  MapPin,
  Calendar,
  Euro,
  FileText,
  Plus,
  Loader2,
  XCircle,
  Users,
  Bell,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Shield,
  ArrowRight,
  CheckCircle2,
  Timer,
  Zap,
  Receipt,
  Handshake,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { CompanyEmployeeFactures } from "@/components/company/CompanyEmployeeFactures";
import { EmployeePaymentConfirmation } from "@/components/company/EmployeePaymentConfirmation";
import { EmployeePhotoUpload } from "@/components/company/employee/EmployeePhotoUpload";
import { EmployeeExpenseReports } from "@/components/company/employee/EmployeeExpenseReports";
import { EmployeePartnersHub } from "@/components/company/employee/EmployeePartnersHub";
import { EmployeeCoursePaymentDeclaration } from "@/components/company/employee/EmployeeCoursePaymentDeclaration";
import { CompanyInlineCourseCreation } from "@/components/company/CompanyInlineCourseCreation";

interface EmployeeData {
  id: string;
  company_id: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  can_invite_drivers: boolean;
  current_month_spent: number;
  max_monthly_budget: number | null;
  avatar_url: string | null;
  company: {
    id: string;
    company_name: string;
    siret: string;
    address: string;
    contact_name: string;
    contact_email: string;
    logo_url: string | null;
  };
  user_name: string | null;
}

interface Course {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  distance_km: number | null;
  started_at: string | null;
  updated_at: string | null;
  company_payment_status: string | null;
  driver_name: string | null;
  amount: number | null;
}

export default function CompanyEmployeeDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCourseCreation, setShowCourseCreation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const { data: empData, error: empError } = await supabase
        .from("company_employees")
        .select(`
          *,
          company:companies!inner(
            id,
            company_name,
            siret,
            address,
            contact_name,
            contact_email,
            logo_url
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .single();

      if (empError) throw empError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .maybeSingle();

      const companyData = empData.company as unknown as EmployeeData["company"];
      setEmployee({
        ...empData,
        company: companyData,
        user_name: profileData?.full_name || null,
      });

      // Fetch courses - either created by this employee OR all company courses if admin/can_view_all
      // First, try to get courses linked to this employee
      let coursesQuery = supabase
        .from("company_courses")
        .select(`
          course:courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            status,
            distance_km,
            started_at,
            updated_at,
            company_payment_status,
            driver_id,
            created_by_user_id
          ),
          employee_id
        `)
        .eq("company_id", empData.company.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // For regular employees, filter by their employee_id OR courses they created
      const { data: coursesData, error: coursesError } = await coursesQuery;

      console.log("[CompanyEmployeeDashboard] Courses query result:", {
        coursesData: coursesData?.length || 0,
        coursesError,
        employeeId: empData.id,
        userId: user?.id,
        companyId: empData.company.id
      });

      if (coursesError) {
        console.error("[CompanyEmployeeDashboard] Courses error:", coursesError);
      }

      if (!coursesError && coursesData) {
        console.log("[CompanyEmployeeDashboard] Raw courses:", coursesData);
        
        // Filter courses: either assigned to this employee OR created by this user
        const filteredCourses = coursesData.filter((cc: any) => 
          cc.employee_id === empData.id || 
          cc.course?.created_by_user_id === user?.id
        );

        console.log("[CompanyEmployeeDashboard] Filtered courses:", filteredCourses.length);

        const enrichedCourses: Course[] = [];
        
        for (const cc of filteredCourses) {
          const course = cc.course as any;
          let driverName = null;
          let amount = null;

          if (course.driver_id) {
            const { data: driver } = await supabase
              .from("drivers")
              .select("user_id")
              .eq("id", course.driver_id)
              .maybeSingle();
            
            if (driver?.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", driver.user_id)
                .maybeSingle();
              driverName = profile?.full_name || null;
            }
          }

          // Get devis - either accepted or pending
          const { data: devis } = await supabase
            .from("devis")
            .select("amount, status")
            .eq("course_id", course.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          amount = devis?.amount || null;

          enrichedCourses.push({
            ...course,
            driver_name: driverName,
            amount
          });
        }

        setCourses(enrichedCourses);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
      pending: { label: "En attente", color: "text-amber-400", bgColor: "bg-amber-500/20", icon: Timer },
      accepted: { label: "Confirmée", color: "text-primary", bgColor: "bg-primary/20", icon: CheckCircle2 },
      in_progress: { label: "En cours", color: "text-blue-400", bgColor: "bg-blue-500/20", icon: Zap },
      completed: { label: "Terminée", color: "text-emerald-400", bgColor: "bg-emerald-500/20", icon: CheckCircle2 },
      cancelled: { label: "Annulée", color: "text-red-400", bgColor: "bg-red-500/20", icon: XCircle },
    };
    return statusMap[status] || { label: status, color: "text-muted-foreground", bgColor: "bg-muted", icon: Clock };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/30 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Compte non trouvé</h2>
            <p className="text-muted-foreground mb-6">
              Votre compte collaborateur n'a pas été trouvé ou a été désactivé.
            </p>
            <Button onClick={() => navigate("/")} className="bg-gradient-to-r from-primary to-accent">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstName = employee.user_name?.split(" ")[0] || "Collaborateur";
  const hasInvoicesTab = employee.can_view_invoices;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Premium */}
      <header className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-card via-card to-card/80">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
        
        <div className="container relative mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Info */}
            <div className="flex items-center gap-4">
              {/* Company Logo */}
              <div className="relative group">
                {employee.company.logo_url ? (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/50 group-hover:scale-105">
                    <img 
                      src={employee.company.logo_url} 
                      alt={employee.company.company_name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/50 group-hover:scale-105">
                    <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                )}
                {/* Online Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
              </div>
              
              {/* Welcome Text */}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  Bonjour, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{firstName}</span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{employee.company.company_name}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {employee.employee_code}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full bg-card/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-2xl h-auto flex-wrap gap-1">
            <TabsTrigger 
              value="overview" 
              className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs sm:text-sm">Accueil</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="courses" 
              className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
            >
              <Car className="w-6 h-6" />
              <span className="text-xs sm:text-sm">Courses</span>
            </TabsTrigger>
            
            {hasInvoicesTab && (
              <TabsTrigger 
                value="invoices" 
                className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs sm:text-sm">Factures</span>
              </TabsTrigger>
            )}

            <TabsTrigger 
              value="expenses" 
              className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
            >
              <Receipt className="w-6 h-6" />
              <span className="text-xs sm:text-sm">Frais</span>
            </TabsTrigger>

            <TabsTrigger 
              value="partners" 
              className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
            >
              <Handshake className="w-6 h-6" />
              <span className="text-xs sm:text-sm">Partenaires</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="profile" 
              className="flex-1 min-w-[80px] rounded-xl py-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-light data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
            >
              <User className="w-6 h-6" />
              <span className="text-xs sm:text-sm">Profil</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            {/* Payment Confirmations */}
            <EmployeePaymentConfirmation employeeId={employee.id} />

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              {/* Dépenses */}
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Dépenses ce mois</p>
                      <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                        {employee.current_month_spent.toFixed(0)}€
                      </p>
                      {employee.max_monthly_budget && (
                        <p className="text-xs text-muted-foreground mt-1">
                          sur {employee.max_monthly_budget}€ de budget
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Euro className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Courses */}
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Courses ce mois</p>
                      <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
                        {courses.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">réservations</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <Car className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-success/10 via-success/5 to-transparent shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <CardContent className="pt-6 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Mes permissions</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant={employee.can_create_courses ? "default" : "secondary"} className={employee.can_create_courses ? "bg-success/20 text-success border-success/30" : ""}>
                          {employee.can_create_courses ? "✓" : "✗"} Réserver
                        </Badge>
                        <Badge variant={employee.can_view_invoices ? "default" : "secondary"} className={employee.can_view_invoices ? "bg-primary/20 text-primary border-primary/30" : ""}>
                          {employee.can_view_invoices ? "✓" : "✗"} Factures
                        </Badge>
                        <Badge variant={employee.can_invite_drivers ? "default" : "secondary"} className={employee.can_invite_drivers ? "bg-accent/20 text-accent border-accent/30" : ""}>
                          {employee.can_invite_drivers ? "✓" : "✗"} Chauffeurs
                        </Badge>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-success/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            {employee.can_create_courses && (
              <Card className="border-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">Réservez votre VTC</h3>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Trouvez un chauffeur professionnel pour vos déplacements d'affaires
                      </p>
                    </div>
                    <Button 
                      onClick={() => setActiveTab("drivers")}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg group"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvelle réservation
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Courses */}
            {courses.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Dernières courses
                    </CardTitle>
                    <CardDescription>Vos 3 derniers déplacements</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("courses")} className="text-primary hover:text-primary">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courses.slice(0, 3).map((course, index) => {
                      const status = getStatusConfig(course.status);
                      const StatusIcon = status.icon;
                      return (
                        <div 
                          key={course.id} 
                          className="group relative p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all border border-transparent hover:border-primary/20"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl ${status.bgColor} flex items-center justify-center`}>
                              <StatusIcon className={`w-5 h-5 ${status.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{course.pickup_address.split(",")[0]}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(course.scheduled_date), "d MMM • HH:mm", { locale: fr })}</span>
                                {course.driver_name && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                    <span>{course.driver_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                {status.label}
                              </Badge>
                              {course.amount && (
                                <p className="text-sm font-semibold mt-1">{course.amount.toFixed(0)}€</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="animate-fade-in">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-primary" />
                    Mes courses
                  </CardTitle>
                  <CardDescription>
                    {employee.can_create_courses 
                      ? "Gérez et suivez vos déplacements professionnels"
                      : "Suivez les courses réservées pour vous"
                    }
                  </CardDescription>
                </div>
                {employee.can_create_courses && (
                  <Button onClick={() => setShowCourseCreation(true)} className="bg-gradient-to-r from-primary to-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle course
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
                      <Car className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Aucune course</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {employee.can_create_courses 
                        ? "Vous n'avez pas encore réservé de course."
                        : "Aucune course n'a été réservée pour vous."
                      }
                    </p>
                    {employee.can_create_courses && (
                      <Button onClick={() => setShowCourseCreation(true)} className="bg-gradient-to-r from-primary to-accent">
                        <Plus className="w-4 h-4 mr-2" />
                        Réserver maintenant
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course, index) => {
                      const status = getStatusConfig(course.status);
                      const StatusIcon = status.icon;
                      return (
                        <div
                          key={course.id}
                          className="p-5 rounded-2xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-all"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-2xl ${status.bgColor} flex items-center justify-center`}>
                                <StatusIcon className={`w-6 h-6 ${status.color}`} />
                              </div>
                              <div>
                                <p className="font-bold">
                                  {format(new Date(course.scheduled_date), "EEEE d MMMM", { locale: fr })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  à {format(new Date(course.scheduled_date), "HH:mm")}
                                  {course.driver_name && ` • ${course.driver_name}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                {status.label}
                              </Badge>
                              {course.amount && (
                                <p className="text-lg font-bold mt-1">{course.amount.toFixed(0)}€</p>
                              )}
                            </div>
                          </div>

                          {/* Addresses */}
                          <div className="space-y-2 text-sm mb-4">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10">
                              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{course.pickup_address}</span>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10">
                              <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{course.destination_address}</span>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="p-4 rounded-xl bg-muted/30">
                            <div className="flex items-center justify-between gap-2">
                              {["pending", "accepted", "in_progress", "completed"].map((step, i) => {
                                const isCompleted = 
                                  (step === "pending" && course.status !== "cancelled") ||
                                  (step === "accepted" && ["accepted", "in_progress", "completed"].includes(course.status)) ||
                                  (step === "in_progress" && ["in_progress", "completed"].includes(course.status)) ||
                                  (step === "completed" && course.status === "completed");
                                const isActive = course.status === step;
                                const stepLabels: Record<string, string> = {
                                  pending: "Confirmée",
                                  accepted: "Acceptée",
                                  in_progress: "En cours",
                                  completed: "Terminée"
                                };
                                return (
                                  <div key={step} className="flex flex-col items-center gap-1.5 flex-1">
                                    <div className={`w-3 h-3 rounded-full transition-all ${
                                      isCompleted ? "bg-primary scale-110" : 
                                      isActive ? "bg-primary animate-pulse" : 
                                      "bg-muted-foreground/30"
                                    }`} />
                                    <span className={`text-xs text-center ${
                                      isActive ? "font-semibold text-primary" : 
                                      isCompleted ? "text-muted-foreground" : 
                                      "text-muted-foreground/50"
                                    }`}>
                                      {stepLabels[step]}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Payment Status */}
                          {course.status === "completed" && (
                            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                              course.company_payment_status === "paid_on_spot" 
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {course.company_payment_status === "paid_on_spot" ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Payée sur place</span>
                                </>
                              ) : (
                                <>
                                  <Building2 className="w-4 h-4" />
                                  <span>Paiement géré par l'entreprise</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Invoices Tab */}
          {hasInvoicesTab && (
            <TabsContent value="invoices" className="animate-fade-in">
              <CompanyEmployeeFactures 
                employeeId={employee.id} 
                companyName={employee.company.company_name} 
              />
            </TabsContent>
          )}

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="animate-fade-in space-y-6">
            {/* Déclaration de paiement des courses */}
            <EmployeeCoursePaymentDeclaration 
              employeeId={employee.id}
              companyId={employee.company_id}
              onExpenseCreated={() => {
                // Rafraîchir les notes de frais si nécessaire
              }}
            />
            
            {/* Notes de frais */}
            <EmployeeExpenseReports 
              employeeId={employee.id}
              companyId={employee.company_id}
            />
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="animate-fade-in">
            <EmployeePartnersHub 
              companyId={employee.company_id}
              canInviteDrivers={employee.can_invite_drivers}
              canCreateCourses={employee.can_create_courses}
            />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Company Info */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-accent" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.company.logo_url && (
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-primary/20">
                        <img 
                          src={employee.company.logo_url} 
                          alt={employee.company.company_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Raison sociale</p>
                    <p className="font-semibold mt-1">{employee.company.company_name}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">SIRET</p>
                    <p className="font-mono font-medium mt-1">{employee.company.siret}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Adresse</p>
                    <p className="font-medium mt-1">{employee.company.address}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
                    <p className="font-medium mt-1">{employee.company.contact_name}</p>
                    <p className="text-sm text-muted-foreground">{employee.company.contact_email}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Info with Photo Upload */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-accent to-success" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-accent" />
                    Mon profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo Upload */}
                  <EmployeePhotoUpload
                    employeeId={employee.id}
                    currentPhotoUrl={employee.avatar_url}
                    employeeName={employee.user_name || "Collaborateur"}
                    onPhotoUpdated={(url) => {
                      setEmployee(prev => prev ? { ...prev, avatar_url: url } : null);
                    }}
                  />

                  <div className="text-center">
                    <h3 className="font-bold text-lg">{employee.user_name || "Collaborateur"}</h3>
                    <Badge className="mt-2 bg-accent/20 text-accent border-accent/30">
                      {employee.employee_code}
                    </Badge>
                  </div>

                  {employee.department && (
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Service</p>
                      <p className="font-medium mt-1">{employee.department}</p>
                    </div>
                  )}
                  {employee.job_title && (
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Poste</p>
                      <p className="font-medium mt-1">{employee.job_title}</p>
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Permissions</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={employee.can_create_courses ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                        {employee.can_create_courses ? "✓" : "✗"} Réservations
                      </Badge>
                      <Badge className={employee.can_view_invoices ? "bg-primary/20 text-primary border-primary/30" : "bg-muted text-muted-foreground"}>
                        {employee.can_view_invoices ? "✓" : "✗"} Factures
                      </Badge>
                      <Badge className={employee.can_invite_drivers ? "bg-accent/20 text-accent border-accent/30" : "bg-muted text-muted-foreground"}>
                        {employee.can_invite_drivers ? "✓" : "✗"} Inviter chauffeurs
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog création de course */}
      {employee && (
        <Dialog open={showCourseCreation} onOpenChange={setShowCourseCreation}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Nouvelle course
              </DialogTitle>
              <DialogDescription>
                Sélectionnez un chauffeur partenaire et créez votre course
              </DialogDescription>
            </DialogHeader>
            <CompanyInlineCourseCreation 
              companyId={employee.company_id}
              onClose={() => setShowCourseCreation(false)}
              onSuccess={() => {
                setShowCourseCreation(false);
                fetchEmployeeData();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
