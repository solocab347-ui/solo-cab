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
  Wallet,
  Target,
  Play,
  ChevronLeft,
  ChevronRight,
  Compass,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingBillingStep } from './OnboardingBillingStep';
import { OnboardingNfcStep } from './OnboardingNfcStep';
import { OnboardingObjectivesStep } from './OnboardingObjectivesStep';
import { OnboardingGoalsStep } from './OnboardingGoalsStep';
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

// Ordre: Vision → Objectifs → Tarifs → Profil → Documents → NFC → Encaissements → Lancement
// Note: Planning est maintenant intégré dans Objectifs pour simplifier le parcours
const ALL_STEPS = [
  { id: 'vision', title: 'Vision', icon: Compass },
  { id: 'goals', title: 'Objectifs', icon: TrendingUp },
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
  const hasNfcPlate = !!(driverProfile?.driver?.has_nfc_plate || driverProfile?.driver?.nfc_tag_number || driverProfile?.driver?.nfc_plate_order_id);
  
  const STEPS = hasNfcPlate 
    ? ALL_STEPS.filter(step => step.id !== 'nfc')
    : ALL_STEPS;

  // FORCER le démarrage au début (étape 0) pour les anciens utilisateurs du tunnel précédent
  // Les données restent enregistrées, mais on recommence la navigation depuis le début
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mettre à jour last_seen_at à chaque connexion au tunnel
  useEffect(() => {
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('drivers')
          .update({ 
            last_seen_at: new Date().toISOString(),
            onboarding_step: 'vision' // Reset au début du tunnel
          })
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
      homeAddress: driverProfile?.driver?.home_address || '',
      homeCoordinates: driverProfile?.driver?.home_latitude && driverProfile?.driver?.home_longitude 
        ? { latitude: driverProfile.driver.home_latitude, longitude: driverProfile.driver.home_longitude }
        : null,
    },
    documents: {
      documentsStatus: driverProfile?.driver?.documents_status || 'pending',
    },
    billing: {
      billingType: (driverProfile?.driver?.billing_type as 'own_equipment' | 'buy_equipment' | 'solocab_stripe') || 'own_equipment',
    },
    nfc: {
      hasNfcPlate,
      wantsNfcPlate: false,
    }
  });

  // Calculer les étapes complétées basées sur l'étape sauvegardée et les données réelles
  const getCompletedStepsFromSavedStep = () => {
    const stepOrder = ['vision', 'goals', 'settings', 'profile', 'documents', 'nfc', 'billing', 'trial_start'];
    const savedStep = driverProfile?.driver?.onboarding_step;
    const savedIndex = savedStep ? stepOrder.indexOf(savedStep) : -1;
    
    // NFC est complété seulement si le chauffeur a déjà une plaque OU a fait un choix explicite
    const nfcCompleted = !!(
      driverProfile?.driver?.has_nfc_plate || 
      driverProfile?.driver?.nfc_tag_number || 
      driverProfile?.driver?.nfc_plate_order_id ||
      driverProfile?.driver?.onboarding_nfc_completed
    );
    
    // Billing est complété seulement si un type de facturation a été explicitement choisi
    const billingCompleted = !!(
      driverProfile?.driver?.onboarding_billing_completed ||
      (savedIndex > stepOrder.indexOf('billing'))
    );
    
    return {
      vision: savedIndex > 0 || driverProfile?.driver?.onboarding_objectives_completed || false,
      goals: savedIndex > 1 || !!(driverProfile?.driver?.objectives_data?.target_monthly_revenue),
      settings: savedIndex > 2 || driverProfile?.driver?.onboarding_settings_completed || false,
      profile: savedIndex > 3 || driverProfile?.driver?.onboarding_profile_completed || false,
      documents: savedIndex > 4 || driverProfile?.driver?.onboarding_documents_completed || false,
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
    const { baseFare, perKmRate, companyName, vehicleBrand } = stepData.settings;
    return !!(baseFare && perKmRate && companyName && vehicleBrand);
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
      case 'settings': return isSettingsValid();
      case 'profile': return isProfileValid();
      case 'billing': return true;
      case 'documents': return true; // Can pass even without all docs, blocked at launch
      case 'nfc': return true;
      case 'trial_start': return false; // Self-navigated
      default: return false;
    }
  };

  const isSelfNavigatedStep = () => {
    const currentStepId = STEPS[currentStep]?.id;
    return currentStepId === 'vision' || currentStepId === 'goals' || currentStepId === 'trial_start' || currentStepId === 'settings';
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
          home_address: profile.homeAddress,
          home_latitude: profile.homeCoordinates?.latitude || null,
          home_longitude: profile.homeCoordinates?.longitude || null,
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
      const { billing } = stepData;
      // Map UI billing type to DB billing type
      // 'buy_equipment' is stored as 'own_equipment' with wants_tpe_affiliate = true
      const dbBillingType = billing.billingType === 'buy_equipment' ? 'own_equipment' : billing.billingType;
      
      // Build update object with only columns that exist
      const updateData: Record<string, any> = {
        billing_type: dbBillingType,
        onboarding_step: 'trial_start',
        onboarding_billing_completed: true,
      };
      
      // wants_tpe_affiliate might not exist - handle gracefully
      if (billing.billingType === 'buy_equipment') {
        updateData.wants_tpe_affiliate = true;
      }
      
      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverId);
        
      if (error) {
        // If error is about unknown column, try without it
        if (error.message?.includes('wants_tpe_affiliate') || error.message?.includes('onboarding_billing_completed')) {
          const { error: retryError } = await supabase
            .from('drivers')
            .update({
              billing_type: dbBillingType,
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
          />
        );
      case 'trial_start':
        return (
          <OnboardingTrialStartStep
            driverId={driverId}
            billingType={stepData.billing.billingType}
            stripeAccountStatus={driverProfile?.driver?.stripe_account_status}
            documentsStatus={stepData.documents.documentsStatus}
            onComplete={handleComplete}
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
      className="fixed inset-0 flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
      style={{ 
        touchAction: 'pan-x',
        overscrollBehavior: 'none',
      }}
    >
      {/* Compact Header */}
      <div 
        className="flex-shrink-0 px-3 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2 bg-slate-900/80 backdrop-blur-sm border-b border-white/5"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Logo + Progress */}
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <img src={logo} alt="SoloCab" className="h-5 sm:h-6" />
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-white/60">
              {autoSaveStatus === 'saving' && <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-spin" />}
              {autoSaveStatus === 'saved' && <Save className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />}
              <span>{currentStep + 1}/{STEPS.length}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-0.5 sm:h-1" />
          
          {/* Step indicators - horizontal scroll - cliquables pour navigation */}
          <div className="flex justify-between mt-1.5 sm:mt-2 gap-0.5 sm:gap-1 overflow-x-auto pb-0.5 sm:pb-1 scrollbar-hide">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep || completedSteps[step.id as keyof typeof completedSteps];
              const isCurrent = index === currentStep;
              // On peut cliquer sur les étapes déjà visitées (complétées ou précédentes)
              const isClickable = index < currentStep || isCompleted;
              
              const handleStepClick = () => {
                if (isClickable && index !== currentStep) {
                  setDirection(index < currentStep ? -1 : 1);
                  setCurrentStep(index);
                }
              };
              
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={handleStepClick}
                  disabled={!isClickable || isCurrent}
                  className={cn(
                    "flex flex-col items-center flex-shrink-0 transition-all",
                    isClickable && !isCurrent ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default",
                    isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-white/30'
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all",
                    isCompleted && !isCurrent
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30' 
                      : isCurrent 
                        ? 'bg-primary/20 ring-1 sm:ring-2 ring-primary' 
                        : 'bg-white/5'
                  )}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                  </div>
                  <span className="text-[7px] sm:text-[8px] mt-0.5 font-medium truncate max-w-[36px] sm:max-w-[40px]">{step.title}</span>
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

        {/* Navigation arrows - Highly visible and clickable */}
        {currentStep > 0 && (
          <button
            onClick={handlePrev}
            disabled={saving}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-24 bg-gradient-to-r from-slate-900/90 to-transparent group disabled:opacity-50"
            aria-label="Étape précédente"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 group-active:scale-90 transition-all shadow-lg">
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white/80 group-hover:text-primary" />
            </div>
          </button>
        )}
        {currentStep < STEPS.length - 1 && !isSelfNavigatedStep() && (
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-12 h-24 bg-gradient-to-l from-slate-900/90 to-transparent group disabled:opacity-50"
            aria-label="Étape suivante"
          >
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-full backdrop-blur-sm flex items-center justify-center group-active:scale-90 transition-all shadow-lg",
              canProceed() 
                ? "bg-primary/20 border border-primary/40 group-hover:bg-primary/30 group-hover:border-primary animate-pulse" 
                : "bg-white/5 border border-white/10"
            )}>
              <ChevronRight className={cn(
                "w-6 h-6 sm:w-7 sm:h-7",
                canProceed() ? "text-primary" : "text-white/30"
              )} />
            </div>
          </button>
        )}
      </motion.div>

      {/* Footer Navigation - Only for non-self-navigated steps */}
      {!isSelfNavigatedStep() && (
        <div 
          className="flex-shrink-0 border-t border-white/10 bg-slate-900/95 backdrop-blur px-3 sm:px-4 py-2 sm:py-3"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 h-10 sm:h-12 border-white/20 text-white hover:bg-white/10 text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              Retour
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 h-10 sm:h-12 bg-gradient-to-r from-primary to-emerald-500 text-sm"
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
