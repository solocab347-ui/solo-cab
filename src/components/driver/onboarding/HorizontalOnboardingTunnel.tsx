import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  Settings,
  User,
  FileText,
  CheckCircle2,
  Loader2,
  CreditCard,
  Save,
  Clock,
  Wallet,
  Target,
  Play,
  ChevronLeft,
  ChevronRight,
  Compass,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingBillingStep } from './OnboardingBillingStep';
import { OnboardingNfcStep } from './OnboardingNfcStep';
import { OnboardingObjectivesStep } from './OnboardingObjectivesStep';
import { OnboardingGoalsStep } from './OnboardingGoalsStep';
import { OnboardingWorkScheduleStep } from './OnboardingWorkScheduleStep';
import { OnboardingTrialStartStep } from './OnboardingTrialStartStep';
import { HorizontalSettingsFlow } from './HorizontalSettingsFlow';
import { useOnboardingAutoSave } from './hooks/useOnboardingAutoSave';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo-solocab.png';

export interface OnboardingTunnelProps {
  driverId: string;
  userId: string;
  driverProfile: any;
  onComplete: () => void;
  initialStep?: number;
}

// Ordre: Vision → Objectifs → Planning → Tarifs → Profil → Documents → NFC → Encaissements → Lancement
const ALL_STEPS = [
  { id: 'vision', title: 'Vision', icon: Compass },
  { id: 'goals', title: 'Objectifs', icon: TrendingUp },
  { id: 'planning', title: 'Horaires', icon: Clock },
  { id: 'settings', title: 'Tarifs', icon: Settings },
  { id: 'profile', title: 'Profil', icon: User },
  { id: 'documents', title: 'Docs', icon: FileText },
  { id: 'nfc', title: 'NFC', icon: CreditCard },
  { id: 'billing', title: 'Encaissements', icon: Wallet },
  { id: 'trial_start', title: 'Lancer', icon: Play },
];

const SWIPE_THRESHOLD = 50;

