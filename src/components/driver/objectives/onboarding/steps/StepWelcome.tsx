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
 import { motivationTranslations } from '@/lib/i18n/translations/motivation';

interface StepWelcomeProps {
  onSkip?: () => void;
}

export function StepWelcome({ onSkip }: StepWelcomeProps) {
   const lang = 'fr'; // TODO: get from context
   const vision = motivationTranslations.vision;
   const signatures = motivationTranslations.signatures;
 
  const commitments = [
    {
      icon: Shield,
      title: 'Votre indépendance',
      description: 'Libérez-vous des plateformes qui prennent vos frais de transaction'
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
    <div className="text-center space-y-4 sm:space-y-6 px-1">
      {/* Hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-3 sm:space-y-4"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
          <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
           {vision.title[lang]}
        </Badge>
        
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Devenez un <span className="text-primary">chauffeur indépendant</span>
        </h1>
      </motion.div>

       {/* Vision Description */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
         <div className="bg-card/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 text-left">
           <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
             {vision.description[lang]}
           </p>
         </div>
      </motion.div>

       {/* Responsibility Message */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
         className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-left"
      >
         <div className="flex items-start gap-2 sm:gap-3">
           <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-xs sm:text-sm font-medium text-foreground whitespace-pre-line leading-tight">
             {vision.responsibility[lang]}
           </p>
        </div>
       </motion.div>
 
       {/* Signature Quote */}
       <motion.div
         initial={{ y: 20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.35 }}
         className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-lg sm:rounded-xl p-3 sm:p-4"
       >
         <div className="flex items-center gap-2 justify-center">
           <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
           <p className="text-xs sm:text-sm font-semibold text-primary italic">
             "{signatures.partnership[lang]}"
           </p>
        </div>
      </motion.div>

      {/* Commitments Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-2 sm:gap-3"
      >
        {commitments.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50 text-left"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5 sm:mb-2">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-[11px] sm:text-xs">{item.title}</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="space-y-2 sm:space-y-3 pt-1 sm:pt-2"
      >
        <p className="text-xs sm:text-sm font-medium text-primary">
          Êtes-vous prêt à devenir maître de votre activité ?
        </p>
        
        {onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground text-xs">
            Configurer plus tard
          </Button>
        )}
      </motion.div>
    </div>
  );
}
