import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo-solocab.png";
import {
  Building2,
  Car,
  FileText,
  Users,
  Settings,
  LogOut,
  Calendar,
  Euro,
  Plus,
  XCircle,
  Receipt,
  CreditCard,
  Globe,
  Search,
  Truck,
  UserPlus,
  ExternalLink,
  Handshake,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { CompanyEmployeesManager } from "@/components/company/CompanyEmployeesManager";
import { CompanyDriverAgreements } from "@/components/company/CompanyDriverAgreements";
import { CompanyCoursesList } from "@/components/company/CompanyCoursesList";
import { CompanyDevisList } from "@/components/company/CompanyDevisList";
import { CompanyFacturesList } from "@/components/company/CompanyFacturesList";
import { CompanyBillingSettings } from "@/components/company/CompanyBillingSettings";
import { CompanyPaymentsDue } from "@/components/company/CompanyPaymentsDue";
import { CompanyPublicProfile } from "@/components/company/CompanyPublicProfile";
import { CompanyStatisticsComplete } from "@/components/company/CompanyStatisticsComplete";
import { CompanyDriverSearch } from "@/components/company/CompanyDriverSearch";
import { CompanyFleetSearch } from "@/components/company/CompanyFleetSearch";
import { BarChart3 } from "lucide-react";

interface Company {
  id: string;
  company_name: string;
  siret: string;
  address: string;
  billing_address: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
}

export default function CompanyDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [stats, setStats] = useState({ courses: 0, spent: 0, drivers: 0, employees: 0 });

  useEffect(() => {
    if (user) {
      fetchCompanyProfile();
    }
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchCompanyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setCompany(data);

      // Fetch stats
      if (data) {
        const [coursesRes, driversRes, employeesRes] = await Promise.all([
          supabase.from("company_courses").select("course_id").eq("company_id", data.id),
          supabase.from("company_driver_agreements").select("id").eq("company_id", data.id).eq("status", "active"),
          supabase.from("company_employees").select("id").eq("company_id", data.id).eq("is_active", true),
        ]);

        setStats({
          courses: coursesRes.data?.length || 0,
          spent: 0,
          drivers: driversRes.data?.length || 0,
          employees: employeesRes.data?.length || 0,
        });
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleCreateCourse = () => {
    navigate("/chauffeurs");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profil non trouvé</h2>
            <p className="text-muted-foreground mb-4">Votre profil entreprise n'a pas été trouvé.</p>
            <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10" />
            <div>
              <h1 className="font-semibold">{company.company_name}</h1>
              <p className="text-xs text-muted-foreground">Espace Entreprise</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-12 mb-6">
            <TabsTrigger value="overview"><Building2 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="reservations"><Calendar className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="devis"><FileText className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="invoices"><Receipt className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="partnerships"><Handshake className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="drivers"><Car className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="fleets"><Truck className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="employees"><Users className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="public"><Globe className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Courses</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.courses}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chauffeurs</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.drivers}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collaborateurs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.employees}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.spent} €</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Button className="h-24 flex-col" onClick={handleCreateCourse}>
                  <Plus className="w-6 h-6 mb-2" />
                  Nouvelle réservation
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab("employees")}>
                  <UserPlus className="w-6 h-6 mb-2" />
                  Ajouter un collaborateur
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab("public")}>
                  <Globe className="w-6 h-6 mb-2" />
                  Mon profil public
                </Button>
                <Button variant="outline" className="h-24 flex-col" onClick={() => setActiveTab("drivers")}>
                  <Search className="w-6 h-6 mb-2" />
                  Rechercher des partenaires
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations">
            <CompanyCoursesList companyId={company.id} onCreateCourse={handleCreateCourse} />
          </TabsContent>

          <TabsContent value="devis">
            <CompanyDevisList companyId={company.id} />
          </TabsContent>

          <TabsContent value="invoices">
            <CompanyFacturesList companyId={company.id} />
          </TabsContent>

          <TabsContent value="payments">
            <CompanyPaymentsDue companyId={company.id} />
          </TabsContent>

          <TabsContent value="partnerships">
            <CompanyDriverAgreements companyId={company.id} />
          </TabsContent>

          <TabsContent value="drivers">
            <CompanyDriverSearch companyId={company.id} />
          </TabsContent>

          <TabsContent value="fleets">
            <CompanyFleetSearch 
              companyId={company.id} 
              companyProfile={{
                company_name: company.company_name,
                contact_name: company.contact_name,
              }}
            />
          </TabsContent>

          <TabsContent value="employees">
            <CompanyEmployeesManager companyId={company.id} />
          </TabsContent>

          <TabsContent value="stats">
            <CompanyStatisticsComplete companyId={company.id} />
          </TabsContent>

          <TabsContent value="public">
            <CompanyPublicProfile companyId={company.id} />
          </TabsContent>

          <TabsContent value="settings">
            <CompanyBillingSettings companyId={company.id} initialData={company} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
