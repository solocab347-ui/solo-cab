import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Trash2, Tag, CreditCard, Truck, Settings2 } from "lucide-react";
import AdminDriversManagement from "../AdminDriversManagement";
import AdminUserCleanup from "../AdminUserCleanup";
import AdminNfcHub from "./AdminNfcHub";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminUsersHub = () => {
  const [activeSection, setActiveSection] = useState<"drivers" | "nfc" | "cleanup">("drivers");
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      {/* Section Selector - Responsive */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSection === "drivers" ? "default" : "outline"}
          size={isMobile ? "sm" : "default"}
          onClick={() => setActiveSection("drivers")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          <span className={isMobile ? "hidden sm:inline" : ""}>Chauffeurs</span>
          {isMobile && <span className="sm:hidden">Chauff.</span>}
        </Button>
        <Button
          variant={activeSection === "nfc" ? "default" : "outline"}
          size={isMobile ? "sm" : "default"}
          onClick={() => setActiveSection("nfc")}
          className="gap-2"
        >
          <CreditCard className="w-4 h-4" />
          <span className={isMobile ? "hidden sm:inline" : ""}>Plaques NFC</span>
          {isMobile && <span className="sm:hidden">NFC</span>}
        </Button>
        <Button
          variant={activeSection === "cleanup" ? "default" : "outline"}
          size={isMobile ? "sm" : "default"}
          onClick={() => setActiveSection("cleanup")}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span className={isMobile ? "hidden sm:inline" : ""}>Nettoyage</span>
          {isMobile && <span className="sm:hidden">Suppr.</span>}
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-x-hidden">
        {activeSection === "drivers" && <AdminDriversManagement />}
        {activeSection === "nfc" && <AdminNfcHub />}
        {activeSection === "cleanup" && <AdminUserCleanup />}
      </div>
    </div>
  );
};

export default AdminUsersHub;
