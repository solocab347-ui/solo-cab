import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Gift, Ticket, Link2 } from "lucide-react";
import AdminSubscriptions from "../AdminSubscriptions";
import AdminFreeAccess from "../AdminFreeAccess";
import { AdminInvitationTokens } from "../AdminInvitationTokens";
import AdminSubscriptionSync from "../AdminSubscriptionSync";

const AdminSubscriptionsHub = () => {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "free" | "tokens" | "sync">("subscriptions");

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
          variant={activeTab === "sync" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("sync")}
          className="gap-2"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Synchronisation</span>
          <span className="sm:hidden">Sync</span>
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
          variant={activeTab === "tokens" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("tokens")}
          className="gap-2"
        >
          <Ticket className="w-4 h-4" />
          <span className="hidden sm:inline">Tokens Campagne</span>
          <span className="sm:hidden">Tokens</span>
        </Button>
      </div>

      {/* Contenu */}
      {activeTab === "subscriptions" && <AdminSubscriptions />}
      {activeTab === "sync" && <AdminSubscriptionSync />}
      {activeTab === "free" && <AdminFreeAccess />}
      {activeTab === "tokens" && <AdminInvitationTokens />}
    </div>
  );
};

export default AdminSubscriptionsHub;