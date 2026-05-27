import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, Flag, Ban, ShieldOff, Lock } from "lucide-react";
import { Message } from "@/hooks/useMessaging";
import { useAuth } from "@/hooks/useAuth";
import { useUserBlock } from "@/hooks/useUserBlock";
import { ReportContentDialog } from "@/components/moderation/ReportContentDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  otherUser: {
    id?: string;
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
          <div className="flex-1">
            <h3 className="font-semibold">{otherUser.full_name}</h3>
            <p className="text-xs text-muted-foreground">En ligne</p>
          </div>
        </div>
        {/* Note conservation messages */}
        <div className="mt-3 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            ℹ️ Les messages sont conservés pendant 3 mois puis automatiquement supprimés
          </p>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id;
            const senderName = isOwnMessage 
              ? user?.user_metadata?.full_name || "Moi" 
              : otherUser.full_name;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <Avatar className="w-10 h-10 shrink-0">
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
                  className={`max-w-[70%] flex flex-col ${
                    isOwnMessage ? "items-end" : "items-start"
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-xs font-semibold text-foreground">
                      {senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "d MMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
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
