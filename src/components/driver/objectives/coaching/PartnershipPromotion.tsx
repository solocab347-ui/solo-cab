import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Users, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  Sparkles,
  Gift,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PartnershipPromotionProps {
  partnershipsCount: number;
  hasPartnerRequests: boolean;
}

const BENEFITS = [
  {
    icon: Users,
    title: "Partagez vos courses",
    description: "Redirigez vos clients vers un partenaire de confiance quand vous n'êtes pas disponible"
  },
  {
    icon: TrendingUp,
    title: "Augmentez vos revenus",
    description: "Recevez des courses de vos partenaires et des commissions sur les partages"
  },
  {
    icon: Shield,
    title: "Sécurisez votre activité",
    description: "Vos clients restent dans le réseau SoloCab, pas sur les plateformes"
  },
  {
    icon: Gift,
    title: "Avantages mutuels",
    description: "Commission réduite sur la première course d'un nouveau client partagé"
  }
];

const STEPS = [
  "Recherchez des chauffeurs dans votre zone",
  "Envoyez une demande de partenariat",
  "Définissez les conditions (commission, zone)",
  "Validez mutuellement le partenariat",
  "Commencez à partager vos courses !"
];

export function PartnershipPromotion({ partnershipsCount, hasPartnerRequests }: PartnershipPromotionProps) {
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  const goToPartnerships = () => {
    navigate('/chauffeur?tab=partners');
  };

  return (
    <Card className="bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-purple-500/10 border-rose-500/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-white" />
            </div>
            Partenariats Chauffeurs
          </CardTitle>
          {hasPartnerRequests && (
            <Badge className="bg-rose-500 animate-pulse">
              Nouvelles demandes
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
          <div>
            <p className="text-2xl font-bold">{partnershipsCount}</p>
            <p className="text-xs text-muted-foreground">Partenaire{partnershipsCount !== 1 ? 's' : ''} actif{partnershipsCount !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={goToPartnerships} className="gap-2">
            {partnershipsCount > 0 ? 'Gérer' : 'Découvrir'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Promotion for new users */}
        {partnershipsCount === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="p-4 bg-gradient-to-r from-rose-500/20 to-purple-500/20 rounded-xl border border-rose-500/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Développez votre réseau d'entraide</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créez des partenariats avec d'autres chauffeurs VTC indépendants. 
                    Partagez vos courses quand vous n'êtes pas disponible et recevez-en quand ils le sont !
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-2">
              {BENEFITS.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 bg-muted/50 rounded-lg"
                >
                  <benefit.icon className="w-5 h-5 text-primary mb-2" />
                  <h5 className="font-medium text-xs">{benefit.title}</h5>
                  <p className="text-[10px] text-muted-foreground mt-1">{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            {/* How it works */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-between text-muted-foreground"
            >
              Comment ça marche ?
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    {STEPS.map((step, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <Button 
              onClick={goToPartnerships}
              className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600"
            >
              <Handshake className="w-4 h-4 mr-2" />
              Trouver des partenaires
            </Button>
          </motion.div>
        )}

        {/* Existing partnerships summary */}
        {partnershipsCount > 0 && (
          <div className="space-y-3">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Réseau actif</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vous pouvez partager vos courses avec {partnershipsCount} chauffeur{partnershipsCount > 1 ? 's' : ''} de confiance
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={goToPartnerships}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Voir mes partenaires
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
