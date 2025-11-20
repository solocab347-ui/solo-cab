import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Conversation } from "@/hooks/useMessaging";
import { MessageSquare } from "lucide-react";

interface ConversationsListProps {
  conversations: Conversation[];
  selectedConversation: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
}

export const ConversationsList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  loading,
}: ConversationsListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune conversation</h3>
        <p className="text-sm text-muted-foreground">
          Commencez une nouvelle conversation en sélectionnant un contact
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {conversations.map((conversation) => (
          <Card
            key={conversation.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedConversation === conversation.id
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={conversation.other_user.profile_photo_url || undefined} />
                <AvatarFallback className="bg-gradient-trust text-trust-foreground">
                  {conversation.other_user.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold truncate">
                    {conversation.other_user.full_name}
                  </h4>
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="bg-primary ml-2">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>

                {conversation.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message.content}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(conversation.last_message_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
