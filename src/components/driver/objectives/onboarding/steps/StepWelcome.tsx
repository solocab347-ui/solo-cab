import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Users, 
  Brain,
  Rocket,
  AlertTriangle,
  Shield,
  HandHeart,
  Compass
} from 'lucide-react';

interface StepWelcomeProps {
  onSkip?: () => void;
}

export function StepWelcome({ onSkip }: StepWelcomeProps) {
  const commitments = [
    {
      icon: Shield,
      title: 'Votre indépendance',
      description: 'Libérez-vous des plateformes qui prennent vos commissions'
    },
    {
      icon: Users,
      title: 'Votre clientèle',
      description: 'Construisez une base de clients fidèles qui vous appartient'
    },
    {
      icon: Brain,
      title: 'Votre coach IA',
      description: 'Un assistant personnel pour vous guider pas à pas'
    },
    {
      icon: Target,
      title: 'Vos objectifs',
      description: 'Définissez et atteignez vos propres ambitions'
    }
  ];

  return (
    <div className="text-center space-y-6">
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
          Bienvenue sur SoloCab
        </Badge>
        
        <h1 className="text-2xl md:text-3xl font-bold">
          Devenez un <span className="text-primary">chauffeur indépendant</span>
        </h1>
      </motion.div>

      {/* Important Notice */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Alert className="bg-amber-500/10 border-amber-500/30 text-left">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600 dark:text-amber-400">Important :</strong> SoloCab ne vous donnera pas de courses. 
            Notre mission est de vous aider à <strong>construire votre propre clientèle</strong> et à vous 
            <strong> libérer définitivement des plateformes</strong> qui prennent vos commissions.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Philosophy Message */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4 text-left space-y-3"
      >
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-primary">La philosophie SoloCab</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Être vraiment indépendant, ça demande de l'<strong className="text-foreground">engagement</strong> et de la <strong className="text-foreground">persévérance</strong>. 
          Ce n'est pas facile, mais c'est <strong className="text-foreground">possible</strong>. 
          Nous sommes là pour vous donner tous les outils nécessaires et vous guider <strong className="text-foreground">pas à pas</strong> vers votre liberté.
        </p>
        <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
          <HandHeart className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-medium">Votre réussite est notre mission</span>
        </div>
      </motion.div>

      {/* Commitments Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        {commitments.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-3 rounded-xl bg-muted/50 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-xs">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="space-y-3 pt-2"
      >
        <p className="text-sm font-medium text-primary">
          Êtes-vous prêt à devenir maître de votre activité ?
        </p>
        
        {onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Configurer plus tard
          </Button>
        )}
      </motion.div>
    </div>
  );
}
