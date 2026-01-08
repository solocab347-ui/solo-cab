import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Handshake, Bot, Lightbulb } from "lucide-react";
import AdminDisputes from "../AdminDisputes";
import { AdminPartnershipDisputes } from "../AdminPartnershipDisputes";
import { AdminAssistantRequests } from "../AdminAssistantRequests";
import AdminFeedback from "../AdminFeedback";

const AdminSupportHub = () => {
  const [activeTab, setActiveTab] = useState<"disputes" | "partnership" | "assistant" | "feedback">("disputes");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "disputes" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("disputes")}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="hidden sm:inline">Litiges Courses</span>
          <span className="sm:hidden">Courses</span>
        </Button>
        <Button
          variant={activeTab === "partnership" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("partnership")}
          className="gap-2"
        >
          <Handshake className="w-4 h-4" />
          <span className="hidden sm:inline">Partenaires</span>
          <span className="sm:hidden">Partn.</span>
        </Button>
        <Button
          variant={activeTab === "assistant" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("assistant")}
          className="gap-2"
        >
          <Bot className="w-4 h-4" />
          Liberty
        </Button>
        <Button
          variant={activeTab === "feedback" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("feedback")}
          className="gap-2"
        >
          <Lightbulb className="w-4 h-4" />
          <span className="hidden sm:inline">Feedbacks</span>
          <span className="sm:hidden">Retours</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "disputes" && <AdminDisputes />}
      {activeTab === "partnership" && <AdminPartnershipDisputes />}
      {activeTab === "assistant" && <AdminAssistantRequests />}
      {activeTab === "feedback" && <AdminFeedback />}
    </div>
  );
};

export default AdminSupportHub;