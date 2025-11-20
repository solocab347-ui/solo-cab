import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
}

interface ContactSelectorProps {
  onSelectContact: (contactId: string) => void;
  onClose: () => void;
}

export const ContactSelector = ({ onSelectContact, onClose }: ContactSelectorProps) => {
  const { user, userRole } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, [user, userRole]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter((contact) =>
        contact.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (userRole === "driver") {
        // Driver can message their clients
        const { data: driverData } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!driverData) return;

        const { data: clientsData } = await supabase
          .from("clients")
          .select(`
            user_id,
            profiles:user_id (
              id,
              full_name,
              profile_photo_url
            )
          `)
          .or(`driver_id.eq.${driverData.id},driver_ids.cs.{${driverData.id}}`);

        if (clientsData) {
          const contactsList = clientsData
            .map((c: any) => c.profiles)
            .filter(Boolean);
          setContacts(contactsList);
          setFilteredContacts(contactsList);
        }
      } else if (userRole === "client") {
        // Client can message their driver(s)
        const { data: clientData } = await supabase
          .from("clients")
          .select("driver_id, driver_ids, is_exclusive")
          .eq("user_id", user.id)
          .single();

        if (!clientData) return;

        let driverIds: string[] = [];

        if (clientData.is_exclusive && clientData.driver_id) {
          // Exclusive client - only their driver
          driverIds = [clientData.driver_id];
        } else if (clientData.driver_ids && clientData.driver_ids.length > 0) {
          // Free client - all their drivers
          driverIds = clientData.driver_ids;
        }

        if (driverIds.length > 0) {
          const { data: driversData } = await supabase
            .from("drivers")
            .select(`
              user_id,
              profiles:user_id (
                id,
                full_name,
                profile_photo_url
              )
            `)
            .in("id", driverIds);

          if (driversData) {
            const contactsList = driversData
              .map((d: any) => d.profiles)
              .filter(Boolean);
            setContacts(contactsList);
            setFilteredContacts(contactsList);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contactId: string) => {
    onSelectContact(contactId);
    onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement des contacts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquarePlus className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold">Nouvelle conversation</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un contact..."
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Aucun contact trouvé"
                  : "Aucun contact disponible"}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <Card
                key={contact.id}
                className="p-4 cursor-pointer transition-all hover:shadow-md hover:bg-muted/50"
                onClick={() => handleSelectContact(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-trust text-trust-foreground">
                      {contact.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{contact.full_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {userRole === "driver" ? "Client" : "Chauffeur"}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button variant="outline" onClick={onClose} className="w-full">
          Annuler
        </Button>
      </div>
    </div>
  );
};
