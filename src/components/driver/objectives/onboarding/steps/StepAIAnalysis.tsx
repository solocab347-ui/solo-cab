import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle,
  Brain,
  Target,
  TrendingUp,
  Rocket,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OnboardingData } from '../OnboardingWizard';

interface StepAIAnalysisProps {
  data: OnboardingData;
  driverId: string;
  onComplete: (aiRecommendations: string) => void;
}

export function StepAIAnalysis({ data, driverId, onComplete }: StepAIAnalysisProps) {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const analyzeProfile = async () => {
    setStatus('analyzing');
    setProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const { data: response, error } = await supabase.functions.invoke('driver-coach-ai', {
        body: {
          type: 'onboarding_analysis',
          driverProfile: {
            experience: data.experience,
            currentRevenue: data.currentMonthlyRevenue,
            targetRevenue: data.targetMonthlyRevenue,
            currentClients: data.currentDirectClients,
            targetClients: data.targetDirectClients,
            workHoursPerDay: data.workHoursPerDay,
            workDaysPerWeek: data.workDaysPerWeek,
            platformsUsed: data.platformsUsed,
            soloCabPercentage: data.soloCabPercentage,
            mainGoal: data.mainGoal,
            challenges: data.challenges,
          }
        }
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (response?.error) {
        throw new Error(response.error);
      }

      setProgress(100);
      setAiResponse(response.message);
      setStatus('done');

    } catch (error) {
      clearInterval(progressInterval);
      console.error('AI analysis error:', error);
      setStatus('error');
      toast.error('Erreur lors de l\'analyse. Veuillez réessayer.');
    }
  };

  useEffect(() => {
    // Auto-start analysis when step is shown
    analyzeProfile();
  }, []);

  const renderAnalyzing = () => (
    <div className="text-center space-y-6 py-8">
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
        className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center"
      >
        <Brain className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
        <p className="text-muted-foreground">
          Notre IA analyse votre profil et prépare un plan personnalisé
        </p>
      </div>

      <div className="max-w-xs mx-auto">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
      </div>

      <div className="flex justify-center gap-2">
        <Badge variant="outline" className="animate-pulse">
          <Sparkles className="w-3 h-3 mr-1" />
          Analyse des objectifs
        </Badge>
        <Badge variant="outline" className="animate-pulse delay-100">
          <Target className="w-3 h-3 mr-1" />
          Calcul du plan
        </Badge>
      </div>
    </div>
  );

  const renderDone = () => (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4"
        >
          <CheckCircle className="w-8 h-8 text-green-500" />
        </motion.div>
        <h2 className="text-xl font-bold mb-2">Analyse terminée !</h2>
        <p className="text-muted-foreground">
          Votre coach IA a préparé un plan d'action personnalisé
        </p>
      </div>

      {/* AI Response */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Recommandations de votre Coach IA</span>
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {aiResponse}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={analyzeProfile}
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Nouvelle analyse
        </Button>
        <Button
          onClick={() => onComplete(aiResponse)}
          className="flex-1 bg-gradient-to-r from-primary to-accent"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Commencer avec ce plan
        </Button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive" />
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-2">Oups, une erreur est survenue</h2>
        <p className="text-muted-foreground">
          Impossible de générer l'analyse. Veuillez réessayer.
        </p>
      </div>

      <Button onClick={analyzeProfile}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Réessayer
      </Button>
    </div>
  );

  return (
    <div>
      {status === 'analyzing' && renderAnalyzing()}
      {status === 'done' && renderDone()}
      {status === 'error' && renderError()}
      {status === 'idle' && renderAnalyzing()}
    </div>
  );
}
