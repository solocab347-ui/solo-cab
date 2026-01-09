import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  Handshake,
  BarChart3,
  Home,
  ChevronRight,
  TrendingUp,
  Clock,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CompanyEmployeesManager } from "@/components/company/CompanyEmployeesManager";
import { CompanyDriverAgreements } from "@/components/company/CompanyDriverAgreements";
import { CompanyCoursesList } from "@/components/company/CompanyCoursesList";
import { CompanyDevisList } from "@/components/company/CompanyDevisList";
import { CompanyFacturesList } from "@/components/company/CompanyFacturesList";
import { CompanyBillingSettings } from "@/components/company/CompanyBillingSettings";
import { CompanyPaymentsHub } from "@/components/company/CompanyPaymentsHub";
import { CompanyPaymentAlerts } from "@/components/company/CompanyPaymentAlerts";
import { CompanyPublicProfile } from "@/components/company/CompanyPublicProfile";
import { CompanyStatisticsComplete } from "@/components/company/CompanyStatisticsComplete";
import { CompanyDriverSearch } from "@/components/company/CompanyDriverSearch";
import { CompanyFleetPartnerships } from "@/components/company/CompanyFleetPartnerships";
import { CompanyInlineCourseCreation } from "@/components/company/CompanyInlineCourseCreation";
import { CompanyExpenseReports } from "@/components/company/CompanyExpenseReports";
import { CompanyCourseRequestsManager } from "@/components/company/CompanyCourseRequestsManager";
import { BillingWarningBanner } from "@/components/company/BillingWarningBanner";
import { CompanyPartnershipQRCode } from "@/components/company/CompanyPartnershipQRCode";
import { CompanyAdministratorsManager } from "@/components/company/CompanyAdministratorsManager";
import { Link } from "react-router-dom";

interface Company {
  id: string;
  company_name: string;
  siret: string;
  siren?: string | null;
  tva_number?: string | null;
  address: string;
  billing_address: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
}


