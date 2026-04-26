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

// ─── Célébrations milestones isolées (déclenchées hors rotation) ────────────
// Utilisées par useProactiveCoach quand un événement réel survient.
export const FIRST_SCAN_CELEBRATION: ProactiveMessage = {
  id: "first-qr-scan",
  type: "celebration",
  title: "🎯 Premier scan QR !",
  message:
    "Quelqu'un vient de scanner votre QR code SoloCab. C'est le tout début de votre clientèle privée — chaque scan est un client potentiel qui revient sans intermédiaire. Continuez à proposer votre QR à chaque course !",
  emoji: "📱",
  priority: "high",
  dismissable: true,
};

export const FIRST_SOLOCAB_COURSE_COMPLETED: ProactiveMessage = {
  id: "first-solocab-course-completed",
  type: "celebration",
  title: "🚗 Première course SoloCab terminée !",
  message:
    "Bravo, vous venez de terminer votre toute première course via SoloCab. Voici la réalité de votre rémunération : SoloCab prélève uniquement 0,50 € fixe par course (pas de pourcentage). Les frais Stripe (notre partenaire de paiement) s'ajoutent selon leur grille publique et sont gérés automatiquement. Le reste vous revient directement sur votre compte Stripe Connect, avec encaissement, virements et facturation 100 % automatisés. Vous fixez vos prix, et ce client peut devenir un client direct grâce à votre QR.",
  emoji: "🏆",
  priority: "high",
  dismissable: true,
};

// ─── Tips philosophie SoloCab — version 2026 ────────────────────────────────
//
// Réécriture complète après audit :
//   - Caractères cassés (\'lindépendance, Cest...) corrigés
//   - Suppression du faux "25% de commission" (la réalité = frais fixe)
//   - Frais standardisés : 0,50 € fixe par course, 0,25 €/chauffeur en course
//     partagée, 0,80 € pour une course spontanée (cf. mémoire fee-structure-v3)
//   - Messages alignés sur les fonctionnalités actuelles
//
export const SOLOCAB_EDUCATION_TIPS: ProactiveMessage[] = [
  {
    id: "philosophy-fair-fee",
    type: "education",
    title: "Une plateforme qui vous appartient",
    message:
      "SoloCab ne prend pas de pourcentage sur vos courses. Juste 0,50 € de frais fixe pour faire tourner la plateforme. Le reste est à vous.",
    emoji: "🎯",
    priority: "high",
  },
  {
    id: "qr-code-power",
    type: "tip",
    title: "Le pouvoir du QR Code",
    message:
      "Votre QR code est votre meilleur outil de fidélisation. Après chaque course, proposez-le à vos passagers : ils scannent, ils réservent directement avec vous la prochaine fois.",
    emoji: "📱",
    actionLabel: "Voir mon QR Code",
    priority: "high",
  },
  {
    id: "you-set-your-prices",
    type: "education",
    title: "Vous fixez vos tarifs",
    message:
      "Pas d'algorithme qui décide à votre place. Vous configurez vos prix selon vos villes, vos horaires et la qualité de service que vous offrez.",
    emoji: "💎",
    actionLabel: "Configurer mes tarifs",
    priority: "high",
  },
  {
    id: "partnership-network",
    type: "education",
    title: "Le réseau entre chauffeurs",
    message:
      "Indisponible mais un client compte sur vous ? Partagez la course avec un partenaire de confiance — frais réduit à 0,25 € par chauffeur impliqué. Tout le monde y gagne.",
    emoji: "🤝",
    actionLabel: "Découvrir les partenariats",
    priority: "medium",
  },
  {
    id: "premium-service",
    type: "tip",
    title: "La qualité fait la différence",
    message:
      "Les clients reviennent pour un service premium : eau fraîche, chargeur, propreté impeccable, ponctualité. Ces petits plus créent des clients à vie.",
    emoji: "⭐",
    priority: "medium",
  },
  {
    id: "recurring-clients",
    type: "tip",
    title: "Clients réguliers = revenus stables",
    message:
      "Un client récurrent (domicile-travail, école des enfants, aéroport) peut représenter plusieurs centaines d'euros de revenus mensuels prévisibles. Identifiez ces profils !",
    emoji: "🔄",
    priority: "medium",
  },
  {
    id: "no-surge-pricing",
    type: "education",
    title: "Pas de surge pricing",
    message:
      "Vos tarifs restent stables. Vos clients savent à quoi s'attendre — pas de mauvaise surprise, juste une relation de confiance qui dure.",
    emoji: "✨",
    priority: "low",
  },
  {
    id: "spontaneous-courses",
    type: "tip",
    title: "Les courses spontanées",
    message:
      "Quand un client vous hèle dans la rue, encaissez en quelques secondes via l'app : juste 0,80 € de frais — vous gardez le reste, et tout est tracé pour votre comptabilité.",
    emoji: "⚡",
    priority: "low",
  },
];

// ─── Générateur contextuel ──────────────────────────────────────────────────
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
  driverName?: string,
): ProactiveMessage | null {
  const hour = new Date().getHours();
  const name = driverName ? `${driverName}, ` : "";

  // Premier client direct → célébration
  if (stats.totalClients === 1) {
    return {
      id: "first-client",
      type: "celebration",
      title: "🎉 Votre premier client direct !",
      message:
        "Bravo ! Ce client est venu DIRECTEMENT chez vous, sans intermédiaire. Continuez à fidéliser avec votre QR code — c'est le début de votre indépendance.",
      emoji: "🏆",
      priority: "high",
    };
  }

  // Excellente journée
  if (stats.todayRevenue > 200 && hour >= 18) {
    return {
      id: "great-day",
      type: "celebration",
      title: `${name}journée exceptionnelle !`,
      message: `${stats.todayRevenue.toFixed(0)} € aujourd'hui. Bravo — vous valorisez votre travail comme il le mérite.`,
      emoji: "🔥",
      priority: "medium",
    };
  }

  // Suggestion partenariat (clients fidèles mais aucun partenaire)
  if (stats.partnershipsCount === 0 && stats.totalClients >= 5) {
    return {
      id: "suggest-partnership",
      type: "tip",
      title: "Pensez à votre réseau",
      message: `Avec ${stats.totalClients} clients fidèles, un partenariat peut vous éviter de perdre une course quand vous êtes indisponible. Frais partagé : 0,25 € par chauffeur.`,
      emoji: "🤝",
      actionLabel: "Découvrir les partenariats",
      priority: "medium",
    };
  }

  // Boost matinal
  if (hour >= 6 && hour < 10 && stats.todayCourses === 0) {
    return {
      id: "morning-boost",
      type: "reminder",
      title: `${name}prêt pour la journée ?`,
      message:
        "Chaque course est une occasion de fidéliser un nouveau client. N'oubliez pas votre QR code !",
      emoji: "☀️",
      priority: "low",
    };
  }

  // Progrès vers l'indépendance
  if (stats.soloCabPercentage >= 25 && stats.soloCabPercentage < 50) {
    return {
      id: "independence-progress",
      type: "milestone",
      title: "Vous progressez !",
      message: `${stats.soloCabPercentage.toFixed(0)} % de vos revenus viennent de clients directs. Encore un effort et vous bâtirez une vraie clientèle privée.`,
      emoji: "📈",
      priority: "medium",
    };
  }

  // Par défaut : aucun message contextuel — laisse la rotation des tips éducation gérer
  return null;
}

