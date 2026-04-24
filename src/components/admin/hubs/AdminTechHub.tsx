import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Bug, Database, Shield, FileText, Activity, Gauge, Bell } from "lucide-react";
import { AdminErrorReports } from "../AdminErrorReports";
import { AdminDataIntegrity } from "../AdminDataIntegrity";
import { AdminRLSAudit } from "../AdminRLSAudit";
import AdminDocumentation from "../AdminDocumentation";
import PlatformHealthDashboard from "../monitoring/PlatformHealthDashboard";
import AdminPushCenter from "../AdminPushCenter";
import { Skeleton } from "@/components/ui/skeleton";

const PerformanceDashboard = lazy(() => import("../monitoring/PerformanceDashboard"));

const AdminTechHub = () => {
  const [activeTab, setActiveTab] = useState<"health" | "perf" | "push" | "errors" | "integrity" | "rls" | "docs">("health");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "health" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("health")}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Santé</span>
          <span className="sm:hidden">🏥</span>
        </Button>
        <Button
          variant={activeTab === "perf" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("perf")}
          className="gap-2"
        >
          <Gauge className="w-4 h-4" />
          <span className="hidden sm:inline">Performance</span>
          <span className="sm:hidden">⚡</span>
        </Button>
        <Button
          variant={activeTab === "push" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("push")}
          className="gap-2"
        >
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">Push</span>
          <span className="sm:hidden">🔔</span>
        </Button>
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
        <Button
          variant={activeTab === "docs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("docs")}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Documentation</span>
          <span className="sm:hidden">Docs</span>
        </Button>
      </div>

      {activeTab === "health" && <PlatformHealthDashboard />}
      {activeTab === "perf" && (
        <Suspense fallback={<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}>
          <PerformanceDashboard />
        </Suspense>
      )}
      {activeTab === "push" && <AdminPushCenter />}
      {activeTab === "errors" && <AdminErrorReports />}
      {activeTab === "integrity" && <AdminDataIntegrity />}
      {activeTab === "rls" && <AdminRLSAudit />}
      {activeTab === "docs" && <AdminDocumentation />}
    </div>
  );
};

export default AdminTechHub;