export function HorizontalOnboardingTunnel({ 
  driverId, 
  userId, 
  driverProfile,
  onComplete,
  initialStep = 0
}: OnboardingTunnelProps) {
  const navigate = useNavigate();
  const hasNfcPlate = !!(driverProfile?.driver?.has_nfc_plate || driverProfile?.driver?.nfc_tag_number || driverProfile?.driver?.nfc_plate_order_id);
  
  const STEPS = hasNfcPlate 
    ? ALL_STEPS.filter(step => step.id !== 'nfc')
    : ALL_STEPS;

  // Reprendre là où le chauffeur s'est arrêté
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mettre à jour last_seen_at à chaque connexion au tunnel (sans reset de l'étape)
  useEffect(() => {
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('drivers')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', driverId);
      } catch (error) {
        console.error('Erreur mise à jour last_seen_at:', error);
      }
    };
    updateLastSeen();
  }, [driverId]);
  
  const [stepData, setStepData] = useState({
    settings: {
      baseFare: driverProfile?.driver?.base_fare?.toString() || '',
      perKmRate: driverProfile?.driver?.per_km_rate?.toString() || '',
      hourlyRate: driverProfile?.driver?.hourly_rate?.toString() || '',
      minimumPrice: driverProfile?.driver?.minimum_price?.toString() || '0',
      maxPassengers: driverProfile?.driver?.max_passengers?.toString() || '4',
      tvaIncluded: driverProfile?.driver?.tva_included || false,
      companyName: driverProfile?.driver?.company_name || '',
      companyAddress: driverProfile?.driver?.company_address || '',
      siret: driverProfile?.driver?.siret || '',
      siren: driverProfile?.driver?.siren || '',
      tvaNumber: driverProfile?.driver?.tva_number || '',
      vehicleBrand: driverProfile?.driver?.vehicle_brand || '',
      vehicleModel: driverProfile?.driver?.vehicle_model || '',
      vehicleYear: driverProfile?.driver?.vehicle_year?.toString() || '',
      vehicleColor: driverProfile?.driver?.vehicle_color || '',
      vehiclePlate: driverProfile?.driver?.vehicle_plate || '',
    },
    profile: {
      profilePhotoUrl: driverProfile?.profile_photo_url || driverProfile?.avatar_url || null,
      cardPhotoUrl: driverProfile?.driver?.card_photo_url || null,
      serviceDescription: driverProfile?.driver?.service_description || '',
      workingSectors: driverProfile?.driver?.working_sectors || [],
      vehicleEquipment: driverProfile?.driver?.vehicle_equipment || [],
      servicesOffered: driverProfile?.driver?.services_offered || [],
      vehicleCategories: driverProfile?.driver?.vehicle_category || [],
      displayDriverName: driverProfile?.driver?.display_driver_name !== false,
      displayCompanyName: driverProfile?.driver?.display_company_name || false,
    },
    documents: {
      documentsStatus: driverProfile?.driver?.documents_status || 'pending',
    },
    billing: {
      billingType: 'solocab_stripe' as const,
    },
    nfc: {
      hasNfcPlate,
      wantsNfcPlate: false,
    }
  });

  // Calculer les étapes complétées basées sur l'étape sauvegardée et les données réelles
  const getCompletedStepsFromSavedStep = () => {
    const stepOrder = ['vision', 'goals', 'planning', 'settings', 'profile', 'documents', 'nfc', 'billing', 'trial_start'];
    const savedStep = driverProfile?.driver?.onboarding_step;
    const savedIndex = savedStep ? stepOrder.indexOf(savedStep) : -1;
    
    const nfcCompleted = !!(
      driverProfile?.driver?.has_nfc_plate || 
      driverProfile?.driver?.nfc_tag_number || 
      driverProfile?.driver?.nfc_plate_order_id ||
      driverProfile?.driver?.onboarding_nfc_completed
    );
    
    const billingCompleted = !!(
      driverProfile?.driver?.onboarding_billing_completed ||
      (savedIndex > stepOrder.indexOf('billing'))
    );

    // Planning is completed if driver has availability slots
    const planningCompleted = savedIndex > stepOrder.indexOf('planning') || 
      !!(driverProfile?.driver?.objectives_data?.schedule_configured_at);
    
    return {
      vision: savedIndex > 0 || driverProfile?.driver?.onboarding_objectives_completed || false,
      goals: savedIndex > 1 || !!(driverProfile?.driver?.objectives_data?.target_monthly_revenue),
      planning: planningCompleted,
      settings: savedIndex > 3 || driverProfile?.driver?.onboarding_settings_completed || false,
      profile: savedIndex > 4 || driverProfile?.driver?.onboarding_profile_completed || false,
      documents: savedIndex > 5 || driverProfile?.driver?.onboarding_documents_completed || false,
      nfc: nfcCompleted,
      billing: billingCompleted,
    };
  };

  const [completedSteps, setCompletedSteps] = useState(getCompletedStepsFromSavedStep);

  const { autoSave, saveImmediately } = useOnboardingAutoSave(driverId, userId, currentStep);
  
  // Sauvegarder l'étape courante dans la base à chaque changement
  const saveCurrentStep = useCallback(async (stepId: string) => {
    try {
      await supabase
        .from('drivers')
        .update({ onboarding_step: stepId })
        .eq('id', driverId);
      console.log('Étape sauvegardée:', stepId);
    } catch (error) {
      console.error('Erreur sauvegarde étape:', error);
    }
  }, [driverId]);
  
  // Sauvegarder à chaque changement d'étape
  useEffect(() => {
    const currentStepId = STEPS[currentStep]?.id;
    if (currentStepId) {
      saveCurrentStep(currentStepId);
    }
  }, [currentStep, STEPS, saveCurrentStep]);

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;

    if (swipe > SWIPE_THRESHOLD || velocity > 500) {
      // Swipe right = go back
      handlePrev();
    } else if (swipe < -SWIPE_THRESHOLD || velocity < -500) {
      // Swipe left = go forward
      handleNext();
    }
  }, [currentStep]);

  const updateStepData = (step: string, updates: any) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof prev], ...updates }
    }));
  };

  const isSettingsValid = () => {
    const { baseFare, perKmRate, vehicleBrand } = stepData.settings;
    // companyName est optionnel - pas tous les VTC ont un nom de société
    // vehicleBrand doit être une vraie valeur (pas le placeholder "À compléter")
    const validBrand = vehicleBrand && vehicleBrand !== 'À compléter';
    return !!(baseFare && perKmRate && validBrand);
  };

  const isProfileValid = () => {
    const { profilePhotoUrl, serviceDescription, workingSectors, servicesOffered } = stepData.profile;
    return !!(profilePhotoUrl && serviceDescription && workingSectors.length > 0 && servicesOffered.length > 0);
  };

  const isDocumentsValid = () => {
    return stepData.documents.documentsStatus === 'submitted' || stepData.documents.documentsStatus === 'validated';
  };

  const canProceed = () => {
    const currentStepId = STEPS[currentStep]?.id;
    switch (currentStepId) {
      case 'vision': return true;
      case 'goals': return true;
      case 'planning': return true; // Self-navigated
      case 'settings': return isSettingsValid();
      case 'profile': return isProfileValid();
      case 'billing': return true;
      case 'documents': return true;
      case 'nfc': return true;
      case 'trial_start': return false;
      default: return false;
    }
  };

  const isSelfNavigatedStep = () => {
    const currentStepId = STEPS[currentStep]?.id;
    return currentStepId === 'vision' || currentStepId === 'goals' || currentStepId === 'planning' || currentStepId === 'trial_start' || currentStepId === 'settings';
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { settings } = stepData;
      const { error } = await supabase
        .from('drivers')
        .update({
          base_fare: settings.baseFare ? parseFloat(settings.baseFare) : null,
          per_km_rate: settings.perKmRate ? parseFloat(settings.perKmRate) : null,
          hourly_rate: settings.hourlyRate ? parseFloat(settings.hourlyRate) : null,
          minimum_price: settings.minimumPrice ? parseFloat(settings.minimumPrice) : 0,
          max_passengers: settings.maxPassengers ? parseInt(settings.maxPassengers) : 4,
          tva_included: settings.tvaIncluded,
          company_name: settings.companyName,
          company_address: settings.companyAddress,
          siret: settings.siret,
          siren: settings.siren,
          tva_number: settings.tvaNumber,
          vehicle_brand: settings.vehicleBrand,
          vehicle_model: settings.vehicleModel,
          vehicle_year: settings.vehicleYear ? parseInt(settings.vehicleYear) : null,
          vehicle_color: settings.vehicleColor,
          vehicle_plate: settings.vehiclePlate,
          onboarding_settings_completed: true,
          onboarding_step: 'profile',
        })
        .eq('id', driverId);

      if (error) throw error;
      setCompletedSteps(prev => ({ ...prev, settings: true }));
      return true;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { profile } = stepData;
      if (profile.profilePhotoUrl) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: profile.profilePhotoUrl })
          .eq('id', userId);
      }
      const { error } = await supabase
        .from('drivers')
        .update({
          card_photo_url: profile.cardPhotoUrl,
          service_description: profile.serviceDescription,
          working_sectors: profile.workingSectors,
          vehicle_equipment: profile.vehicleEquipment,
          services_offered: profile.servicesOffered,
          vehicle_category: profile.vehicleCategories,
          display_driver_name: profile.displayDriverName,
          display_company_name: profile.displayCompanyName,
          public_profile_enabled: true,
          onboarding_profile_completed: true,
          onboarding_step: 'documents',
        })
        .eq('id', driverId);
      if (error) throw error;
      setCompletedSteps(prev => ({ ...prev, profile: true }));
      return true;
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveBilling = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        billing_type: 'solocab_stripe',
        onboarding_step: 'trial_start',
        onboarding_billing_completed: true,
      };
      
      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);
        
      if (error) {
        if (error.message?.includes('onboarding_billing_completed')) {
          const { error: retryError } = await supabase
            .from('drivers')
            .update({
              billing_type: 'solocab_stripe',
              onboarding_step: 'trial_start',
            })
            .eq('id', driverId);
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      
      setCompletedSteps(prev => ({ ...prev, billing: true }));
      return true;
    } catch (error: any) {
      console.error('Error saving billing:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveNfc = async () => {
    try {
      await supabase
        .from('drivers')
        .update({
          onboarding_nfc_completed: true,
          onboarding_step: 'billing',
        })
        .eq('id', driverId);
      setCompletedSteps(prev => ({ ...prev, nfc: true }));
      return true;
    } catch (error) {
      console.error('Error saving NFC step:', error);
      return true; // Don't block progression
    }
  };

  const handleNext = async () => {
    if (currentStep >= STEPS.length - 1) return;
    
    const currentStepId = STEPS[currentStep]?.id;
    let success = true;
    
    switch (currentStepId) {
      case 'settings':
        success = await saveSettings();
        break;
      case 'profile':
        success = await saveProfile();
        break;
      case 'nfc':
        success = await saveNfc();
        break;
      case 'billing':
        success = await saveBilling();
        break;
      default:
        break;
    }

    if (success) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
        })
        .eq('id', driverId);

      if (error) throw error;
      toast.success('🎉 Bienvenue sur SoloCab !');
      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  const renderStep = () => {
    const currentStepId = STEPS[currentStep]?.id;
    
    switch (currentStepId) {
      case 'vision':
        return (
          <OnboardingObjectivesStep
            driverId={driverId}
            onComplete={() => {
              setCompletedSteps(prev => ({ ...prev, vision: true }));
              setDirection(1);
              setCurrentStep(prev => prev + 1);
            }}
          />
        );
      case 'goals':
        return (
          <OnboardingGoalsStep
            driverId={driverId}
            onComplete={() => {
              setCompletedSteps(prev => ({ ...prev, goals: true }));
              setDirection(1);
              setCurrentStep(prev => prev + 1);
            }}
          />
        );
      case 'planning':
        return (
          <OnboardingWorkScheduleStep
            driverId={driverId}
            onComplete={() => {
              setCompletedSteps(prev => ({ ...prev, planning: true }));
              setDirection(1);
              setCurrentStep(prev => prev + 1);
            }}
          />
        );
      case 'settings':
        // Récupérer le prénom depuis full_name (profil utilisateur)
        const settingsFirstName = driverProfile?.full_name?.split(' ')[0] || '';
        return (
          <HorizontalSettingsFlow 
            data={stepData.settings}
            driverName={settingsFirstName}
            onUpdate={(updates) => updateStepData('settings', updates)}
            onComplete={handleNext}
          />
        );
      case 'profile':
        return (
          <OnboardingProfileStep 
            data={stepData.profile}
            driverProfile={driverProfile}
            userId={userId}
            onUpdate={(updates) => updateStepData('profile', updates)}
          />
        );
      case 'billing':
        return (
          <OnboardingBillingStep
            data={stepData.billing}
            onUpdate={(updates) => updateStepData('billing', updates)}
          />
        );
      case 'documents':
        return (
          <OnboardingDocumentsStep 
            driverId={driverId}
            userId={userId}
            onStatusChange={(status) => updateStepData('documents', { documentsStatus: status })}
          />
        );
      case 'nfc':
        return (
          <OnboardingNfcStep
            hasNfcPlate={stepData.nfc.hasNfcPlate}
            driverId={driverId}
            onSkip={() => {
              setDirection(1);
              setCurrentStep(currentStep + 1);
            }}
          />
        );
      case 'trial_start':
        const documentsStepIndex = STEPS.findIndex(s => s.id === 'documents');
        return (
          <OnboardingTrialStartStep
            driverId={driverId}
            billingType={stepData.billing.billingType}
            stripeAccountStatus={driverProfile?.driver?.stripe_account_status}
            documentsStatus={stepData.documents.documentsStatus}
            onComplete={handleComplete}
            onGoToDocuments={documentsStepIndex >= 0 ? () => {
              setDirection(-1);
              setCurrentStep(documentsStepIndex);
            } : undefined}
            loading={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex flex-col bg-background overflow-hidden"
      style={{ 
        touchAction: 'pan-x',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header - Clean & minimal */}
      <div 
        className="flex-shrink-0 px-4 pt-3 pb-2 bg-card/90 backdrop-blur-md border-b border-border/50"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Logo + Progress */}
          <div className="flex items-center justify-between mb-2">
            <img src={logo} alt="SoloCab" className="h-5" />
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">
                Étape {currentStep + 1}/{STEPS.length}
              </span>
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* Progress bar - gradient */}
          <div className="h-1 bg-muted/50 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Step indicators - minimalist pills */}
          <div className="flex justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep || completedSteps[step.id as keyof typeof completedSteps];
              const isCurrent = index === currentStep;
              const isClickable = index < currentStep || isCompleted;
              
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => {
                    if (isClickable && index !== currentStep) {
                      setDirection(index < currentStep ? -1 : 1);
                      setCurrentStep(index);
                    }
                  }}
                  disabled={!isClickable || isCurrent}
                  className={cn(
                    "flex flex-col items-center flex-shrink-0 transition-all duration-300",
                    isClickable && !isCurrent ? "cursor-pointer" : "cursor-default",
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted && !isCurrent
                      ? 'bg-emerald-500/15 text-emerald-500' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' 
                        : 'bg-muted/40 text-muted-foreground/40'
                  )}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[8px] mt-0.5 font-medium truncate max-w-[45px]",
                    isCurrent ? "text-primary" : isCompleted ? "text-emerald-500" : "text-muted-foreground/40"
                  )}>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content - Horizontal slides with swipe */}
      <motion.div 
        className="flex-1 overflow-hidden relative"
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
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute inset-0 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-2 sm:py-3">
              <div className="max-w-lg mx-auto h-full">
                {renderStep()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows - subtle */}
        {currentStep > 0 && (
          <button
            onClick={handlePrev}
            disabled={saving}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-muted active:scale-90 transition-all shadow-sm"
            aria-label="Étape précédente"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        {currentStep < STEPS.length - 1 && !isSelfNavigatedStep() && (
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full backdrop-blur flex items-center justify-center active:scale-90 transition-all shadow-sm disabled:opacity-30",
              canProceed() 
                ? "bg-primary/15 border border-primary/30 hover:bg-primary/25" 
                : "bg-card/80 border border-border/50"
            )}
            aria-label="Étape suivante"
          >
            <ChevronRight className={cn(
              "w-5 h-5",
              canProceed() ? "text-primary" : "text-muted-foreground/30"
            )} />
          </button>
        )}
      </motion.div>

      {/* Footer Navigation */}
      {!isSelfNavigatedStep() && (
        <div 
          className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur px-3 sm:px-4 py-2 sm:py-3"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 h-10 sm:h-12 border-border text-muted-foreground text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              Retour
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 h-10 sm:h-12 bg-primary hover:bg-primary/90 text-sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <>
                  Suivant
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1 sm:ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
