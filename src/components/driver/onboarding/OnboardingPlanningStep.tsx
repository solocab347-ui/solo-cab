import { useState, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
  Check,
  Smartphone,
  UserCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingPlanningStepProps {
  driverId: string;
  onComplete: () => void;
}

const PLANNING_STEPS = [
  { id: 'split', title: 'Répartition' },
  { id: 'days', title: 'Jours & Horaires' },
  { id: 'targets', title: 'Objectifs' },
];

const DAYS_OF_WEEK = [
  { id: 'lundi', label: 'Lun', weight: 0.7 },
  { id: 'mardi', label: 'Mar', weight: 0.85 },
  { id: 'mercredi', label: 'Mer', weight: 0.95 },
  { id: 'jeudi', label: 'Jeu', weight: 0.95 },
  { id: 'vendredi', label: 'Ven', weight: 1.15 },
  { id: 'samedi', label: 'Sam', weight: 1.2 },
  { id: 'dimanche', label: 'Dim', weight: 1.2 },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingPlanningStep({ driverId, onComplete }: OnboardingPlanningStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Platform vs SoloCab split
  const [platformPercentage, setPlatformPercentage] = useState(70); // Starting dependent on platforms
  const [targetWeeklyRevenue, setTargetWeeklyRevenue] = useState(1250); // Will be loaded from goals

  // Step 2: Selected work days
  const [selectedDays, setSelectedDays] = useState<string[]>(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);

  // Calculate SoloCab percentage
  const solocabPercentage = 100 - platformPercentage;

  // Calculate weekly targets
  const platformWeeklyTarget = Math.round(targetWeeklyRevenue * platformPercentage / 100);
  const solocabWeeklyTarget = Math.round(targetWeeklyRevenue * solocabPercentage / 100);

  // Calculate daily targets with AI weighting
  const dailyTargets = useMemo(() => {
    const selectedDayData = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.id));
    const totalWeight = selectedDayData.reduce((sum, d) => sum + d.weight, 0);
    
    return selectedDayData.map(day => {
      const dayShare = day.weight / totalWeight;
      const platformDaily = Math.round(platformWeeklyTarget * dayShare);
      const solocabDaily = Math.round(solocabWeeklyTarget * dayShare);
      return {
        ...day,
        platformTarget: platformDaily,
        solocabTarget: solocabDaily,
        totalTarget: platformDaily + solocabDaily,
      };
    });
  }, [selectedDays, platformWeeklyTarget, solocabWeeklyTarget]);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return selectedDays.length >= 3;
      case 2: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < PLANNING_STEPS.length - 1 && canProceed()) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === PLANNING_STEPS.length - 1) {
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

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Fetch existing objectives_data to merge
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const existingData = (existingDriver?.objectives_data as Record<string, unknown>) || {};

      // Prepare daily targets map
      const dailyTargetsMap: Record<string, { platform: number; solocab: number; total: number }> = {};
      dailyTargets.forEach(day => {
        dailyTargetsMap[day.id] = {
          platform: day.platformTarget,
          solocab: day.solocabTarget,
          total: day.totalTarget,
        };
      });

      await supabase
        .from('drivers')
        .update({
          objectives_data: {
            ...existingData,
            platform_percentage: platformPercentage,
            solocab_percentage: solocabPercentage,
            target_weekly_revenue: targetWeeklyRevenue,
            platform_weekly_target: platformWeeklyTarget,
            solocab_weekly_target: solocabWeeklyTarget,
            selected_work_days: selectedDays,
            daily_targets: dailyTargetsMap,
            planning_completed_at: new Date().toISOString()
          }
        })
        .eq('id', driverId);

      toast.success('Ton planning est prêt !');
      onComplete();
    } catch (error) {
      console.error('Error saving planning:', error);
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3"
              >
                <TrendingDown className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Ta stratégie d'indépendance
              </h2>
              <p className="text-sm text-muted-foreground">
                Comment répartis-tu ton CA aujourd'hui ?
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              {/* Platform vs SoloCab split */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium">Plateformes</span>
                  </div>
                  <span className="text-lg font-bold text-destructive">{platformPercentage}%</span>
                </div>
                
                <Slider
                  value={[platformPercentage]}
                  onValueChange={([v]) => setPlatformPercentage(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="mb-4"
                />

                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">SoloCab (privé)</span>
                  </div>
                  <span className="text-lg font-bold text-primary">{solocabPercentage}%</span>
                </div>
              </div>

              {/* Visual split */}
              <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-destructive"
                  animate={{ width: `${platformPercentage}%` }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
                <motion.div 
                  className="bg-primary"
                  animate={{ width: `${solocabPercentage}%` }}
                  transition={{ type: "spring", stiffness: 300 }}
                />
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Objectif Alex :</span> t'aider à passer de {platformPercentage}% → 20% sur les plateformes en quelques mois !
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3"
              >
                <Calendar className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Tes jours de travail
              </h2>
              <p className="text-sm text-muted-foreground">
                Sélectionne les jours où tu travailles
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-4">
              {/* Day selector */}
              <div className="grid grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-xl transition-all",
                      selectedDays.includes(day.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="text-xs font-medium">{day.label}</span>
                    {selectedDays.includes(day.id) && (
                      <Check className="w-3 h-3 mt-1" />
                    )}
                  </button>
                ))}
              </div>

              {/* Activity level hints */}
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-2">Potentiel de CA par jour :</p>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <div 
                      key={day.id}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div 
                        className={cn(
                          "w-full rounded transition-all",
                          day.weight >= 1.15 ? "bg-emerald-500" : 
                          day.weight >= 0.9 ? "bg-amber-500" : "bg-muted"
                        )}
                        style={{ height: `${day.weight * 24}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground mt-1">{day.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-emerald-500" /> Fort
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-amber-500" /> Moyen
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-muted" /> Faible
                  </span>
                </div>
              </div>

              {selectedDays.length < 3 && (
                <p className="text-xs text-destructive text-center">
                  Sélectionne au moins 3 jours
                </p>
              )}
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
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3"
              >
                <Target className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Tes objectifs journaliers
              </h2>
              <p className="text-sm text-muted-foreground">
                Alex a calculé tes cibles selon l'activité de chaque jour
              </p>
            </div>

            <div className="max-w-sm mx-auto w-full space-y-3">
              {/* Weekly summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
                  <Smartphone className="w-4 h-4 text-destructive mx-auto mb-1" />
                  <p className="text-lg font-bold text-destructive">{platformWeeklyTarget}€</p>
                  <p className="text-xs text-muted-foreground">Plateformes/sem</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <UserCheck className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-primary">{solocabWeeklyTarget}€</p>
                  <p className="text-xs text-muted-foreground">SoloCab/sem</p>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="bg-card border border-border rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-2">Répartition journalière :</p>
                <div className="space-y-2">
                  {dailyTargets.map(day => (
                    <div key={day.id} className="flex items-center gap-2">
                      <span className={cn(
                        "w-8 text-xs font-medium capitalize",
                        day.weight >= 1.15 ? "text-emerald-500" : "text-foreground"
                      )}>
                        {day.label}
                      </span>
                      <div className="flex-1 flex gap-1 h-4 rounded overflow-hidden">
                        <div 
                          className="bg-destructive/60"
                          style={{ width: `${(day.platformTarget / day.totalTarget) * 100}%` }}
                        />
                        <div 
                          className="bg-primary"
                          style={{ width: `${(day.solocabTarget / day.totalTarget) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{day.totalTarget}€</span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    Chaque semaine, Alex t'aidera à <span className="font-semibold text-primary">augmenter ta part SoloCab</span> et réduire ta dépendance aux plateformes !
                  </p>
                </div>
              </motion.div>

              {/* Complete button */}
              <Button
                onClick={handleComplete}
                disabled={saving}
                size="lg"
                className="w-full"
              >
                {saving ? 'Enregistrement...' : 'Valider mon planning'}
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
        {PLANNING_STEPS.map((_, i) => (
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
        className="flex-1 overflow-hidden relative px-4"
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
            className="absolute inset-0 flex flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {currentStep > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < PLANNING_STEPS.length - 1 && canProceed() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation - only for non-final steps */}
      {currentStep < PLANNING_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-3 px-4 py-3">
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
