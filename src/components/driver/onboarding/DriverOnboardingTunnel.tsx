import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  Settings,
  User,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  CreditCard
} from 'lucide-react';
import { OnboardingSettingsStep } from './OnboardingSettingsStep';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingNfcStep } from './OnboardingNfcStep';
import { OnboardingCompleteStep } from './OnboardingCompleteStep';
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

const STEPS = [
  { id: 'settings', title: 'Réglages', icon: Settings },
  { id: 'profile', title: 'Profil', icon: User },
  { id: 'documents', title: 'Documents', icon: FileText },
  { id: 'nfc', title: 'Plaque NFC', icon: CreditCard },
  { id: 'complete', title: 'Terminé', icon: Sparkles },
];

export function DriverOnboardingTunnel({ 
  driverId, 
  userId, 
  driverProfile,
  onComplete,
  initialStep = 0
}: OnboardingTunnelProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
    nfc: {
      hasNfcPlate: driverProfile?.driver?.has_nfc_plate || false,
      wantsNfcPlate: false,
    }
  });

  // Vérifier les étapes déjà complétées
  const [completedSteps, setCompletedSteps] = useState({
    settings: driverProfile?.driver?.onboarding_settings_completed || false,
    profile: driverProfile?.driver?.onboarding_profile_completed || false,
    documents: driverProfile?.driver?.onboarding_documents_completed || false,
    nfc: true, // Toujours "complétable" car optionnel
  });

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Validation de chaque étape - SIMPLIFIÉE pour réduire les abandons
  const isSettingsValid = () => {
    const { baseFare, perKmRate, companyName, vehicleBrand } = stepData.settings;
    // Seuls les champs essentiels sont requis - le reste peut être complété plus tard
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
    switch (currentStep) {
      case 0: return isSettingsValid();
      case 1: return isProfileValid();
      case 2: return isDocumentsValid();
      case 3: return true; // NFC est optionnel
      case 4: return true;
      default: return false;
    }
  };

  const updateStepData = (step: string, updates: any) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof prev], ...updates }
    }));
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
      toast.success('Réglages enregistrés !');
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
      
      // Update profile photo in profiles table
      if (profile.profilePhotoUrl) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: profile.profilePhotoUrl })
          .eq('id', userId);
      }

      // Update driver data
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
      toast.success('Profil enregistré !');
      return true;
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    let success = false;
    
    switch (currentStep) {
      case 0:
        success = await saveSettings();
        break;
      case 1:
        success = await saveProfile();
        break;
      case 2:
        // Documents are saved automatically via DriverDocuments component
        success = true;
        break;
      case 3:
        // NFC step - just proceed
        success = true;
        break;
      default:
        success = true;
    }

    if (success && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
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
      
      toast.success('🎉 Bienvenue sur SoloCab ! Votre inscription est complète.');
      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <OnboardingSettingsStep 
            data={stepData.settings}
            onUpdate={(updates) => updateStepData('settings', updates)}
          />
        );
      case 1:
        return (
          <OnboardingProfileStep 
            data={stepData.profile}
            driverProfile={driverProfile}
            userId={userId}
            onUpdate={(updates) => updateStepData('profile', updates)}
          />
        );
      case 2:
        return (
          <OnboardingDocumentsStep 
            driverId={driverId}
            userId={userId}
            onStatusChange={(status) => updateStepData('documents', { documentsStatus: status })}
          />
        );
      case 3:
        return (
          <OnboardingNfcStep
            hasNfcPlate={stepData.nfc.hasNfcPlate}
            driverId={driverId}
          />
        );
      case 4:
        return <OnboardingCompleteStep onComplete={handleComplete} loading={saving} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-background to-muted/30"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        touchAction: 'pan-y',
      }}
    >
      {/* Fixed Header */}
      <div 
        className="flex-shrink-0 px-4 pt-4 pb-2"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Logo */}
          <div className="text-center mb-3">
            <img src={logo} alt="SoloCab" className="h-8 mx-auto" />
          </div>
          
          {/* Title */}
          <h1 className="text-lg font-bold text-center">Configuration de votre espace</h1>
          <p className="text-muted-foreground text-xs text-center mt-0.5">
            Complétez ces étapes pour démarrer votre activité
          </p>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Étape {currentStep + 1} sur {STEPS.length}
              </span>
              <span className="text-xs font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            
            {/* Step Indicators - Compact */}
            <div className="flex justify-between mt-3 px-1">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep || completedSteps[step.id as keyof typeof completedSteps];
                const isCurrent = index === currentStep;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex flex-col items-center ${
                      index <= currentStep ? 'text-primary' : 'text-muted-foreground/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-primary text-primary-foreground' 
                        : isCurrent 
                          ? 'bg-primary/20 border-2 border-primary' 
                          : 'bg-muted'
                    }`}>
                      {isCompleted && !isCurrent ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[9px] mt-1 font-medium">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content - FIXED for iOS/Android */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-lg mx-auto pb-4">
          {/* Step Header Card */}
          <div className="bg-card border rounded-lg p-3 mb-3 mt-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                {(() => {
                  const Icon = STEPS[currentStep].icon;
                  return <Icon className="w-4 h-4 text-primary" />;
                })()}
              </div>
              <div>
                <h2 className="text-base font-semibold">{STEPS[currentStep].title}</h2>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Footer Navigation */}
      {currentStep < STEPS.length - 1 && (
        <div 
          className="flex-shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Précédent
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 h-11"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              {currentStep === 3 ? 'Terminer' : 'Suivant'}
              {!saving && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
