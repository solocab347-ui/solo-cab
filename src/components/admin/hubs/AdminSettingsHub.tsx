import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock } from "lucide-react";
import AdminRGPD from "../AdminRGPD";
import AdminSettings from "../AdminSettings";

const AdminSettingsHub = () => {
  const [activeTab, setActiveTab] = useState("rgpd");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="rgpd" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Shield className="w-4 h-4" />
            <span>RGPD</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Mot de passe</span>
            <span className="sm:hidden">MDP</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rgpd" className="mt-4">
          <AdminRGPD />
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettingsHub;
