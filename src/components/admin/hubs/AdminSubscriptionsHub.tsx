import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Gift, Link2 } from "lucide-react";
import AdminSubscriptions from "../AdminSubscriptions";
import AdminFreeAccess from "../AdminFreeAccess";
import AdminSubscriptionSync from "../AdminSubscriptionSync";
import AdminInvitationLinks from "../AdminInvitationLinks";

const AdminSubscriptionsHub = () => {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "invitations" | "free" | "sync">("subscriptions");

  return (
    <div className="space-y-4">
      {/* Navigation simplifiée */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <Button
          variant={activeTab === "subscriptions" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("subscriptions")}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Abonnements</span>
          <span className="sm:hidden">Abos</span>
        </Button>
        <Button
          variant={activeTab === "invitations" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("invitations")}
          className="gap-2"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Liens d'invitation</span>
          <span className="sm:hidden">Liens</span>
        </Button>
        <Button
          variant={activeTab === "free" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("free")}
          className="gap-2"
        >
          <Gift className="w-4 h-4" />
          <span className="hidden sm:inline">Accès Gratuits</span>
          <span className="sm:hidden">Gratuits</span>
        </Button>
        <Button
          variant={activeTab === "sync" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("sync")}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Synchronisation</span>
          <span className="sm:hidden">Sync</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "subscriptions" && <AdminSubscriptions />}
      {activeTab === "invitations" && <AdminInvitationLinks />}
      {activeTab === "free" && <AdminFreeAccess />}
      {activeTab === "sync" && <AdminSubscriptionSync />}
    </div>
  );
};

export default AdminSubscriptionsHub;
