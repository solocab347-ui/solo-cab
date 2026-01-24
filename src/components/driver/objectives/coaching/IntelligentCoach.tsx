import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ObjectiveProgress } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Bot, 
  Send, 
  Loader2, 
  Sparkles, 
  TrendingUp,
  Users,
  Target,
  Calendar,
  Lightbulb,
  Heart,
  Handshake,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'greeting' | 'advice' | 'celebration' | 'encouragement' | 'partnership';
}

interface IntelligentCoachProps {
  driverId: string;
  progress: ObjectiveProgress[];
  driverName?: string;
  stats: {
    totalClients: number;
    totalCourses: number;
    totalRevenue: number;
    soloCabPercentage: number;
    streakDays: number;
    partnershipsCount: number;
    isFirstClient: boolean;
    isFirstCourse: boolean;
    recentGrowth: number;
  };
}

const QUICK_ACTIONS = [
  { 
    icon: TrendingUp, 
    label: "Augmenter mon CA", 
    prompt: "Comment puis-je augmenter mon chiffre d'affaires ce mois-ci ?",
    color: "text-green-500"
  },
  { 
    icon: Users, 
    label: "Fidéliser clients", 
    prompt: "Quelles stratégies pour fidéliser mes clients directs ?",
    color: "text-blue-500"
  },
  { 
    icon: Target, 
    label: "Devenir indépendant", 
    prompt: "Comment réduire ma dépendance aux plateformes ?",
    color: "text-purple-500"
  },
  { 
    icon: Handshake, 
    label: "Partenariats", 
    prompt: "Comment fonctionnent les partenariats entre chauffeurs ? Quels avantages ?",
    color: "text-rose-500"
  },
  { 
    icon: Calendar, 
    label: "Optimiser horaires", 
    prompt: "Quels sont les meilleurs créneaux horaires pour maximiser mes revenus ?",
    color: "text-amber-500"
  },
  { 
    icon: Lightbulb, 
    label: "Conseils du jour", 
    prompt: "Donne-moi un conseil actionnable pour aujourd'hui",
    color: "text-cyan-500"
  },
];

