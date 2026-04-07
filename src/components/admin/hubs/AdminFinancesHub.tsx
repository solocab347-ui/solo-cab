import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FileSearch, BarChart3 } from "lucide-react";
import AdminFinanceKPIs from "../finance/AdminFinanceKPIs";
import AdminWeeklySummary from "../finance/AdminWeeklySummary";
import AdminDriversFinanceTable from "../finance/AdminDriversFinanceTable";
import AdminPaymentAudit from "../finance/AdminPaymentAudit";
import AdminFinanceCharts from "../finance/AdminFinanceCharts";

type Tab = "dashboard" | "drivers" | "audit" | "charts";

const AdminFinancesHub = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_admin_finance_stats");
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error("Error fetching admin finance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "drivers" as Tab, label: "Chauffeurs", icon: Users },
    { id: "audit" as Tab, label: "Audit", icon: FileSearch },
    { id: "charts" as Tab, label: "Graphiques", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
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

      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : stats ? (
            <>
              <AdminFinanceKPIs stats={stats} />
              <AdminWeeklySummary stats={stats} />
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Erreur de chargement</div>
          )}
        </div>
      )}

      {activeTab === "drivers" && <AdminDriversFinanceTable />}
      {activeTab === "audit" && <AdminPaymentAudit />}
      {activeTab === "charts" && <AdminFinanceCharts />}
    </div>
  );
};

export default AdminFinancesHub;
