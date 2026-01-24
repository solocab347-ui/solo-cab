import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Users, 
  TrendingUp, 
  Target,
  Zap,
  Crown,
  Medal,
  Award,
  Rocket,
  Heart,
  Sparkles,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Milestone {
  id: string;
  type: 'first_client' | 'first_course' | 'revenue_goal' | 'client_count' | 'independence' | 'partnership' | 'streak';
  title: string;
  description: string;
  icon: any;
  color: string;
  achieved: boolean;
  achievedAt?: string;
  progress?: number;
  target?: number;
  current?: number;
}

interface MilestoneTrackerProps {
  driverId: string;
  stats: {
    totalClients: number;
    totalCourses: number;
    totalRevenue: number;
    soloCabPercentage: number;
    streakDays: number;
    partnershipsCount: number;
  };
  onMilestoneAchieved?: (milestone: Milestone) => void;
}

export function MilestoneTracker({ driverId, stats, onMilestoneAchieved }: MilestoneTrackerProps) {
  const [newlyAchieved, setNewlyAchieved] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<Milestone | null>(null);

  // Define milestones based on current stats
  const milestones: Milestone[] = [
    {
      id: 'first_client',
      type: 'first_client',
      title: '🎉 Premier Client Privé !',
      description: 'Vous avez acquis votre premier client direct via SoloCab',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      achieved: stats.totalClients >= 1,
      target: 1,
      current: stats.totalClients,
    },
    {
      id: 'first_course',
      type: 'first_course',
      title: '🚗 Première Course !',
      description: 'Votre première course via SoloCab est terminée',
      icon: Zap,
      color: 'from-blue-500 to-cyan-500',
      achieved: stats.totalCourses >= 1,
      target: 1,
      current: stats.totalCourses,
    },
    {
      id: 'clients_10',
      type: 'client_count',
      title: '⭐ 10 Clients Fidèles',
      description: 'Vous avez constitué une base de 10 clients réguliers',
      icon: Star,
      color: 'from-amber-500 to-yellow-500',
      achieved: stats.totalClients >= 10,
      progress: Math.min((stats.totalClients / 10) * 100, 100),
      target: 10,
      current: stats.totalClients,
    },
    {
      id: 'clients_50',
      type: 'client_count',
      title: '👑 50 Clients - Expert',
      description: 'Un portefeuille client impressionnant !',
      icon: Crown,
      color: 'from-purple-500 to-violet-500',
      achieved: stats.totalClients >= 50,
      progress: Math.min((stats.totalClients / 50) * 100, 100),
      target: 50,
      current: stats.totalClients,
    },
    {
      id: 'revenue_1000',
      type: 'revenue_goal',
      title: '💰 1 000€ de CA',
      description: 'Premier palier de CA via clients directs',
      icon: TrendingUp,
      color: 'from-green-500 to-lime-500',
      achieved: stats.totalRevenue >= 1000,
      progress: Math.min((stats.totalRevenue / 1000) * 100, 100),
      target: 1000,
      current: stats.totalRevenue,
    },
    {
      id: 'revenue_5000',
      type: 'revenue_goal',
      title: '🚀 5 000€ de CA',
      description: 'Votre activité décolle !',
      icon: Rocket,
      color: 'from-orange-500 to-red-500',
      achieved: stats.totalRevenue >= 5000,
      progress: Math.min((stats.totalRevenue / 5000) * 100, 100),
      target: 5000,
      current: stats.totalRevenue,
    },
    {
      id: 'independence_25',
      type: 'independence',
      title: '🔓 25% Indépendant',
      description: '25% de votre CA vient de clients directs',
      icon: Target,
      color: 'from-teal-500 to-cyan-500',
      achieved: stats.soloCabPercentage >= 25,
      progress: Math.min((stats.soloCabPercentage / 25) * 100, 100),
      target: 25,
      current: stats.soloCabPercentage,
    },
    {
      id: 'independence_50',
      type: 'independence',
      title: '🏆 50% Indépendant',
      description: 'La moitié de votre activité est indépendante !',
      icon: Medal,
      color: 'from-indigo-500 to-purple-500',
      achieved: stats.soloCabPercentage >= 50,
      progress: Math.min((stats.soloCabPercentage / 50) * 100, 100),
      target: 50,
      current: stats.soloCabPercentage,
    },
    {
      id: 'independence_75',
      type: 'independence',
      title: '💎 75% Indépendant',
      description: 'Vous êtes presque totalement indépendant',
      icon: Award,
      color: 'from-pink-500 to-rose-500',
      achieved: stats.soloCabPercentage >= 75,
      progress: Math.min((stats.soloCabPercentage / 75) * 100, 100),
      target: 75,
      current: stats.soloCabPercentage,
    },
    {
      id: 'streak_7',
      type: 'streak',
      title: '🔥 Série de 7 jours',
      description: '7 jours consécutifs avec objectifs atteints',
      icon: Sparkles,
      color: 'from-orange-500 to-amber-500',
      achieved: stats.streakDays >= 7,
      progress: Math.min((stats.streakDays / 7) * 100, 100),
      target: 7,
      current: stats.streakDays,
    },
    {
      id: 'first_partnership',
      type: 'partnership',
      title: '🤝 Premier Partenariat',
      description: 'Vous avez établi votre premier partenariat chauffeur',
      icon: Heart,
      color: 'from-rose-500 to-pink-500',
      achieved: stats.partnershipsCount >= 1,
      target: 1,
      current: stats.partnershipsCount,
    },
    {
      id: 'network_5',
      type: 'partnership',
      title: '🌐 Réseau de 5 Partenaires',
      description: 'Votre réseau de partenaires grandit',
      icon: Gift,
      color: 'from-violet-500 to-purple-500',
      achieved: stats.partnershipsCount >= 5,
      progress: Math.min((stats.partnershipsCount / 5) * 100, 100),
      target: 5,
      current: stats.partnershipsCount,
    },
  ];

  const achievedMilestones = milestones.filter(m => m.achieved);
  const upcomingMilestones = milestones.filter(m => !m.achieved).slice(0, 3);

  // Celebration animation
  const celebrate = (milestone: Milestone) => {
    setCelebratingMilestone(milestone);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && celebratingMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-card p-8 rounded-2xl shadow-2xl max-w-sm mx-4 text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 1 }}
                className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${celebratingMilestone.color} flex items-center justify-center`}
              >
                <celebratingMilestone.icon className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">{celebratingMilestone.title}</h2>
              <p className="text-muted-foreground">{celebratingMilestone.description}</p>
              <div className="mt-4 flex justify-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ delay: i * 0.1, repeat: Infinity, duration: 0.5 }}
                  >
                    ⭐
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-amber-500" />
            Vos Succès
            <Badge variant="secondary" className="ml-auto">
              {achievedMilestones.length}/{milestones.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress 
            value={(achievedMilestones.length / milestones.length) * 100} 
            className="h-2 mb-4"
          />
          
          {achievedMilestones.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {achievedMilestones.map((milestone) => (
                <motion.div
                  key={milestone.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => celebrate(milestone)}
                  className={`aspect-square rounded-xl bg-gradient-to-br ${milestone.color} p-2 flex items-center justify-center cursor-pointer shadow-lg`}
                >
                  <milestone.icon className="w-6 h-6 text-white" />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Commencez votre aventure pour débloquer vos premiers succès !
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Prochains Objectifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMilestones.map((milestone) => (
              <div 
                key={milestone.id}
                className="p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${milestone.color} opacity-50 flex items-center justify-center`}>
                    <milestone.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{milestone.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{milestone.description}</p>
                  </div>
                  {milestone.target && milestone.current !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {milestone.current}/{milestone.target}
                    </Badge>
                  )}
                </div>
                {milestone.progress !== undefined && (
                  <Progress value={milestone.progress} className="h-1.5 mt-2" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
