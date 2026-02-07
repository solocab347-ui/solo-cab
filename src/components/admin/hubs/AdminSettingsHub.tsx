import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Video } from "lucide-react";
import AdminRGPD from "../AdminRGPD";
import AdminSettings from "../AdminSettings";
import AdminVideosManagement from "../AdminVideosManagement";

const AdminSettingsHub = () => {
  const [activeTab, setActiveTab] = useState<"rgpd" | "password" | "videos">("rgpd");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
        <Button
          variant={activeTab === "rgpd" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("rgpd")}
          className="gap-2"
        >
          <Shield className="w-4 h-4" />
          RGPD
        </Button>
        <Button
          variant={activeTab === "password" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("password")}
          className="gap-2"
        >
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">Mot de passe</span>
          <span className="sm:hidden">MDP</span>
        </Button>
        <Button
          variant={activeTab === "videos" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("videos")}
          className="gap-2"
        >
          <Video className="w-4 h-4" />
          <span className="hidden sm:inline">Vidéos</span>
          <span className="sm:hidden">Vid.</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "rgpd" && <AdminRGPD />}
      {activeTab === "password" && <AdminSettings />}
      {activeTab === "videos" && <AdminVideosManagement />}
    </div>
  );
};

export default AdminSettingsHub;