export default function CompanyDashboard() {
  const { user, signOut } = useAuth();
  const { t } = useLocale();
  useUserLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "home");
  const [stats, setStats] = useState({ courses: 0, spent: 0, drivers: 0, employees: 0, fleets: 0 });
  const [pendingDriverRequests, setPendingDriverRequests] = useState(0);
  const [pendingFleetRequests, setPendingFleetRequests] = useState(0);

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

      if (data) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const [coursesRes, driversRes, employeesRes, paymentsRes, fleetsRes, pendingDriversRes, pendingFleetsRes] = await Promise.all([
          supabase.from("company_courses")
            .select("course_id, courses:course_id(scheduled_date)")
            .eq("company_id", data.id),
          supabase.from("company_driver_agreements").select("id").eq("company_id", data.id).eq("status", "accepted"),
          supabase.from("company_employees").select("id").eq("company_id", data.id).eq("is_active", true),
          supabase.from("company_payments")
            .select("amount")
            .eq("company_id", data.id)
            .gte("created_at", startOfMonth.toISOString())
            .lte("created_at", endOfMonth.toISOString()),
          supabase.from("company_fleet_agreements").select("id").eq("company_id", data.id).eq("status", "accepted"),
          // Pending driver partnership requests (received)
          supabase.from("company_driver_agreements")
            .select("id", { count: 'exact', head: true })
            .eq("company_id", data.id)
            .eq("status", "pending")
            .eq("proposed_by", "driver"),
          // Pending fleet partnership requests (received)
          supabase.from("company_fleet_agreements")
            .select("id", { count: 'exact', head: true })
            .eq("company_id", data.id)
            .eq("status", "pending")
            .eq("proposed_by", "fleet_manager"),
        ]);

        const monthCourses = coursesRes.data?.filter(cc => {
          const courseDate = cc.courses?.scheduled_date;
          if (!courseDate) return false;
          const date = new Date(courseDate);
          return date >= startOfMonth && date <= endOfMonth;
        }) || [];

        const totalSpent = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

        setStats({
          courses: monthCourses.length,
          spent: Math.round(totalSpent * 100) / 100,
          drivers: driversRes.data?.length || 0,
          employees: employeesRes.data?.length || 0,
          fleets: fleetsRes.data?.length || 0,
        });

        setPendingDriverRequests(pendingDriversRes.count || 0);
        setPendingFleetRequests(pendingFleetsRes.count || 0);
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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background auth-loading-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md bg-card/50 backdrop-blur border-border/50">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('companyDashboard.profileNotFound')}</h2>
            <p className="text-muted-foreground mb-4">{t('companyDashboard.profileNotFoundDesc')}</p>
            <Button onClick={() => navigate("/")}>{t('companyDashboard.backToHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPendingRequests = pendingDriverRequests + pendingFleetRequests;

  return (
    <div className="min-h-screen bg-gradient-bg page-transition">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="SoloCab" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            {activeTab !== "home" && (
              <Button variant="ghost" size="sm" onClick={() => handleTabChange("home")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Accueil</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{company.contact_name}</span>
              <Badge variant="outline" className="text-xs border-primary/50 text-primary bg-primary/10">
                Entreprise
              </Badge>
            </div>
            <Link to="/rgpd-data">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" title="Mes Données RGPD">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <LanguageSelector variant="header" />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Navigation Menu - Dropdown style like Fleet Manager */}
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="w-full h-12 px-4 pr-12 rounded-xl bg-card border border-border text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none cursor-pointer shadow-sm"
            >
              <option value="home">🏠 Accueil</option>
              <option value="courses">🚗 Courses</option>
              <option value="team">👥 Équipe</option>
              <option value="finances">💰 Finances</option>
              <option value="partnerships">🤝 Partenaires {totalPendingRequests > 0 ? `(${totalPendingRequests})` : ''}</option>
              <option value="stats">📊 Statistiques</option>
              <option value="settings">⚙️ Paramètres</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
              <span className="text-xs text-muted-foreground hidden sm:inline">Naviguer</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Home Tab */}
          <TabsContent value="home">
            <CompanyHome 
              company={company}
              stats={stats}
              pendingDriverRequests={pendingDriverRequests}
              pendingFleetRequests={pendingFleetRequests}
              onTabChange={handleTabChange}
            />
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <CoursesSection companyId={company.id} onTabChange={handleTabChange} />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <TeamSection companyId={company.id} companyName={company.company_name} />
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances">
            <FinancesSection companyId={company.id} company={company} />
          </TabsContent>

          {/* Partnerships Tab */}
          <TabsContent value="partnerships">
            <PartnershipsSection 
              companyId={company.id} 
              companyProfile={{ company_name: company.company_name, contact_name: company.contact_name }}
            />
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <CompanyStatisticsComplete companyId={company.id} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SettingsSection companyId={company.id} company={company} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============= HOME SECTION =============
function CompanyHome({
  company,
  stats,
  pendingDriverRequests,
  pendingFleetRequests,
  onTabChange,
}: {
  company: Company;
  stats: { courses: number; spent: number; drivers: number; employees: number; fleets: number };
  pendingDriverRequests: number;
  pendingFleetRequests: number;
  onTabChange: (tab: string) => void;
}) {
  const totalPendingRequests = pendingDriverRequests + pendingFleetRequests;

  const quickActions = [
    { label: "Courses", icon: Car, tab: "courses", color: "text-blue-400", bgColor: "bg-blue-500/20", count: stats.courses },
    { label: "Équipe", icon: Users, tab: "team", color: "text-emerald-400", bgColor: "bg-emerald-500/20", count: stats.employees },
    { label: "Partenaires", icon: Handshake, tab: "partnerships", color: "text-violet-400", bgColor: "bg-violet-500/20", count: stats.drivers + stats.fleets, badge: totalPendingRequests },
    { label: "Finances", icon: Euro, tab: "finances", color: "text-amber-400", bgColor: "bg-amber-500/20" },
    { label: "Statistiques", icon: BarChart3, tab: "stats", color: "text-cyan-400", bgColor: "bg-cyan-500/20" },
    { label: "Paramètres", icon: Settings, tab: "settings", color: "text-slate-400", bgColor: "bg-slate-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Billing Warning */}
      <BillingWarningBanner 
        company={company} 
        onNavigateToSettings={() => onTabChange("settings")} 
      />
      
      {/* Payment Alerts */}
      <CompanyPaymentAlerts 
        companyId={company.id} 
        onNavigateToPayments={() => onTabChange("finances")} 
      />

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-violet-500/20 to-indigo-500/10 border border-primary/20 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-violet-500/10 to-pink-500/5" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Espace Entreprise</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Bonjour, {company.contact_name} 👋
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Gérez vos réservations VTC, vos collaborateurs et vos partenaires.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/40 to-violet-500/30 flex items-center justify-center border border-white/10">
              <Building2 className="w-12 h-12 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Grid 3x2 */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.tab}
              onClick={() => onTabChange(action.tab)}
              className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card transition-all duration-200"
            >
              {action.badge && action.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                  {action.badge}
                </div>
              )}
              <div className={`p-3 rounded-xl ${action.bgColor}`}>
                <Icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">{action.label}</span>
              {action.count !== undefined && (
                <span className="text-xs text-muted-foreground">{action.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Courses ce mois" value={stats.courses} icon={Calendar} color="text-blue-400" bgColor="bg-blue-500/20" />
        <StatCard label="Chauffeurs" value={stats.drivers} icon={Car} color="text-violet-400" bgColor="bg-violet-500/20" />
        <StatCard label="Flottes" value={stats.fleets} icon={Truck} color="text-rose-400" bgColor="bg-rose-500/20" />
        <StatCard label="Dépenses" value={`${stats.spent}€`} icon={Euro} color="text-amber-400" bgColor="bg-amber-500/20" />
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Courses</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onTabChange("courses")} className="text-blue-400 hover:text-blue-300">
                Gérer <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3">
                <Car className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-muted-foreground mb-2">{stats.courses} courses ce mois</p>
              <Button onClick={() => onTabChange("courses")} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle course
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Handshake className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white">Partenaires</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onTabChange("partnerships")} className="text-violet-400 hover:text-violet-300">
                Voir tout <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white">{stats.drivers}</p>
                  <p className="text-xs text-muted-foreground">Chauffeurs</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-rose-500/20 to-pink-500/10 border border-rose-500/20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-white">{stats.fleets}</p>
                  <p className="text-xs text-muted-foreground">Flottes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= STATS CARD COMPONENT =============
function StatCard({ label, value, icon: Icon, color, bgColor }: { 
  label: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  bgColor: string;
}) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm">
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ============= COURSES SECTION =============
function CoursesSection({ companyId, onTabChange }: { companyId: string; onTabChange: (tab: string) => void }) {
  const [subTab, setSubTab] = useState("requests");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={subTab === "requests" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("requests")}
          className="whitespace-nowrap rounded-full"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Demandes
        </Button>
        <Button 
          variant={subTab === "list" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("list")}
          className="whitespace-nowrap rounded-full"
        >
          <Car className="w-4 h-4 mr-2" />
          Historique
        </Button>
      </div>

      {subTab === "requests" && <CompanyCourseRequestsManager companyId={companyId} />}
      {subTab === "list" && <CompanyCoursesList companyId={companyId} onCreateCourse={() => setSubTab("requests")} />}
    </div>
  );
}

// ============= TEAM SECTION =============
function TeamSection({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [subTab, setSubTab] = useState("employees");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={subTab === "employees" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("employees")}
          className="whitespace-nowrap"
        >
          <Users className="w-4 h-4 mr-2" />
          Collaborateurs
        </Button>
        <Button 
          variant={subTab === "admins" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("admins")}
          className="whitespace-nowrap"
        >
          <Shield className="w-4 h-4 mr-2" />
          Administrateurs
        </Button>
      </div>

      {subTab === "employees" && <CompanyEmployeesManager companyId={companyId} />}
      {subTab === "admins" && <CompanyAdministratorsManager companyId={companyId} companyName={companyName} />}
    </div>
  );
}

// ============= FINANCES SECTION =============
function FinancesSection({ companyId, company }: { companyId: string; company: Company }) {
  const [subTab, setSubTab] = useState("payments");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={subTab === "payments" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("payments")}
          className="whitespace-nowrap"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Paiements
        </Button>
        <Button 
          variant={subTab === "invoices" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("invoices")}
          className="whitespace-nowrap"
        >
          <Receipt className="w-4 h-4 mr-2" />
          Factures
        </Button>
        <Button 
          variant={subTab === "quotes" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("quotes")}
          className="whitespace-nowrap"
        >
          <FileText className="w-4 h-4 mr-2" />
          Devis
        </Button>
        <Button 
          variant={subTab === "expenses" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("expenses")}
          className="whitespace-nowrap"
        >
          <Euro className="w-4 h-4 mr-2" />
          Notes de frais
        </Button>
      </div>

      {subTab === "payments" && <CompanyPaymentsHub companyId={companyId} />}
      {subTab === "invoices" && <CompanyFacturesList companyId={companyId} />}
      {subTab === "quotes" && <CompanyDevisList companyId={companyId} />}
      {subTab === "expenses" && <CompanyExpenseReports companyId={companyId} />}
    </div>
  );
}

// ============= PARTNERSHIPS SECTION =============
function PartnershipsSection({ 
  companyId, 
  companyProfile 
}: { 
  companyId: string; 
  companyProfile: { company_name: string; contact_name: string };
}) {
  const [subTab, setSubTab] = useState("agreements");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={subTab === "agreements" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("agreements")}
          className="whitespace-nowrap"
        >
          <Handshake className="w-4 h-4 mr-2" />
          Accords
        </Button>
        <Button 
          variant={subTab === "drivers" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("drivers")}
          className="whitespace-nowrap"
        >
          <Car className="w-4 h-4 mr-2" />
          Chauffeurs
        </Button>
        <Button 
          variant={subTab === "fleets" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("fleets")}
          className="whitespace-nowrap"
        >
          <Truck className="w-4 h-4 mr-2" />
          Flottes
        </Button>
        <Button 
          variant={subTab === "qrcode" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("qrcode")}
          className="whitespace-nowrap"
        >
          <Globe className="w-4 h-4 mr-2" />
          QR Code
        </Button>
      </div>

      {subTab === "agreements" && <CompanyDriverAgreements companyId={companyId} />}
      {subTab === "drivers" && <CompanyDriverSearch companyId={companyId} />}
      {subTab === "fleets" && (
        <CompanyFleetPartnerships 
          companyId={companyId} 
          companyProfile={{ 
            company_name: companyProfile.company_name, 
            contact_name: companyProfile.contact_name 
          }} 
        />
      )}
      {subTab === "qrcode" && <CompanyPartnershipQRCode companyId={companyId} companyName={companyProfile.company_name} />}
    </div>
  );
}

// ============= SETTINGS SECTION =============
function SettingsSection({ companyId, company }: { companyId: string; company: Company }) {
  const [subTab, setSubTab] = useState("billing");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button 
          variant={subTab === "billing" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("billing")}
          className="whitespace-nowrap"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configuration
        </Button>
        <Button 
          variant={subTab === "public" ? "default" : "outline"} 
          size="sm"
          onClick={() => setSubTab("public")}
          className="whitespace-nowrap"
        >
          <Globe className="w-4 h-4 mr-2" />
          Profil public
        </Button>
      </div>

      {subTab === "billing" && <CompanyBillingSettings companyId={companyId} initialData={company} />}
      {subTab === "public" && <CompanyPublicProfile companyId={companyId} />}
    </div>
  );
}
