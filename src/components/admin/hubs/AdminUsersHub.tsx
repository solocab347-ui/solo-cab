import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Tag } from "lucide-react";
import AdminDriversManagement from "../AdminDriversManagement";
import AdminUserCleanup from "../AdminUserCleanup";
import AdminDriversNfcManager from "../AdminDriversNfcManager";

const AdminUsersHub = () => {
  const [activeTab, setActiveTab] = useState<"drivers" | "nfc" | "cleanup">("drivers");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "drivers" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("drivers")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Chauffeurs</span>
          <span className="sm:hidden">Chauff.</span>
        </Button>
        <Button
          variant={activeTab === "nfc" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("nfc")}
          className="gap-2"
        >
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">Gestion NFC</span>
          <span className="sm:hidden">NFC</span>
        </Button>
        <Button
          variant={activeTab === "cleanup" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("cleanup")}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Nettoyage</span>
          <span className="sm:hidden">Suppr.</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "drivers" && <AdminDriversManagement />}
      {activeTab === "nfc" && <AdminDriversNfcManager />}
      {activeTab === "cleanup" && <AdminUserCleanup />}
    </div>
  );
};

export default AdminUsersHub;
