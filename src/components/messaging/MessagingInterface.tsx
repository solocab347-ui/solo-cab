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
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-250px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-4 overflow-hidden flex flex-col max-h-[400px] lg:max-h-none">
        <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-bold">Messages</h2>
          <Button
            size="sm"
            className="bg-gradient-premium hover:opacity-90 text-xs sm:text-sm"
            onClick={() => setShowContactSelector(true)}
          >
            <MessageSquarePlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nouveau</span>
            <span className="sm:hidden">+</span>
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
      <Card className="lg:col-span-8 overflow-hidden min-h-[500px] lg:min-h-0">
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
          <div className="flex items-center justify-center h-full text-center p-4 sm:p-6">
            <div className="max-w-sm">
              <MessageSquarePlus className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Sélectionnez une conversation</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Choisissez une conversation existante ou créez-en une nouvelle
              </p>
              <Button
                className="bg-gradient-premium hover:opacity-90 text-xs sm:text-sm w-full sm:w-auto"
                onClick={() => setShowContactSelector(true)}
              >
                <MessageSquarePlus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Nouvelle conversation
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
