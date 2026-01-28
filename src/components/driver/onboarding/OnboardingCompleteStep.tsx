import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  CheckCircle2, 
  Target,
  Loader2,
  Rocket,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

interface OnboardingCompleteStepProps {
  onComplete: () => void;
  loading: boolean;
}

export function OnboardingCompleteStep({ onComplete, loading }: OnboardingCompleteStepProps) {
  return (
    <div className="text-center space-y-4 py-2">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center"
      >
        <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-xl font-bold">Félicitations ! 🎉</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Votre inscription est presque complète
        </p>
      </motion.div>

      {/* What's next */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-2"
      >
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-primary/20 rounded-lg shrink-0">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Coach IA dédié</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Votre assistant vous aidera à développer votre clientèle privée.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-muted rounded-lg shrink-0">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Validation documents</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vérification sous 24-48h. Notification dès validation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-muted rounded-lg shrink-0">
                <Rocket className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm">Accès complet</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  QR codes, calculateur de prix, statistiques, et plus.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="pt-2"
      >
        <Button 
          onClick={onComplete} 
          disabled={loading}
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 h-12"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Accéder à mon espace
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
