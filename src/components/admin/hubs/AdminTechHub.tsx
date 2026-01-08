import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bug, Database, Shield } from "lucide-react";
import { AdminErrorReports } from "../AdminErrorReports";
import { AdminDataIntegrity } from "../AdminDataIntegrity";
import { AdminRLSAudit } from "../AdminRLSAudit";

const AdminTechHub = () => {
  const [activeTab, setActiveTab] = useState<"errors" | "integrity" | "rls">("errors");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "errors" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("errors")}
          className="gap-2"
        >
          <Bug className="w-4 h-4" />
          <span className="hidden sm:inline">Erreurs</span>
          <span className="sm:hidden">Err.</span>
        </Button>
        <Button
          variant={activeTab === "integrity" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("integrity")}
          className="gap-2"
        >
          <Database className="w-4 h-4" />
          <span className="hidden sm:inline">Intégrité</span>
          <span className="sm:hidden">Data</span>
        </Button>
        <Button
          variant={activeTab === "rls" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("rls")}
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          RLS
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "errors" && <AdminErrorReports />}
      {activeTab === "integrity" && <AdminDataIntegrity />}
      {activeTab === "rls" && <AdminRLSAudit />}
    </div>
  );
};

export default AdminTechHub;