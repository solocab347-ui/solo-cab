import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DriverCoachingMessage, ObjectiveProgress } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  Trophy, 
  Lightbulb,
  Heart,
  CheckCircle2,
  Loader2,
  Send,
  Bot
} from 'lucide-react';

interface CoachingPanelProps {
  driverId: string;
  messages: DriverCoachingMessage[];
  progress: ObjectiveProgress[];
  onMarkRead: (id: string) => Promise<void>;
}

const MESSAGE_ICONS: Record<string, any> = {
  suggestion: Lightbulb,
  alert: AlertTriangle,
  motivation: Heart,
  tip: Sparkles,
  milestone: Trophy,
};

const MESSAGE_COLORS: Record<string, string> = {
  suggestion: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  alert: 'bg-destructive/20 text-destructive border-destructive/30',
  motivation: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  tip: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  milestone: 'bg-green-500/20 text-green-500 border-green-500/30',
};

export function CoachingPanel({ driverId, messages, progress, onMarkRead }: CoachingPanelProps) {
  const [askingAI, setAskingAI] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const generateCoachingAdvice = async () => {
    if (!question.trim()) {
      toast.error('Posez une question à l\'assistant');
      return;
    }

    setAskingAI(true);
    setAiResponse(null);

    try {
      // Build context from current progress
      const dailyProgress = progress.find(p => p.period === 'daily');
      const weeklyProgress = progress.find(p => p.period === 'weekly');
      const monthlyProgress = progress.find(p => p.period === 'monthly');

      const context = `
Contexte du chauffeur VTC:
- Aujourd'hui: ${dailyProgress?.current.revenue.toFixed(0) || 0}€ de CA, ${dailyProgress?.current.courses || 0} courses
- Cette semaine: ${weeklyProgress?.current.revenue.toFixed(0) || 0}€ de CA, ${weeklyProgress?.current.courses || 0} courses
- Ce mois: ${monthlyProgress?.current.revenue.toFixed(0) || 0}€ de CA, ${monthlyProgress?.current.newClients || 0} nouveaux clients

Objectifs quotidiens: ${dailyProgress?.objective?.revenue_target || 'non défini'}€, ${dailyProgress?.objective?.courses_target || 'non défini'} courses
Objectifs hebdo: ${weeklyProgress?.objective?.revenue_target || 'non défini'}€
Objectifs mensuels: ${monthlyProgress?.objective?.revenue_target || 'non défini'}€

Question du chauffeur: ${question}
`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/driver-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: `En tant que coach VTC professionnel, réponds à cette question en tenant compte du contexte:\n\n${context}` }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      // Parse SSE response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

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
                  setAiResponse(fullResponse);
                }
              } catch {}
            }
          }
        }
      }

      if (!fullResponse) {
        setAiResponse("Je suis là pour vous aider à atteindre vos objectifs. Posez-moi vos questions sur votre activité VTC !");
      }

    } catch (error) {
      console.error('AI error:', error);
      toast.error('Erreur de communication avec l\'assistant');
    } finally {
      setAskingAI(false);
    }
  };

  const handleMarkAllRead = async () => {
    for (const msg of messages.filter(m => !m.is_read)) {
      await onMarkRead(msg.id);
    }
    toast.success('Messages marqués comme lus');
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-4">
      {/* AI Assistant */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            Assistant Coaching IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Posez votre question... Ex: Comment puis-je augmenter mon CA quotidien ?"
              rows={3}
            />
            <Button 
              onClick={generateCoachingAdvice} 
              disabled={askingAI || !question.trim()}
              className="w-full"
            >
              {askingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Demander conseil
            </Button>
          </div>

          {aiResponse && (
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Suggestions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Comment optimiser mes horaires ?",
              "Conseils pour fidéliser mes clients",
              "Comment atteindre mes objectifs ?",
              "Meilleures heures pour travailler",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setQuestion(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              Notifications ({messages.length})
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune notification pour le moment
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {messages.map((msg) => {
                const Icon = MESSAGE_ICONS[msg.message_type] || MessageSquare;
                return (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg border ${msg.is_read ? 'bg-muted/30' : 'bg-card'}`}
                    onClick={() => !msg.is_read && onMarkRead(msg.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={`${MESSAGE_COLORS[msg.message_type]} px-2 py-1`}>
                        <Icon className="w-3 h-3" />
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">{msg.title}</h4>
                          {!msg.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(msg.created_at), 'PPp', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
