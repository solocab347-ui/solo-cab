import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { Message } from "@/hooks/useMessaging";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  otherUser: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

export const ChatWindow = ({ messages, onSendMessage, otherUser }: ChatWindowProps) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherUser.profile_photo_url || undefined} />
            <AvatarFallback className="bg-gradient-trust text-trust-foreground">
              {otherUser.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{otherUser.full_name}</h3>
            <p className="text-xs text-muted-foreground">En ligne</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={
                      isOwnMessage
                        ? user?.user_metadata?.profile_photo_url
                        : otherUser.profile_photo_url || undefined
                    }
                  />
                  <AvatarFallback
                    className={
                      isOwnMessage
                        ? "bg-gradient-premium text-premium-foreground"
                        : "bg-gradient-trust text-trust-foreground"
                    }
                  >
                    {isOwnMessage
                      ? user?.user_metadata?.full_name?.charAt(0) || "M"
                      : otherUser.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`max-w-[70%] ${
                    isOwnMessage ? "items-end" : "items-start"
                  }`}
                >
                  <Card
                    className={`p-3 ${
                      isOwnMessage
                        ? "bg-gradient-premium text-premium-foreground"
                        : "bg-card"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </Card>
                  <p
                    className={`text-xs text-muted-foreground mt-1 ${
                      isOwnMessage ? "text-right" : "text-left"
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-gradient-premium hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
