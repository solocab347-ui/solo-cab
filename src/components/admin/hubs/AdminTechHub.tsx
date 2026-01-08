import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Database, Shield } from "lucide-react";
import { AdminErrorReports } from "../AdminErrorReports";
import { AdminDataIntegrity } from "../AdminDataIntegrity";
import { AdminRLSAudit } from "../AdminRLSAudit";

const AdminTechHub = () => {
  const [activeTab, setActiveTab] = useState("errors");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="errors" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Bug className="w-4 h-4" />
            <span className="hidden sm:inline">Rapports Erreurs</span>
            <span className="sm:hidden">Erreurs</span>
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Intégrité Données</span>
            <span className="sm:hidden">Données</span>
          </TabsTrigger>
          <TabsTrigger value="rls" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Audit RLS</span>
            <span className="sm:hidden">RLS</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="mt-4">
          <AdminErrorReports />
        </TabsContent>

        <TabsContent value="integrity" className="mt-4">
          <AdminDataIntegrity />
        </TabsContent>

        <TabsContent value="rls" className="mt-4">
          <AdminRLSAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTechHub;
