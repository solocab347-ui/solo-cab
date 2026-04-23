import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  MessageCircle,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';

interface OnboardingAIAssistantProps {
  currentStep: number;
  stepData: any;
  driverName: string;
}

const STEP_CONTEXTS = {
  0: {
    title: 'Configuration des tarifs',
    key: 'settings',
    prompts: [
      'Comment fixer mes tarifs VTC ?',
      'Quel prix au km recommandé ?',
      'Dois-je inclure la TVA ?',
    ]
  },
  1: {
    title: 'Profil professionnel',
    key: 'profile',
    prompts: [
      'Pourquoi remplir mon profil ?',
      'Comment attirer des clients ?',
      'Quels secteurs choisir ?',
    ]
  },
  2: {
    title: 'Documents obligatoires',
    key: 'documents',
    prompts: [
      'Quels documents sont requis ?',
      'Combien de temps pour valider ?',
      'Mes documents sont-ils sécurisés ?',
    ]
  },
  3: {
    title: 'Plaque NFC SoloCab',
    key: 'nfc',
    prompts: [
      'À quoi sert la plaque NFC ?',
      'Comment fidéliser mes clients ?',
      'Comment utiliser le QR code ?',
    ]
  },
  4: {
    title: 'Bienvenue sur SoloCab !',
    key: 'complete',
    prompts: []
  }
};

const STEP_TIPS: Record<number, string> = {
  0: `💡 **Conseil tarifs** : Sur SoloCab, vous êtes maître de vos prix ! Commencez par les tarifs moyens de votre zone, puis ajustez selon la qualité de votre service. Des tarifs transparents = des clients qui reviennent.`,
  1: `📸 **Un profil complet = +40% de réservations** ! Les clients SoloCab recherchent des chauffeurs de confiance. Photo pro, description soignée et zones d'activité précises vous démarquent des plateformes anonymes.`,
  2: `📋 **Documents validés = accès complet** à votre espace SoloCab. Votre carte VTC, permis et pièce d'identité sont vérifiés manuellement pour garantir la confiance de vos futurs clients.`,
  3: `🏷️ **La plaque NFC** transforme chaque course en opportunité de fidélisation. Vos clients scannent et réservent directement — sans frais de transaction plateforme. C'est votre atout indépendance !`,
};

const STEP_BENEFITS: Record<number, string[]> = {
  0: [
    '🎯 Tarifs affichés sur votre profil public',
    '💶 Calcul automatique du prix des courses',
    '📊 Statistiques de revenus précises',
  ],
  1: [
    '\'🔍 Visible dans lannuaire SoloCab',
    '⭐ Confiance accrue des clients',
    '📱 Profil partageable par lien/QR',
    '🤝 Accès aux partenariats entreprises',
  ],
  2: [
    '✅ Accès complet au dashboard',
    '🔒 Clients rassurés sur votre légitimité',
    '📋 Conformité réglementaire garantie',
  ],
  3: [
    '🚀 Réservations directes sans frais de transaction',
    '💳 Paiements sécurisés intégrés',
    '📈 Fidélisation client automatique',
  ],
};

export function OnboardingAIAssistant({ 
  currentStep, 
  stepData, 
  driverName 
}: OnboardingAIAssistantProps) {
   const lang = 'fr';
   const assistant = motivationTranslations.assistant;
 
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const context = STEP_CONTEXTS[currentStep as keyof typeof STEP_CONTEXTS] || STEP_CONTEXTS[0];
  const tip = STEP_TIPS[currentStep];
  const benefits = STEP_BENEFITS[currentStep] || [];

  // Reset AI response when step changes
  useEffect(() => {
    setAiResponse(null);
    setActiveQuestion(null);
  }, [currentStep]);

  const askAI = useCallback(async (question: string) => {
    setIsLoading(true);
    setActiveQuestion(question);
    setAiResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('driver-coach-ai', {
        body: {
          type: 'strategy_advice',
          driverProfile: {
            experience: 'new',
            currentRevenue: 0,
            targetRevenue: 3000,
            currentClients: 0,
            targetClients: 10,
            workHoursPerDay: 8,
            workDaysPerWeek: 5,
            platformsUsed: [],
            soloCabPercentage: 0,
            mainGoal: 'independence',
            challenges: ['getting_started'],
          },
          specificQuestion: `${question} (Contexte: configuration onboarding SoloCab, étape "${context.title}")`,
        }
      });

      if (error) throw error;
      setAiResponse(data.message);
    } catch (error) {
      console.error('AI error:', error);
      setAiResponse('Désolé, je ne peux pas répondre pour le moment. Consultez notre FAQ ou contactez le support.');
    } finally {
      setIsLoading(false);
    }
  }, [context.title]);

  // Don't show on complete step
  if (currentStep === 4) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 mb-3">
      <CardContent className="p-3">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-primary to-accent rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold">Assistant IA</span>
              <Badge variant="outline" className="ml-2 text-[9px] px-1.5 py-0">
                {context.title}
              </Badge>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                {/* Tip Card */}
                {tip && (
                  <div className="bg-background/60 rounded-lg p-2.5 border border-primary/10">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {tip.replace(/\*\*(.*?)\*\*/g, '$1')}
                      </p>
                    </div>
                  </div>
                )}
 
                 {/* Assistant Intro */}
                 <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-2.5 border border-primary/10">
                   <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                     {assistant.intro[lang]}
                   </p>
                 </div>

                {/* Benefits */}
                {benefits.length > 0 && (
                  <div className="bg-background/40 rounded-lg p-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Avantages à compléter cette étape
                    </p>
                    <div className="space-y-1">
                      {benefits.map((benefit, index) => (
                        <p key={index} className="text-xs">
                          {benefit}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Questions */}
                {context.prompts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Questions fréquentes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {context.prompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => askAI(prompt)}
                          disabled={isLoading}
                          className={`h-7 text-[11px] px-2.5 ${
                            activeQuestion === prompt ? 'border-primary bg-primary/10' : ''
                          }`}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Response */}
                {(isLoading || aiResponse) && (
                  <div className="bg-background rounded-lg p-3 border">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Réflexion en cours...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-primary/80 uppercase">
                            Réponse de votre Coach IA
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => activeQuestion && askAI(activeQuestion)}
                            className="h-6 px-2 text-[10px]"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reformuler
                          </Button>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                          {aiResponse}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
