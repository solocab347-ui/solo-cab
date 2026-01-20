import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Share2, FileText, Receipt } from "lucide-react";
import AdminEmails from "../AdminEmails";
import AdminSocialLinks from "../AdminSocialLinks";
import AdminFlyers from "../AdminFlyers";
import AdminBillingDocuments from "../AdminBillingDocuments";

const AdminCommunicationsHub = () => {
  const [activeTab, setActiveTab] = useState<"emails" | "social" | "flyers" | "billing">("emails");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
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
        <Button
          variant={activeTab === "flyers" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("flyers")}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Flyers
        </Button>
        <Button
          variant={activeTab === "billing" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("billing")}
          className="gap-2"
        >
          <Receipt className="w-4 h-4" />
          <span className="hidden sm:inline">Devis & Factures</span>
          <span className="sm:hidden">Devis</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "emails" && <AdminEmails />}
      {activeTab === "social" && <AdminSocialLinks />}
      {activeTab === "flyers" && <AdminFlyers />}
      {activeTab === "billing" && <AdminBillingDocuments />}
    </div>
  );
};

export default AdminCommunicationsHub;