export function IntelligentCoach({ driverId, progress, driverName, stats }: IntelligentCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Generate personalized greeting on mount
  useEffect(() => {
    const greeting = generateGreeting();
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      type: 'greeting'
    }]);
  }, []);

  // Generate context-aware greeting
  const generateGreeting = (): string => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const name = driverName ? `, ${driverName}` : "";
    
    let greeting = `${timeGreeting}${name} ! 👋\n\n`;

    // First client celebration
    if (stats.isFirstClient && stats.totalClients === 1) {
      greeting += "🎉 **Félicitations pour votre premier client privé !** C'est le début de votre indépendance !\n\n";
    }
    
    // First course celebration
    if (stats.isFirstCourse && stats.totalCourses === 1) {
      greeting += "🚗 **Bravo pour votre première course SoloCab !** Vous êtes sur la bonne voie !\n\n";
    }

    // Growth celebration
    if (stats.recentGrowth > 0) {
      greeting += `📈 **+${stats.recentGrowth.toFixed(0)}% de croissance** ce mois-ci ! Continuez comme ça !\n\n`;
    }

    // Independence progress
    if (stats.soloCabPercentage > 0) {
      greeting += `🎯 Vous êtes à **${stats.soloCabPercentage.toFixed(0)}% d'indépendance** des plateformes. `;
      if (stats.soloCabPercentage < 25) {
        greeting += "Chaque nouveau client vous rapproche de la liberté !\n\n";
      } else if (stats.soloCabPercentage < 50) {
        greeting += "Excellent progrès vers votre indépendance !\n\n";
      } else {
        greeting += "Impressionnant ! Vous êtes en bonne voie vers l'autonomie totale !\n\n";
      }
    }

    // Partnership suggestion
    if (stats.partnershipsCount === 0) {
      greeting += "💡 **Astuce** : Découvrez les partenariats entre chauffeurs pour mutualiser vos courses et développer votre réseau !\n\n";
    } else {
      greeting += `🤝 Vous avez **${stats.partnershipsCount} partenaire(s)** - votre réseau s'agrandit !\n\n`;
    }

    greeting += "Comment puis-je vous aider aujourd'hui ?";

    return greeting;
  };

  // Send message to AI
  const sendMessage = async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build rich context
      const dailyProgress = progress.find(p => p.period === 'daily');
      const weeklyProgress = progress.find(p => p.period === 'weekly');
      const monthlyProgress = progress.find(p => p.period === 'monthly');

      const context = `
CONTEXTE CHAUFFEUR VTC SOLOCAB:
- Clients directs: ${stats.totalClients}
- Courses réalisées: ${stats.totalCourses}
- CA total clients privés: ${stats.totalRevenue.toFixed(0)}€
- Indépendance plateformes: ${stats.soloCabPercentage.toFixed(0)}%
- Partenaires chauffeurs: ${stats.partnershipsCount}
- Série de jours consécutifs: ${stats.streakDays}

PROGRESSION AUJOURD'HUI:
- CA: ${dailyProgress?.current.revenue.toFixed(0) || 0}€ / ${dailyProgress?.objective?.revenue_target || 0}€ (${dailyProgress?.percentage.revenue.toFixed(0) || 0}%)
- Courses: ${dailyProgress?.current.courses || 0} / ${dailyProgress?.objective?.courses_target || 0}

PROGRESSION SEMAINE:
- CA: ${weeklyProgress?.current.revenue.toFixed(0) || 0}€ / ${weeklyProgress?.objective?.revenue_target || 0}€

PROGRESSION MOIS:
- CA: ${monthlyProgress?.current.revenue.toFixed(0) || 0}€ / ${monthlyProgress?.objective?.revenue_target || 0}€
- Nouveaux clients: ${monthlyProgress?.current.newClients || 0}

OBJECTIF SOLOCAB: Aider ce chauffeur à devenir INDÉPENDANT des plateformes (Uber, Bolt, etc.) 
en développant sa clientèle directe et son réseau de partenariats avec d'autres chauffeurs.

Question du chauffeur: ${messageText}
`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/driver-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: `Tu es le Coach IA SoloCab, un assistant bienveillant et expert pour les chauffeurs VTC français. 
              
Ton objectif principal: aider les chauffeurs à devenir INDÉPENDANTS des plateformes comme Uber et Bolt.

Personnalité:
- Humain, encourageant et positif
- Célèbre chaque victoire (même petite)
- Donne des conseils CONCRETS et ACTIONNABLES
- Mentionne les partenariats entre chauffeurs comme opportunité
- Utilise des emojis pour rendre tes messages chaleureux
- Réponds en français, max 300 mots

Thèmes clés à promouvoir:
1. Acquisition de clients directs (QR code, bouche à oreille, réseaux)
2. Fidélisation par un service premium
3. Partenariats entre chauffeurs SoloCab
4. Optimisation des horaires et zones
5. Calcul du seuil de rentabilité sans plateformes`
            },
            { role: 'user', content: context }
          ]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Trop de requêtes. Réessayez dans un moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('Service temporairement indisponible.');
          return;
        }
        throw new Error('Erreur API');
      }

      // Parse SSE response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let assistantMessageId = `assistant-${Date.now()}`;

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        type: 'advice'
      }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId 
                      ? { ...m, content: fullResponse }
                      : m
                  ));
                }
              } catch {}
            }
          }
        }
      }

      if (!fullResponse) {
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: "Je suis là pour vous aider à développer votre activité et devenir indépendant des plateformes. N'hésitez pas à me poser vos questions !" }
            : m
        ));
      }

    } catch (error) {
      console.error('AI error:', error);
      toast.error('Erreur de communication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg">Coach IA SoloCab</span>
            <p className="text-xs font-normal text-muted-foreground">Votre assistant vers l'indépendance</p>
          </div>
          <Badge variant="secondary" className="ml-auto bg-green-500/20 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
            En ligne
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent">
                    <AvatarFallback className="bg-transparent">
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-sm' 
                      : 'bg-muted rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {format(message.timestamp, 'HH:mm', { locale: fr })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-muted">
                    <AvatarFallback>
                      <MessageCircle className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent">
                <AvatarFallback className="bg-transparent">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-2 h-2 bg-primary/60 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-2 h-2 bg-primary/60 rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-2 h-2 bg-primary/60 rounded-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-2 border-t bg-muted/30">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(action.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 text-xs gap-1.5"
            >
              <action.icon className={`w-3 h-3 ${action.color}`} />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <CardContent className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Posez votre question au coach..."
            rows={1}
            className="min-h-[40px] max-h-[100px] resize-none"
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
