import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Users, 
  Brain,
  Rocket
} from 'lucide-react';

interface StepWelcomeProps {
  onSkip?: () => void;
}

export function StepWelcome({ onSkip }: StepWelcomeProps) {
  const features = [
    {
      icon: Target,
      title: 'Objectifs personnalisés',
      description: 'Définissez vos objectifs de CA, clients et temps de travail'
    },
    {
      icon: Brain,
      title: 'Coach IA intelligent',
      description: 'Recevez des conseils quotidiens adaptés à votre profil'
    },
    {
      icon: TrendingUp,
      title: 'Suivi en temps réel',
      description: 'Visualisez votre progression vers l\'indépendance'
    },
    {
      icon: Users,
      title: 'Acquisition clients',
      description: 'Stratégies pour fidéliser vos clients directs'
    }
  ];

  return (
    <div className="text-center space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
          <Rocket className="w-10 h-10 text-white" />
        </div>
        
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Sparkles className="w-3 h-3 mr-1" />
          Assistant IA activé
        </Badge>
        
        <h1 className="text-2xl md:text-3xl font-bold">
          Bienvenue dans votre <span className="text-primary">Centre d'Objectifs</span>
        </h1>
        
        <p className="text-muted-foreground max-w-md mx-auto">
          En quelques minutes, configurez vos objectifs et laissez notre IA vous accompagner 
          vers l'indépendance et la réussite.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4 max-w-lg mx-auto"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="p-4 rounded-xl bg-muted/50 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Skip Option */}
      {onSkip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Configurer plus tard
          </Button>
        </motion.div>
      )}
    </div>
  );
}
