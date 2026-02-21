import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";
import AdminStats from "../AdminStats";
import AdminSubscriptionStats from "../AdminSubscriptionStats";

const AdminHomeHub = () => {
  const [activeTab, setActiveTab] = useState<"stats" | "subscriptions">("stats");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Statistiques
        </Button>
        <Button
          variant={activeTab === "subscriptions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("subscriptions")}
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Abonnements & Revenus
        </Button>
      </div>

      {activeTab === "stats" && <AdminStats />}
      {activeTab === "subscriptions" && <AdminSubscriptionStats />}
    </div>
  );
};

export default AdminHomeHub;
