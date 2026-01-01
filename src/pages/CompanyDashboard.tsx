import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useUserLanguage } from "@/hooks/useUserLanguage";
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
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CompanyEmployeesManager } from "@/components/company/CompanyEmployeesManager";
import { CompanyDriverAgreements } from "@/components/company/CompanyDriverAgreements";
import { CompanyCoursesList } from "@/components/company/CompanyCoursesList";
import { CompanyDevisList } from "@/components/company/CompanyDevisList";
import { CompanyFacturesList } from "@/components/company/CompanyFacturesList";
import { CompanyBillingSettings } from "@/components/company/CompanyBillingSettings";
import { CompanyPaymentsDue } from "@/components/company/CompanyPaymentsDue";
import { CompanyPaymentAlerts } from "@/components/company/CompanyPaymentAlerts";
import { CompanyPublicProfile } from "@/components/company/CompanyPublicProfile";
import { CompanyStatisticsComplete } from "@/components/company/CompanyStatisticsComplete";
import { CompanyDriverSearch } from "@/components/company/CompanyDriverSearch";
import { CompanyFleetSearch } from "@/components/company/CompanyFleetSearch";
import { CompanyInlineCourseCreation } from "@/components/company/CompanyInlineCourseCreation";
import { CompanyExpenseReports } from "@/components/company/CompanyExpenseReports";
import { BillingWarningBanner } from "@/components/company/BillingWarningBanner";
import { CompanyPartnershipQRCode } from "@/components/company/CompanyPartnershipQRCode";
import { cn } from "@/lib/utils";

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
  useUserLanguage(); // Sync language with user profile
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [stats, setStats] = useState({ courses: 0, spent: 0, drivers: 0, employees: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: "overview", icon: Home, label: t('companyDashboard.menu.dashboard'), color: "text-blue-400" },
    { id: "reservations", icon: Calendar, label: t('companyDashboard.menu.rides'), color: "text-violet-400" },
    { id: "employees", icon: Users, label: t('companyDashboard.menu.employees'), color: "text-emerald-400" },
    { id: "divider1", type: "divider", label: t('companyDashboard.menu.finances') },
    { id: "devis", icon: FileText, label: t('companyDashboard.menu.quotes'), color: "text-amber-400" },
    { id: "invoices", icon: Receipt, label: t('companyDashboard.menu.invoices'), color: "text-orange-400" },
    { id: "expenses", icon: Euro, label: t('companyDashboard.menu.expenses'), color: "text-lime-400" },
    { id: "payments", icon: CreditCard, label: t('companyDashboard.menu.payments'), color: "text-pink-400" },
    { id: "divider2", type: "divider", label: t('companyDashboard.menu.partners') },
    { id: "partnerships", icon: Handshake, label: t('companyDashboard.menu.agreements'), color: "text-cyan-400" },
    { id: "drivers", icon: Car, label: t('companyDashboard.menu.vtcDrivers'), color: "text-indigo-400" },
    { id: "fleets", icon: Truck, label: t('companyDashboard.menu.fleets'), color: "text-rose-400" },
    { id: "qrcode", icon: Globe, label: t('companyDashboard.menu.partnershipQR'), color: "text-purple-400" },
    { id: "divider3", type: "divider", label: t('companyDashboard.menu.settings') },
    { id: "stats", icon: BarChart3, label: t('companyDashboard.menu.statistics'), color: "text-teal-400" },
    { id: "public", icon: Globe, label: t('companyDashboard.menu.publicProfile'), color: "text-sky-400" },
    { id: "settings", icon: Settings, label: t('companyDashboard.menu.configuration'), color: "text-slate-400" },
  ];

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
    handleTabChange("new-course");
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
          <p className="text-muted-foreground">{t('companyDashboard.loading')}</p>
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
            <h2 className="text-xl font-semibold mb-2">{t('companyDashboard.profileNotFound')}</h2>
            <p className="text-muted-foreground mb-4">{t('companyDashboard.profileNotFoundDesc')}</p>
            <Button onClick={() => navigate("/")}>{t('companyDashboard.backToHome')}</Button>
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
        return <CompanyCoursesList companyId={company.id} onCreateCourse={() => handleTabChange("new-course")} />;
      case "new-course":
        return <CompanyInlineCourseCreation companyId={company.id} onSuccess={() => handleTabChange("reservations")} onSearchNewDriver={() => handleTabChange("drivers")} />;
      case "devis":
        return <CompanyDevisList companyId={company.id} />;
      case "invoices":
        return <CompanyFacturesList companyId={company.id} />;
      case "expenses":
        return <CompanyExpenseReports companyId={company.id} />;
      case "payments":
        return <CompanyPaymentsDue companyId={company.id} />;
      case "partnerships":
        return <CompanyDriverAgreements companyId={company.id} />;
      case "drivers":
        return <CompanyDriverSearch companyId={company.id} />;
      case "fleets":
        return <CompanyFleetSearch companyId={company.id} companyProfile={{ company_name: company.company_name, contact_name: company.contact_name }} />;
      case "qrcode":
        return <CompanyPartnershipQRCode companyId={company.id} companyName={company.company_name} />;
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="flex items-center gap-2 px-3 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors border border-primary/30"
          >
            <Menu className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Menu</span>
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="SoloCab" className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="header" />
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
              menuItems={menuItems}
              t={t}
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
          menuItems={menuItems}
          t={t}
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
                  <p className="text-sm text-muted-foreground">{t('companyDashboard.companySpace')}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              {t('companyDashboard.logout')}
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
  menuItems,
  t,
}: {
  company: Company;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onClose?: () => void;
  menuItems: any[];
  t: (key: string) => string;
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
              <p className="text-xs text-muted-foreground">{t('companyDashboard.company')}</p>
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
            const itemColor = (item as any).color || "text-muted-foreground";

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : itemColor)} />
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
          {t('companyDashboard.logout')}
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
  const companyId = company.id;
  const statCards = [
    { label: "Courses", value: stats.courses, icon: Calendar, gradient: "from-blue-500 to-indigo-600", bgColor: "bg-blue-500/20", iconColor: "text-blue-400" },
    { label: "Chauffeurs", value: stats.drivers, icon: Car, gradient: "from-violet-500 to-purple-600", bgColor: "bg-violet-500/20", iconColor: "text-violet-400" },
    { label: "Collaborateurs", value: stats.employees, icon: Users, gradient: "from-emerald-500 to-teal-600", bgColor: "bg-emerald-500/20", iconColor: "text-emerald-400" },
    { label: "Dépenses", value: `${stats.spent}€`, icon: Euro, gradient: "from-amber-500 to-orange-600", bgColor: "bg-amber-500/20", iconColor: "text-amber-400" },
  ];

  const quickActions = [
    { label: "Nouvelle course", icon: Plus, action: onCreateCourse, primary: true, gradient: "from-primary to-primary/80" },
    { label: "Trouver un chauffeur", icon: Search, action: () => onNavigate("drivers"), gradient: "from-indigo-500 to-violet-500", iconColor: "text-indigo-400" },
    { label: "Mes collaborateurs", icon: Users, action: () => onNavigate("employees"), gradient: "from-emerald-500 to-teal-500", iconColor: "text-emerald-400" },
    { label: "Statistiques", icon: BarChart3, action: () => onNavigate("stats"), gradient: "from-amber-500 to-orange-500", iconColor: "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Billing Warning - Priority */}
      <BillingWarningBanner 
        company={company} 
        onNavigateToSettings={() => onNavigate("settings")} 
      />
      
      {/* Payment Alerts - Priority */}
      <CompanyPaymentAlerts 
        companyId={companyId} 
        onNavigateToPayments={() => onNavigate("payments")} 
      />

      {/* Welcome Banner with gradient */}
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
              Gérez vos réservations VTC, vos collaborateurs et vos partenaires depuis votre tableau de bord.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/40 to-violet-500/30 flex items-center justify-center border border-white/10">
              <Building2 className="w-12 h-12 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - FIRST */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-primary" />
          Actions rapides
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={action.action}
                className={cn(
                  "group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
                  action.primary
                    ? `bg-gradient-to-br ${action.gradient} text-primary-foreground shadow-lg shadow-primary/25`
                    : "bg-white/5 border border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={cn(
                    "p-3 rounded-xl transition-all duration-300",
                    action.primary 
                      ? "bg-white/20" 
                      : `bg-gradient-to-br ${action.gradient} bg-opacity-10 group-hover:scale-110`
                  )}>
                    <Icon className={cn("w-5 h-5", action.primary ? "text-white" : "text-white")} />
                  </div>
                  <span className={cn("text-sm font-medium", action.primary ? "text-white" : "text-white")}>{action.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid - AFTER Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          Statistiques
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className={cn(
                "relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-pointer group",
              )}>
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} style={{ opacity: 0.1 }} />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                      <Icon className={cn("w-5 h-5", stat.iconColor)} />
                    </div>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Activity Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 hover:border-blue-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white">Prochaines courses</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("reservations")} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-3">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-muted-foreground mb-2">Aucune course planifiée</p>
              <Button onClick={onCreateCourse} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Réserver maintenant
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20 hover:border-violet-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Handshake className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white">Partenaires actifs</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("partnerships")} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {stats.drivers > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/20">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{stats.drivers}</p>
                    <p className="text-sm text-muted-foreground">Chauffeur{stats.drivers > 1 ? 's' : ''} partenaire{stats.drivers > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-3">
                  <Handshake className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-muted-foreground mb-2">Aucun partenaire pour le moment</p>
                <Button onClick={() => onNavigate("drivers")} className="bg-violet-500 hover:bg-violet-600 text-white">
                  <Search className="w-4 h-4 mr-2" />
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