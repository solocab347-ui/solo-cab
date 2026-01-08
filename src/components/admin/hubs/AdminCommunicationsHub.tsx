import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Share2 } from "lucide-react";
import AdminEmails from "../AdminEmails";
import AdminSocialLinks from "../AdminSocialLinks";

const AdminCommunicationsHub = () => {
  const [activeTab, setActiveTab] = useState<"emails" | "social">("emails");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "emails" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("emails")}
          className="gap-2"
        >
          <Mail className="w-4 h-4" />
          Emails
        </Button>
        <Button
          variant={activeTab === "social" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("social")}
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Réseaux Sociaux</span>
          <span className="sm:hidden">Sociaux</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "emails" && <AdminEmails />}
      {activeTab === "social" && <AdminSocialLinks />}
    </div>
  );
};

export default AdminCommunicationsHub;