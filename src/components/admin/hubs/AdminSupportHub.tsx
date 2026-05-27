import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bot, Lightbulb, Flag } from "lucide-react";
import AdminDisputes from "../AdminDisputes";
import { AdminAssistantRequests } from "../AdminAssistantRequests";
import AdminFeedback from "../AdminFeedback";
import AdminContentReports from "../AdminContentReports";

const AdminSupportHub = () => {
  const [activeTab, setActiveTab] = useState<"disputes" | "reports" | "assistant" | "feedback">("disputes");

  return (
    <div className="space-y-4">
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
          variant={activeTab === "reports" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("reports")}
          className="gap-2"
        >
          <Flag className="w-4 h-4" />
          <span className="hidden sm:inline">Signalements</span>
          <span className="sm:hidden">Reports</span>
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

      {activeTab === "disputes" && <AdminDisputes />}
      {activeTab === "reports" && <AdminContentReports />}
      {activeTab === "assistant" && <AdminAssistantRequests />}
      {activeTab === "feedback" && <AdminFeedback />}
    </div>
  );
};

export default AdminSupportHub;
