import { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingGoalsStepProps {
  driverId: string;
  onComplete: () => void;
}

const GOALS_STEPS = [
  { id: 'revenue', title: 'Revenus' },
  { id: 'clients', title: 'Clients' },
  { id: 'time', title: 'Temps' },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingGoalsStep({ driverId, onComplete }: OnboardingGoalsStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);

  // Goals data
  const [targetRevenue, setTargetRevenue] = useState(5000);
  const [revenueValue, setRevenueValue] = useState('5000');
  const [targetClients, setTargetClients] = useState(20);
  const [clientsValue, setClientsValue] = useState('20');
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState(5);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return targetRevenue >= 1000;
      case 1: return targetClients >= 5;
      case 2: return workHoursPerDay >= 4 && workDaysPerWeek >= 3;
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
      // Calculate estimated hourly rate needed
      const totalHoursMonthly = workHoursPerDay * workDaysPerWeek * 4;
      const estimatedHourlyTarget = Math.round(targetRevenue / totalHoursMonthly);

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
          objectives_data: {
            ...existingData,
            target_monthly_revenue: targetRevenue,
            target_direct_clients: targetClients,
            work_hours_per_day: workHoursPerDay,
            work_days_per_week: workDaysPerWeek,
            estimated_hourly_target: estimatedHourlyTarget,
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3"
              >
                <TrendingUp className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Objectif de revenus
              </h2>
              <p className="text-sm text-muted-foreground">
                Combien veux-tu générer par mois sans plateforme ?
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

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center"
              >
                <p className="text-sm text-primary">
                  💡 C'est ton objectif, Alex t'aidera à l'atteindre !
                </p>
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
                <Users className="w-7 h-7 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Objectif clients
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
                    max={200}
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
                  max={200}
                  step={5}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>5 clients</span>
                  <span>200 clients</span>
                </div>
              </div>

              {estimatedPerClient > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center"
                >
                  <p className="text-sm text-blue-400">
                    📊 ~{estimatedPerClient}€ de CA moyen par client/mois
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
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
                  <span className="text-sm font-semibold text-foreground">Ton objectif horaire</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  ~{estimatedHourlyTarget}€/heure
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour atteindre {targetRevenue}€/mois en {totalHoursPerMonth}h de travail
                </p>
              </motion.div>
            </div>

            {/* Complete button */}
            <div className="mt-6 px-4">
              <Button
                onClick={handleComplete}
                disabled={saving || !canProceed()}
                size="lg"
                className="w-full max-w-sm mx-auto block"
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
        {GOALS_STEPS.map((_, i) => (
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
        {currentStep < GOALS_STEPS.length - 1 && canProceed() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 pointer-events-none">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation - only for non-final steps */}
      {currentStep < GOALS_STEPS.length - 1 && (
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
