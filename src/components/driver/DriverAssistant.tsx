import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Bot, X, Send, Minimize2, Maximize2, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const DriverAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Salut ! Je suis Liberty, ton assistant SoloCab 🚗\n\nJe suis là pour t'aider avec toutes les fonctionnalités de la plateforme. Pose-moi tes questions sur les courses, devis, factures, paramètres, ou n'importe quelle autre fonctionnalité !"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminHelp, setShowAdminHelp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/driver-assistant`;
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: userMessage }] 
        }),
      });

      if (resp.status === 429) {
        toast({
          title: "Trop de requêtes",
          description: "Merci de patienter quelques instants avant de réessayer.",
          variant: "destructive",
        });
        return;
      }

      if (resp.status === 402) {
        toast({
          title: "Service temporairement indisponible",
          description: "Veuillez contacter le support.",
          variant: "destructive",
        });
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error("Erreur de connexion à l'assistant");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter à l'assistant. Réessayez.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    await streamChat(userMessage);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContactAdmin = async () => {
    if (!input.trim()) {
      toast({
        title: "Question requise",
        description: "Veuillez saisir votre question avant de contacter l'admin.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Récupérer le driver_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driverData) throw new Error("Profil chauffeur introuvable");

      // Créer la demande d'assistance
      const { error } = await supabase
        .from('assistant_requests')
        .insert({
          driver_id: driverData.id,
          question: input,
          context: JSON.stringify(messages.slice(-5)), // Les 5 derniers messages pour contexte
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Question envoyée à l'administrateur",
        description: "Un administrateur reviendra vers vous très prochainement. Vous recevrez une notification.",
      });

      setInput('');
      setShowAdminHelp(false);
      
      // Ajouter un message de confirmation dans le chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "J'ai bien envoyé votre question à l'équipe administrative. Vous recevrez une réponse sous forme de notification dès qu'un administrateur aura traité votre demande. 📧"
      }]);
    } catch (error) {
      console.error('Error contacting admin:', error);
      toast({
        title: "Erreur",
        description: "Impossible de contacter l'admin. Réessayez.",
        variant: "destructive",
      });
    }
  };

  const bottomClass = "bottom-6";

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed ${bottomClass} right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50 p-0 transition-all duration-300`}
        aria-label="Ouvrir l'assistant Liberty"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card 
      className={`fixed ${bottomClass} right-6 bg-card shadow-2xl z-50 flex flex-col transition-all duration-300 ${
        isMinimized 
          ? 'w-80 h-16' 
          : 'w-[95vw] sm:w-96 h-[600px] max-h-[85vh]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 sm:h-6 sm:h-6" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Liberty - Assistant SoloCab</h3>
            <p className="text-xs opacity-90">Support 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary-foreground/10"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap break-words ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t">
            {showAdminHelp ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Votre question sera envoyée directement à l'équipe administrative qui vous répondra par notification.
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAdminHelp(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleContactAdmin}
                    disabled={!input.trim()}
                    size="sm"
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer à l'admin
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Pose ta question à Liberty..."
                    disabled={isLoading}
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => setShowAdminHelp(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  <HelpCircle className="h-3 w-3 mr-2" />
                  Liberty ne peut pas répondre ? Contactez l'admin
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};