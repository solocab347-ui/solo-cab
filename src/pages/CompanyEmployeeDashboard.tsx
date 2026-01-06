import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import { NotificationBell } from "@/components/NotificationBell";

import { CompanyEmployeeFactures } from "@/components/company/CompanyEmployeeFactures";
import { EmployeePaymentConfirmation } from "@/components/company/EmployeePaymentConfirmation";

interface EmployeeData {
  id: string;
  company_id: string;
  employee_code: string;
  department: string | null;
  job_title: string | null;
  can_create_courses: boolean;
  can_view_invoices: boolean;
  current_month_spent: number;
  max_monthly_budget: number | null;
  company: {
    id: string;
    company_name: string;
    siret: string;
    address: string;
    contact_name: string;
    contact_email: string;
  };
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

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      // Récupérer les données de l'employé avec l'entreprise
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
            contact_email
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .single();

      if (empError) throw empError;

      const companyData = empData.company as unknown as EmployeeData["company"];
      setEmployee({
        ...empData,
        company: companyData,
      });

      // Récupérer les courses de l'employé avec détails enrichis
      const { data: coursesData, error: coursesError } = await supabase
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
            driver_id
          )
        `)
        .eq("employee_id", empData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!coursesError && coursesData) {
        // Enrichir avec les noms des chauffeurs et montants
        const enrichedCourses: Course[] = [];
        
        for (const cc of coursesData) {
          const course = cc.course as any;
          let driverName = null;
          let amount = null;

          // Récupérer le nom du chauffeur
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

          // Récupérer le montant du devis
          const { data: devis } = await supabase
            .from("devis")
            .select("amount")
            .eq("course_id", course.id)
            .eq("status", "accepted")
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "secondary" },
      accepted: { label: "Acceptée", variant: "default" },
      in_progress: { label: "En cours", variant: "default" },
      completed: { label: "Terminée", variant: "outline" },
      cancelled: { label: "Annulée", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Compte non trouvé</h2>
            <p className="text-muted-foreground mb-4">
              Votre compte collaborateur n'a pas été trouvé ou a été désactivé.
            </p>
            <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold">{employee.company.company_name}</span>
              </div>
              <p className="text-xs text-muted-foreground">Espace Collaborateur</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Calcul dynamique du nombre d'onglets */}
          {(() => {
            const tabCount = 2 + // Accueil + Profil (toujours présents)
              1 + // Mes courses (toujours présent - suivi)
              (employee.can_create_courses ? 0 : 0) + // Le bouton "nouvelle course" est dans l'onglet
              (employee.can_view_invoices ? 1 : 0); // Factures si permission
            
            return (
              <TabsList className={`grid w-full mb-6 ${
                tabCount === 3 ? 'grid-cols-3' : 
                tabCount === 4 ? 'grid-cols-4' : 
                'grid-cols-3'
              }`}>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Accueil</span>
                </TabsTrigger>
                <TabsTrigger value="courses" className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  <span className="hidden sm:inline">Mes courses</span>
                </TabsTrigger>
                {employee.can_view_invoices && (
                  <TabsTrigger value="invoices" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Factures</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
              </TabsList>
            );
          })()}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Confirmations de paiement en attente */}
            <EmployeePaymentConfirmation employeeId={employee.id} />

            {/* Carte entreprise */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{employee.company.company_name}</h2>
                    <p className="text-sm text-muted-foreground">{employee.company.address}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">Code: {employee.employee_code}</Badge>
                      {employee.department && (
                        <Badge variant="secondary">{employee.department}</Badge>
                      )}
                      {employee.job_title && (
                        <Badge variant="secondary">{employee.job_title}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dépenses ce mois</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employee.current_month_spent.toFixed(2)} €</div>
                  {employee.max_monthly_budget && (
                    <p className="text-xs text-muted-foreground">
                      Budget: {employee.max_monthly_budget} €
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Courses ce mois</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courses.length}</div>
                  <p className="text-xs text-muted-foreground">Réservations</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {employee.can_create_courses ? (
                      <Badge>Réservations</Badge>
                    ) : (
                      <Badge variant="secondary">Réservations ❌</Badge>
                    )}
                    {employee.can_view_invoices && <Badge>Factures</Badge>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions rapides */}
            {employee.can_create_courses && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions rapides</CardTitle>
                  <CardDescription>Réservez un VTC pour vos déplacements professionnels</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Button className="h-20 flex-col" onClick={() => navigate("/chauffeurs")}>
                    <Plus className="w-6 h-6 mb-2" />
                    Nouvelle réservation
                  </Button>
                  <Button variant="outline" className="h-20 flex-col" onClick={() => setActiveTab("courses")}>
                    <Car className="w-6 h-6 mb-2" />
                    Voir mes courses
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Dernières courses */}
            {courses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dernières courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courses.slice(0, 3).map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{course.pickup_address.split(",")[0]}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(course.scheduled_date).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(course.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Mes courses</CardTitle>
                  <CardDescription>
                    {employee.can_create_courses 
                      ? "Gérez et suivez vos déplacements professionnels"
                      : "Suivez les courses réservées pour vous"
                    }
                  </CardDescription>
                </div>
                {employee.can_create_courses && (
                  <Button onClick={() => navigate("/chauffeurs")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle course
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Aucune course</h3>
                    <p className="text-muted-foreground mb-4">
                      {employee.can_create_courses 
                        ? "Vous n'avez pas encore réservé de course."
                        : "Aucune course n'a été réservée pour vous."
                      }
                    </p>
                    {employee.can_create_courses && (
                      <Button onClick={() => navigate("/chauffeurs")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Réserver maintenant
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3"
                      >
                        {/* En-tête de la course */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Car className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {format(new Date(course.scheduled_date), "EEEE d MMMM", { locale: fr })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                à {format(new Date(course.scheduled_date), "HH:mm")}
                                {course.driver_name && ` • ${course.driver_name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(course.status)}
                            {course.amount && (
                              <span className="text-sm font-semibold">{course.amount.toFixed(2)}€</span>
                            )}
                          </div>
                        </div>

                        {/* Adresses */}
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{course.pickup_address}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{course.destination_address}</span>
                          </div>
                        </div>

                        {/* Timeline de progression */}
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${course.status !== "pending" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                              <span className={course.status !== "pending" ? "font-medium" : "text-muted-foreground"}>Confirmée</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${course.status === "in_progress" || course.status === "completed" ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                              <span className={course.status === "in_progress" || course.status === "completed" ? "font-medium text-blue-600" : "text-muted-foreground"}>
                                En cours
                                {course.started_at && (course.status === "in_progress" || course.status === "completed") && (
                                  <span className="ml-1">({format(new Date(course.started_at), "HH:mm")})</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${course.status === "completed" ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                              <span className={course.status === "completed" ? "font-medium text-green-600" : "text-muted-foreground"}>
                                Terminée
                                {course.updated_at && course.status === "completed" && (
                                  <span className="ml-1">({format(new Date(course.updated_at), "HH:mm")})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Statut paiement si terminée */}
                        {course.status === "completed" && (
                          <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                            course.company_payment_status === "paid_on_spot" 
                              ? "bg-green-500/10 text-green-700"
                              : "bg-blue-500/10 text-blue-700"
                          }`}>
                            {course.company_payment_status === "paid_on_spot" ? (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Payée sur place</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Paiement géré par l'entreprise</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Invoices Tab */}
          {employee.can_view_invoices && (
            <TabsContent value="invoices">
              <CompanyEmployeeFactures 
                employeeId={employee.id} 
                companyName={employee.company.company_name} 
              />
            </TabsContent>
          )}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informations de l'entreprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Raison sociale</p>
                    <p className="font-medium">{employee.company.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SIRET</p>
                    <p className="font-medium">{employee.company.siret}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresse</p>
                    <p className="font-medium">{employee.company.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contact entreprise</p>
                    <p className="font-medium">{employee.company.contact_name}</p>
                    <p className="text-sm text-muted-foreground">{employee.company.contact_email}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mon profil collaborateur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code employé</p>
                    <p className="font-medium">{employee.employee_code}</p>
                  </div>
                  {employee.department && (
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium">{employee.department}</p>
                    </div>
                  )}
                  {employee.job_title && (
                    <div>
                      <p className="text-sm text-muted-foreground">Poste</p>
                      <p className="font-medium">{employee.job_title}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Permissions</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={employee.can_create_courses ? "default" : "secondary"}>
                        {employee.can_create_courses ? "✓" : "✗"} Réservations
                      </Badge>
                      <Badge variant={employee.can_view_invoices ? "default" : "secondary"}>
                        {employee.can_view_invoices ? "✓" : "✗"} Factures
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
