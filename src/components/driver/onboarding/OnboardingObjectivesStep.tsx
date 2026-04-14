import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  Shield,
  Heart,
  Rocket,
  HandHeart,
  Star,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Lightbulb,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Zap,
  Crown,
  Phone,
  QrCode,
  Calendar,
  PiggyBank,
  UserCheck,
  Clock,
  Ban
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingObjectivesStepProps {
  driverId: string;
  onComplete: () => void;
}

const VISION_STEPS = [
  { id: 'problem', title: 'Le problème' },
  { id: 'solution', title: 'La solution' },
  { id: 'motivation', title: 'Ton profil' },
  { id: 'commitment', title: 'C\'est parti' },
];

const PLATFORM_PROBLEMS = [
  { icon: PiggyBank, text: 'Commissions de 18% à 45%, parfois plus !' },
  { icon: XCircle, text: 'Clients qui ne te rappellent jamais' },
  { icon: Clock, text: 'Dépendance totale aux algorithmes' },
  { icon: Ban, text: 'Aucune visibilité sur ton avenir' },
];

const SOLOCAB_SOLUTIONS = [
  { 
    icon: Crown, 
    title: '0% de commission', 
    desc: 'Tu gardes 100% de ce que tu gagnes'
  },
  { 
    icon: Users, 
    title: 'Tes clients, pour toujours', 
    desc: 'Ils te retrouvent facilement et te recommandent'
  },
  { 
    icon: QrCode, 
    title: 'Plaque NFC intelligente', 
    desc: 'Un simple scan = nouveau client fidélisé'
  },
  { 
    icon: Calendar, 
    title: 'Réservations directes', 
    desc: 'Ton agenda en ligne, sans intermédiaire'
  },
];

