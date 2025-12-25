import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetClientInvitations } from "@/components/fleet-manager/FleetClientInvitations";
import { FleetClientsList } from "@/components/fleet-manager/FleetClientsList";
import {
  Users,
  Send,
} from "lucide-react";

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface FleetClientsTabProps {
  fleetManagerId: string;
  clients: FleetClient[];
}

export const FleetClientsTab = ({ fleetManagerId, clients }: FleetClientsTabProps) => {
  const [activeSubTab, setActiveSubTab] = useState("list");

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <div className="glass-strong p-3 rounded-2xl">
          <TabsList className="grid w-full grid-cols-2 gap-2 h-auto bg-transparent p-0">
            <TabsTrigger 
              value="list"
              className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-success data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-success"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Clients</span>
              <span className="sm:hidden">Clients</span>
            </TabsTrigger>
            <TabsTrigger 
              value="invitations"
              className="flex items-center gap-2 py-3 px-4 rounded-xl transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-warning data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-warning"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Invitations</span>
              <span className="sm:hidden">Inviter</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="space-y-4">
          <FleetClientsList clients={clients} />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <FleetClientInvitations fleetManagerId={fleetManagerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
