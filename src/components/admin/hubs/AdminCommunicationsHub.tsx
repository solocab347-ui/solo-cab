import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Share2 } from "lucide-react";
import AdminEmails from "../AdminEmails";
import AdminSocialLinks from "../AdminSocialLinks";

const AdminCommunicationsHub = () => {
  const [activeTab, setActiveTab] = useState("emails");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="emails" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Mail className="w-4 h-4" />
            <span>Emails</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Réseaux Sociaux</span>
            <span className="sm:hidden">Sociaux</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emails" className="mt-4">
          <AdminEmails />
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <AdminSocialLinks />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCommunicationsHub;
