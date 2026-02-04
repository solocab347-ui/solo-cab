import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { NumericInput } from '@/components/ui/numeric-input';
import { 
  ArrowRight, 
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  Smartphone,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingGoalsStepProps {
  driverId: string;
  onComplete: () => void;
}

const GOALS_STEPS = [
  { id: 'current', title: 'Aujourd\'hui' },
  { id: 'revenue', title: 'Objectif CA' },
  { id: 'clients', title: 'Clients' },
  { id: 'time', title: 'Rythme' },
];

const SWIPE_THRESHOLD = 50;

// Coach advice system
const getCoachAdvice = (
  currentRevenue: number,
  targetRevenue: number,
  currentClients: number,
  targetClients: number,
  platformPercentage: number
) => {
  const revenueGrowth = targetRevenue > 0 && currentRevenue > 0 
    ? ((targetRevenue - currentRevenue) / currentRevenue) * 100 
    : 0;
  const clientGrowth = targetClients - currentClients;
  const solocabPercentage = 100 - platformPercentage;
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check revenue growth
  if (revenueGrowth > 100) {
    warnings.push(`Doubler ton CA en 1 mois via le privé, c'est très ambitieux ! 📊`);
    suggestions.push(`Je te suggère de viser +30-50% d'abord, on ajustera à la hausse ensuite.`);
  } else if (revenueGrowth > 50 && currentRevenue > 0) {
    suggestions.push(`+${Math.round(revenueGrowth)}% de croissance, c'est faisable avec de l'engagement ! 💪`);
  }
  
  // Check client acquisition
  if (currentClients === 0 && targetClients > 20) {
    warnings.push(`Passer de 0 à ${targetClients} clients en quelques semaines, c'est très ambitieux.`);
    suggestions.push(`La confiance client se construit petit à petit. Commence par viser 10-15 clients réguliers.`);
  } else if (clientGrowth > 30 && currentClients > 0) {
    warnings.push(`+${clientGrowth} nouveaux clients d'un coup, ça demande beaucoup d'énergie !`);
    suggestions.push(`Je te conseille de viser +10-15 clients d'abord.`);
  } else if (clientGrowth > 15 && currentClients === 0) {
    // Acceptable for beginners
    suggestions.push(`${targetClients} clients fidèles en objectif, c'est réaliste avec du travail ! 🎯`);
  }
  
  // Check platform dependency target
  if (solocabPercentage > 50 && platformPercentage > 70) {
    warnings.push(`Passer de ${platformPercentage}% plateformes à ${solocabPercentage}% privé rapidement, c'est un grand saut.`);
    suggestions.push(`Vise 30-40% de privé d'abord, puis augmente progressivement.`);
  }
  
  return { warnings, suggestions };
};

export function OnboardingGoalsStep({ driverId, onComplete }: OnboardingGoalsStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);

  // Current situation data
  const [currentRevenue, setCurrentRevenue] = useState(0);
  const [currentRevenueValue, setCurrentRevenueValue] = useState('');
  const [currentClients, setCurrentClients] = useState(0);
  const [currentClientsValue, setCurrentClientsValue] = useState('');
  const [platformPercentage, setPlatformPercentage] = useState(80);

  // Goals data
  const [targetRevenue, setTargetRevenue] = useState(5000);
  const [revenueValue, setRevenueValue] = useState('5000');
  const [targetClients, setTargetClients] = useState(15);
  const [clientsValue, setClientsValue] = useState('15');
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);

  // Coach advice state
  const [coachAdvice, setCoachAdvice] = useState<{ warnings: string[]; suggestions: string[] }>({ warnings: [], suggestions: [] });

  // Update coach advice when values change
  useEffect(() => {
    const advice = getCoachAdvice(currentRevenue, targetRevenue, currentClients, targetClients, platformPercentage);
    setCoachAdvice(advice);
  }, [currentRevenue, targetRevenue, currentClients, targetClients, platformPercentage]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Current situation has defaults
      case 1: return targetRevenue >= 1000;
      case 2: return targetClients >= 5;
      case 3: return workHoursPerDay >= 4 && workDaysPerWeek >= 3;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < GOALS_STEPS.length - 1 && canProceed()) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === GOALS_STEPS.length - 1) {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;

    if (swipe > SWIPE_THRESHOLD || velocity > 500) {
      prevStep();
    } else if ((swipe < -SWIPE_THRESHOLD || velocity < -500) && canProceed()) {
      nextStep();
    }
  };

  const handleCurrentRevenueChange = (value: string) => {
    setCurrentRevenueValue(value);
    const numValue = parseInt(value) || 0;
    setCurrentRevenue(numValue);
  };

  const handleCurrentClientsChange = (value: string) => {
    setCurrentClientsValue(value);
    const numValue = parseInt(value) || 0;
    setCurrentClients(numValue);
  };

  const handleRevenueChange = (value: string) => {
    setRevenueValue(value);
    const numValue = parseInt(value) || 0;
    setTargetRevenue(numValue);
  };

  const handleClientsChange = (value: string) => {
    setClientsValue(value);
    const numValue = parseInt(value) || 0;
    setTargetClients(numValue);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const totalHoursMonthly = workHoursPerDay * workDaysPerWeek * 4;
      const estimatedHourlyTarget = Math.round(targetRevenue / totalHoursMonthly);
      const solocabPercentage = 100 - platformPercentage;

      // Fetch existing objectives_data to merge
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const existingData = (existingDriver?.objectives_data as Record<string, unknown>) || {};

      await supabase
        .from('drivers')
        .update({
          onboarding_step: 'settings', // Sauvegarder la prochaine étape
          objectives_data: {
            ...existingData,
            // Current situation
            current_monthly_revenue: currentRevenue,
            current_direct_clients: currentClients,
            platform_percentage: platformPercentage,
            solocab_percentage: solocabPercentage,
            // Targets
            target_monthly_revenue: targetRevenue,
            target_direct_clients: targetClients,
            work_hours_per_day: workHoursPerDay,
            work_days_per_week: workDaysPerWeek,
            estimated_hourly_target: estimatedHourlyTarget,
            // Meta
            goals_completed_at: new Date().toISOString()
          }
        })
        .eq('id', driverId);

      toast.success('Tes objectifs sont enregistrés !');
      onComplete();
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  // Calculate estimates
  const totalHoursPerMonth = workHoursPerDay * workDaysPerWeek * 4;
  const estimatedHourlyTarget = totalHoursPerMonth > 0 ? Math.round(targetRevenue / totalHoursPerMonth) : 0;
  const estimatedPerClient = targetClients > 0 ? Math.round(targetRevenue / targetClients) : 0;
  const solocabPercentage = 100 - platformPercentage;

  const renderCoachFeedback = () => {
    if (coachAdvice.warnings.length === 0 && coachAdvice.suggestions.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-xl p-3 border",
          coachAdvice.warnings.length > 0 
            ? "bg-amber-500/10 border-amber-500/20" 
            : "bg-emerald-500/10 border-emerald-500/20"
        )}
      >
        <div className="flex items-start gap-2">
          {coachAdvice.warnings.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1">
            {coachAdvice.warnings.map((warning, i) => (
              <p key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {warning}
              </p>
            ))}
            {coachAdvice.suggestions.map((suggestion, i) => (
              <p key={`s-${i}`} className="text-xs text-foreground/80">
                💡 {suggestion}
              </p>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-3"
              >
                <TrendingUp className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ta situation aujourd'hui
              </h2>
              <p className="text-sm text-muted-foreground">
                D'où tu pars pour mieux te guider
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              {/* Current revenue */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CA mensuel actuel</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <NumericInput
                    value={currentRevenueValue}
                    onChange={handleCurrentRevenueChange}
                    allowEmpty={true}
                    min={0}
                    max={30000}
                    className="text-2xl font-bold text-center w-28"
                    placeholder="0"
                  />
                  <span className="text-lg text-muted-foreground">€/mois</span>
                </div>
              </div>

              {/* Current clients */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Clients directs actuels</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <NumericInput
                    value={currentClientsValue}
                    onChange={handleCurrentClientsChange}
                    allowEmpty={true}
                    min={0}
                    max={200}
                    className="text-2xl font-bold text-center w-20"
                    placeholder="0"
                  />
                  <span className="text-lg text-muted-foreground">clients</span>
                </div>
              </div>

              {/* Platform dependency */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">Dépendance plateformes</span>
                  </div>
                  <span className="text-lg font-bold text-destructive">{platformPercentage}%</span>
                </div>
                <Slider
                  value={[platformPercentage]}
                  onValueChange={([v]) => setPlatformPercentage(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-destructive"
                    animate={{ width: `${platformPercentage}%` }}
                  />
                  <motion.div 
                    className="bg-primary"
                    animate={{ width: `${solocabPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span className="text-destructive">Apps: {platformPercentage}%</span>
                  <span className="text-primary">Privé: {solocabPercentage}%</span>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">Alex :</span> Pas de jugement, on part d'où tu es. L'important c'est où tu veux aller ! 🚀
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3"
              >
                <Target className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ton objectif de revenus
              </h2>
              <p className="text-sm text-muted-foreground">
                Combien veux-tu générer avec ta clientèle privée ?
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <NumericInput
                    value={revenueValue}
                    onChange={handleRevenueChange}
                    allowEmpty={true}
                    min={1000}
                    max={20000}
                    className="text-2xl font-bold text-center w-32"
                  />
                  <span className="text-xl font-semibold text-muted-foreground">€/mois</span>
                </div>
                
                <Slider
                  value={[targetRevenue]}
                  onValueChange={([v]) => {
                    setTargetRevenue(v);
                    setRevenueValue(v.toString());
                  }}
                  min={1000}
                  max={20000}
                  step={250}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>1 000€</span>
                  <span>20 000€</span>
                </div>
              </div>

              {currentRevenue > 0 && targetRevenue > currentRevenue && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    📈 +{Math.round(((targetRevenue - currentRevenue) / currentRevenue) * 100)}% de croissance visée
                  </p>
                </div>
              )}

              {renderCoachFeedback()}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3"
              >
                <Users className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ton objectif clients
              </h2>
              <p className="text-sm text-muted-foreground">
                Combien de clients fidèles veux-tu avoir ?
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <NumericInput
                    value={clientsValue}
                    onChange={handleClientsChange}
                    allowEmpty={true}
                    min={5}
                    max={100}
                    className="text-2xl font-bold text-center w-24"
                  />
                  <span className="text-xl font-semibold text-muted-foreground">clients</span>
                </div>
                
                <Slider
                  value={[targetClients]}
                  onValueChange={([v]) => {
                    setTargetClients(v);
                    setClientsValue(v.toString());
                  }}
                  min={5}
                  max={100}
                  step={5}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>5 clients</span>
                  <span>100 clients</span>
                </div>
              </div>

              {estimatedPerClient > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    📊 ~{estimatedPerClient}€ de CA moyen par client/mois
                  </p>
                </div>
              )}

              {renderCoachFeedback()}

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">Alex :</span> Un client fidèle vaut 3 à 5 fois plus qu'une course plateforme. Mieux vaut 15 bons clients que 50 qui commandent une fois !
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-3"
              >
                <Clock className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ton rythme de travail
              </h2>
              <p className="text-sm text-muted-foreground">
                Définis ton équilibre idéal
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              {/* Hours per day */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Heures par jour</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{workHoursPerDay}h</span>
                </div>
                <Slider
                  value={[workHoursPerDay]}
                  onValueChange={([v]) => setWorkHoursPerDay(v)}
                  min={4}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>4h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Days per week */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Jours par semaine</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{workDaysPerWeek}j</span>
                </div>
                <Slider
                  value={[workDaysPerWeek]}
                  onValueChange={([v]) => setWorkDaysPerWeek(v)}
                  min={3}
                  max={7}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>3 jours</span>
                  <span>7 jours</span>
                </div>
              </div>

              {/* Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Récapitulatif</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold text-primary">~{estimatedHourlyTarget}€/h</p>
                    <p className="text-[10px] text-muted-foreground">Objectif horaire</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-500">{totalHoursPerMonth}h</p>
                    <p className="text-[10px] text-muted-foreground">Par mois</p>
                  </div>
                </div>
              </motion.div>

              {/* Complete button */}
              <Button
                onClick={handleComplete}
                disabled={saving || !canProceed()}
                size="lg"
                className="w-full"
              >
                {saving ? 'Enregistrement...' : 'Valider mes objectifs'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Progress dots */}
      <div className="flex-shrink-0 flex justify-center gap-2 py-3">
        {GOALS_STEPS.map((step, i) => (
          <div 
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-emerald-500" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-y-auto relative px-4 pb-4"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
            className="flex flex-col min-h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {currentStep > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < GOALS_STEPS.length - 1 && canProceed() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation - only for non-final steps */}
      {currentStep < GOALS_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-3 px-4 py-3 border-t border-border/50 bg-background">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 h-11"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-11"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
