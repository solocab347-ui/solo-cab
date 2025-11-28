import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatWindow } from "./ChatWindow";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logger } from "@/lib/productionLogger";

interface Contact {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
}

export const MessagingInterface = () => {
  const { user, userRole } = useAuth();
  const {
    messages,
    selectedConversation,
    setSelectedConversation,
    sendMessage,
    getOrCreateConversation,
    fetchMessages,
  } = useMessaging();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, [user, userRole]);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (userRole === "driver") {
        // Driver: fetch all clients
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (driverError) {
          logger.error("Error fetching driver", { error: driverError });
          toast.error("Erreur lors du chargement du chauffeur");
          return;
        }

        if (!driverData) {
          logger.warn("No driver data found for messaging");
          return;
        }

        const { data: clientsData, error: clientsError } = await supabase
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

        if (clientsError) {
          logger.error("Error fetching clients for messaging", { error: clientsError });
          toast.error("Erreur lors du chargement des clients");
          return;
        }

        if (clientsData) {
          const contactsList = clientsData
            .map((c: any) => c.profiles)
            .filter(Boolean);
          setContacts(contactsList);
        }
      } else if (userRole === "client") {
        // Client: fetch their driver(s)
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("driver_id, driver_ids, is_exclusive")
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientError) {
          logger.error("Error fetching client data for messaging", { error: clientError });
          toast.error("Erreur lors du chargement du client");
          return;
        }

        if (!clientData) {
          console.warn("⚠️ No client data found");
          return;
        }

        let driverIds: string[] = [];

        if (clientData.is_exclusive && clientData.driver_id) {
          driverIds = [clientData.driver_id];
        } else if (clientData.driver_ids && clientData.driver_ids.length > 0) {
          driverIds = clientData.driver_ids;
        }

        if (driverIds.length > 0) {
          const { data: driversData, error: driversError } = await supabase
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

          if (driversError) {
            console.error("❌ Error fetching drivers:", driversError);
            toast.error("Erreur lors du chargement des chauffeurs");
            return;
          }

          if (driversData) {
            const contactsList = driversData
              .map((d: any) => d.profiles)
              .filter(Boolean);
            setContacts(contactsList);
            // Auto-select if exclusive client with single driver
            if (contactsList.length === 1) {
              handleSelectContact(contactsList[0].id);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Exception fetching contacts:", error);
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    setSelectedContact(contact);
    const conversationId = await getOrCreateConversation(contactId);
    if (conversationId) {
      setSelectedConversation(conversationId);
      await fetchMessages(conversationId);
    } else {
      toast.error("Erreur lors de la création de la conversation");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation, content);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contact Selector - Mobile style */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">
              {userRole === "driver" ? "Sélectionnez un client" : "Sélectionnez votre chauffeur"}
            </h3>
          </div>
          
          <Select 
            value={selectedContact?.id || ""} 
            onValueChange={handleSelectContact}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={contacts.length === 0 ? "Aucun contact disponible" : "Choisir un contact"}>
                {selectedContact && (
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedContact.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs">
                        {selectedContact.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedContact.full_name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-[100]">
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id} className="cursor-pointer hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={contact.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs">
                        {contact.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{contact.full_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Chat Window */}
      <Card className="overflow-hidden min-h-[500px]">
        {selectedContact ? (
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            otherUser={selectedContact}
          />
        ) : (
          <div className="flex items-center justify-center h-[500px] text-center p-6">
            <div className="max-w-sm">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sélectionnez un contact</h3>
              <p className="text-sm text-muted-foreground">
                {contacts.length === 0 
                  ? "Aucun contact disponible pour le moment"
                  : "Choisissez un contact ci-dessus pour démarrer la conversation"
                }
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
