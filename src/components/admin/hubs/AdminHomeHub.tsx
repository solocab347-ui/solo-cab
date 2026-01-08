import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, TrendingUp } from "lucide-react";
import AdminOverview from "../AdminOverview";
import AdminSubscriptionStats from "../AdminSubscriptionStats";

const AdminHomeHub = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Accueil</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Statistiques</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <AdminSubscriptionStats />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHomeHub;