const DRIVER_PROFILES = [
  { 
    id: 'pioneer', 
    emoji: '🚀', 
    title: 'Le Pionnier', 
    desc: 'Je veux sortir des plateformes maintenant',
    motivation: 'high'
  },
  { 
    id: 'builder', 
    emoji: '🏗️', 
    title: 'Le Bâtisseur', 
    desc: 'Je construis ma clientèle progressivement',
    motivation: 'medium'
  },
  { 
    id: 'explorer', 
    emoji: '🔍', 
    title: 'L\'Explorateur', 
    desc: 'Je découvre et j\'apprends',
    motivation: 'low'
  },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingObjectivesStep({ driverId, onComplete }: OnboardingObjectivesStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Charger le profil sauvegardé au montage (y compris currentStep)
  useEffect(() => {
    const loadSavedProfile = async () => {
      try {
        // Check localStorage backup first
        const localBackup = localStorage.getItem(`onboarding_vision_${driverId}`);
        let localData: Record<string, any> | null = null;
        if (localBackup) {
          try {
            localData = JSON.parse(localBackup);
          } catch (e) {
            console.warn('Impossible de parser le backup local vision');
          }
        }

        const { data } = await supabase
          .from('drivers')
          .select('objectives_data')
          .eq('id', driverId)
          .single();
        
        const objectivesData = data?.objectives_data as Record<string, any> | null;
        const mergedData = { ...localData, ...objectivesData };
        
        if (mergedData?.driver_profile) {
          setSelectedProfile(mergedData.driver_profile);
        }
        if (mergedData?.vision_current_step !== undefined) {
          setCurrentStep(mergedData.vision_current_step);
        }
        
        // Clear localStorage backup after successful load
        if (localBackup) {
          localStorage.removeItem(`onboarding_vision_${driverId}`);
        }
        
        console.log('📊 Données vision chargées:', mergedData);
      } catch (error) {
        console.error('Erreur chargement profil:', error);
      } finally {
        setDataLoaded(true);
      }
    };
    loadSavedProfile();
  }, [driverId]);
  
  // Auto-save continuous - sauvegarde le step et le profil sélectionné
  const autoSaveData = useCallback(async () => {
    if (!dataLoaded) return;
    
    try {
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const existingData = (existingDriver?.objectives_data as Record<string, any>) || {};
      const profile = DRIVER_PROFILES.find(p => p.id === selectedProfile);

      await supabase
        .from('drivers')
        .update({
          objectives_data: {
            ...existingData,
            driver_profile: selectedProfile || (existingData.driver_profile as string) || '',
            motivation_level: profile?.motivation || (existingData.motivation_level as string) || 'medium',
            vision_current_step: currentStep,
            last_auto_save_vision: new Date().toISOString(),
          }
        })
        .eq('id', driverId);

      console.log('✅ Vision auto-sauvegardée - step:', currentStep, 'profile:', selectedProfile);
    } catch (error) {
      console.error('❌ Erreur auto-save vision:', error);
    }
  }, [driverId, dataLoaded, currentStep, selectedProfile]);

  // Auto-save with debounce whenever data changes
  useEffect(() => {
    if (!dataLoaded) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save (800ms delay)
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveData();
    }, 800);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dataLoaded, currentStep, selectedProfile, autoSaveData]);

  // Save immediately on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Store in localStorage as backup
      const dataToSave = {
        driver_profile: selectedProfile,
        vision_current_step: currentStep,
      };
      localStorage.setItem(`onboarding_vision_${driverId}`, JSON.stringify(dataToSave));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [driverId, currentStep, selectedProfile]);
  
  // Sauvegarder à chaque changement de profil
  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Problem awareness
      case 1: return true; // Solution discovery
      case 2: return !!selectedProfile;
      case 3: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < VISION_STEPS.length - 1 && canProceed()) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
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
      const profile = DRIVER_PROFILES.find(p => p.id === selectedProfile);
      
      await supabase
        .from('drivers')
        .update({
          objectives_completed: true,
          onboarding_objectives_completed: true,
          onboarding_step: 'goals',
          objectives_data: {
            driver_profile: selectedProfile,
            motivation_level: profile?.motivation || 'medium',
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', driverId);

      toast.success('Parfait ! Passons à la suite');
      onComplete();
    } catch (error) {
      console.error('Error saving vision:', error);
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
      // STEP 0: LE PROBLÈME
      case 0:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-4 sm:mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl bg-destructive flex items-center justify-center mb-3 sm:mb-4 shadow-lg"
              >
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive-foreground" />
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2"
              >
                Le piège des plateformes
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-xs sm:text-sm"
              >
                Tu travailles dur, mais pour qui ?
              </motion.p>
            </div>

            <div className="space-y-2 sm:space-y-3 w-full max-w-sm mx-auto px-1">
              {PLATFORM_PROBLEMS.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-destructive/10 border border-destructive/20"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    </div>
                    <p className="text-xs sm:text-sm text-foreground font-medium leading-tight">{problem.text}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center mt-4 sm:mt-6"
            >
              <p className="text-base sm:text-lg font-bold text-destructive">
                Stop. Il y a mieux.
              </p>
            </motion.div>
          </div>
        );

      // STEP 1: LA SOLUTION SOLOCAB
      case 1:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center mb-2 sm:mb-3 shadow-lg"
              >
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl sm:text-2xl font-bold text-foreground mb-0.5 sm:mb-1"
              >
                SoloCab, c'est quoi ?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xs sm:text-sm max-w-xs mx-auto px-2"
              >
                L'outil des chauffeurs qui veulent reprendre le contrôle
              </motion.p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full max-w-sm mx-auto px-1">
              {SOLOCAB_SOLUTIONS.map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center mb-1.5 sm:mb-2">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-bold text-foreground text-xs sm:text-sm mb-0.5 leading-tight">{solution.title}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{solution.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 w-full max-w-sm mx-auto"
            >
              <p className="text-center text-xs sm:text-sm font-semibold text-primary">
                🎯 14 jours d'essai gratuit
              </p>
              <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Gratuit • Premium 19,99€/mois
              </p>
            </motion.div>
          </div>
        );

      // STEP 2: PROFIL DU CHAUFFEUR
      case 2:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center mb-2 sm:mb-3"
              >
                <UserCheck className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1">
                Quel chauffeur es-tu ?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                On adapte ton parcours à ton rythme
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3 w-full max-w-sm mx-auto px-1">
              {DRIVER_PROFILES.map((profile, index) => {
                const isSelected = selectedProfile === profile.id;
                return (
                  <motion.button
                    key={profile.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleProfileSelect(profile.id)}
                    className={cn(
                      "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all",
                      isSelected 
                        ? "border-primary bg-primary/10 shadow-md" 
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl sm:text-3xl">{profile.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm sm:text-base">{profile.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{profile.desc}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {selectedProfile && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-xs sm:text-sm text-primary mt-3 sm:mt-4 font-medium"
              >
                ✨ Parfait, on va t'accompagner !
              </motion.p>
            )}
          </div>
        );

      // STEP 3: ENGAGEMENT FINAL
      case 3:
        return (
          <div className="flex flex-col h-full justify-center py-2 sm:py-4">
            <div className="text-center mb-3 sm:mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-primary flex items-center justify-center mb-3 sm:mb-4 shadow-xl"
              >
                <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2"
              >
                Prêt à te libérer ?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-xs sm:text-sm max-w-xs mx-auto px-2"
              >
                En quelques minutes, ton espace chauffeur sera configuré
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 w-full max-w-sm mx-auto mb-3 sm:mb-4"
            >
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="font-bold text-foreground text-sm sm:text-base">Ce qui t'attend</span>
              </div>
              <ul className="space-y-1.5 sm:space-y-2">
                {[
                  { icon: Target, text: 'Définir tes objectifs de revenus' },
                  { icon: TrendingUp, text: 'Configurer tes tarifs' },
                  { icon: Users, text: 'Créer ton profil public' },
                  { icon: QrCode, text: 'Commander ta plaque NFC' },
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{item.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-sm mx-auto px-1"
            >
              <Button
                onClick={handleComplete}
                disabled={saving}
                size="lg"
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold bg-primary hover:bg-primary/90 shadow-lg"
              >
                {saving ? (
                  'Préparation...'
                ) : (
                  <>
                    Lancer ma configuration
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-center text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3">
                ⏱️ Environ 5 minutes • Données modifiables à tout moment
              </p>
            </motion.div>
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
        {VISION_STEPS.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-1.5 sm:h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-6 sm:w-8 bg-primary" : i < currentStep ? "w-1.5 sm:w-2 bg-primary/60" : "w-1.5 sm:w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-y-auto overflow-x-hidden relative px-2 sm:px-4"
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
            className="min-h-full flex flex-col"
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
        {currentStep < VISION_STEPS.length - 1 && canProceed() && (
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

      {/* Navigation */}
      {currentStep < VISION_STEPS.length - 1 && (
        <div className="flex-shrink-0 flex gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 border-t border-border/50">
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
