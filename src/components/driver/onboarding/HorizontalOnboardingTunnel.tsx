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
  ChevronRight
} from 'lucide-react';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingBillingStep } from './OnboardingBillingStep';
import { OnboardingNfcStep } from './OnboardingNfcStep';
import { OnboardingObjectivesStep } from './OnboardingObjectivesStep';
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

// Ordre psychologique : Projection → Construction → Lancement
const ALL_STEPS = [
  { id: 'objectives', title: 'Vision', icon: Target },
  { id: 'settings', title: 'Tarifs', icon: Settings },
  { id: 'profile', title: 'Profil', icon: User },
  { id: 'documents', title: 'Docs', icon: FileText },
  { id: 'nfc', title: 'NFC', icon: CreditCard },
  { id: 'billing', title: 'Paiement', icon: Wallet },
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

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  const [completedSteps, setCompletedSteps] = useState({
    settings: driverProfile?.driver?.onboarding_settings_completed || false,
    profile: driverProfile?.driver?.onboarding_profile_completed || false,
    billing: true,
    documents: driverProfile?.driver?.onboarding_documents_completed || false,
    nfc: true,
    objectives: driverProfile?.driver?.onboarding_objectives_completed || false,
  });

  const { autoSave, saveImmediately } = useOnboardingAutoSave(driverId, userId, currentStep);

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
      case 'objectives': return true;
      case 'settings': return isSettingsValid();
      case 'profile': return isProfileValid();
      case 'billing': return true;
      case 'documents': return isDocumentsValid();
      case 'nfc': return true;
      case 'trial_start': return false;
      default: return false;
    }
  };

  const isSelfNavigatedStep = () => {
    const currentStepId = STEPS[currentStep]?.id;
    return currentStepId === 'objectives' || currentStepId === 'trial_start' || currentStepId === 'settings';
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
      const dbBillingType = billing.billingType === 'buy_equipment' ? 'own_equipment' : billing.billingType;
      const { error } = await supabase
        .from('drivers')
        .update({
          billing_type: dbBillingType,
          wants_tpe_affiliate: billing.billingType === 'buy_equipment',
          onboarding_step: 'trial_start',
        })
        .eq('id', driverId);
      if (error) throw error;
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
      case 'objectives':
        return (
          <OnboardingObjectivesStep
            driverId={driverId}
            onComplete={() => {
              setDirection(1);
              setCurrentStep(prev => prev + 1);
            }}
          />
        );
      case 'settings':
        return (
          <HorizontalSettingsFlow 
            data={stepData.settings}
            driverName={driverProfile?.full_name || 'Chauffeur'}
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
        className="flex-shrink-0 px-4 pt-3 pb-2 bg-slate-900/80 backdrop-blur-sm border-b border-white/5"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Logo + Progress */}
          <div className="flex items-center justify-between mb-2">
            <img src={logo} alt="SoloCab" className="h-6" />
            <div className="flex items-center gap-2 text-xs text-white/60">
              {autoSaveStatus === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
              {autoSaveStatus === 'saved' && <Save className="w-3 h-3 text-emerald-400" />}
              <span>{currentStep + 1}/{STEPS.length}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-1" />
          
          {/* Step indicators - horizontal scroll */}
          <div className="flex justify-between mt-2 gap-1 overflow-x-auto pb-1">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep || completedSteps[step.id as keyof typeof completedSteps];
              const isCurrent = index === currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center flex-shrink-0 ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-white/30'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isCompleted && !isCurrent
                      ? 'bg-emerald-500/20' 
                      : isCurrent 
                        ? 'bg-primary/20 ring-2 ring-primary' 
                        : 'bg-white/5'
                  }`}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-[8px] mt-0.5 font-medium truncate max-w-[40px]">{step.title}</span>
                </div>
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
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
              <div className="max-w-lg mx-auto h-full">
                {renderStep()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Swipe indicators */}
        {currentStep > 0 && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20">
            <ChevronLeft className="w-8 h-8" />
          </div>
        )}
        {currentStep < STEPS.length - 1 && !isSelfNavigatedStep() && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20">
            <ChevronRight className="w-8 h-8" />
          </div>
        )}
      </motion.div>

      {/* Footer Navigation - Only for non-self-navigated steps */}
      {!isSelfNavigatedStep() && (
        <div 
          className="flex-shrink-0 border-t border-white/10 bg-slate-900/95 backdrop-blur px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Retour
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-emerald-500"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
