import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Shield } from "lucide-react";
import AdminStats from "../AdminStats";
import AdminSubscriptionStats from "../AdminSubscriptionStats";
import AdminRatingDisputes from "../AdminRatingDisputes";

const AdminHomeHub = () => {
  const [activeTab, setActiveTab] = useState<"stats" | "subscriptions" | "ratings">("stats");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
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
        <Button
          variant={activeTab === "ratings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("ratings")}
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          Litiges notation
        </Button>
      </div>

      {activeTab === "stats" && <AdminStats />}
      {activeTab === "subscriptions" && <AdminSubscriptionStats />}
      {activeTab === "ratings" && <AdminRatingDisputes />}
    </div>
  );
};

export default AdminHomeHub;
