import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { ConversationsList } from "./ConversationsList";
import { ChatWindow } from "./ChatWindow";
import { ContactSelector } from "./ContactSelector";
import { useMessaging } from "@/hooks/useMessaging";
import { toast } from "sonner";

export const MessagingInterface = () => {
  const {
    conversations,
    messages,
    selectedConversation,
    loading,
    setSelectedConversation,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
  } = useMessaging();

  const [showContactSelector, setShowContactSelector] = useState(false);

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    await fetchMessages(conversationId);
    setShowContactSelector(false);
  };

  const handleSelectContact = async (contactId: string) => {
    const conversationId = await getOrCreateConversation(contactId);
    if (conversationId) {
      await handleSelectConversation(conversationId);
    } else {
      toast.error("Erreur lors de la création de la conversation");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation, content);
    }
  };

  const selectedConvo = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
      {/* Conversations List */}
      <Card className="col-span-4 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Messages</h2>
          <Button
            size="sm"
            className="bg-gradient-premium hover:opacity-90"
            onClick={() => setShowContactSelector(true)}
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Nouveau
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ConversationsList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            loading={loading}
          />
        </div>
      </Card>

      {/* Chat Window or Contact Selector */}
      <Card className="col-span-8 overflow-hidden">
        {showContactSelector ? (
          <ContactSelector
            onSelectContact={handleSelectContact}
            onClose={() => setShowContactSelector(false)}
          />
        ) : selectedConvo ? (
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            otherUser={selectedConvo.other_user}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center p-6">
            <div>
              <MessageSquarePlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sélectionnez une conversation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choisissez une conversation existante ou créez-en une nouvelle
              </p>
              <Button
                className="bg-gradient-premium hover:opacity-90"
                onClick={() => setShowContactSelector(true)}
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Nouvelle conversation
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
