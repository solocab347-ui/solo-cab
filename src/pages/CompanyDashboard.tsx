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

  const quickActions = [
    { icon: Plus, label: "Nouvelle réservation", action: handleCreateCourse, primary: true },
    { icon: UserPlus, label: "Collaborateur", action: () => setActiveTab("employees") },
    { icon: Search, label: "Partenaires", action: () => setActiveTab("drivers") },
    { icon: Globe, label: "Profil public", action: () => setActiveTab("public") },
  ];

  const tabGroups = [
    {
      label: "Gestion",
      tabs: [
        { value: "overview", icon: Building2, label: "Accueil" },
        { value: "reservations", icon: Calendar, label: "Courses" },
        { value: "employees", icon: Users, label: "Collaborateurs" },
      ]
    },
    {
      label: "Finances",
      tabs: [
        { value: "devis", icon: FileText, label: "Devis" },
        { value: "invoices", icon: Receipt, label: "Factures" },
        { value: "payments", icon: CreditCard, label: "Paiements" },
      ]
    },
    {
      label: "Partenaires",
      tabs: [
        { value: "partnerships", icon: Handshake, label: "Accords" },
        { value: "drivers", icon: Car, label: "Chauffeurs" },
        { value: "fleets", icon: Truck, label: "Flottes" },
      ]
    },
    {
      label: "Plus",
      tabs: [
        { value: "stats", icon: BarChart3, label: "Statistiques" },
        { value: "public", icon: Globe, label: "Profil" },
        { value: "settings", icon: Settings, label: "Paramètres" },
      ]
    },
  ];

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
          {/* Navigation par onglets groupés sur 2 lignes */}
          <div className="bg-card rounded-xl border p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tabGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                    {group.label}
                  </span>
                  <div className="flex flex-col gap-1">
                    {group.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.value;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setActiveTab(tab.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Actions rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={action.action}
                    className={`group relative overflow-hidden rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${
                      action.primary
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className={`p-2 rounded-lg ${action.primary ? "bg-primary-foreground/20" : "bg-muted"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{action.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Statistiques compactes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Courses</p>
                      <p className="text-2xl font-bold">{stats.courses}</p>
                    </div>
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Chauffeurs</p>
                      <p className="text-2xl font-bold">{stats.drivers}</p>
                    </div>
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Car className="w-5 h-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Collaborateurs</p>
                      <p className="text-2xl font-bold">{stats.employees}</p>
                    </div>
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Dépenses</p>
                      <p className="text-2xl font-bold">{stats.spent} €</p>
                    </div>
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Euro className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section d'aide */}
            <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Handshake className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Développez votre réseau</p>
                      <p className="text-sm text-muted-foreground">Trouvez des chauffeurs et flottes partenaires</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab("drivers")}>
                    <Search className="w-4 h-4 mr-2" />
                    Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="mt-0">
            <CompanyCoursesList companyId={company.id} onCreateCourse={handleCreateCourse} />
          </TabsContent>

          <TabsContent value="devis" className="mt-0">
            <CompanyDevisList companyId={company.id} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-0">
            <CompanyFacturesList companyId={company.id} />
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <CompanyPaymentsDue companyId={company.id} />
          </TabsContent>

          <TabsContent value="partnerships" className="mt-0">
            <CompanyDriverAgreements companyId={company.id} />
          </TabsContent>

          <TabsContent value="drivers" className="mt-0">
            <CompanyDriverSearch companyId={company.id} />
          </TabsContent>

          <TabsContent value="fleets" className="mt-0">
            <CompanyFleetSearch 
              companyId={company.id} 
              companyProfile={{
                company_name: company.company_name,
                contact_name: company.contact_name,
              }}
            />
          </TabsContent>

          <TabsContent value="employees" className="mt-0">
            <CompanyEmployeesManager companyId={company.id} />
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <CompanyStatisticsComplete companyId={company.id} />
          </TabsContent>

          <TabsContent value="public" className="mt-0">
            <CompanyPublicProfile companyId={company.id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <CompanyBillingSettings companyId={company.id} initialData={company} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
