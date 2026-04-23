import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Users, 
  TrendingUp, 
  Shield, 
  Gift,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

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
    description: "Recevez des courses de vos partenaires et des frais de transaction sur les partages"
  },
  {
    icon: Shield,
    title: "Sécurisez votre activité",
    description: "Vos clients restent dans le réseau SoloCab, pas sur les plateformes"
  },
  {
    icon: Gift,
    title: "Avantages mutuels",
    description: "Frais de transaction réduite sur la première course d'un nouveau client partagé"
  }
];

export function PartnershipPromotion({ partnershipsCount, hasPartnerRequests }: PartnershipPromotionProps) {
  return (
    <Card className="bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 border-muted-foreground/20 overflow-hidden opacity-70">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-muted-foreground" />
            </div>
            Partenariats Chauffeurs
          </CardTitle>
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-background/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Bientôt disponible
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Info Coming Soon */}
        <div className="p-4 bg-muted/30 rounded-xl border border-muted-foreground/20">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Fonctionnalité en cours de développement</h4>
              <p className="text-xs text-muted-foreground/80 mt-1">
                Créez des partenariats avec d'autres chauffeurs VTC indépendants. 
                Partagez vos courses quand vous n'êtes pas disponible et recevez-en quand ils le sont !
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Grid - Preview */}
        <div className="grid grid-cols-2 gap-2">
          {BENEFITS.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-muted/20 rounded-lg border border-muted-foreground/10"
            >
              <benefit.icon className="w-5 h-5 text-muted-foreground/60 mb-2" />
              <h5 className="font-medium text-xs text-muted-foreground">{benefit.title}</h5>
              <p className="text-[10px] text-muted-foreground/70 mt-1">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Note */}
        <p className="text-xs text-center text-muted-foreground/60 pt-2">
          Nous vous informerons dès que cette fonctionnalité sera disponible 🚀
        </p>
      </CardContent>
    </Card>
  );
}
