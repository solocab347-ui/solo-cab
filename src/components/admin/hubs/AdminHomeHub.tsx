import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp } from "lucide-react";
import AdminOverview from "../AdminOverview";
import AdminSubscriptionStats from "../AdminSubscriptionStats";

const AdminHomeHub = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "stats">("overview");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "overview" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("overview")}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          Vue d'ensemble
        </Button>
        <Button
          variant={activeTab === "stats" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("stats")}
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Statistiques
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "stats" && <AdminSubscriptionStats />}
    </div>
  );
};

export default AdminHomeHub;