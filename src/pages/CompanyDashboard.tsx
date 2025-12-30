import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Menu,
  X,
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
import { cn } from "@/lib/utils";

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

const menuItems = [
  { id: "overview", icon: Home, label: "Tableau de bord" },
  { id: "reservations", icon: Calendar, label: "Courses" },
  { id: "employees", icon: Users, label: "Collaborateurs" },
  { id: "divider1", type: "divider", label: "Finances" },
  { id: "devis", icon: FileText, label: "Devis" },
  { id: "invoices", icon: Receipt, label: "Factures" },
  { id: "payments", icon: CreditCard, label: "Paiements" },
  { id: "divider2", type: "divider", label: "Partenaires" },
  { id: "partnerships", icon: Handshake, label: "Mes accords" },
  { id: "drivers", icon: Car, label: "Chauffeurs VTC" },
  { id: "fleets", icon: Truck, label: "Flottes" },
  { id: "divider3", type: "divider", label: "Paramètres" },
  { id: "stats", icon: BarChart3, label: "Statistiques" },
  { id: "public", icon: Globe, label: "Profil public" },
  { id: "settings", icon: Settings, label: "Configuration" },
];

export default function CompanyDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [stats, setStats] = useState({ courses: 0, spent: 0, drivers: 0, employees: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
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
            <h2 className="text-xl font-semibold mb-2">Profil non trouvé</h2>
            <p className="text-muted-foreground mb-4">Votre profil entreprise n'a pas été trouvé.</p>
            <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverview stats={stats} company={company} onNavigate={handleTabChange} onCreateCourse={handleCreateCourse} />;
      case "reservations":
        return <CompanyCoursesList companyId={company.id} onCreateCourse={handleCreateCourse} />;
      case "devis":
        return <CompanyDevisList companyId={company.id} />;
      case "invoices":
        return <CompanyFacturesList companyId={company.id} />;
      case "payments":
        return <CompanyPaymentsDue companyId={company.id} />;
      case "partnerships":
        return <CompanyDriverAgreements companyId={company.id} />;
      case "drivers":
        return <CompanyDriverSearch companyId={company.id} />;
      case "fleets":
        return <CompanyFleetSearch companyId={company.id} companyProfile={{ company_name: company.company_name, contact_name: company.contact_name }} />;
      case "employees":
        return <CompanyEmployeesManager companyId={company.id} />;
      case "stats":
        return <CompanyStatisticsComplete companyId={company.id} />;
      case "public":
        return <CompanyPublicProfile companyId={company.id} />;
      case "settings":
        return <CompanyBillingSettings companyId={company.id} initialData={company} />;
      default:
        return null;
    }
  };

  const currentMenuItem = menuItems.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-8 h-8" />
            <span className="font-semibold text-white text-sm">{company.company_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-white/10 animate-slide-in-right">
            <SidebarContent
              company={company}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-slate-900/50 backdrop-blur-xl border-r border-white/10">
        <SidebarContent
          company={company}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {currentMenuItem && !currentMenuItem.type && (
              <>
                <div className="p-2 rounded-lg bg-primary/20">
                  <currentMenuItem.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{currentMenuItem.label}</h1>
                  <p className="text-sm text-muted-foreground">Espace entreprise</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// Sidebar Content Component
function SidebarContent({
  company,
  activeTab,
  onTabChange,
  onLogout,
  onClose,
}: {
  company: Company;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo & Company */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{company.company_name}</p>
              <p className="text-xs text-muted-foreground">Entreprise</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg lg:hidden">
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (item.type === "divider") {
              return (
                <div key={item.id} className="pt-4 pb-2">
                  <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </p>
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

// Dashboard Overview Component
function DashboardOverview({
  stats,
  company,
  onNavigate,
  onCreateCourse,
}: {
  stats: { courses: number; spent: number; drivers: number; employees: number };
  company: Company;
  onNavigate: (tab: string) => void;
  onCreateCourse: () => void;
}) {
  const statCards = [
    { label: "Courses", value: stats.courses, icon: Calendar, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10" },
    { label: "Chauffeurs", value: stats.drivers, icon: Car, color: "from-violet-500 to-violet-600", bgColor: "bg-violet-500/10" },
    { label: "Collaborateurs", value: stats.employees, icon: Users, color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-500/10" },
    { label: "Dépenses", value: `${stats.spent}€`, icon: Euro, color: "from-amber-500 to-amber-600", bgColor: "bg-amber-500/10" },
  ];

  const quickActions = [
    { label: "Nouvelle course", icon: Plus, action: onCreateCourse, primary: true },
    { label: "Trouver un chauffeur", icon: Search, action: () => onNavigate("drivers") },
    { label: "Mes collaborateurs", icon: Users, action: () => onNavigate("employees") },
    { label: "Statistiques", icon: BarChart3, action: () => onNavigate("stats") },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenue, {company.contact_name}
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Gérez vos réservations VTC, vos collaborateurs et vos partenaires depuis votre espace entreprise.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <Icon className={cn("w-4 h-4 bg-gradient-to-r bg-clip-text", stat.color.replace("from-", "text-").split(" ")[0])} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.action}
                className={cn(
                  "group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]",
                  action.primary
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10"
                )}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={cn(
                    "p-3 rounded-xl transition-colors",
                    action.primary ? "bg-white/20" : "bg-white/10 group-hover:bg-primary/20"
                  )}>
                    <Icon className={cn("w-5 h-5", action.primary ? "" : "text-muted-foreground group-hover:text-primary")} />
                  </div>
                  <span className={cn("text-sm font-medium", !action.primary && "text-white")}>{action.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Prochaines courses</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("reservations")} className="text-primary hover:text-primary">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Aucune course planifiée</p>
              <Button variant="link" onClick={onCreateCourse} className="mt-2 text-primary">
                Réserver maintenant
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Partenaires actifs</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("partnerships")} className="text-primary hover:text-primary">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {stats.drivers > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{stats.drivers} chauffeur{stats.drivers > 1 ? 's' : ''}</p>
                    <p className="text-sm text-muted-foreground">Partenaires actifs</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Handshake className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucun partenaire</p>
                <Button variant="link" onClick={() => onNavigate("drivers")} className="mt-2 text-primary">
                  Trouver des chauffeurs
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}