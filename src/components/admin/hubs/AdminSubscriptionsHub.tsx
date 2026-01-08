import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Gift, Ticket } from "lucide-react";
import AdminSubscriptions from "../AdminSubscriptions";
import AdminFreeAccess from "../AdminFreeAccess";
import { AdminInvitationTokens } from "../AdminInvitationTokens";

const AdminSubscriptionsHub = () => {
  const [activeTab, setActiveTab] = useState("subscriptions");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="subscriptions" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Abonnements</span>
            <span className="sm:hidden">Abos</span>
          </TabsTrigger>
          <TabsTrigger value="free-access" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Accès Gratuits</span>
            <span className="sm:hidden">Gratuits</span>
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Ticket className="w-4 h-4" />
            <span className="hidden sm:inline">Tokens Campagne</span>
            <span className="sm:hidden">Tokens</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <AdminSubscriptions />
        </TabsContent>

        <TabsContent value="free-access" className="mt-4">
          <AdminFreeAccess />
        </TabsContent>

        <TabsContent value="tokens" className="mt-4">
          <AdminInvitationTokens />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSubscriptionsHub;
