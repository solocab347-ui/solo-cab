import { useState, useRef, useEffect } from 'react';
import { useRideChat, RideMessage } from '@/hooks/useRideChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Lock, X, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RideChatPanelProps {
  rideId: string;
  senderType: 'client' | 'driver' | 'guest';
  senderId: string;
  otherName: string;
  /** Required when senderType === 'guest' (the guest_tracking_token from the URL) */
  guestToken?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  onCallPress?: () => void;
}

const QUICK_MESSAGES_DRIVER = [
  "Je suis en route",
  "J'arrive dans 2 min",
  "Je suis devant",
  "Vous êtes où ?",
];

const QUICK_MESSAGES_CLIENT = [
  "J'arrive",
  "Je suis prêt",
  "Vous êtes où ?",
  "2 minutes svp",
];

export function RideChatPanel({
  rideId,
  senderType,
  senderId,
  otherName,
  guestToken,
  isOpen,
  onOpenChange,
  triggerLabel = "Contacter",
  onCallPress,
}: RideChatPanelProps) {
  const {
    messages,
    loading,
    sending,
    unreadCount,
    chatClosed,
    sendMessage,
    markAsRead,
  } = useRideChat({ rideId, senderType, senderId, guestToken });

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isControlled = isOpen !== undefined;
  const sheetOpen = isControlled ? isOpen : open;
  const setSheetOpen = isControlled ? onOpenChange! : setOpen;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when opened
  useEffect(() => {
    if (sheetOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [sheetOpen, unreadCount, markAsRead]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const success = await sendMessage(text);
    if (success) setText('');
    else toast.error('Message non envoyé');
  };

  const handleQuickMessage = async (msg: string) => {
    const success = await sendMessage(msg);
    if (!success) toast.error('Message non envoyé');
  };

  const quickMessages = senderType === 'driver' ? QUICK_MESSAGES_DRIVER : QUICK_MESSAGES_CLIENT;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative gap-2 border-primary/30 hover:bg-primary/10"
          >
            <MessageCircle className="h-4 w-4" />
            {triggerLabel}
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col p-0 rounded-t-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">{otherName}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                {chatClosed ? '🔒 Chat terminé' : '🟢 Course en cours'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onCallPress && !chatClosed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCallPress}
                className="text-green-600 hover:bg-green-500/10"
                title="Appeler"
              >
                <Phone className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSheetOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Chargement...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <MessageCircle className="h-10 w-10 opacity-30" />
              <p className="text-sm">Aucun message</p>
              <p className="text-xs">Envoyez un message pour commencer</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isMine={msg.sender_type === senderType}
              />
            ))
          )}
        </div>

        {/* Quick messages */}
        {!chatClosed && (
          <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto">
            {quickMessages.map((qm) => (
              <Button
                key={qm}
                variant="secondary"
                size="sm"
                className="whitespace-nowrap text-xs h-7 shrink-0"
                onClick={() => handleQuickMessage(qm)}
                disabled={sending}
              >
                {qm}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        {chatClosed ? (
          <div className="flex items-center justify-center gap-2 py-4 border-t text-muted-foreground bg-muted/30">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Chat fermé — course terminée</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 border-t bg-background">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ChatBubble({ message, isMine }: { message: RideMessage; isMine: boolean }) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        <p
          className={cn(
            'text-[10px] mt-1',
            isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
          )}
        >
          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
        </p>
      </div>
    </div>
  );
}
