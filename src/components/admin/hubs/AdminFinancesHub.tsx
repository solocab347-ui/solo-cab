import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, Users, FileSearch, BarChart3, Calendar, CreditCard, Search, ShieldAlert } from "lucide-react";
import AdminFinanceKPIs from "../finance/AdminFinanceKPIs";
import AdminWeeklySummary from "../finance/AdminWeeklySummary";
import AdminDriversFinanceTable from "../finance/AdminDriversFinanceTable";
import AdminPaymentAudit from "../finance/AdminPaymentAudit";
import AdminFinanceCharts from "../finance/AdminFinanceCharts";
import AdminPeriodSummary from "../finance/AdminPeriodSummary";
import AdminStripePayments from "../finance/AdminStripePayments";
import AdminGlobalSearch from "../AdminGlobalSearch";
import AdminStripeAnomalies from "../finance/AdminStripeAnomalies";
import AdminManualOperations from "../finance/AdminManualOperations";

type Tab = "dashboard" | "drivers" | "audit" | "charts" | "stripe" | "anomalies" | "operations" | "search";
type Preset = "week" | "month" | "year" | "custom";

const getPresetDates = (preset: Preset): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString().split("T")[0];

  switch (preset) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() + 1);
      return { start: d.toISOString().split("T")[0], end };
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: d.toISOString().split("T")[0], end };
    }
    case "year": {
      return { start: `${now.getFullYear()}-01-01`, end };
    }
    case "custom":
      return { start: end, end };
  }
};

const AdminFinancesHub = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("month");
  const [dateRange, setDateRange] = useState(getPresetDates("month"));

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_finance_stats", {
        p_start: `${dateRange.start}T00:00:00Z`,
        p_end: `${dateRange.end}T23:59:59Z`,
      });
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error("Error fetching admin finance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      setDateRange(getPresetDates(p));
    }
  };

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "drivers" as Tab, label: "Chauffeurs", icon: Users },
    { id: "operations" as Tab, label: "Opérations", icon: CreditCard },
    { id: "stripe" as Tab, label: "Stripe", icon: CreditCard },
    { id: "anomalies" as Tab, label: "Anomalies", icon: ShieldAlert },
    { id: "audit" as Tab, label: "Audit", icon: FileSearch },
    { id: "charts" as Tab, label: "Graphiques", icon: BarChart3 },
    { id: "search" as Tab, label: "Recherche", icon: Search },
  ];

  const presets: { id: Preset; label: string }[] = [
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
    { id: "custom", label: "Personnalisé" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-2 shrink-0"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Period selector */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5 p-1 bg-muted/30 rounded-lg w-fit overflow-x-auto">
          {presets.map((p) => (
            <Button
              key={p.id}
              variant={preset === p.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handlePreset(p.id)}
              className="text-xs h-7 px-2.5 shrink-0"
            >
              {p.label}
            </Button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex gap-2 items-center">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
              className="h-8 text-xs w-[130px]"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
              className="h-8 text-xs w-[130px]"
            />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Période : {new Date(dateRange.start).toLocaleDateString("fr-FR")} → {new Date(dateRange.end).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : stats ? (
            <>
              <AdminFinanceKPIs stats={stats} />
              <AdminPeriodSummary stats={stats} preset={preset} />
              <AdminWeeklySummary stats={stats} />
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Erreur de chargement</div>
          )}
        </div>
      )}

      {activeTab === "drivers" && (
        <AdminDriversFinanceTable
          periodStart={dateRange.start}
          periodEnd={dateRange.end}
        />
      )}
      {activeTab === "audit" && <AdminPaymentAudit />}
      {activeTab === "charts" && <AdminFinanceCharts />}
      {activeTab === "stripe" && <AdminStripePayments />}
      {activeTab === "anomalies" && <AdminStripeAnomalies />}
      {activeTab === "search" && <AdminGlobalSearch />}
    </div>
  );
};

export default AdminFinancesHub;
