import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { NumericInput } from '@/components/ui/numeric-input';
import { 
  ArrowRight, 
  ArrowLeft,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  Smartphone,
  UserCheck,
  Check
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
  { id: 'planning', title: 'Planning' },
  { id: 'summary', title: 'Récap' },
];

const DAYS_OF_WEEK = [
  { id: 'lundi', label: 'Lun', fullLabel: 'Lundi', weight: 0.7 },
  { id: 'mardi', label: 'Mar', fullLabel: 'Mardi', weight: 0.85 },
  { id: 'mercredi', label: 'Mer', fullLabel: 'Mercredi', weight: 0.95 },
  { id: 'jeudi', label: 'Jeu', fullLabel: 'Jeudi', weight: 0.95 },
  { id: 'vendredi', label: 'Ven', fullLabel: 'Vendredi', weight: 1.15 },
  { id: 'samedi', label: 'Sam', fullLabel: 'Samedi', weight: 1.2 },
  { id: 'dimanche', label: 'Dim', fullLabel: 'Dimanche', weight: 1.2 },
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

  // Planning data
  const [selectedDays, setSelectedDays] = useState<string[]>(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  // Coach advice state
  const [coachAdvice, setCoachAdvice] = useState<{ warnings: string[]; suggestions: string[] }>({ warnings: [], suggestions: [] });

  // Calculations
  const solocabPercentage = 100 - platformPercentage;
  const weeklyRevenue = Math.round(targetRevenue / 4);

  // Calculate daily targets with AI weighting
  const dailyTargets = useMemo(() => {
    const selectedDayData = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.id));
    if (selectedDayData.length === 0) return [];
    
    const totalWeight = selectedDayData.reduce((sum, d) => sum + d.weight, 0);
    
    return selectedDayData.map(day => {
      const dayShare = day.weight / totalWeight;
      const dailyTarget = Math.round(weeklyRevenue * dayShare);
      return {
        ...day,
        dailyTarget,
      };
    });
  }, [selectedDays, weeklyRevenue]);

  // Update coach advice when values change
  useEffect(() => {
    const advice = getCoachAdvice(currentRevenue, targetRevenue, currentClients, targetClients, platformPercentage);
    setCoachAdvice(advice);
  }, [currentRevenue, targetRevenue, currentClients, targetClients, platformPercentage]);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Current situation has defaults
      case 1: return targetRevenue >= 1000;
      case 2: return targetClients >= 5;
      case 3: return selectedDays.length >= 3; // Planning step
      case 4: return true; // Summary
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
      const totalHoursMonthly = workHoursPerDay * selectedDays.length * 4;
      const estimatedHourlyTarget = Math.round(targetRevenue / totalHoursMonthly);

      // Prepare daily targets map
      const dailyTargetsMap: Record<string, { target: number; weight: number }> = {};
      dailyTargets.forEach(day => {
        dailyTargetsMap[day.id] = {
          target: day.dailyTarget,
          weight: day.weight,
        };
      });

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
          onboarding_step: 'settings',
          objectives_data: {
            ...existingData,
            // Current situation
            current_monthly_revenue: currentRevenue,
            current_direct_clients: currentClients,
            platform_percentage: platformPercentage,
            solocab_percentage: solocabPercentage,
            // Targets
            target_monthly_revenue: targetRevenue,
            target_weekly_revenue: weeklyRevenue,
            target_direct_clients: targetClients,
            // Planning
            work_hours_per_day: workHoursPerDay,
            work_days_per_week: selectedDays.length,
            selected_work_days: selectedDays,
            daily_targets: dailyTargetsMap,
            estimated_hourly_target: estimatedHourlyTarget,
            // Meta
            goals_completed_at: new Date().toISOString()
          }
        })
        .eq('id', driverId);

      toast.success('Tes objectifs et ton planning sont enregistrés !');
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
  const totalHoursPerMonth = workHoursPerDay * selectedDays.length * 4;
  const estimatedHourlyTarget = totalHoursPerMonth > 0 ? Math.round(targetRevenue / totalHoursPerMonth) : 0;
  const estimatedPerClient = targetClients > 0 ? Math.round(targetRevenue / targetClients) : 0;

  const renderCoachFeedback = () => {
    if (coachAdvice.warnings.length === 0 && coachAdvice.suggestions.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-lg sm:rounded-xl p-2.5 sm:p-3 border",
          coachAdvice.warnings.length > 0 
            ? "bg-amber-500/10 border-amber-500/20" 
            : "bg-emerald-500/10 border-emerald-500/20"
        )}
      >
        <div className="flex items-start gap-2">
          {coachAdvice.warnings.length > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-0.5 sm:space-y-1">
            {coachAdvice.warnings.map((warning, i) => (
              <p key={`w-${i}`} className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 leading-tight">
                ⚠️ {warning}
              </p>
            ))}
            {coachAdvice.suggestions.map((suggestion, i) => (
              <p key={`s-${i}`} className="text-[10px] sm:text-xs text-foreground/80 leading-tight">
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
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center mb-2 sm:mb-3"
              >
                <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Ta situation aujourd'hui
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                D'où tu pars pour mieux te guider
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4 px-1">
              {/* Current revenue */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">CA mensuel actuel</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <NumericInput
                    value={currentRevenueValue}
                    onChange={handleCurrentRevenueChange}
                    allowEmpty={true}
                    min={0}
                    max={30000}
                    className="text-xl sm:text-2xl font-bold text-center w-24 sm:w-28"
                    placeholder="0"
                  />
                  <span className="text-base sm:text-lg text-muted-foreground">€/mois</span>
                </div>
              </div>

              {/* Current clients */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm font-medium">Clients directs actuels</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <NumericInput
                    value={currentClientsValue}
                    onChange={handleCurrentClientsChange}
                    allowEmpty={true}
                    min={0}
                    max={200}
                    className="text-xl sm:text-2xl font-bold text-center w-16 sm:w-20"
                    placeholder="0"
                  />
                  <span className="text-base sm:text-lg text-muted-foreground">clients</span>
                </div>
              </div>

              {/* Platform dependency */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                    <span className="text-xs sm:text-sm font-medium">Dépendance plateformes</span>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-destructive">{platformPercentage}%</span>
                </div>
                <Slider
                  value={[platformPercentage]}
                  onValueChange={([v]) => setPlatformPercentage(v)}
                  min={0}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <div className="flex gap-1 h-2.5 sm:h-3 rounded-full overflow-hidden">
                  <motion.div 
                    className="bg-destructive"
                    animate={{ width: `${platformPercentage}%` }}
                  />
                  <motion.div 
                    className="bg-primary"
                    animate={{ width: `${solocabPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[9px] sm:text-[10px] text-muted-foreground">
                  <span className="text-destructive">Apps: {platformPercentage}%</span>
                  <span className="text-primary">Privé: {solocabPercentage}%</span>
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-foreground leading-tight">
                    <span className="font-semibold">Alex :</span> Pas de jugement, on part d'où tu es. L'important c'est où tu veux aller ! 🚀
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-2 sm:mb-3"
              >
                <Target className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Ton objectif de revenus
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Combien veux-tu générer avec ta clientèle privée ?
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4 px-1">
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                  <NumericInput
                    value={revenueValue}
                    onChange={handleRevenueChange}
                    allowEmpty={true}
                    min={1000}
                    max={20000}
                    className="text-xl sm:text-2xl font-bold text-center w-24 sm:w-32"
                  />
                  <span className="text-lg sm:text-xl font-semibold text-muted-foreground">€/mois</span>
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
                  className="mt-2 sm:mt-3"
                />
                <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                  <span>1 000€</span>
                  <span>20 000€</span>
                </div>
              </div>

              {currentRevenue > 0 && targetRevenue > currentRevenue && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 sm:p-3 text-center">
                  <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
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
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2 sm:mb-3"
              >
                <Users className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Ton objectif clients
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Combien de clients fidèles veux-tu avoir ?
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4 px-1">
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
                  <NumericInput
                    value={clientsValue}
                    onChange={handleClientsChange}
                    allowEmpty={true}
                    min={5}
                    max={100}
                    className="text-xl sm:text-2xl font-bold text-center w-20 sm:w-24"
                  />
                  <span className="text-lg sm:text-xl font-semibold text-muted-foreground">clients</span>
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
                  className="mt-2 sm:mt-3"
                />
                <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                  <span>5 clients</span>
                  <span>100 clients</span>
                </div>
              </div>

              {estimatedPerClient > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 sm:p-3 text-center">
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                    📊 ~{estimatedPerClient}€ de CA moyen par client/mois
                  </p>
                </div>
              )}

              {renderCoachFeedback()}

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-foreground leading-tight">
                    <span className="font-semibold">Alex :</span> Un client fidèle vaut 3 à 5 fois plus qu'une course plateforme. Mieux vaut 15 bons clients que 50 qui commandent une fois !
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-2 sm:mb-3"
              >
                <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Ton planning de travail
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Quels jours travailles-tu ?
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4 px-1">
              {/* Day selector */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={cn(
                        "flex flex-col items-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all",
                        selectedDays.includes(day.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-[10px] sm:text-xs font-medium">{day.label}</span>
                      {selectedDays.includes(day.id) && (
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5 sm:mt-1" />
                      )}
                    </button>
                  ))}
                </div>
                
                {selectedDays.length < 3 && (
                  <p className="text-[10px] sm:text-xs text-destructive text-center mt-1.5 sm:mt-2">
                    Sélectionne au moins 3 jours
                  </p>
                )}
              </div>

              {/* Hours per day */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">Heures par jour</span>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-primary">{workHoursPerDay}h</span>
                </div>
                <Slider
                  value={[workHoursPerDay]}
                  onValueChange={([v]) => setWorkHoursPerDay(v)}
                  min={4}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1">
                  <span>4h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Activity level hints */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2">Potentiel de CA par jour :</p>
                <div className="flex gap-0.5 sm:gap-1">
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
                        style={{ height: `${day.weight * 20}px` }}
                      />
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-foreground leading-tight">
                    <span className="font-semibold">Alex :</span> Ven/Sam/Dim ont le meilleur potentiel CA. Je vais répartir tes objectifs selon l'activité de chaque jour ! 📊
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-2 sm:mb-3"
              >
                <Target className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Ton plan de réussite
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tes objectifs calculés par Alex
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto space-y-2.5 sm:space-y-3 px-1">
              {/* Weekly summary */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div className="bg-primary/10 border border-primary/20 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-center">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-base sm:text-lg font-bold text-primary">{weeklyRevenue}€</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">CA / semaine</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-center">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mx-auto mb-0.5 sm:mb-1" />
                  <p className="text-base sm:text-lg font-bold text-emerald-500">~{estimatedHourlyTarget}€/h</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Objectif horaire</p>
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="bg-card border border-border rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                  Répartition intelligente sur {selectedDays.length} jours :
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  {dailyTargets.map(day => (
                    <div key={day.id} className="flex items-center gap-1.5 sm:gap-2">
                      <span className={cn(
                        "w-10 sm:w-12 text-[10px] sm:text-xs font-medium",
                        day.weight >= 1.15 ? "text-emerald-500" : "text-foreground"
                      )}>
                        {day.fullLabel}
                      </span>
                      <div className="flex-1 h-3 sm:h-4 rounded-full bg-muted overflow-hidden">
                        <motion.div 
                          className={cn(
                            "h-full rounded-full",
                            day.weight >= 1.15 ? "bg-emerald-500" : 
                            day.weight >= 0.9 ? "bg-primary" : "bg-amber-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${(day.dailyTarget / weeklyRevenue) * 100 * selectedDays.length}%` }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-bold w-12 sm:w-14 text-right">{day.dailyTarget}€</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Annual projection */}
              <div className="bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Projection annuelle</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{(targetRevenue * 12).toLocaleString('fr-FR')}€</p>
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
                  avec {targetClients} clients fidèles 🎯
                </p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-2.5 sm:p-3"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-foreground leading-tight">
                    <span className="font-semibold">Alex :</span> J'ai réparti ton CA selon le potentiel de chaque jour. Les jours les plus forts auront des objectifs plus élevés. Tu es prêt ! 🚀
                  </p>
                </div>
              </motion.div>

              {/* Complete button */}
              <Button
                onClick={handleComplete}
                disabled={saving}
                size="lg"
                className="w-full h-10 sm:h-12 text-sm"
              >
                {saving ? 'Enregistrement...' : 'Valider mes objectifs'}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
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
      <div className="flex-shrink-0 flex justify-center gap-1.5 sm:gap-2 py-2 sm:py-3">
        {GOALS_STEPS.map((step, i) => (
          <div 
            key={i}
            className={cn(
              "h-1.5 sm:h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-6 sm:w-8 bg-primary" : i < currentStep ? "w-1.5 sm:w-2 bg-emerald-500" : "w-1.5 sm:w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-y-auto overflow-x-hidden relative px-2 sm:px-4 pb-2 sm:pb-4"
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
          <button 
            onClick={prevStep}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-16 sm:w-12 sm:h-20 flex items-center justify-center bg-gradient-to-r from-background/90 to-transparent hover:from-background transition-all active:scale-95 z-10"
            aria-label="Page précédente"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-sm hover:bg-primary/20 transition-colors">
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </button>
        )}
        {currentStep < GOALS_STEPS.length - 1 && canProceed() && (
          <button 
            onClick={nextStep}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-16 sm:w-12 sm:h-20 flex items-center justify-center bg-gradient-to-l from-background/90 to-transparent hover:from-background transition-all active:scale-95 z-10"
            aria-label="Page suivante"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-sm hover:bg-primary/20 transition-colors">
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          </button>
        )}
      </motion.div>

      {/* Navigation - only for non-final steps */}
      {currentStep < GOALS_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-t border-border/50 bg-background">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex-1 h-10 sm:h-11 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            Retour
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1 h-10 sm:h-11 text-sm"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
