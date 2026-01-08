import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Trash2 } from "lucide-react";
import AdminDriversManagement from "../AdminDriversManagement";
import { AdminFleetManagersDocuments } from "../AdminFleetManagersDocuments";
import AdminUserCleanup from "../AdminUserCleanup";

const AdminUsersHub = () => {
  const [activeTab, setActiveTab] = useState("drivers");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="drivers" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Chauffeurs</span>
            <span className="sm:hidden">Chauff.</span>
          </TabsTrigger>
          <TabsTrigger value="fleet-managers" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Gestionnaires</span>
            <span className="sm:hidden">Flottes</span>
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Nettoyage</span>
            <span className="sm:hidden">Suppr.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="mt-4">
          <AdminDriversManagement />
        </TabsContent>

        <TabsContent value="fleet-managers" className="mt-4">
          <AdminFleetManagersDocuments />
        </TabsContent>

        <TabsContent value="cleanup" className="mt-4">
          <AdminUserCleanup />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUsersHub;
