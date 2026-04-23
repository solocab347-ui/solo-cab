import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  X, 
  Sparkles, 
  Target, 
  TrendingUp,
  Users,
  Handshake,
  Lightbulb,
  ArrowRight,
  Gift,
  Zap,
  Heart,
  MessageCircle
} from 'lucide-react';

export interface ProactiveMessage {
  id: string;
  type: 'welcome' | 'tip' | 'celebration' | 'reminder' | 'education' | 'milestone';
  title: string;
  message: string;
  emoji?: string;
  actionLabel?: string;
  actionCallback?: () => void;
  dismissable?: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface ProactiveCoachPopupProps {
  message: ProactiveMessage | null;
  onDismiss: () => void;
  onAction?: () => void;
  driverName?: string;
}

export function ProactiveCoachPopup({ 
  message, 
  onDismiss, 
  onAction,
  driverName 
}: ProactiveCoachPopupProps) {
  if (!message) return null;

  const typeStyles = {
    welcome: 'from-primary/20 to-accent/20 border-primary/40',
    tip: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40',
    celebration: 'from-green-500/20 to-emerald-500/20 border-green-500/40',
    reminder: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
    education: 'from-purple-500/20 to-violet-500/20 border-purple-500/40',
    milestone: 'from-rose-500/20 to-pink-500/20 border-rose-500/40'
  };

  const typeIcons = {
    welcome: Bot,
    tip: Lightbulb,
    celebration: Gift,
    reminder: Target,
    education: Sparkles,
    milestone: TrendingUp
  };

  const Icon = typeIcons[message.type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-md"
      >
        <Card className={`overflow-hidden bg-gradient-to-br ${typeStyles[message.type]} backdrop-blur-xl shadow-2xl`}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg flex-shrink-0"
              >
                <Icon className="w-6 h-6 text-white" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                    <Bot className="w-3 h-3 mr-1" />
                    Coach IA
                  </Badge>
                  {message.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      <Zap className="w-3 h-3 mr-1" />
                      Important
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {message.emoji && <span>{message.emoji}</span>}
                  {message.title}
                </h3>
                
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {message.message}
                </p>
              </div>

              {message.dismissable !== false && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 opacity-60 hover:opacity-100"
                  onClick={onDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Action Button */}
            {message.actionLabel && (
              <motion.div 
                className="mt-4 flex gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  onClick={() => {
                    message.actionCallback?.();
                    onAction?.();
                    onDismiss();
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {message.actionLabel}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {message.dismissable !== false && (
                  <Button 
                    variant="outline" 
                    onClick={onDismiss}
                    className="px-4"
                  >
                    Plus tard
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Education tips about SoloCab philosophy
export const SOLOCAB_EDUCATION_TIPS: ProactiveMessage[] = [
  {
    id: 'solocab-philosophy',
    type: 'education',
    title: 'La philosophie SoloCab',
    message: 'SoloCab vous aide à reprendre le contrôle de votre activité. Finis les algorithmes qui décident pour vous ! Ici, vous fixez VOS tarifs, vous choisissez VOS clients.',
    emoji: '🎯',
    priority: 'high'
  },
  {
    id: 'independence-goal',
    type: 'education',
    title: '\'Votre objectif : lindépendance',
    message: '\'Chaque client direct que vous fidélisez, cest une course sans frais de transaction à 25% ! En développant votre clientèle privée, vous gardez 100% de vos revenus.',
    emoji: '💰',
    priority: 'high'
  },
  {
    id: 'qr-code-power',
    type: 'tip',
    title: 'Le pouvoir du QR Code',
    message: '\'Votre QR Code est votre meilleur outil ! Après chaque course, proposez-le à vos clients satisfaits. Cest simple : ils scannent, ils réservent directement avec vous.',
    emoji: '📱',
    actionLabel: 'Voir mon QR Code',
    priority: 'medium'
  },
  {
    id: 'partnership-benefits',
    type: 'education',
    title: 'Les partenariats entre chauffeurs',
    message: '\'Vous êtes indisponible mais un client fidèle a besoin dune course ? Redirigez-le vers un partenaire de confiance et recevez des frais de transaction. Tout le monde gagne !',
    emoji: '🤝',
    actionLabel: 'Découvrir les partenariats',
    priority: 'medium'
  },
  {
    id: 'premium-service',
    type: 'tip',
    title: 'La qualité fait la différence',
    message: 'Les clients choisissent SoloCab pour un service premium. Eau fraîche, chargeur, propreté impeccable... Ces petits plus fidélisent vos clients à vie !',
    emoji: '⭐',
    priority: 'low'
  },
  {
    id: 'pricing-freedom',
    type: 'education',
    title: 'Vous fixez vos tarifs',
    message: '\'\'Contrairement aux plateformes, cest VOUS qui décidez de vos prix. Un service premium mérite une tarification juste. Nayez pas peur de valoriser votre travail !',
    emoji: '💎',
    actionLabel: 'Configurer mes tarifs',
    priority: 'high'
  },
  {
    id: 'recurring-clients',
    type: 'tip',
    title: 'Clients récurrents = revenus stables',
    message: 'Un client régulier (trajet domicile-travail, école des enfants...) peut représenter 500€+ par mois de revenus garantis. Identifiez ces profils !',
    emoji: '🔄',
    priority: 'medium'
  },
  {
    id: 'no-surge-pricing',
    type: 'education',
    title: 'Pas de surge pricing',
    message: 'Vos clients apprécient la stabilité de vos tarifs. Contrairement à Uber, pas de mauvaise surprise pour eux, et une relation de confiance qui se construit.',
    emoji: '✨',
    priority: 'low'
  }
];

// Context-aware message generator
export function generateContextualMessage(
  stats: {
    todayRevenue: number;
    todayCourses: number;
    weekRevenue: number;
    monthRevenue: number;
    totalClients: number;
    streakDays: number;
    hasObjectives: boolean;
    soloCabPercentage: number;
    partnershipsCount: number;
  },
  driverName?: string
): ProactiveMessage | null {
  const hour = new Date().getHours();
  const name = driverName ? `${driverName}, ` : '';

  // Note: Les objectifs sont maintenant remplis à l'inscription, donc on ne demande plus de les définir
  // Priority 1: No objectives set - DÉSACTIVÉ car remplis à l'onboarding
  // if (!stats.hasObjectives) { ... }
  // Priority 2: First client celebration
  if (stats.totalClients === 1) {
    return {
      id: 'first-client',
      type: 'celebration',
      title: '🎉 Votre premier client direct !',
      message: '\'\'\'Cest le début de votre indépendance ! Ce client, cest une course sans frais de transaction. Continuez à fidéliser, et bientôt vous naurez plus besoin des plateformes.',
      emoji: '🏆',
      priority: 'high'
    };
  }

  // Priority 3: Great day celebration
  if (stats.todayRevenue > 200 && hour >= 18) {
    return {
      id: 'great-day',
      type: 'celebration',
      title: `${name}Journée exceptionnelle !`,
      message: `${stats.todayRevenue.toFixed(0)}€ aujourd'hui, c'est impressionnant ! Vous êtes sur la bonne voie pour atteindre l'indépendance.`,
      emoji: '🔥',
      priority: 'medium'
    };
  }

  // Priority 4: Partnership suggestion if none
  if (stats.partnershipsCount === 0 && stats.totalClients >= 5) {
    return {
      id: 'suggest-partnership',
      type: 'tip',
      title: 'Développez votre réseau !',
      message: `Avec ${stats.totalClients} clients fidèles, pensez aux partenariats ! Si vous êtes indisponible, un partenaire peut prendre vos courses et vous reversez une petite frais de transaction.`,
      emoji: '🤝',
      actionLabel: 'Découvrir les partenariats',
      priority: 'medium'
    };
  }

  // Priority 5: Morning motivation
  if (hour >= 6 && hour < 10 && stats.todayCourses === 0) {
    return {
      id: 'morning-boost',
      type: 'reminder',
      title: `${name}Prêt pour une nouvelle journée ?`,
      message: '\'Chaque course est une opportunité de fidéliser un nouveau client. Noubliez pas votre QR Code !',
      emoji: '☀️',
      priority: 'low'
    };
  }

  // Priority 6: Independence progress
  if (stats.soloCabPercentage >= 25 && stats.soloCabPercentage < 50) {
    return {
      id: 'independence-progress',
      type: 'milestone',
      title: '\'Vous progressez vers lindépendance !',
      message: `${stats.soloCabPercentage.toFixed(0)}% de vos revenus viennent de clients directs. Encore un effort et vous réduirez drastiquement votre dépendance aux plateformes !`,
      emoji: '📈',
      priority: 'medium'
    };
  }

  // Default: Random education tip
  const randomTip = SOLOCAB_EDUCATION_TIPS[Math.floor(Math.random() * SOLOCAB_EDUCATION_TIPS.length)];
  return randomTip;
}
