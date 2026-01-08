import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Handshake, Bot, Lightbulb } from "lucide-react";
import AdminDisputes from "../AdminDisputes";
import { AdminPartnershipDisputes } from "../AdminPartnershipDisputes";
import { AdminAssistantRequests } from "../AdminAssistantRequests";
import AdminFeedback from "../AdminFeedback";

const AdminSupportHub = () => {
  const [activeTab, setActiveTab] = useState("disputes");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="disputes" className="flex items-center gap-1 py-3 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Litiges Courses</span>
            <span className="sm:hidden">Courses</span>
          </TabsTrigger>
          <TabsTrigger value="partnership" className="flex items-center gap-1 py-3 text-xs sm:text-sm">
            <Handshake className="w-4 h-4" />
            <span className="hidden sm:inline">Litiges Partenaires</span>
            <span className="sm:hidden">Partenaires</span>
          </TabsTrigger>
          <TabsTrigger value="assistant" className="flex items-center gap-1 py-3 text-xs sm:text-sm">
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">Demandes Liberty</span>
            <span className="sm:hidden">Liberty</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1 py-3 text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Feedbacks</span>
            <span className="sm:hidden">Retours</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="mt-4">
          <AdminDisputes />
        </TabsContent>

        <TabsContent value="partnership" className="mt-4">
          <AdminPartnershipDisputes />
        </TabsContent>

        <TabsContent value="assistant" className="mt-4">
          <AdminAssistantRequests />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <AdminFeedback />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSupportHub;
